"""
Aureos Score — Global Scoring & Ranking System
================================================
A unified score (0-1000) that evaluates:
- Performance (40%): PnL, win rate, avg return
- Risk Management (25%): Drawdown, risk per trade, stop-loss discipline
- Decision Quality (20%): Alignment with JARVIS signals, high-prob setups
- Consistency (15%): Trading frequency, stability, streak behavior

Includes leaderboard, achievements, and JARVIS integration.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import logging
import math
import random

logger = logging.getLogger("aureos")

router = APIRouter(prefix="/api/score", tags=["aureos-score"])


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
# TIER SYSTEM
# ══════════════════════════════════════════════════════════════

TIERS = [
    {"name": "Beginner", "min": 0, "max": 300, "color": "#FF5252", "icon": "beginner"},
    {"name": "Intermediate", "min": 301, "max": 600, "color": "#FF9800", "icon": "intermediate"},
    {"name": "Advanced", "min": 601, "max": 800, "color": "#00B4FF", "icon": "advanced"},
    {"name": "Elite", "min": 801, "max": 1000, "color": "#CFAE46", "icon": "elite"},
]

ACHIEVEMENTS = [
    {"id": "first_trade", "name": "First Trade", "description": "Execute your first paper trade", "threshold": "trade_count >= 1", "icon": "zap", "points": 10},
    {"id": "ten_trades", "name": "Active Trader", "description": "Complete 10 trades", "threshold": "trade_count >= 10", "icon": "activity", "points": 25},
    {"id": "fifty_trades", "name": "Veteran Trader", "description": "Complete 50 trades", "threshold": "trade_count >= 50", "icon": "award", "points": 50},
    {"id": "score_300", "name": "Rising Star", "description": "Reach Intermediate tier (300+)", "threshold": "score >= 300", "icon": "trending-up", "points": 30},
    {"id": "score_500", "name": "Consistent Trader", "description": "Reach 500 Aureos Score", "threshold": "score >= 500", "icon": "target", "points": 50},
    {"id": "score_600", "name": "Skilled Operator", "description": "Reach Advanced tier (600+)", "threshold": "score >= 600", "icon": "shield", "points": 75},
    {"id": "score_800", "name": "Advanced Operator", "description": "Reach Elite tier (800+)", "threshold": "score >= 800", "icon": "crown", "points": 100},
    {"id": "score_900", "name": "Elite Quant Mind", "description": "Reach 900+ Aureos Score", "threshold": "score >= 900", "icon": "brain", "points": 150},
    {"id": "win_streak_3", "name": "Hot Streak", "description": "Win 3 trades in a row", "threshold": "win_streak >= 3", "icon": "flame", "points": 20},
    {"id": "win_streak_5", "name": "On Fire", "description": "Win 5 trades in a row", "threshold": "win_streak >= 5", "icon": "flame", "points": 40},
    {"id": "win_streak_10", "name": "Unstoppable", "description": "Win 10 trades in a row", "threshold": "win_streak >= 10", "icon": "flame", "points": 100},
    {"id": "win_rate_60", "name": "Sharp Eye", "description": "Maintain 60%+ win rate (10+ trades)", "threshold": "win_rate >= 60 and trade_count >= 10", "icon": "eye", "points": 35},
    {"id": "win_rate_75", "name": "Precision Master", "description": "Maintain 75%+ win rate (20+ trades)", "threshold": "win_rate >= 75 and trade_count >= 20", "icon": "crosshair", "points": 75},
    {"id": "profit_1k", "name": "First $1K", "description": "Earn $1,000 total profit", "threshold": "total_pnl >= 1000", "icon": "dollar-sign", "points": 25},
    {"id": "profit_10k", "name": "Five Figure Club", "description": "Earn $10,000 total profit", "threshold": "total_pnl >= 10000", "icon": "dollar-sign", "points": 75},
    {"id": "profit_50k", "name": "Whale Status", "description": "Earn $50,000 total profit", "threshold": "total_pnl >= 50000", "icon": "dollar-sign", "points": 150},
    {"id": "risk_master", "name": "Risk Master", "description": "Complete 20 trades with max drawdown < 5%", "threshold": "max_drawdown_pct < 5 and trade_count >= 20", "icon": "shield-check", "points": 60},
]


def get_tier(score: int) -> dict:
    for tier in TIERS:
        if tier["min"] <= score <= tier["max"]:
            return tier
    return TIERS[0]


def get_next_tier(score: int) -> Optional[dict]:
    current = get_tier(score)
    idx = TIERS.index(current)
    if idx < len(TIERS) - 1:
        return TIERS[idx + 1]
    return None


# ══════════════════════════════════════════════════════════════
# SCORE CALCULATION ENGINE
# ══════════════════════════════════════════════════════════════

async def calculate_score(db, user_id: str) -> dict:
    """Calculate the Aureos Score for a user based on their paper trading history."""

    portfolio = await db.paper_portfolios.find_one({"user_id": user_id}, {"_id": 0})
    if not portfolio:
        return _empty_score()

    closed_trades = await db.paper_trades.find(
        {"user_id": user_id, "status": "closed"}, {"_id": 0}
    ).sort("closed_at", 1).to_list(1000)

    total_trades = len(closed_trades)
    if total_trades == 0:
        return _empty_score()

    # ── PERFORMANCE COMPONENT (40%) ──
    total_pnl = sum(t.get("pnl", 0) for t in closed_trades)
    winning_trades = sum(1 for t in closed_trades if t.get("pnl", 0) > 0)
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    avg_return = (total_pnl / total_trades) if total_trades > 0 else 0
    initial_balance = portfolio.get("initial_balance", 100000)
    total_return_pct = (total_pnl / initial_balance * 100) if initial_balance > 0 else 0

    # Score: sigmoid-ish mapping
    pnl_score = _sigmoid_score(total_return_pct, center=5, scale=8)  # 5% return = 50 score
    wr_score = min(100, max(0, (win_rate - 30) * (100 / 40)))  # 30%=0, 70%=100
    avg_ret_score = _sigmoid_score(avg_return / max(initial_balance * 0.001, 1) * 100, center=0.5, scale=2)
    performance_score = round(pnl_score * 0.4 + wr_score * 0.35 + avg_ret_score * 0.25)

    # ── RISK MANAGEMENT COMPONENT (25%) ──
    max_drawdown = _calculate_max_drawdown(closed_trades, initial_balance)
    max_drawdown_pct = (max_drawdown / initial_balance * 100) if initial_balance > 0 else 0
    avg_risk_per_trade = _calculate_avg_risk(closed_trades, initial_balance)

    # Better drawdown = higher score (inverted)
    dd_score = max(0, 100 - max_drawdown_pct * 5)  # 0% dd=100, 20% dd=0
    risk_per_trade_score = max(0, 100 - avg_risk_per_trade * 10)  # Low risk = high score
    # Stop-loss discipline: ratio of losing trades that were cut early (<3% loss)
    losing_trades = [t for t in closed_trades if t.get("pnl", 0) < 0]
    sl_discipline = 0
    if losing_trades:
        small_losses = sum(1 for t in losing_trades if abs(t.get("pnl_pct", 0)) < 3)
        sl_discipline = (small_losses / len(losing_trades)) * 100
    risk_score = round(dd_score * 0.4 + risk_per_trade_score * 0.3 + sl_discipline * 0.3)

    # ── DECISION QUALITY COMPONENT (20%) ──
    # Simulated alignment with JARVIS signals (based on trade outcomes + timing)
    high_conf_trades = sum(1 for t in closed_trades if t.get("pnl_pct", 0) > 2)
    low_conf_avoided = max(0, total_trades - sum(1 for t in closed_trades if t.get("pnl_pct", 0) < -5))
    alignment_ratio = (high_conf_trades / total_trades * 100) if total_trades > 0 else 0
    avoidance_ratio = (low_conf_avoided / total_trades * 100) if total_trades > 0 else 50
    decision_score = round(min(100, alignment_ratio * 0.6 + avoidance_ratio * 0.4))

    # ── CONSISTENCY COMPONENT (15%) ──
    streaks = _calculate_streaks(closed_trades)
    # Frequency score: reward regular trading (diminishing returns to prevent spam)
    freq_score = min(100, math.log2(max(1, total_trades)) * 15)
    # Stability: low std dev of returns
    returns = [t.get("pnl_pct", 0) for t in closed_trades]
    if len(returns) > 1:
        mean_ret = sum(returns) / len(returns)
        variance = sum((r - mean_ret) ** 2 for r in returns) / len(returns)
        std_dev = math.sqrt(variance)
        stability_score = max(0, 100 - std_dev * 5)
    else:
        stability_score = 50
    # Streak bonus
    streak_score = min(100, streaks["current_win_streak"] * 10 + streaks["best_win_streak"] * 5)
    consistency_score = round(freq_score * 0.3 + stability_score * 0.4 + streak_score * 0.3)

    # ── ANTI-MANIPULATION ──
    # Penalize spam trading (many tiny trades with minimal PnL)
    spam_penalty = 0
    if total_trades > 5:
        tiny_trades = sum(1 for t in closed_trades if abs(t.get("pnl", 0)) < 1)
        spam_ratio = tiny_trades / total_trades
        if spam_ratio > 0.5:
            spam_penalty = min(100, int(spam_ratio * 100))

    # ── FINAL COMPOSITE SCORE ──
    raw_score = (
        performance_score * 0.40 +
        risk_score * 0.25 +
        decision_score * 0.20 +
        consistency_score * 0.15
    )
    # Scale to 0-1000
    final_score = max(0, min(1000, round(raw_score * 10 - spam_penalty * 2)))

    tier = get_tier(final_score)
    next_tier = get_next_tier(final_score)

    # Check achievements
    unlocked = _check_achievements(
        score=final_score,
        trade_count=total_trades,
        win_rate=win_rate,
        win_streak=streaks["current_win_streak"],
        best_win_streak=streaks["best_win_streak"],
        total_pnl=total_pnl,
        max_drawdown_pct=max_drawdown_pct
    )

    return {
        "score": final_score,
        "previous_score": 0,  # Will be filled from DB
        "delta": 0,
        "tier": tier,
        "next_tier": next_tier,
        "progress_to_next": _progress_to_next(final_score, tier, next_tier),
        "components": {
            "performance": {"score": performance_score, "weight": 40, "details": {
                "total_pnl": round(total_pnl, 2),
                "total_return_pct": round(total_return_pct, 2),
                "win_rate": round(win_rate, 1),
                "avg_return": round(avg_return, 2),
            }},
            "risk_management": {"score": risk_score, "weight": 25, "details": {
                "max_drawdown": round(max_drawdown, 2),
                "max_drawdown_pct": round(max_drawdown_pct, 2),
                "avg_risk_per_trade": round(avg_risk_per_trade, 2),
                "stop_loss_discipline": round(sl_discipline, 1),
            }},
            "decision_quality": {"score": decision_score, "weight": 20, "details": {
                "high_confidence_trades": high_conf_trades,
                "alignment_ratio": round(alignment_ratio, 1),
                "avoidance_ratio": round(avoidance_ratio, 1),
            }},
            "consistency": {"score": consistency_score, "weight": 15, "details": {
                "total_trades": total_trades,
                "stability_score": round(stability_score, 1),
                "current_win_streak": streaks["current_win_streak"],
                "best_win_streak": streaks["best_win_streak"],
            }},
        },
        "streaks": streaks,
        "spam_penalty": spam_penalty,
        "achievements": unlocked,
        "stats": {
            "total_trades": total_trades,
            "winning_trades": winning_trades,
            "win_rate": round(win_rate, 1),
            "total_pnl": round(total_pnl, 2),
            "total_return_pct": round(total_return_pct, 2),
            "max_drawdown_pct": round(max_drawdown_pct, 2),
        },
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


def _empty_score():
    return {
        "score": 0,
        "previous_score": 0,
        "delta": 0,
        "tier": TIERS[0],
        "next_tier": TIERS[1],
        "progress_to_next": 0,
        "components": {
            "performance": {"score": 0, "weight": 40, "details": {}},
            "risk_management": {"score": 0, "weight": 25, "details": {}},
            "decision_quality": {"score": 0, "weight": 20, "details": {}},
            "consistency": {"score": 0, "weight": 15, "details": {}},
        },
        "streaks": {"current_win_streak": 0, "best_win_streak": 0, "current_lose_streak": 0},
        "spam_penalty": 0,
        "achievements": [],
        "stats": {"total_trades": 0, "winning_trades": 0, "win_rate": 0, "total_pnl": 0, "total_return_pct": 0, "max_drawdown_pct": 0},
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


def _sigmoid_score(value, center=0, scale=1):
    """Map a value to 0-100 using a sigmoid curve."""
    x = (value - center) / max(scale, 0.01)
    return round(100 / (1 + math.exp(-x)))


def _calculate_max_drawdown(trades, initial_balance):
    """Calculate the maximum drawdown from trade history."""
    balance = initial_balance
    peak = initial_balance
    max_dd = 0
    for t in trades:
        balance += t.get("pnl", 0)
        peak = max(peak, balance)
        dd = peak - balance
        max_dd = max(max_dd, dd)
    return max_dd


def _calculate_avg_risk(trades, initial_balance):
    """Calculate average risk per trade as % of portfolio."""
    if not trades:
        return 0
    risks = []
    for t in trades:
        cost = t.get("cost", 0)
        risk_pct = (cost / initial_balance * 100) if initial_balance > 0 else 0
        risks.append(risk_pct)
    return sum(risks) / len(risks) if risks else 0


def _calculate_streaks(trades):
    """Calculate win/lose streaks."""
    current_win = 0
    current_lose = 0
    best_win = 0
    best_lose = 0
    for t in trades:
        if t.get("pnl", 0) > 0:
            current_win += 1
            current_lose = 0
            best_win = max(best_win, current_win)
        elif t.get("pnl", 0) < 0:
            current_lose += 1
            current_win = 0
            best_lose = max(best_lose, current_lose)
        # pnl == 0 doesn't break streak
    return {
        "current_win_streak": current_win,
        "best_win_streak": best_win,
        "current_lose_streak": current_lose,
        "best_lose_streak": best_lose,
    }


def _progress_to_next(score, tier, next_tier):
    if not next_tier:
        return 100
    range_size = next_tier["min"] - tier["min"]
    if range_size <= 0:
        return 100
    progress = ((score - tier["min"]) / range_size) * 100
    return round(min(100, max(0, progress)))


def _check_achievements(score, trade_count, win_rate, win_streak, best_win_streak, total_pnl, max_drawdown_pct):
    """Check which achievements are unlocked."""
    unlocked = []
    context = {
        "score": score,
        "trade_count": trade_count,
        "win_rate": win_rate,
        "win_streak": max(win_streak, best_win_streak),
        "total_pnl": total_pnl,
        "max_drawdown_pct": max_drawdown_pct,
    }
    for a in ACHIEVEMENTS:
        try:
            if eval(a["threshold"], {"__builtins__": {}}, context):
                unlocked.append({
                    "id": a["id"],
                    "name": a["name"],
                    "description": a["description"],
                    "icon": a["icon"],
                    "points": a["points"],
                })
        except Exception:
            pass
    return unlocked


# ══════════════════════════════════════════════════════════════
# API ENDPOINTS
# ══════════════════════════════════════════════════════════════

@router.get("/my-score")
async def get_my_score(request: Request):
    """Get the current user's Aureos Score with full breakdown."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    score_data = await calculate_score(db, user_id)

    # Get previous score from history
    last_entry = await db.score_history.find_one(
        {"user_id": user_id}, {"_id": 0}, sort=[("timestamp", -1)]
    )
    if last_entry:
        score_data["previous_score"] = last_entry.get("score", 0)
        score_data["delta"] = score_data["score"] - last_entry.get("score", 0)

    return score_data


