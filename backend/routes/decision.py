"""
Aureos AI — DECISION ENGINE
==============================
For every asset: BUY / SELL / HOLD with structured reasoning.
"Why This Trade?" engine using market structure, liquidity, volatility, quant signals, sentiment.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
import logging
import random
import uuid
import math

logger = logging.getLogger("aureos")
router = APIRouter(prefix="/api/decision", tags=["decision"])

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


def _compute_technical_signals(candles: list) -> dict:
    """Compute technical indicators from candle data."""
    if not candles or len(candles) < 20:
        return {"rsi": 50, "macd_signal": "neutral", "ma_trend": "neutral", "volatility": 0.02, "momentum": 0}

    closes = [c.get("close", 0) for c in candles if c.get("close", 0) > 0]
    if len(closes) < 20:
        return {"rsi": 50, "macd_signal": "neutral", "ma_trend": "neutral", "volatility": 0.02, "momentum": 0}

    # RSI (14-period)
    gains, losses = [], []
    for i in range(1, min(15, len(closes))):
        diff = closes[-i] - closes[-i-1]
        if diff > 0:
            gains.append(diff)
        else:
            losses.append(abs(diff))
    avg_gain = sum(gains) / max(len(gains), 1) if gains else 0.01
    avg_loss = sum(losses) / max(len(losses), 1) if losses else 0.01
    rs = avg_gain / max(avg_loss, 0.001)
    rsi = round(100 - (100 / (1 + rs)), 1)

    # Moving Averages
    ma20 = sum(closes[-20:]) / 20
    ma50 = sum(closes[-min(50, len(closes)):]) / min(50, len(closes))
    current = closes[-1]
    ma_trend = "bullish" if current > ma20 > ma50 else "bearish" if current < ma20 < ma50 else "neutral"

    # MACD simplified
    ema12 = sum(closes[-12:]) / 12
    ema26 = sum(closes[-min(26, len(closes)):]) / min(26, len(closes))
    macd = ema12 - ema26
    macd_signal = "bullish" if macd > 0 else "bearish"

    # Volatility (std dev of returns)
    returns = [(closes[i] - closes[i-1]) / max(closes[i-1], 0.001) for i in range(max(1, len(closes)-20), len(closes))]
    volatility = round((sum(r**2 for r in returns) / max(len(returns), 1)) ** 0.5, 4) if returns else 0.02

    # Momentum (rate of change)
    momentum = round((closes[-1] / max(closes[-min(10, len(closes))], 0.001) - 1) * 100, 2)

    return {
        "rsi": rsi,
        "macd_signal": macd_signal,
        "ma_trend": ma_trend,
        "ma20": round(ma20, 4),
        "ma50": round(ma50, 4),
        "volatility": volatility,
        "momentum": momentum,
        "current_price": round(current, 4),
    }


def _compute_volume_analysis(candles: list) -> dict:
    """Analyze volume patterns."""
    if not candles or len(candles) < 10:
        return {"volume_trend": "neutral", "volume_ratio": 1.0, "accumulation": False}

    volumes = [c.get("volume", 0) for c in candles if c.get("volume", 0) > 0]
    if len(volumes) < 5:
        return {"volume_trend": "neutral", "volume_ratio": 1.0, "accumulation": False}

    recent_avg = sum(volumes[-5:]) / 5
    older_avg = sum(volumes[-20:-5]) / max(len(volumes[-20:-5]), 1) if len(volumes) > 5 else recent_avg

    ratio = round(recent_avg / max(older_avg, 1), 2)
    trend = "increasing" if ratio > 1.2 else "decreasing" if ratio < 0.8 else "neutral"

    # Check for accumulation (price up + volume up)
    recent_closes = [c.get("close", 0) for c in candles[-5:]]
    price_up = recent_closes[-1] > recent_closes[0] if len(recent_closes) >= 2 else False
    accumulation = price_up and ratio > 1.1

    return {
        "volume_trend": trend,
        "volume_ratio": ratio,
        "accumulation": accumulation,
        "distribution": not price_up and ratio > 1.1,
    }


def _generate_decision(symbol: str, asset_type: str, technicals: dict, volume: dict, sentiment_score: float) -> dict:
    """Core decision engine — BUY / SELL / HOLD with multi-factor reasoning."""

    factors = {
        "technical": 0,
        "volume": 0,
        "sentiment": 0,
        "momentum": 0,
        "risk": 0,
    }

    reasoning = []
    rsi = technicals.get("rsi", 50)
    ma_trend = technicals.get("ma_trend", "neutral")
    macd = technicals.get("macd_signal", "neutral")
    momentum = technicals.get("momentum", 0)
    volatility = technicals.get("volatility", 0.02)
    price = technicals.get("current_price", 0)

    # Technical Score (-100 to +100)
    if ma_trend == "bullish":
        factors["technical"] += 30
        reasoning.append("Price above key moving averages (MA20 > MA50) — bullish structure")
    elif ma_trend == "bearish":
        factors["technical"] -= 30
        reasoning.append("Price below key moving averages — bearish structure")

    if macd == "bullish":
        factors["technical"] += 20
        reasoning.append("MACD above signal line — positive momentum")
    else:
        factors["technical"] -= 20
        reasoning.append("MACD below signal line — weakening momentum")

    if rsi < 30:
        factors["technical"] += 25
        reasoning.append(f"RSI at {rsi} — oversold. Potential bounce opportunity")
    elif rsi > 70:
        factors["technical"] -= 25
        reasoning.append(f"RSI at {rsi} — overbought. Risk of pullback")
    else:
        reasoning.append(f"RSI at {rsi} — neutral territory")

    # Volume Score
    if volume.get("accumulation"):
        factors["volume"] += 25
        reasoning.append("Volume accumulation detected — institutional buying pressure")
    elif volume.get("distribution"):
        factors["volume"] -= 25
        reasoning.append("Volume distribution detected — selling pressure")
    elif volume.get("volume_trend") == "increasing":
        factors["volume"] += 10
        reasoning.append("Increasing volume supports current price action")

    # Sentiment
    factors["sentiment"] = int(sentiment_score * 30)
    if sentiment_score > 0.3:
        reasoning.append("Positive market sentiment supports upside")
    elif sentiment_score < -0.3:
        reasoning.append("Negative sentiment adds downside risk")

    # Momentum
    factors["momentum"] = min(max(int(momentum * 3), -30), 30)
    if momentum > 3:
        reasoning.append(f"Strong upward momentum (+{momentum}% in 10 periods)")
    elif momentum < -3:
        reasoning.append(f"Negative momentum ({momentum}% in 10 periods)")

    # Risk
    if volatility > 0.04:
        factors["risk"] = -15
        reasoning.append(f"High volatility ({volatility*100:.1f}%) — increased risk, tighter stops needed")
    elif volatility < 0.01:
        factors["risk"] = 5
        reasoning.append("Low volatility — stable conditions")

    # Aggregate score
    total = sum(factors.values())
    max_possible = 100  # noqa: F841

    # Decision
    if total > 25:
        decision = "BUY"
        confidence = min(95, 55 + total * 0.4)
    elif total < -25:
        decision = "SELL"
        confidence = min(95, 55 + abs(total) * 0.4)
    else:
        decision = "HOLD"
        confidence = 40 + abs(total) * 0.3

    probability = round(min(confidence / 100, 0.95), 2)

    # Risk parameters
    if decision == "BUY":
        entry = price
        target = round(price * (1 + 0.03 + volatility * 2), 4)
        stop_loss = round(price * (1 - 0.015 - volatility), 4)
    elif decision == "SELL":
        entry = price
        target = round(price * (1 - 0.03 - volatility * 2), 4)
        stop_loss = round(price * (1 + 0.015 + volatility), 4)
    else:
        entry = price
        target = round(price * (1 + 0.02), 4)
        stop_loss = round(price * (1 - 0.02), 4)

    rr_ratio = round(abs(target - entry) / max(abs(entry - stop_loss), 0.001), 2)
    confidence_tier = "very_high" if probability > 0.8 else "high" if probability > 0.65 else "medium" if probability > 0.5 else "low"
    risk_level = "high" if volatility > 0.04 else "moderate" if volatility > 0.02 else "low"

    return {
        "decision": decision,
        "probability": probability,
        "confidence": round(confidence, 1),
        "confidence_tier": confidence_tier,
        "entry_price": entry,
        "target_price": target,
        "stop_loss": stop_loss,
        "risk_reward_ratio": rr_ratio,
        "risk_level": risk_level,
        "factors": factors,
        "total_score": total,
        "reasoning": reasoning,
    }


# ══════════════════════════════════════════════════════════════
# MAIN ENDPOINT: Decision for any asset
# ══════════════════════════════════════════════════════════════

@router.get("/{symbol}")
async def get_decision(symbol: str, asset_type: str = "stock", request: Request = None):
    """
    CORE PRODUCT: Get a structured BUY/SELL/HOLD decision for any asset.
    Includes entry/exit levels, probability, risk parameters, and multi-factor reasoning.
    """
    from services.market_data import market_data_adapter

    symbol = symbol.upper()

    # Fetch real market data
    try:
        data = await market_data_adapter.get_asset_data(symbol, asset_type)
    except Exception as e:
        logger.error(f"Decision engine data error for {symbol}: {e}")
        data = {"symbol": symbol, "price": 100, "candles": [], "source": "fallback"}

    candles = data.get("candles", [])
    price = data.get("price", 0)

    # Compute signals
    technicals = _compute_technical_signals(candles)
    volume_analysis = _compute_volume_analysis(candles)

    # Simple sentiment proxy (from data change)
    change = data.get("change_percent", 0)
    sentiment_score = max(-1, min(1, change / 5))

    # Generate decision
    decision = _generate_decision(symbol, asset_type, technicals, volume_analysis, sentiment_score)

    # Log signal for track record
    db = get_db()
    signal_doc = {
        "signal_id": str(uuid.uuid4()),
        "symbol": symbol,
        "direction": "bullish" if decision["decision"] == "BUY" else "bearish" if decision["decision"] == "SELL" else "neutral",
        "probability": decision["probability"],
        "confidence_tier": decision["confidence_tier"],
        "risk_level": decision["risk_level"],
        "entry_price": decision["entry_price"],
        "target_price": decision["target_price"],
        "stop_loss": decision["stop_loss"],
        "reasoning": decision["reasoning"],
        "factors": decision["factors"],
        "asset_type": asset_type,
        "outcome": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.signals_log.insert_one(signal_doc)

    return {
        "symbol": symbol,
        "name": data.get("name", symbol),
        "type": asset_type,
        "current_price": price,
        "source": data.get("source", "unknown"),
        "decision": decision,
        "technicals": technicals,
        "volume": volume_analysis,
        "why_this_trade": {
            "market_structure": technicals.get("ma_trend", "neutral"),
            "liquidity": volume_analysis.get("volume_trend", "neutral"),
            "volatility": f"{technicals.get('volatility', 0) * 100:.1f}%",
            "quant_signals": {
                "rsi": technicals.get("rsi"),
                "macd": technicals.get("macd_signal"),
                "momentum": technicals.get("momentum"),
            },
            "sentiment": "positive" if sentiment_score > 0.2 else "negative" if sentiment_score < -0.2 else "neutral",
        },
        "signal_id": signal_doc["signal_id"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ══════════════════════════════════════════════════════════════
# ASSET UNIVERSE ENDPOINT
# ══════════════════════════════════════════════════════════════

@router.get("/universe/catalog")
async def get_asset_universe(asset_type: str = None, query: str = None):
    """Get the full asset universe (500+ assets) or search/filter it."""
    from services.asset_universe import get_full_universe, search_universe

    if query:
        results = search_universe(query, asset_type)
        return {"results": results, "total": len(results), "query": query}

    universe = get_full_universe()
    if asset_type:
        universe["assets"] = [a for a in universe["assets"] if a.get("type") == asset_type]
        universe["counts"]["filtered"] = len(universe["assets"])

    return universe


# ══════════════════════════════════════════════════════════════
# BATCH DECISIONS (Top opportunities)
# ══════════════════════════════════════════════════════════════

@router.get("/batch/top-opportunities")
async def get_top_opportunities(limit: int = 10):
    """Scan top assets and return the strongest signals."""
    from services.market_data import market_data_adapter

    # Quick scan of major assets
    symbols = [
        ("BTC", "crypto"), ("ETH", "crypto"), ("SOL", "crypto"),
        ("AAPL", "stock"), ("NVDA", "stock"), ("MSFT", "stock"), ("TSLA", "stock"),
        ("GOOGL", "stock"), ("AMZN", "stock"), ("META", "stock"),
        ("SPY", "etf"), ("QQQ", "etf"), ("GLD", "etf"),
    ]

    opportunities = []
    for sym, atype in symbols:
        try:
            data = await market_data_adapter.get_asset_data(sym, atype)
            candles = data.get("candles", [])
            technicals = _compute_technical_signals(candles)
            volume_analysis = _compute_volume_analysis(candles)
            change = data.get("change_percent", 0)
            sentiment = max(-1, min(1, change / 5))
            decision = _generate_decision(sym, atype, technicals, volume_analysis, sentiment)

            if decision["decision"] != "HOLD":
                opportunities.append({
                    "symbol": sym,
                    "name": data.get("name", sym),
                    "type": atype,
                    "price": data.get("price", 0),
                    "decision": decision["decision"],
                    "probability": decision["probability"],
                    "confidence_tier": decision["confidence_tier"],
                    "target": decision["target_price"],
                    "stop_loss": decision["stop_loss"],
                    "risk_reward": decision["risk_reward_ratio"],
                    "top_reason": decision["reasoning"][0] if decision["reasoning"] else "",
                })
        except Exception as e:
            logger.warning(f"Batch scan error for {sym}: {e}")

    opportunities.sort(key=lambda x: x["probability"], reverse=True)
    return {"opportunities": opportunities[:limit], "total_scanned": len(symbols)}
