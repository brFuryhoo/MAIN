"""
JARVIS News & Sentiment Engine
================================
Fetches market news and generates sentiment analysis.
Uses CoinGecko trending + general market sentiment indicators.
"""

from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import os
import logging
import aiohttp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/news", tags=["news-sentiment"])


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


async def _fetch_crypto_fear_greed():
    """Fetch the Crypto Fear & Greed Index."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("https://api.alternative.me/fng/?limit=7", timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("data", [])
    except Exception as e:
        logger.warning(f"Fear & Greed fetch failed: {e}")
    return []


async def _fetch_coingecko_trending():
    """Fetch trending coins from CoinGecko."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("https://api.coingecko.com/api/v3/search/trending", timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    coins = data.get("coins", [])
                    return [{"name": c["item"]["name"], "symbol": c["item"]["symbol"],
                             "rank": c["item"].get("market_cap_rank", 0),
                             "score": c["item"].get("score", 0)} for c in coins[:10]]
    except Exception as e:
        logger.warning(f"Trending fetch failed: {e}")
    return []


async def _fetch_global_market_data():
    """Fetch global crypto market data."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("https://api.coingecko.com/api/v3/global", timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    gd = data.get("data", {})
                    return {
                        "total_market_cap_usd": gd.get("total_market_cap", {}).get("usd", 0),
                        "total_volume_24h": gd.get("total_volume", {}).get("usd", 0),
                        "market_cap_change_24h": gd.get("market_cap_change_percentage_24h_usd", 0),
                        "btc_dominance": gd.get("market_cap_percentage", {}).get("btc", 0),
                        "eth_dominance": gd.get("market_cap_percentage", {}).get("eth", 0),
                        "active_cryptocurrencies": gd.get("active_cryptocurrencies", 0),
                    }
    except Exception as e:
        logger.warning(f"Global data fetch failed: {e}")
    return {}


@router.get("/sentiment")
async def get_market_sentiment():
    """Get comprehensive market sentiment data."""
    try:
        fear_greed = await _fetch_crypto_fear_greed()
        trending = await _fetch_coingecko_trending()
        global_data = await _fetch_global_market_data()

        # Current fear & greed
        current_fg = fear_greed[0] if fear_greed else {}
        fg_value = int(current_fg.get("value", 50))
        fg_label = current_fg.get("value_classification", "Neutral")

        # Sentiment score (normalized 0-100)
        sentiment_score = fg_value
        if global_data.get("market_cap_change_24h", 0) > 2:
            sentiment_score = min(100, sentiment_score + 10)
        elif global_data.get("market_cap_change_24h", 0) < -2:
            sentiment_score = max(0, sentiment_score - 10)

        # Classification
        if sentiment_score >= 75:
            market_mood = "Extreme Greed"
            interpretation = "Markets are extremely greedy. Historically this indicates potential overvaluation. Consider taking profits or reducing exposure."
        elif sentiment_score >= 55:
            market_mood = "Greed"
            interpretation = "Markets are greedy. Momentum is positive but watch for signs of overextension."
        elif sentiment_score >= 45:
            market_mood = "Neutral"
            interpretation = "Market sentiment is balanced. No extreme positioning detected."
        elif sentiment_score >= 25:
            market_mood = "Fear"
            interpretation = "Markets are fearful. Contrarian investors may find opportunities. Watch for capitulation signals."
        else:
            market_mood = "Extreme Fear"
            interpretation = "Markets are extremely fearful. Historically this has been a strong contrarian BUY signal. Smart money often accumulates during extreme fear."

        return {
            "status": "complete",
            "sentiment_score": sentiment_score,
            "market_mood": market_mood,
            "interpretation": interpretation,
            "fear_greed": {
                "current": fg_value,
                "label": fg_label,
                "history": [{"value": int(fg.get("value", 50)), "label": fg.get("value_classification", ""), "date": fg.get("timestamp", "")} for fg in fear_greed],
            },
            "trending_coins": trending,
            "global_market": global_data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"Sentiment error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
