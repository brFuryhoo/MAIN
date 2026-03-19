"""
Aureos AI — TRUST LAYER
=========================
Public Performance Dashboard, Signal Logging, Verified Track Record, Signal Transparency.
The most critical layer for platform credibility.
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os
import logging
import random
import uuid
import math

logger = logging.getLogger("aureos")
router = APIRouter(prefix="/api/trust", tags=["trust"])

def get_db():
    from server import db
    return db

def _uid(request: Request) -> str:
    import jwt as pyjwt
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            secret = os.environ.get('JWT_SECRET', 'aureos_ai_secure_secret')
            return pyjwt.decode(auth.split(" ")[1], secret, algorithms=["HS256"]).get("user_id", "anonymous")
        except Exception:
            pass
    return "anonymous"


# ══════════════════════════════════════════════════════════════
# 1. PUBLIC PERFORMANCE DASHBOARD
# ══════════════════════════════════════════════════════════════

@router.get("/performance")
async def get_public_performance():
    """Public performance dashboard — aggregate platform metrics. No auth required."""
    db = get_db()

    # Aggregate from all users
    all_trades = await db.paper_trades.find({"status": "closed"}, {"_id": 0}).to_list(10000)
    all_signals = await db.signals_log.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)

    total_trades = len(all_trades)
    wins = sum(1 for t in all_trades if t.get("pnl", 0) > 0)
    total_pnl = sum(t.get("pnl", 0) for t in all_trades)
    win_rate = round(wins / max(total_trades, 1) * 100, 1)

    # Drawdown calculation
    running_pnl = 0
    peak = 0
    max_drawdown = 0
    for t in sorted(all_trades, key=lambda x: x.get("closed_at", "")):
        running_pnl += t.get("pnl", 0)
        peak = max(peak, running_pnl)
        dd = peak - running_pnl
        max_drawdown = max(max_drawdown, dd)

    avg_return = round(total_pnl / max(total_trades, 1), 2)
    avg_win = round(sum(t.get("pnl", 0) for t in all_trades if t.get("pnl", 0) > 0) / max(wins, 1), 2)
    losses = total_trades - wins
    avg_loss = round(sum(t.get("pnl", 0) for t in all_trades if t.get("pnl", 0) <= 0) / max(losses, 1), 2)
    risk_reward = round(abs(avg_win / avg_loss), 2) if avg_loss != 0 else 0

    # Monthly performance breakdown
    monthly = {}
    for t in all_trades:
        d = t.get("closed_at", "")
        if d:
            try:
                dt = datetime.fromisoformat(d.replace("Z", "+00:00")) if isinstance(d, str) else d
                m = dt.strftime("%Y-%m")
                monthly[m] = monthly.get(m, {"pnl": 0, "trades": 0, "wins": 0})
                monthly[m]["pnl"] += t.get("pnl", 0)
                monthly[m]["trades"] += 1
                if t.get("pnl", 0) > 0:
                    monthly[m]["wins"] += 1
            except Exception:
                pass

    monthly_data = [
        {"month": m, "pnl": round(d["pnl"], 2), "trades": d["trades"],
         "win_rate": round(d["wins"] / max(d["trades"], 1) * 100, 1)}
        for m, d in sorted(monthly.items())
    ]

    # Signal accuracy
    total_signals = len(all_signals)
    correct_signals = sum(1 for s in all_signals if s.get("outcome") == "correct")
    signal_accuracy = round(correct_signals / max(total_signals, 1) * 100, 1)

    # Top performing strategies
    strategies = await db.strategies.find({}, {"_id": 0, "name": 1, "performance_history": 1}).to_list(50)
    top_strategies = []
    for s in strategies:
        perf = s.get("performance_history", [])
        if perf:
            total_ret = sum(p.get("return", 0) for p in perf)
            top_strategies.append({"name": s["name"], "return": round(total_ret, 2), "trades": len(perf)})
    top_strategies.sort(key=lambda x: x["return"], reverse=True)

    return {
        "overview": {
            "total_trades": total_trades,
            "win_rate": win_rate,
            "avg_return_per_trade": avg_return,
            "total_pnl": round(total_pnl, 2),
            "max_drawdown": round(max_drawdown, 2),
            "risk_reward_ratio": risk_reward,
            "avg_win": avg_win,
            "avg_loss": avg_loss,
            "sharpe_estimate": round(avg_return / max(abs(avg_loss), 0.01) * math.sqrt(252), 2),
        },
        "signals": {
            "total_signals": total_signals,
            "accuracy": signal_accuracy,
            "correct": correct_signals,
        },
        "monthly_performance": monthly_data,
        "top_strategies": top_strategies[:5],
        "platform_stats": {
            "total_users": await db.users.count_documents({}),
            "total_strategies": len(strategies),
            "assets_covered": 500,
        },
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


# ══════════════════════════════════════════════════════════════
# 2. VERIFIED TRACK RECORD
# ══════════════════════════════════════════════════════════════

@router.get("/track-record")
async def get_verified_track_record(limit: int = 50):
    """Verified track record — every signal logged with outcome."""
    db = get_db()
    signals = await db.signals_log.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)

    # Calculate streak
    streak = 0
    for s in signals:
        if s.get("outcome") == "correct":
            streak += 1
        else:
            break

    # Calculate by asset class
    by_class = {}
    for s in signals:
        cls = s.get("asset_type", "unknown")
        by_class[cls] = by_class.get(cls, {"total": 0, "correct": 0})
        by_class[cls]["total"] += 1
        if s.get("outcome") == "correct":
            by_class[cls]["correct"] += 1

    class_accuracy = {
        k: {"total": v["total"], "accuracy": round(v["correct"] / max(v["total"], 1) * 100, 1)}
        for k, v in by_class.items()
    }

    return {
        "signals": signals,
        "total": len(signals),
        "current_streak": streak,
        "accuracy_by_class": class_accuracy,
    }


# ══════════════════════════════════════════════════════════════
# 3. SIGNAL TRANSPARENCY
# ══════════════════════════════════════════════════════════════

@router.get("/signal/{signal_id}")
async def get_signal_transparency(signal_id: str):
    """Full transparency for any signal — probability, confidence, reasoning, outcome."""
    db = get_db()
    signal = await db.signals_log.find_one({"signal_id": signal_id}, {"_id": 0})
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    # Get similar historical signals
    similar = await db.signals_log.find(
        {"symbol": signal.get("symbol"), "direction": signal.get("direction"), "signal_id": {"$ne": signal_id}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)

    similar_accuracy = 0
    if similar:
        correct = sum(1 for s in similar if s.get("outcome") == "correct")
        similar_accuracy = round(correct / len(similar) * 100, 1)

    return {
        "signal": signal,
        "transparency": {
            "probability": signal.get("probability", 0),
            "confidence_tier": signal.get("confidence_tier", "medium"),
            "risk_level": signal.get("risk_level", "moderate"),
            "reasoning": signal.get("reasoning", []),
            "factors": signal.get("factors", {}),
        },
        "historical": {
            "similar_signals": len(similar),
            "similar_accuracy": similar_accuracy,
            "recent_similar": similar[:5],
        },
    }


# ══════════════════════════════════════════════════════════════
# 4. LOG A SIGNAL (Internal use by Decision Engine)
# ══════════════════════════════════════════════════════════════

class SignalLog(BaseModel):
    symbol: str
    direction: str  # bullish, bearish, neutral
    probability: float
    confidence_tier: str  # low, medium, high, very_high
    risk_level: str  # low, moderate, high
    entry_price: float
    target_price: float
    stop_loss: float
    reasoning: list
    factors: dict
    asset_type: str = "stock"

@router.post("/signal/log")
async def log_signal(data: SignalLog, request: Request):
    """Log a signal for track record verification."""
    db = get_db()
    user_id = _uid(request)

    signal_doc = {
        "signal_id": str(uuid.uuid4()),
        "user_id": user_id,
        "symbol": data.symbol.upper(),
        "direction": data.direction,
        "probability": data.probability,
        "confidence_tier": data.confidence_tier,
        "risk_level": data.risk_level,
        "entry_price": data.entry_price,
        "target_price": data.target_price,
        "stop_loss": data.stop_loss,
        "reasoning": data.reasoning,
        "factors": data.factors,
        "asset_type": data.asset_type,
        "outcome": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.signals_log.insert_one(signal_doc)
    signal_doc.pop("_id", None)
    return {"success": True, "signal": signal_doc}


# ══════════════════════════════════════════════════════════════
# 5. USER PERFORMANCE PROFILE (Public)
# ══════════════════════════════════════════════════════════════

@router.get("/user/{user_id}")
async def get_user_public_performance(user_id: str):
    """Public performance profile for any user."""
    db = get_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "full_name": 1, "created_at": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    trades = await db.paper_trades.find({"user_id": user_id, "status": "closed"}, {"_id": 0}).to_list(1000)
    score_doc = await db.score_history.find_one({"user_id": user_id}, {"_id": 0})
    evolution = await db.user_evolution.find_one({"user_id": user_id}, {"_id": 0})

    total = len(trades)
    wins = sum(1 for t in trades if t.get("pnl", 0) > 0)
    total_pnl = sum(t.get("pnl", 0) for t in trades)

    return {
        "user": {
            "name": user.get("full_name", "Anonymous"),
            "member_since": user.get("created_at", ""),
            "score": (score_doc or {}).get("score", 0),
            "tier": (score_doc or {}).get("tier", "Beginner"),
            "level": (evolution or {}).get("level", 1),
        },
        "performance": {
            "total_trades": total,
            "win_rate": round(wins / max(total, 1) * 100, 1),
            "total_pnl": round(total_pnl, 2),
            "avg_return": round(total_pnl / max(total, 1), 2),
        },
    }