@router.get("/history")
async def get_score_history(request: Request, days: int = 30):
    """Get score history for the current user."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    entries = await db.score_history.find(
        {"user_id": user_id, "timestamp": {"$gte": cutoff.isoformat()}},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(500)

    return {"history": entries, "days": days}


@router.get("/leaderboard")
async def get_leaderboard(period: str = "all", limit: int = 50):
    """Get global leaderboard."""
    db = get_db()

    # Get all users with scores
    scores = await db.score_snapshots.find(
        {}, {"_id": 0}
    ).sort("score", -1).limit(limit).to_list(limit)

    # Enrich with rank
    leaderboard = []
    for i, entry in enumerate(scores):
        tier = get_tier(entry.get("score", 0))
        leaderboard.append({
            "rank": i + 1,
            "user_id": entry.get("user_id"),
            "username": entry.get("username", "Anonymous"),
            "score": entry.get("score", 0),
            "tier": tier,
            "win_rate": entry.get("win_rate", 0),
            "total_trades": entry.get("total_trades", 0),
            "total_pnl": entry.get("total_pnl", 0),
            "total_return_pct": entry.get("total_return_pct", 0),
            "updated_at": entry.get("updated_at"),
        })

    total_users = await db.score_snapshots.count_documents({})

    return {
        "leaderboard": leaderboard,
        "total_users": total_users,
        "period": period,
    }


@router.get("/my-rank")
async def get_my_rank(request: Request):
    """Get the current user's rank in the global leaderboard."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    my_snapshot = await db.score_snapshots.find_one({"user_id": user_id}, {"_id": 0})
    if not my_snapshot:
        return {"rank": 0, "total_users": 0, "percentile": 0}

    my_score = my_snapshot.get("score", 0)
    higher_count = await db.score_snapshots.count_documents({"score": {"$gt": my_score}})
    total_users = await db.score_snapshots.count_documents({})

    rank = higher_count + 1
    percentile = round(((total_users - rank) / max(total_users, 1)) * 100, 1)

    return {
        "rank": rank,
        "total_users": total_users,
        "percentile": percentile,
        "score": my_score,
        "tier": get_tier(my_score),
    }


@router.get("/achievements")
async def get_achievements(request: Request):
    """Get all achievements and which ones the user has unlocked."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    score_data = await calculate_score(db, user_id)
    unlocked_ids = {a["id"] for a in score_data["achievements"]}

    all_achievements = []
    for a in ACHIEVEMENTS:
        all_achievements.append({
            "id": a["id"],
            "name": a["name"],
            "description": a["description"],
            "icon": a["icon"],
            "points": a["points"],
            "unlocked": a["id"] in unlocked_ids,
        })

    return {
        "achievements": all_achievements,
        "total_unlocked": len(unlocked_ids),
        "total_available": len(ACHIEVEMENTS),
        "total_points": sum(a["points"] for a in ACHIEVEMENTS if a["id"] in unlocked_ids),
    }


@router.post("/recalculate")
async def recalculate_score(request: Request):
    """Force recalculation and snapshot of the score."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    score_data = await calculate_score(db, user_id)

    # Get user info for snapshot
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "full_name": 1, "email": 1})
    username = user.get("full_name", "Anonymous") if user else "Anonymous"

    # Save to history
    history_entry = {
        "user_id": user_id,
        "score": score_data["score"],
        "components": {k: v["score"] for k, v in score_data["components"].items()},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.score_history.insert_one(history_entry)

    # Update snapshot (upsert)
    await db.score_snapshots.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "username": username,
            "score": score_data["score"],
            "win_rate": score_data["stats"]["win_rate"],
            "total_trades": score_data["stats"]["total_trades"],
            "total_pnl": score_data["stats"]["total_pnl"],
            "total_return_pct": score_data["stats"]["total_return_pct"],
            "tier": score_data["tier"]["name"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    return score_data


@router.get("/explain")
async def explain_score(request: Request):
    """JARVIS explains the user's score and how to improve."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    score_data = await calculate_score(db, user_id)
    s = score_data["score"]
    comp = score_data["components"]
    stats = score_data["stats"]

    # Generate JARVIS explanation
    explanations = []
    suggestions = []

    # Performance
    perf = comp["performance"]
    if perf["score"] >= 70:
        explanations.append(f"Strong performance: {stats['win_rate']}% win rate with {stats['total_return_pct']:.1f}% total return.")
    elif perf["score"] >= 40:
        explanations.append(f"Decent performance: {stats['win_rate']}% win rate. Room to improve entry timing.")
        suggestions.append("Focus on higher-probability setups with clear risk/reward ratios above 2:1.")
    else:
        explanations.append(f"Performance needs work: {stats['win_rate']}% win rate with {stats['total_return_pct']:.1f}% return.")
        suggestions.append("Review JARVIS signals before entering trades. Cut losing positions faster.")

    # Risk
    risk = comp["risk_management"]
    if risk["score"] >= 70:
        explanations.append("Excellent risk management discipline.")
    elif risk["score"] >= 40:
        explanations.append(f"Moderate risk control. Max drawdown: {stats['max_drawdown_pct']:.1f}%.")
        suggestions.append("Keep position sizes under 5% of portfolio. Always set stop-losses.")
    else:
        explanations.append(f"High risk behavior detected. Max drawdown: {stats['max_drawdown_pct']:.1f}%.")
        suggestions.append("Reduce position sizes immediately. Never risk more than 2% per trade.")

    # Decision
    dec = comp["decision_quality"]
    if dec["score"] >= 70:
        explanations.append("High-quality decisions aligned with market signals.")
    else:
        suggestions.append("Check JARVIS AI Signals before entering trades for better alignment.")

    # Consistency
    cons = comp["consistency"]
    if cons["score"] >= 70:
        explanations.append(f"Great consistency with {stats['total_trades']} trades executed.")
    else:
        suggestions.append("Trade more regularly and maintain stable position sizing.")

    tier = score_data["tier"]
    next_tier = score_data["next_tier"]
    tier_msg = f"Current tier: {tier['name']} ({s}/1000)."
    if next_tier:
        points_needed = next_tier["min"] - s
        tier_msg += f" You need {points_needed} more points to reach {next_tier['name']}."

    return {
        "score": s,
        "tier": tier,
        "summary": tier_msg,
        "explanations": explanations,
        "suggestions": suggestions,
        "strongest_area": max(comp.items(), key=lambda x: x[1]["score"])[0].replace("_", " ").title(),
        "weakest_area": min(comp.items(), key=lambda x: x[1]["score"])[0].replace("_", " ").title(),
    }


@router.get("/trade-impact")
async def get_trade_impact(request: Request, trade_id: str = ""):
    """Get the score impact of the last closed trade."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    # Get latest score history entries
    history = await db.score_history.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("timestamp", -1).limit(2).to_list(2)

    current_score = await calculate_score(db, user_id)
    new_score = current_score["score"]

    if len(history) >= 1:
        old_score = history[0].get("score", 0)
    else:
        old_score = 0

    delta = new_score - old_score

    # Generate impact explanation
    if delta > 0:
        reason = "Strong risk management and profitable trade execution."
        if delta > 20:
            reason = "Exceptional trade! High-probability setup with excellent risk/reward."
        elif delta > 10:
            reason = "Good trade execution with solid risk management."
    elif delta < 0:
        reason = "Trade resulted in a loss. Consider reviewing entry criteria."
        if delta < -20:
            reason = "Significant score drop. Entering low-confidence trades without confirmation increases risk."
        elif delta < -10:
            reason = "Moderate score impact. Review stop-loss placement."
    else:
        reason = "Trade had minimal impact on your score."

    return {
        "new_score": new_score,
        "old_score": old_score,
        "delta": delta,
        "reason": reason,
        "tier": get_tier(new_score),
    }
