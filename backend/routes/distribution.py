"""
Aureos AI - DISTRIBUTION ENGINE + TRADER EVOLUTION
====================================================
1. Shareable Intelligence Cards (Trade, Score, Alpha, Performance)
2. Trader Evolution Path (gamified progression with unlocks)
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os
import logging
import random
import uuid

logger = logging.getLogger("aureos")
router = APIRouter(prefix="/api/distribution", tags=["distribution-evolution"])


def get_db():
    from server import db
    return db


def _extract_user_id(request: Request) -> str:
    import jwt as pyjwt
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            secret = os.environ.get('JWT_SECRET', 'aureos_ai_secure_secret')
            payload = pyjwt.decode(auth.split(" ")[1], secret, algorithms=["HS256"])
            return payload.get("user_id", "anonymous")
        except Exception:
            pass
    return "anonymous"


# ══════════════════════════════════════════════════════════════
# 1. SHAREABLE INTELLIGENCE CARDS
# ══════════════════════════════════════════════════════════════

@router.get("/card/score")
async def generate_score_card(request: Request):
    """Generate a shareable Aureos Score card."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "full_name": 1, "created_at": 1})
    score_doc = await db.score_history.find_one({"user_id": user_id}, {"_id": 0})
    trades = await db.paper_trades.count_documents({"user_id": user_id, "status": "closed"})
    won = await db.paper_trades.count_documents({"user_id": user_id, "status": "closed", "pnl": {"$gt": 0}})

    score = (score_doc or {}).get("score", 0)
    tier = _get_tier_name(score)

    card_id = f"sc_{uuid.uuid4().hex[:10]}"
    card = {
        "card_id": card_id,
        "card_type": "score",
        "user_name": (user or {}).get("full_name", "Anonymous Trader"),
        "score": score,
        "tier": tier,
        "tier_color": _get_tier_color(tier),
        "total_trades": trades,
        "win_rate": round(won / max(trades, 1) * 100, 1),
        "member_since": (user or {}).get("created_at", ""),
        "share_url": f"/share/card/{card_id}",
        "share_text": f"My Aureos Score: {score} ({tier}) | Win Rate: {round(won / max(trades, 1) * 100, 1)}% | {trades} trades | Powered by Aureos AI",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.shared_cards.update_one(
        {"card_id": card_id}, {"$set": card}, upsert=True
    )
    return card


@router.get("/card/trade/{trade_id}")
async def generate_trade_card(trade_id: str, request: Request):
    """Generate a shareable Trade Result card."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    trade = await db.paper_trades.find_one(
        {"id": trade_id, "user_id": user_id}, {"_id": 0}
    )
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "full_name": 1})
    pnl = trade.get("pnl", 0)
    pnl_pct = trade.get("pnl_pct", 0)
    is_win = pnl > 0

    card_id = f"tc_{uuid.uuid4().hex[:10]}"
    card = {
        "card_id": card_id,
        "card_type": "trade",
        "user_name": (user or {}).get("full_name", "Anonymous"),
        "symbol": trade.get("symbol", "?"),
        "action": trade.get("action", "buy").upper(),
        "entry_price": trade.get("entry_price", 0),
        "exit_price": trade.get("exit_price", 0),
        "pnl": round(pnl, 2),
        "pnl_pct": round(pnl_pct, 2),
        "is_win": is_win,
        "quantity": trade.get("quantity", 0),
        "opened_at": trade.get("opened_at", ""),
        "closed_at": trade.get("closed_at", ""),
        "share_url": f"/share/card/{card_id}",
        "share_text": f"{'WIN' if is_win else 'LOSS'} {trade.get('symbol', '?')} {trade.get('action', 'buy').upper()} | P&L: {'+'if pnl>0 else ''}${pnl:.2f} ({'+' if pnl_pct>0 else ''}{pnl_pct:.1f}%) | Aureos AI",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.shared_cards.update_one(
        {"card_id": card_id}, {"$set": card}, upsert=True
    )
    return card


@router.get("/card/performance")
async def generate_performance_card(request: Request):
    """Generate a shareable Performance card with verified track record."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "full_name": 1})
    trades = await db.paper_trades.find(
        {"user_id": user_id, "status": "closed"}, {"_id": 0}
    ).to_list(500)

    total = len(trades)
    wins = sum(1 for t in trades if t.get("pnl", 0) > 0)
    total_pnl = sum(t.get("pnl", 0) for t in trades)
    best = max((t.get("pnl", 0) for t in trades), default=0)
    worst = min((t.get("pnl", 0) for t in trades), default=0)

    score_doc = await db.score_history.find_one({"user_id": user_id}, {"_id": 0})

    card_id = f"pc_{uuid.uuid4().hex[:10]}"
    card = {
        "card_id": card_id,
        "card_type": "performance",
        "user_name": (user or {}).get("full_name", "Anonymous"),
        "total_trades": total,
        "win_rate": round(wins / max(total, 1) * 100, 1),
        "total_pnl": round(total_pnl, 2),
        "best_trade": round(best, 2),
        "worst_trade": round(worst, 2),
        "avg_pnl": round(total_pnl / max(total, 1), 2),
        "aureos_score": (score_doc or {}).get("score", 0),
        "tier": _get_tier_name((score_doc or {}).get("score", 0)),
        "verified": True,
        "share_url": f"/share/card/{card_id}",
        "share_text": f"Verified Track Record | {total} trades | Win Rate: {round(wins / max(total, 1) * 100, 1)}% | P&L: {'+'if total_pnl>0 else ''}${total_pnl:.2f} | Aureos AI",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.shared_cards.update_one(
        {"card_id": card_id}, {"$set": card}, upsert=True
    )
    return card


@router.get("/card/alpha")
async def generate_alpha_card(request: Request):
    """Generate a shareable Alpha Detection card."""
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    db = get_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "full_name": 1})

    card_id = f"ac_{uuid.uuid4().hex[:10]}"
    card = {
        "card_id": card_id,
        "card_type": "alpha",
        "user_name": (user or {}).get("full_name", "Anonymous"),
        "title": "Alpha Detection by JARVIS",
        "description": "Top opportunities detected by Aureos AI's Alpha Radar",
        "share_url": f"/share/card/{card_id}",
        "share_text": "JARVIS just detected high-probability alpha opportunities | Powered by Aureos AI's Alpha Radar",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.shared_cards.update_one(
        {"card_id": card_id}, {"$set": card}, upsert=True
    )
    return card


@router.get("/card/{card_id}")
async def get_shared_card(card_id: str):
    """Retrieve a shared card by ID (public endpoint)."""
    db = get_db()
    card = await db.shared_cards.find_one({"card_id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


# ══════════════════════════════════════════════════════════════
# 2. TRADER EVOLUTION PATH
# ══════════════════════════════════════════════════════════════

EVOLUTION_LEVELS = [
    {
        "level": 1, "name": "Novice", "tier": "Beginner",
        "min_score": 0, "min_trades": 0,
        "color": "#888", "icon": "seedling",
        "description": "Starting your trading journey",
        "unlocks": ["Paper Trading", "Basic Watchlist", "Market Pulse"],
    },
    {
        "level": 2, "name": "Apprentice", "tier": "Beginner",
        "min_score": 100, "min_trades": 5,
        "color": "#FF9800", "icon": "flame",
        "description": "Learning the fundamentals",
        "unlocks": ["JARVIS Copilot", "Signal Timeline", "Sentiment Analysis"],
    },
    {
        "level": 3, "name": "Trader", "tier": "Intermediate",
        "min_score": 300, "min_trades": 15,
        "color": "#00B4FF", "icon": "trending-up",
        "description": "Building consistent habits",
        "unlocks": ["Deep Analysis", "Market Scanner", "Decision Replay", "Weekly Digest"],
    },
    {
        "level": 4, "name": "Strategist", "tier": "Intermediate",
        "min_score": 450, "min_trades": 30,
        "color": "#9C27B0", "icon": "brain",
        "description": "Developing your own edge",
        "unlocks": ["Trader DNA", "Trade Simulator", "Strategy Marketplace", "Capital Flow"],
    },
    {
        "level": 5, "name": "Operator", "tier": "Advanced",
        "min_score": 600, "min_trades": 50,
        "color": "#00E676", "icon": "shield",
        "description": "Executing with precision",
        "unlocks": ["JARVIS Challenge Mode", "Alpha Radar", "Market Narrative", "Global Intelligence"],
    },
    {
        "level": 6, "name": "Quantitative", "tier": "Advanced",
        "min_score": 750, "min_trades": 75,
        "color": "#00BCD4", "icon": "activity",
        "description": "Mastering quantitative analysis",
        "unlocks": ["AI Quantica Lab", "Opportunity Scanner", "Strategy Creator", "Advanced Signals"],
    },
    {
        "level": 7, "name": "Elite", "tier": "Elite",
        "min_score": 850, "min_trades": 100,
        "color": "#CFAE46", "icon": "crown",
        "description": "Among the best on the platform",
        "unlocks": ["Shareable Performance Cards", "Public Profile", "Premium Signal Access", "Copy Trading"],
    },
    {
        "level": 8, "name": "Legendary", "tier": "Elite",
        "min_score": 950, "min_trades": 200,
        "color": "#FFD700", "icon": "star",
        "description": "A trading legend",
        "unlocks": ["Strategy Monetization", "Priority JARVIS", "Custom Indicators", "Hedge Fund Tools"],
    },
]


@router.get("/evolution")
async def get_evolution_path(request: Request):
    """Get the user's current evolution level and progression."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    score_doc = await db.score_history.find_one({"user_id": user_id}, {"_id": 0})
    score = (score_doc or {}).get("score", 0)
    trades = await db.paper_trades.count_documents({"user_id": user_id, "status": "closed"})
    total_trades = await db.paper_trades.count_documents({"user_id": user_id})

    # Determine current level
    current_level = EVOLUTION_LEVELS[0]
    for lvl in EVOLUTION_LEVELS:
        if score >= lvl["min_score"] and (total_trades + trades) >= lvl["min_trades"]:
            current_level = lvl
        else:
            break

    # Next level
    next_level = None
    for lvl in EVOLUTION_LEVELS:
        if lvl["level"] > current_level["level"]:
            next_level = lvl
            break

    # Progress to next level
    progress = 100
    if next_level:
        score_progress = min(100, (score - current_level["min_score"]) / max(next_level["min_score"] - current_level["min_score"], 1) * 100)
        trade_progress = min(100, ((total_trades + trades) - current_level["min_trades"]) / max(next_level["min_trades"] - current_level["min_trades"], 1) * 100)
        progress = round((score_progress + trade_progress) / 2, 1)

    # All unlocked features
    unlocked = []
    for lvl in EVOLUTION_LEVELS:
        if lvl["level"] <= current_level["level"]:
            unlocked.extend(lvl["unlocks"])

    # Build levels with locked/unlocked status
    levels_with_status = []
    for lvl in EVOLUTION_LEVELS:
        levels_with_status.append({
            **lvl,
            "is_current": lvl["level"] == current_level["level"],
            "is_unlocked": lvl["level"] <= current_level["level"],
            "is_locked": lvl["level"] > current_level["level"],
        })

    return {
        "current_level": current_level,
        "next_level": next_level,
        "progress_to_next": progress,
        "score": score,
        "total_trades": total_trades + trades,
        "unlocked_features": unlocked,
        "all_levels": levels_with_status,
    }


def _get_tier_name(score):
    if score >= 801:
        return "Elite"
    elif score >= 601:
        return "Advanced"
    elif score >= 301:
        return "Intermediate"
    return "Beginner"


def _get_tier_color(tier):
    return {"Elite": "#CFAE46", "Advanced": "#00B4FF", "Intermediate": "#FF9800", "Beginner": "#FF5252"}.get(tier, "#888")
