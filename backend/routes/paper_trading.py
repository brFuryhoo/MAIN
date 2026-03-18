"""
JARVIS Paper Trading System
==============================
Virtual portfolio simulation for testing strategies.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/paper", tags=["paper-trading"])


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


INITIAL_BALANCE = 100000.0


class TradeRequest(BaseModel):
    symbol: str
    name: str = ""
    asset_type: str = "crypto"
    action: str  # "buy" or "sell"
    quantity: float
    price: float


class CloseRequest(BaseModel):
    trade_id: str
    close_price: float


async def _get_or_create_portfolio(db, user_id: str):
    portfolio = await db.paper_portfolios.find_one({"user_id": user_id}, {"_id": 0})
    if not portfolio:
        portfolio = {
            "user_id": user_id,
            "balance": INITIAL_BALANCE,
            "initial_balance": INITIAL_BALANCE,
            "total_pnl": 0,
            "total_trades": 0,
            "winning_trades": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.paper_portfolios.insert_one(portfolio)
    return portfolio


@router.get("/portfolio")
async def get_portfolio(request: Request):
    """Get paper trading portfolio."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)
        portfolio = await _get_or_create_portfolio(db, user_id)

        # Get open positions
        open_positions = await db.paper_trades.find(
            {"user_id": user_id, "status": "open"}, {"_id": 0}
        ).to_list(50)

        # Get recent closed trades
        closed_trades = await db.paper_trades.find(
            {"user_id": user_id, "status": "closed"}, {"_id": 0}
        ).sort("closed_at", -1).limit(20).to_list(20)

        win_rate = round(portfolio["winning_trades"] / portfolio["total_trades"] * 100, 1) if portfolio["total_trades"] > 0 else 0
        total_return = round((portfolio["balance"] - portfolio["initial_balance"]) / portfolio["initial_balance"] * 100, 2)

        return {
            "balance": round(portfolio["balance"], 2),
            "initial_balance": portfolio["initial_balance"],
            "total_pnl": round(portfolio["total_pnl"], 2),
            "total_return_pct": total_return,
            "total_trades": portfolio["total_trades"],
            "winning_trades": portfolio["winning_trades"],
            "win_rate": win_rate,
            "open_positions": open_positions,
            "closed_trades": closed_trades,
        }
    except Exception as e:
        logger.error(f"Portfolio error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trade")
async def execute_trade(req: TradeRequest, request: Request):
    """Execute a paper trade."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)
        portfolio = await _get_or_create_portfolio(db, user_id)

        cost = req.quantity * req.price
        if req.action == "buy" and cost > portfolio["balance"]:
            raise HTTPException(status_code=400, detail=f"Insufficient balance. Need ${cost:,.2f}, have ${portfolio['balance']:,.2f}")

        trade_id = f"PT_{datetime.now().strftime('%Y%m%d%H%M%S')}_{req.symbol[:6]}"

        trade = {
            "trade_id": trade_id,
            "user_id": user_id,
            "symbol": req.symbol,
            "name": req.name or req.symbol,
            "asset_type": req.asset_type,
            "action": req.action,
            "quantity": req.quantity,
            "entry_price": req.price,
            "cost": round(cost, 2),
            "status": "open",
            "opened_at": datetime.now(timezone.utc).isoformat(),
            "pnl": 0,
        }
        await db.paper_trades.insert_one(trade)

        # Update balance
        if req.action == "buy":
            await db.paper_portfolios.update_one(
                {"user_id": user_id},
                {"$inc": {"balance": -cost}}
            )
        else:
            await db.paper_portfolios.update_one(
                {"user_id": user_id},
                {"$inc": {"balance": cost}}
            )

        return {
            "status": "executed",
            "trade_id": trade_id,
            "action": req.action,
            "symbol": req.symbol,
            "quantity": req.quantity,
            "price": req.price,
            "cost": round(cost, 2),
            "new_balance": round(portfolio["balance"] - cost if req.action == "buy" else portfolio["balance"] + cost, 2),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trade error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/close")
async def close_trade(req: CloseRequest, request: Request):
    """Close an open paper trade."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)

        trade = await db.paper_trades.find_one(
            {"user_id": user_id, "trade_id": req.trade_id, "status": "open"}, {"_id": 0}
        )
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found or already closed")

        close_value = trade["quantity"] * req.close_price
        if trade["action"] == "buy":
            pnl = close_value - trade["cost"]
        else:
            pnl = trade["cost"] - close_value

        pnl_pct = round(pnl / trade["cost"] * 100, 2) if trade["cost"] > 0 else 0
        is_win = pnl > 0

        await db.paper_trades.update_one(
            {"user_id": user_id, "trade_id": req.trade_id},
            {"$set": {
                "status": "closed",
                "close_price": req.close_price,
                "close_value": round(close_value, 2),
                "pnl": round(pnl, 2),
                "pnl_pct": pnl_pct,
                "closed_at": datetime.now(timezone.utc).isoformat(),
            }}
        )

        await db.paper_portfolios.update_one(
            {"user_id": user_id},
            {"$inc": {
                "balance": close_value if trade["action"] == "buy" else -close_value,
                "total_pnl": pnl,
                "total_trades": 1,
                "winning_trades": 1 if is_win else 0,
            }}
        )

        # Grant Aureos Tokens for trade completion
        try:
            from routes.aureos_tokens import grant_tokens
            await grant_tokens(user_id, "trade_close")
            if is_win:
                await grant_tokens(user_id, "trade_win")
                if pnl_pct > 5:
                    await grant_tokens(user_id, "trade_big_win")
        except Exception as token_err:
            logger.warning(f"Token grant error: {token_err}")

        # Update weekly challenge if registered
        try:
            from routes.aureos_score import calculate_score
            score_data = await calculate_score(db, user_id)
            now = datetime.now(timezone.utc)
            start_of_week = now - timedelta(days=now.weekday())
            start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
            week_id = start_of_week.strftime("%Y-W%W")
            challenge = await db.weekly_challenge.find_one({"user_id": user_id, "week_id": week_id})
            if challenge:
                await db.weekly_challenge.update_one(
                    {"user_id": user_id, "week_id": week_id},
                    {"$set": {"score_current": score_data["score"], "score_delta": score_data["score"] - challenge.get("score_start", 0)},
                     "$inc": {"trades_this_week": 1}}
                )
        except Exception:
            pass

        return {
            "status": "closed",
            "trade_id": req.trade_id,
            "pnl": round(pnl, 2),
            "pnl_pct": pnl_pct,
            "is_win": is_win,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Close error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset")
async def reset_portfolio(request: Request):
    """Reset paper portfolio to initial state."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)
        await db.paper_portfolios.delete_one({"user_id": user_id})
        await db.paper_trades.delete_many({"user_id": user_id})
        return {"status": "reset", "balance": INITIAL_BALANCE}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
