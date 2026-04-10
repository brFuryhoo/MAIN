"""
Signal Learning Routes
======================
FastAPI routes exposing the Self-Improving Signal Engine's data to the
frontend and internal services.

Prefix: /api/signal-learning
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.signal_learning_engine import (
    OUTCOME_HIT,
    OUTCOME_PENDING,
    apply_learning_to_signal,
    get_signal_performance_report,
    record_signal,
    resolve_pending_signals,
    _get_db,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/signal-learning", tags=["signal-learning"])


# ─── Pydantic Models ────────────────────────────────────────────────────────

class RecordSignalRequest(BaseModel):
    symbol: str
    asset_type: str = "crypto"
    signal: str = "HOLD"
    confidence: int = 50
    entry_price: float = 0.0
    target_price: float = 0.0
    stop_loss: float = 0.0
    timeframe: str = "1d"
    source: str = "predictions"
    context: Optional[Dict[str, Any]] = None
    # optional passthrough fields from predictions.py
    signal_id: Optional[str] = None
    technical_score: Optional[int] = None
    sentiment_score: Optional[int] = None
    geopolitical_risk: Optional[str] = None
    overall_score: Optional[int] = None
    reasoning: Optional[str] = None


# ─── GET /api/signal-learning/performance ──────────────────────────────────

@router.get("/performance")
async def get_performance(
    symbol: Optional[str] = Query(default=None, description="Filter by asset symbol, e.g. BTC"),
    days: int = Query(default=30, ge=1, le=365, description="Lookback period in days"),
):
    """
    Full performance report for the competition dashboard / trust page.

    Returns overall win rate, signal counts, breakdowns by symbol / signal type /
    source, top and bottom patterns, recent hits, confidence trend, and a
    JARVIS AI-generated one-liner verdict.
    """
    try:
        report = await get_signal_performance_report(symbol=symbol, days=days)
        return report
    except Exception as exc:
        logger.error("Performance report error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


# ─── GET /api/signal-learning/leaderboard ──────────────────────────────────

@router.get("/leaderboard")
async def get_leaderboard():
    """
    Top 10 best-performing signal patterns (symbol × signal_type × source).

    Returns rank, symbol, signal_type, win_rate, accuracy, total_signals,
    and a trend indicator ("improving" | "declining" | "stable").
    """
    try:
        db = _get_db()

        weight_docs: List[Dict] = await db.signal_weights.find(
            {"total_signals": {"$gte": 3}},
            {"_id": 0},
        ).sort("win_rate", -1).limit(20).to_list(20)

        leaderboard = []
        for rank, doc in enumerate(weight_docs[:10], start=1):
            # Determine trend from confidence_multiplier relative to 1.0
            mult = doc.get("confidence_multiplier", 1.0)
            if mult > 1.05:
                trend = "improving"
            elif mult < 0.95:
                trend = "declining"
            else:
                trend = "stable"

            leaderboard.append({
                "rank":          rank,
                "key":           doc.get("key", ""),
                "symbol":        doc.get("symbol", ""),
                "signal_type":   doc.get("signal_type", ""),
                "macro_regime":  doc.get("macro_regime", ""),
                "source":        doc.get("source", ""),
                "win_rate":      doc.get("win_rate", 0.0),
                "accuracy":      doc.get("avg_accuracy", 0.0),
                "total_signals": doc.get("total_signals", 0),
                "multiplier":    round(mult, 4),
                "trend":         trend,
            })

        return {"leaderboard": leaderboard, "generated_at": datetime.now(timezone.utc).isoformat()}

    except Exception as exc:
        logger.error("Leaderboard error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


# ─── GET /api/signal-learning/signal/{signal_id} ───────────────────────────

@router.get("/signal/{signal_id}")
async def get_signal_detail(signal_id: str):
    """
    Full detail of a single signal including outcome, accuracy score,
    and learning impact (confidence multiplier at resolution time).
    """
    try:
        db = _get_db()
        doc = await db.signal_ledger.find_one({"signal_id": signal_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail=f"Signal {signal_id} not found")

        # Enrich with weight info if resolved
        if doc.get("outcome") != OUTCOME_PENDING:
            symbol      = doc.get("symbol", "")
            signal_type = doc.get("signal", "")
            macro_regime = doc.get("context", {}).get("macro_regime", "neutral")
            source       = doc.get("source", "predictions")
            key = f"{symbol}_{signal_type}_{macro_regime}_{source}"
            weight_doc = await db.signal_weights.find_one({"key": key}, {"_id": 0})
            doc["pattern_weights"] = {
                k: weight_doc.get(k)
                for k in ("win_rate", "avg_accuracy", "confidence_multiplier",
                           "total_signals", "underperforming")
            } if weight_doc else {}

        return doc

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Signal detail error for %s: %s", signal_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


# ─── GET /api/signal-learning/recent-hits ──────────────────────────────────

@router.get("/recent-hits")
async def get_recent_hits(limit: int = Query(default=20, ge=1, le=100)):
    """
    Last N signals that were HITs — for social proof / trust dashboard.

    Returns: [{symbol, signal, confidence, entry_price, target_price,
               accuracy_score, timeframe, created_at, outcome_price}]
    """
    try:
        db = _get_db()

        hits: List[Dict] = await db.signal_ledger.find(
            {"outcome": OUTCOME_HIT},
            {
                "_id": 0,
                "signal_id": 1,
                "symbol": 1,
                "signal": 1,
                "confidence": 1,
                "entry_price": 1,
                "target_price": 1,
                "accuracy_score": 1,
                "timeframe": 1,
                "created_at": 1,
                "outcome_price": 1,
                "source": 1,
            },
        ).sort("outcome_checked_at", -1).limit(limit).to_list(limit)

        return {
            "hits":      hits,
            "count":     len(hits),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as exc:
        logger.error("Recent hits error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


# ─── POST /api/signal-learning/record ──────────────────────────────────────

@router.post("/record")
async def record_signal_endpoint(body: RecordSignalRequest):
    """
    Manually record a signal.  Called internally by predictions.py and
    jarvis_narrative.py; also available for admin testing.
    """
    try:
        signal_dict = body.model_dump(exclude_none=True)
        signal_id = await record_signal(signal_dict)
        return {
            "status":    "recorded",
            "signal_id": signal_id,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.error("Record signal endpoint error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


# ─── POST /api/signal-learning/resolve-now ─────────────────────────────────

@router.post("/resolve-now")
async def trigger_resolve():
    """
    Admin / debug endpoint — immediately trigger resolution of all pending
    signals whose expiry time has passed.

    Returns a summary of what was resolved.
    """
    try:
        result = await resolve_pending_signals()
        return {
            "status":    "ok",
            "summary":   result,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.error("Manual resolve trigger error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
