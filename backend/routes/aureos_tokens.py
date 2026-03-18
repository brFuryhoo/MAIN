"""
Aureos Token System — Internal Reward Economy
================================================
Earn tokens by:
- Trading (closing paper trades)
- Aureos Score milestones
- Achievements unlocked
- Weekly Challenge wins
- Daily login streaks

Spend tokens on:
- Unlock premium signals
- Unlock JARVIS deep insights
- Redeem for PRO/ELITE subscription time
- Future: withdraw to private wallet
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os
import logging
import uuid

logger = logging.getLogger("aureos")
router = APIRouter(prefix="/api/tokens", tags=["aureos-tokens"])


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
# TOKEN EARNING RULES
# ══════════════════════════════════════════════════════════════

EARNING_RULES = {
    "trade_close": {"base": 5, "description": "Close a paper trade"},
    "trade_win": {"base": 10, "description": "Close a winning trade"},
    "trade_big_win": {"base": 25, "description": "Close a trade with >5% profit"},
    "score_milestone_300": {"base": 100, "description": "Reach Intermediate tier (300+)"},
    "score_milestone_500": {"base": 200, "description": "Reach 500 Aureos Score"},
    "score_milestone_600": {"base": 300, "description": "Reach Advanced tier (600+)"},
    "score_milestone_800": {"base": 500, "description": "Reach Elite tier (800+)"},
    "score_milestone_900": {"base": 750, "description": "Reach 900+ Aureos Score"},
    "achievement_unlock": {"base": 15, "description": "Unlock an achievement"},
    "weekly_challenge_top3": {"base": 200, "description": "Finish top 3 in Weekly Challenge"},
    "weekly_challenge_winner": {"base": 500, "description": "Win the Weekly Challenge"},
    "daily_login": {"base": 3, "description": "Daily login bonus"},
    "login_streak_7": {"base": 25, "description": "7-day login streak"},
    "login_streak_30": {"base": 100, "description": "30-day login streak"},
    "first_analysis": {"base": 10, "description": "Run your first AI analysis"},
    "use_jarvis_copilot": {"base": 5, "description": "Interact with JARVIS Copilot"},
}

# ══════════════════════════════════════════════════════════════
# TOKEN SPENDING RULES
# ══════════════════════════════════════════════════════════════

SPENDING_OPTIONS = [
    {"id": "unlock_signal", "name": "Unlock Premium Signal", "cost": 50, "description": "Unlock one locked high-confidence signal", "category": "signals"},
    {"id": "jarvis_deep_insight", "name": "JARVIS Deep Insight", "cost": 75, "description": "Get JARVIS deep analysis on any asset", "category": "insights"},
    {"id": "why_trade_analysis", "name": "Why This Trade?", "cost": 30, "description": "Unlock AI trade explanation for any signal", "category": "insights"},
    {"id": "decision_replay", "name": "Decision Replay", "cost": 40, "description": "AI analysis of a closed trade", "category": "learning"},
    {"id": "pro_1day", "name": "PRO Access (1 day)", "cost": 200, "description": "24h of PRO tier features", "category": "subscription"},
    {"id": "pro_7days", "name": "PRO Access (7 days)", "cost": 1000, "description": "7 days of PRO tier features", "category": "subscription"},
    {"id": "elite_badge", "name": "Elite Visual Badge", "cost": 500, "description": "Exclusive profile badge displayed on leaderboard", "category": "cosmetic"},
    {"id": "custom_avatar", "name": "Custom Avatar Border", "cost": 300, "description": "Gold animated avatar border", "category": "cosmetic"},
]


# ══════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════

@router.get("/balance")
async def get_token_balance(request: Request):
    """Get user's Aureos Token balance and recent transactions."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    wallet = await db.token_wallets.find_one({"user_id": user_id}, {"_id": 0})
    if not wallet:
        wallet = {
            "user_id": user_id,
            "balance": 0,
            "total_earned": 0,
            "total_spent": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.token_wallets.insert_one(wallet)
        wallet.pop("_id", None)

    # Recent transactions
    recent = await db.token_transactions.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(20)

    return {
        "balance": wallet.get("balance", 0),
        "total_earned": wallet.get("total_earned", 0),
        "total_spent": wallet.get("total_spent", 0),
        "recent_transactions": recent,
    }


@router.get("/earning-rules")
async def get_earning_rules():
    """Get all ways to earn Aureos Tokens."""
    rules = []
    for rule_id, rule in EARNING_RULES.items():
        rules.append({
            "id": rule_id,
            "tokens": rule["base"],
            "description": rule["description"],
        })
    return {"rules": rules}


@router.get("/store")
async def get_token_store(request: Request):
    """Get all items available to purchase with Aureos Tokens."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    wallet = await db.token_wallets.find_one({"user_id": user_id}, {"_id": 0})
    balance = (wallet or {}).get("balance", 0)

    items = []
    for item in SPENDING_OPTIONS:
        items.append({
            **item,
            "can_afford": balance >= item["cost"],
        })

    return {
        "items": items,
        "balance": balance,
    }


class SpendRequest(BaseModel):
    item_id: str
    context: Optional[str] = ""  # e.g. signal symbol for unlock_signal


@router.post("/spend")
async def spend_tokens(data: SpendRequest, request: Request):
    """Spend Aureos Tokens on a store item."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    item = next((i for i in SPENDING_OPTIONS if i["id"] == data.item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    wallet = await db.token_wallets.find_one({"user_id": user_id}, {"_id": 0})
    balance = (wallet or {}).get("balance", 0)

    if balance < item["cost"]:
        raise HTTPException(status_code=400, detail=f"Insufficient tokens. Need {item['cost']}, have {balance}")

    # Deduct tokens
    await db.token_wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"balance": -item["cost"], "total_spent": item["cost"]}}
    )

    # Record transaction
    txn = {
        "id": f"txn_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": "spend",
        "amount": -item["cost"],
        "item_id": data.item_id,
        "item_name": item["name"],
        "context": data.context,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.token_transactions.insert_one(txn)

    new_balance = balance - item["cost"]
    return {
        "success": True,
        "item": item["name"],
        "cost": item["cost"],
        "new_balance": new_balance,
        "transaction_id": txn["id"],
    }


@router.post("/earn")
async def earn_tokens_endpoint(request: Request):
    """Internal endpoint to grant tokens (called by other services)."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    body = await request.json()
    reason = body.get("reason", "")
    custom_amount = body.get("amount", 0)

    rule = EARNING_RULES.get(reason)
    amount = custom_amount if custom_amount > 0 else (rule["base"] if rule else 0)

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid earning reason")

    # Ensure wallet exists
    wallet = await db.token_wallets.find_one({"user_id": user_id})
    if not wallet:
        await db.token_wallets.insert_one({
            "user_id": user_id, "balance": 0, "total_earned": 0, "total_spent": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Add tokens
    await db.token_wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"balance": amount, "total_earned": amount}}
    )

    # Record transaction
    txn = {
        "id": f"txn_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": "earn",
        "amount": amount,
        "reason": reason,
        "description": rule["description"] if rule else body.get("description", "Bonus"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.token_transactions.insert_one(txn)

    updated = await db.token_wallets.find_one({"user_id": user_id}, {"_id": 0})

    return {
        "success": True,
        "earned": amount,
        "reason": rule["description"] if rule else "Bonus",
        "new_balance": updated.get("balance", 0),
        "transaction_id": txn["id"],
    }


@router.get("/history")
async def get_token_history(request: Request, limit: int = 50):
    """Get full token transaction history."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    transactions = await db.token_transactions.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)

    return {"transactions": transactions, "total": len(transactions)}


@router.post("/daily-login")
async def claim_daily_login(request: Request):
    """Claim daily login bonus tokens."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.token_transactions.find_one({
        "user_id": user_id, "reason": "daily_login",
        "timestamp": {"$regex": f"^{today}"}
    })

    if existing:
        return {"success": False, "message": "Already claimed today", "balance": 0}

    # Check login streak
    streak = await _get_login_streak(db, user_id)
    bonus = EARNING_RULES["daily_login"]["base"]

    # Streak bonuses
    streak_bonus_reason = None
    if streak + 1 >= 30:
        bonus += EARNING_RULES["login_streak_30"]["base"]
        streak_bonus_reason = "login_streak_30"
    elif streak + 1 >= 7:
        bonus += EARNING_RULES["login_streak_7"]["base"]
        streak_bonus_reason = "login_streak_7"

    # Grant tokens
    await db.token_wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"balance": bonus, "total_earned": bonus}},
        upsert=True
    )

    txn = {
        "id": f"txn_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": "earn",
        "amount": bonus,
        "reason": "daily_login",
        "description": f"Daily login (streak: {streak + 1} days)",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.token_transactions.insert_one(txn)

    wallet = await db.token_wallets.find_one({"user_id": user_id}, {"_id": 0})

    return {
        "success": True,
        "earned": bonus,
        "streak": streak + 1,
        "streak_bonus": streak_bonus_reason,
        "new_balance": wallet.get("balance", 0),
    }


async def _get_login_streak(db, user_id: str) -> int:
    """Calculate consecutive daily login streak."""
    txns = await db.token_transactions.find(
        {"user_id": user_id, "reason": "daily_login"},
        {"_id": 0, "timestamp": 1}
    ).sort("timestamp", -1).limit(60).to_list(60)

    if not txns:
        return 0

    streak = 0
    for i, txn in enumerate(txns):
        expected_date = (datetime.now(timezone.utc) - timedelta(days=i + 1)).strftime("%Y-%m-%d")
        txn_date = txn.get("timestamp", "")[:10]
        if txn_date == expected_date:
            streak += 1
        else:
            break
    return streak


# ══════════════════════════════════════════════════════════════
# HELPER: Grant tokens from other services
# ══════════════════════════════════════════════════════════════

async def grant_tokens(user_id: str, reason: str, custom_amount: int = 0):
    """Helper function to grant tokens from other route handlers."""
    db = get_db()
    rule = EARNING_RULES.get(reason)
    amount = custom_amount if custom_amount > 0 else (rule["base"] if rule else 0)
    if amount <= 0:
        return

    await db.token_wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"balance": amount, "total_earned": amount}},
        upsert=True
    )

    await db.token_transactions.insert_one({
        "id": f"txn_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": "earn",
        "amount": amount,
        "reason": reason,
        "description": rule["description"] if rule else "Bonus",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


# ══════════════════════════════════════════════════════════════
# WEEKLY CHALLENGE
# ══════════════════════════════════════════════════════════════

@router.get("/weekly-challenge")
async def get_weekly_challenge(request: Request):
    """Get the current weekly challenge status and leaderboard."""
    db = get_db()
    user_id = _extract_user_id(request)

    # Calculate current week boundaries
    now = datetime.now(timezone.utc)
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=7)

    week_id = start_of_week.strftime("%Y-W%W")

    # Get all score snapshots updated this week
    participants = await db.weekly_challenge.find(
        {"week_id": week_id}, {"_id": 0}
    ).sort("score_delta", -1).to_list(100)

    # Get user's own entry
    my_entry = None
    my_rank = 0
    for i, p in enumerate(participants):
        if p.get("user_id") == user_id:
            my_entry = p
            my_rank = i + 1
            break

    # Top 3 get badges
    badges = ["Weekly Champion", "Silver Challenger", "Bronze Contender"]

    leaderboard = []
    for i, p in enumerate(participants[:20]):
        leaderboard.append({
            "rank": i + 1,
            "username": p.get("username", "Anonymous"),
            "score_start": p.get("score_start", 0),
            "score_current": p.get("score_current", 0),
            "score_delta": p.get("score_delta", 0),
            "trades_this_week": p.get("trades_this_week", 0),
            "badge": badges[i] if i < 3 else None,
        })

    return {
        "week_id": week_id,
        "starts": start_of_week.isoformat(),
        "ends": end_of_week.isoformat(),
        "days_remaining": max(0, (end_of_week - now).days),
        "total_participants": len(participants),
        "leaderboard": leaderboard,
        "my_entry": {
            "rank": my_rank,
            "score_delta": my_entry["score_delta"] if my_entry else 0,
            "trades_this_week": my_entry.get("trades_this_week", 0) if my_entry else 0,
        } if user_id != "anonymous" else None,
        "prizes": {
            "1st": {"tokens": 500, "badge": "Weekly Champion"},
            "2nd": {"tokens": 300, "badge": "Silver Challenger"},
            "3rd": {"tokens": 200, "badge": "Bronze Contender"},
        },
    }


@router.post("/weekly-challenge/register")
async def register_weekly_challenge(request: Request):
    """Register the user for this week's challenge."""
    db = get_db()
    user_id = _extract_user_id(request)
    if user_id == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")

    now = datetime.now(timezone.utc)
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    week_id = start_of_week.strftime("%Y-W%W")

    # Check if already registered
    existing = await db.weekly_challenge.find_one({"user_id": user_id, "week_id": week_id})
    if existing:
        return {"success": True, "message": "Already registered", "week_id": week_id}

    # Get current score
    from routes.aureos_score import calculate_score
    score_data = await calculate_score(db, user_id)
    current_score = score_data["score"]

    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "full_name": 1})
    username = (user or {}).get("full_name", "Anonymous")

    await db.weekly_challenge.insert_one({
        "user_id": user_id,
        "username": username,
        "week_id": week_id,
        "score_start": current_score,
        "score_current": current_score,
        "score_delta": 0,
        "trades_this_week": 0,
        "registered_at": now.isoformat(),
    })

    return {
        "success": True,
        "message": "Registered for Weekly Challenge!",
        "week_id": week_id,
        "starting_score": current_score,
    }
