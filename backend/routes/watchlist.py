"""
Watchlist & Signal Monitoring Routes
--------------------------------------
Users save assets to watchlist, JARVIS monitors for signal changes.
Supports adding, removing, listing, and checking alerts.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


def get_db():
    from server import db
    return db


def get_user_from_token(token: str):
    import jwt as pyjwt
    try:
        secret = os.environ.get('JWT_SECRET', 'aureos_ai_secure_secret')
        payload = pyjwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except Exception:
        return None


def _extract_user_id(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        user_data = get_user_from_token(auth.split(" ")[1])
        if user_data:
            return user_data.get("user_id", "anonymous")
    return "anonymous"


class WatchlistAddRequest(BaseModel):
    symbol: str
    name: Optional[str] = None
    asset_type: str = "stock"
    coingecko_id: Optional[str] = None
    exchange: Optional[str] = None
    alert_on_signal_change: bool = True
    alert_on_price_move: Optional[float] = None  # Alert if price moves X%


class WatchlistRemoveRequest(BaseModel):
    symbol: str


@router.get("/")
async def get_watchlist(request: Request):
    """Get user's watchlist with latest signal data."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)

        items = await db.watchlist.find(
            {"user_id": user_id}, {"_id": 0, "user_id": 0}
        ).sort("added_at", -1).to_list(50)

        # Enrich with latest analysis data
        for item in items:
            latest = await db.analysis_history.find_one(
                {"user_id": user_id, "symbol": item["symbol"]},
                {"_id": 0},
                sort=[("timestamp", -1)]
            )
            if latest:
                item["latest_signal"] = latest.get("signal", {})
                item["latest_price"] = latest.get("price", 0)
                item["latest_regime"] = latest.get("regime", {})
                item["last_analyzed"] = latest.get("timestamp", "")
            else:
                item["latest_signal"] = None
                item["latest_price"] = None
                item["last_analyzed"] = None

        # Also get alerts
        alerts = await db.watchlist_alerts.find(
            {"user_id": user_id, "read": False}, {"_id": 0, "user_id": 0}
        ).sort("created_at", -1).limit(20).to_list(20)

        return {
            "watchlist": items,
            "count": len(items),
            "unread_alerts": len(alerts),
            "alerts": alerts,
        }
    except Exception as e:
        logger.error(f"Watchlist get error: {e}")
        return {"watchlist": [], "count": 0, "unread_alerts": 0, "alerts": []}


@router.post("/add")
async def add_to_watchlist(req: WatchlistAddRequest, request: Request):
    """Add an asset to the user's watchlist."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)

        # Check if already in watchlist
        existing = await db.watchlist.find_one({
            "user_id": user_id, "symbol": req.symbol.upper()
        })
        if existing:
            return {"status": "already_exists", "message": f"{req.symbol} is already in your watchlist"}

        doc = {
            "user_id": user_id,
            "symbol": req.symbol.upper(),
            "name": req.name or req.symbol,
            "asset_type": req.asset_type,
            "coingecko_id": req.coingecko_id,
            "exchange": req.exchange,
            "alert_on_signal_change": req.alert_on_signal_change,
            "alert_on_price_move": req.alert_on_price_move,
            "added_at": datetime.now(timezone.utc).isoformat(),
            "last_signal": None,
            "last_price": None,
        }
        await db.watchlist.insert_one(doc)

        return {"status": "added", "message": f"{req.symbol} added to watchlist", "symbol": req.symbol.upper()}
    except Exception as e:
        logger.error(f"Watchlist add error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remove")
async def remove_from_watchlist(req: WatchlistRemoveRequest, request: Request):
    """Remove an asset from the user's watchlist."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)

        result = await db.watchlist.delete_one({
            "user_id": user_id, "symbol": req.symbol.upper()
        })

        if result.deleted_count == 0:
            return {"status": "not_found", "message": f"{req.symbol} not found in watchlist"}

        return {"status": "removed", "message": f"{req.symbol} removed from watchlist"}
    except Exception as e:
        logger.error(f"Watchlist remove error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan")
async def scan_watchlist(request: Request):
    """Scan all watchlist assets for signal changes — JARVIS monitoring."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)

        items = await db.watchlist.find(
            {"user_id": user_id}, {"_id": 0}
        ).to_list(50)

        if not items:
            return {"status": "empty", "message": "Watchlist is empty", "scanned": 0, "alerts_generated": 0}

        from services.market_data import market_data_adapter
        from services.technical_engine import compute_technical_analysis
        from services.market_structure import detect_market_structure
        from services.liquidity_mapper import map_liquidity
        from services.monte_carlo import run_monte_carlo
        from services.risk_engine import compute_risk_model
        from services.causality_engine import explain_market_causality
        from services.probability_engine import compute_probabilities
        from services.regime_detector import detect_regime

        alerts_generated = 0
        scanned = 0
        scan_results = []

        for item in items[:10]:  # Max 10 to avoid rate limits
            try:
                asset_data = await market_data_adapter.get_asset_data(
                    symbol=item["symbol"],
                    asset_type=item.get("asset_type", "stock"),
                    coingecko_id=item.get("coingecko_id"),
                )
                candles = asset_data.get("candles", [])
                price = asset_data.get("price", 0)
                if not candles or price <= 0:
                    continue

                # Quick analysis (simplified for speed)
                technical = compute_technical_analysis(candles, price)
                structure = detect_market_structure(candles, technical)
                liquidity = map_liquidity(candles, technical)
                mc = run_monte_carlo(candles, price, num_simulations=1000, forecast_periods=14)
                risk = compute_risk_model(candles, price, technical, mc)
                causality = explain_market_causality(technical, structure, liquidity, candles)
                probability = compute_probabilities(technical, structure, liquidity, mc, risk, causality)
                regime = detect_regime(candles, technical, structure)

                current_signal = probability.get("signal", {}).get("direction", "HOLD")
                current_confidence = probability.get("signal", {}).get("confidence", 0)
                previous_signal = item.get("last_signal")

                scan_result = {
                    "symbol": item["symbol"],
                    "name": item.get("name", item["symbol"]),
                    "price": price,
                    "signal": current_signal,
                    "confidence": current_confidence,
                    "regime": regime.get("market_phase", {}).get("phase", "unknown"),
                    "change_percent": asset_data.get("change_percent", 0),
                    "previous_signal": previous_signal,
                }
                scan_results.append(scan_result)

                # Check for signal change alert
                if item.get("alert_on_signal_change") and previous_signal and previous_signal != current_signal:
                    alert = {
                        "user_id": user_id,
                        "symbol": item["symbol"],
                        "type": "signal_change",
                        "title": f"{item['symbol']} Signal Changed: {previous_signal} -> {current_signal}",
                        "message": f"JARVIS detected a signal change for {item['symbol']}. Previous: {previous_signal}, Current: {current_signal} ({current_confidence}% confidence). Regime: {regime.get('market_phase', {}).get('phase', 'unknown')}.",
                        "severity": "high" if current_signal in ("BUY", "SELL") else "medium",
                        "read": False,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                    await db.watchlist_alerts.insert_one(alert)
                    alerts_generated += 1

                # Check for price move alert
                if item.get("alert_on_price_move") and item.get("last_price"):
                    prev_price = item["last_price"]
                    if prev_price > 0:
                        pct_change = abs((price - prev_price) / prev_price * 100)
                        threshold = item["alert_on_price_move"]
                        if pct_change >= threshold:
                            direction = "up" if price > prev_price else "down"
                            alert = {
                                "user_id": user_id,
                                "symbol": item["symbol"],
                                "type": "price_move",
                                "title": f"{item['symbol']} moved {direction} {pct_change:.1f}%",
                                "message": f"{item['symbol']} price moved {direction} {pct_change:.1f}% (from ${prev_price:,.2f} to ${price:,.2f}). Signal: {current_signal}.",
                                "severity": "medium",
                                "read": False,
                                "created_at": datetime.now(timezone.utc).isoformat(),
                            }
                            await db.watchlist_alerts.insert_one(alert)
                            alerts_generated += 1

                # Update watchlist item with latest data
                await db.watchlist.update_one(
                    {"user_id": user_id, "symbol": item["symbol"]},
                    {"$set": {"last_signal": current_signal, "last_price": price, "last_scanned": datetime.now(timezone.utc).isoformat()}}
                )

                scanned += 1
            except Exception as e:
                logger.warning(f"Scan error for {item['symbol']}: {e}")
                continue

        return {
            "status": "complete",
            "scanned": scanned,
            "alerts_generated": alerts_generated,
            "results": scan_results,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"Watchlist scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/mark-read")
async def mark_alerts_read(request: Request):
    """Mark all alerts as read."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)
        await db.watchlist_alerts.update_many(
            {"user_id": user_id, "read": False},
            {"$set": {"read": True}}
        )
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Alert mark read error: {e}")
        return {"status": "error"}
