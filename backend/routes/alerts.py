"""
Price Alert System
==================
Allows users to set price threshold alerts on any tracked asset.
Alerts are stored in MongoDB collection `price_alerts`.

Endpoints:
  POST   /api/alerts/create        — create a new alert
  GET    /api/alerts/my            — list the caller's active alerts
  DELETE /api/alerts/{alert_id}    — delete an alert
  GET    /api/alerts/triggered     — list triggered alerts for caller
  POST   /api/alerts/check         — internal: evaluate all pending alerts (background task)
"""

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


# ---------------------------------------------------------------------------
# Helpers: DB + Auth
# ---------------------------------------------------------------------------

def _get_db():
    from server import db  # noqa: PLC0415 – deferred to avoid circular import
    return db


def _extract_user_id(request: Request) -> str:
    """Extract user_id from JWT Bearer token.  Returns 'anonymous' if absent/invalid."""
    import jwt as pyjwt  # noqa: PLC0415
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            secret = os.environ.get("JWT_SECRET", "aureos_ai_secure_secret")
            payload = pyjwt.decode(auth.split(" ", 1)[1], secret, algorithms=["HS256"])
            return payload.get("user_id", "anonymous")
        except Exception:
            pass
    return "anonymous"


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class AlertCreate(BaseModel):
    user_id: Optional[str] = Field(None, description="Overrides JWT if provided (admin use)")
    symbol: str = Field(..., examples=["BTC"])
    condition: Literal["above", "below"] = Field(..., description="Trigger when price is above or below target")
    target_price: float = Field(..., gt=0)
    asset_type: Literal["crypto", "stock", "forex", "commodity"] = Field(default="crypto")


class AlertResponse(BaseModel):
    alert_id: str
    user_id: str
    symbol: str
    condition: str
    target_price: float
    asset_type: str
    triggered: bool
    triggered_at: Optional[str]
    current_price: Optional[float]
    created_at: str


# ---------------------------------------------------------------------------
# Price-fetch helper (reuses live_feed cache where possible)
# ---------------------------------------------------------------------------

async def _get_current_price(symbol: str, asset_type: str) -> Optional[float]:
    """Fetch the latest price for a symbol, using the live_feed in-memory cache."""
    try:
        from services.market_data import market_data_adapter  # noqa: PLC0415
        data = await market_data_adapter.get_asset_data(symbol, asset_type)
        return data.get("price")
    except Exception as exc:
        logger.warning("Price fetch for alert check failed (%s): %s", symbol, exc)
        return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/create", response_model=AlertResponse, status_code=201)
async def create_alert(payload: AlertCreate, request: Request):
    """Create a new price alert for the authenticated user."""
    db = _get_db()
    caller_id = _extract_user_id(request)
    user_id = payload.user_id or caller_id

    alert_doc = {
        "alert_id": str(uuid.uuid4()),
        "user_id": user_id,
        "symbol": payload.symbol.upper(),
        "condition": payload.condition,
        "target_price": payload.target_price,
        "asset_type": payload.asset_type,
        "triggered": False,
        "triggered_at": None,
        "current_price": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        await db.price_alerts.insert_one(alert_doc)
    except Exception as exc:
        logger.error("Alert insert failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create alert")

    # Strip MongoDB's internal _id before returning
    alert_doc.pop("_id", None)
    return AlertResponse(**alert_doc)


@router.get("/my", response_model=List[AlertResponse])
async def list_my_alerts(request: Request):
    """Return all active (non-triggered) alerts for the authenticated user."""
    db = _get_db()
    user_id = _extract_user_id(request)

    try:
        cursor = db.price_alerts.find(
            {"user_id": user_id, "triggered": False},
            {"_id": 0},
        )
        alerts = await cursor.to_list(length=200)
    except Exception as exc:
        logger.error("Alert list failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch alerts")

    return [AlertResponse(**a) for a in alerts]


@router.get("/triggered", response_model=List[AlertResponse])
async def list_triggered_alerts(request: Request):
    """Return all triggered alerts for the authenticated user, newest first."""
    db = _get_db()
    user_id = _extract_user_id(request)

    try:
        cursor = db.price_alerts.find(
            {"user_id": user_id, "triggered": True},
            {"_id": 0},
        ).sort("triggered_at", -1).limit(50)
        alerts = await cursor.to_list(length=50)
    except Exception as exc:
        logger.error("Triggered alert list failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch triggered alerts")

    return [AlertResponse(**a) for a in alerts]


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, request: Request):
    """Delete an alert by ID.  The caller must own the alert."""
    db = _get_db()
    user_id = _extract_user_id(request)

    try:
        result = await db.price_alerts.delete_one(
            {"alert_id": alert_id, "user_id": user_id}
        )
    except Exception as exc:
        logger.error("Alert delete failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete alert")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found or not owned by user")

    return {"status": "deleted", "alert_id": alert_id}


@router.post("/check")
async def check_alerts():
    """
    Internal endpoint — evaluates all pending (untriggered) alerts against
    current market prices. Call this from a background task / cron job.

    Returns a summary of how many alerts were evaluated and triggered.
    """
    db = _get_db()

    try:
        cursor = db.price_alerts.find({"triggered": False}, {"_id": 0})
        pending: List[dict] = await cursor.to_list(length=10_000)
    except Exception as exc:
        logger.error("Alert check — fetch failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load alerts")

    if not pending:
        return {"evaluated": 0, "triggered": 0, "status": "no_pending_alerts"}

    # Group alerts by (symbol, asset_type) to minimise API calls
    groups: dict = {}
    for alert in pending:
        key = (alert["symbol"], alert["asset_type"])
        groups.setdefault(key, []).append(alert)

    triggered_count = 0
    evaluated_count = len(pending)

    for (symbol, asset_type), group_alerts in groups.items():
        current_price = await _get_current_price(symbol, asset_type)
        if current_price is None:
            logger.debug("No price available for %s — skipping", symbol)
            continue

        for alert in group_alerts:
            condition: str = alert["condition"]
            target: float = alert["target_price"]
            met = (condition == "above" and current_price >= target) or \
                  (condition == "below" and current_price <= target)

            if met:
                triggered_at = datetime.now(timezone.utc).isoformat()
                try:
                    await db.price_alerts.update_one(
                        {"alert_id": alert["alert_id"]},
                        {"$set": {
                            "triggered": True,
                            "triggered_at": triggered_at,
                            "current_price": current_price,
                        }},
                    )
                    triggered_count += 1
                    logger.info(
                        "Alert triggered: %s %s %.6f (current=%.6f)",
                        symbol, condition, target, current_price,
                    )
                except Exception as exc:
                    logger.error("Alert update failed for %s: %s", alert["alert_id"], exc)

    return {
        "status": "complete",
        "evaluated": evaluated_count,
        "triggered": triggered_count,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }
