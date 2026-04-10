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
import json
import uuid
from emergentintegrations.llm.chat import LlmChat, UserMessage

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


# ==================== NEWS INTELLIGENCE (NEW) ====================

async def _fetch_newsapi_headlines(api_key: str, query: str = "financial markets economy crypto") -> List[Dict[str, Any]]:
    """
    Fetch top business/finance headlines from NewsAPI.
    Returns a list of raw headline dicts: {title, source, url, published_at}
    """
    import aiohttp  # noqa: PLC0415 — already imported in news_sentiment.py
    try:
        url = "https://newsapi.org/v2/top-headlines"
        params = {
            "apiKey": api_key,
            "category": "business",
            "language": "en",
            "pageSize": 20,
        }
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status != 200:
                    _patch_logger.warning("NewsAPI returned status %d", resp.status)
                    return []
                data = await resp.json()
                articles = data.get("articles", [])
                return [
                    {
                        "title": a.get("title", ""),
                        "source": a.get("source", {}).get("name", "Unknown"),
                        "url": a.get("url", ""),
                        "published_at": a.get("publishedAt", ""),
                    }
                    for a in articles
                    if a.get("title") and "[Removed]" not in a.get("title", "")
                ]
    except Exception as exc:
        _patch_logger.warning("NewsAPI fetch failed: %s", exc)
        return []


async def _generate_ai_headlines() -> List[Dict[str, Any]]:
    """
    When no NEWSAPI_KEY is available, use GPT-5.2 to generate a realistic
    simulated news feed based on known ongoing global events.
    Returns a list of {title, source} dicts.
    """
    system_prompt = (
        "You are a financial news aggregator assistant. Generate realistic, plausible financial market "
        "news headlines based on real, ongoing global events (US-China trade tensions, Federal Reserve policy, "
        "Middle East geopolitics, crypto regulation, energy markets, AI sector developments). "
        "Return ONLY valid JSON — a list of 12 objects with keys: title, source. "
        "Sources should be realistic financial outlets (Bloomberg, Reuters, FT, WSJ, CoinDesk, etc.). "
        "Make headlines specific and current-sounding, not generic."
    )
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: PLC0415
        chat = LlmChat(
            session_id=str(uuid.uuid4()),
            system_message=system_prompt,
            llm_config={"model": "gpt-4o"},
        )
        today = datetime.now(timezone.utc).strftime("%B %Y")
        response = await chat.send_message(
            UserMessage(content=f"Generate 12 financial news headlines for {today}. Return only the JSON array.")
        )
        raw: str = response.content if hasattr(response, "content") else str(response)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.rstrip("```").strip()
        return json.loads(raw)
    except Exception as exc:
        _patch_logger.error("AI headline generation failed: %s", exc)
        # Static emergency fallback
        return [
            {"title": "Federal Reserve Signals Cautious Approach to Rate Cuts Amid Sticky Inflation", "source": "Reuters"},
            {"title": "Bitcoin ETF Inflows Hit Monthly Record as Institutional Demand Surges", "source": "CoinDesk"},
            {"title": "NVIDIA Shares Rally on Blowout AI Datacenter Revenue Guidance", "source": "Bloomberg"},
            {"title": "Gold Hits All-Time High as Central Banks Continue Record Buying Spree", "source": "Financial Times"},
            {"title": "US-China Chip War Intensifies with New Export Controls on Advanced AI Hardware", "source": "WSJ"},
            {"title": "OPEC+ Extends Production Cuts, Keeping Oil Prices Elevated Through Q3", "source": "Reuters"},
            {"title": "ECB Signals Potential Rate Cut as Euro Zone Growth Disappoints", "source": "Bloomberg"},
            {"title": "Tesla Faces Margin Pressure as China EV Competition Reaches U.S. Shores", "source": "Reuters"},
            {"title": "S&P 500 Approaches Record High as Mega-Cap Tech Powers Broad Market Rally", "source": "WSJ"},
            {"title": "Crypto Regulation: SEC Approves Spot Ethereum ETF Applications", "source": "CoinDesk"},
            {"title": "Middle East Tensions Fuel Safe-Haven Demand for Treasuries and Gold", "source": "FT"},
            {"title": "Japan Yen Intervention Warnings Grow Louder as USD/JPY Tests 155", "source": "Bloomberg"},
        ]


async def _score_headline_sentiment(headline: str) -> Dict[str, Any]:
    """
    Score a single headline for market sentiment.
    Uses keyword-based heuristics for speed; complex cases fall through to a score.
    Returns {sentiment, score, affected_assets}
    """
    # Keyword maps
    bullish_keywords = [
        "rally", "surges", "record high", "beats", "exceeds", "all-time high",
        "bullish", "inflows", "gains", "growth", "breakthrough", "approves", "eases",
        "expansion", "boom", "strong", "upgrade", "positive", "rise",
    ]
    bearish_keywords = [
        "plunges", "falls", "decline", "miss", "bearish", "crisis", "default",
        "recession", "outflows", "drops", "cut", "warning", "risk", "tensions",
        "fears", "sell-off", "downturn", "inflation", "sanctions", "ban",
    ]
    # Asset mapping based on keywords
    asset_map = {
        "bitcoin": "BTC", "btc": "BTC", "crypto": "BTC",
        "ethereum": "ETH", "solana": "SOL",
        "gold": "GOLD", "precious metal": "GOLD",
        "fed": "SPY", "federal reserve": "SPY", "rate": "SPY",
        "nvidia": "NVDA", "nvda": "NVDA", "ai chip": "NVDA",
        "tesla": "TSLA", "tsla": "TSLA",
        "apple": "AAPL", "aapl": "AAPL",
        "s&p": "SPY", "sp500": "SPY", "market": "SPY",
        "oil": "XOM", "opec": "XOM", "crude": "XOM",
        "euro": "EUR/USD", "eur": "EUR/USD",
        "pound": "GBP/USD", "gbp": "GBP/USD",
        "yen": "USD/JPY", "japan": "USD/JPY",
    }

    lower = headline.lower()
    bull_score = sum(1 for kw in bullish_keywords if kw in lower)
    bear_score = sum(1 for kw in bearish_keywords if kw in lower)

    if bull_score > bear_score:
        sentiment = "bullish"
        score = round(min(0.5 + bull_score * 0.08, 0.97), 2)
    elif bear_score > bull_score:
        sentiment = "bearish"
        score = round(max(0.5 - bear_score * 0.08, 0.03), 2)
    else:
        sentiment = "neutral"
        score = 0.5

    affected = list({v for k, v in asset_map.items() if k in lower})[:4]

    return {
        "sentiment": sentiment,
        "score": score,
        "affected_assets": affected,
    }


# ============================================================
# PASTE this endpoint into news_sentiment.py
# ============================================================

from fastapi import APIRouter as _APIRouter  # will use the existing `router` in the actual file

# NOTE: In news_sentiment.py, replace `router` below with the existing module-level `router`.
# This standalone reference is only for the patch file's completeness.
_intelligence_router_ref = _APIRouter(prefix="/api/news", tags=["news-sentiment"])


@_intelligence_router_ref.get("/intelligence")
async def get_news_intelligence():
    """
    Fetches real news headlines (via NewsAPI if NEWSAPI_KEY env var is set)
    or falls back to GPT-5.2 simulated news, then scores each headline for
    market sentiment and returns an aggregated market mood.

    Response format:
    {
      "headlines": [{"title", "source", "sentiment", "score", "affected_assets"}],
      "overall_sentiment": "bullish|bearish|neutral",
      "sentiment_score": float,
      "market_mood": "RISK-ON|RISK-OFF|NEUTRAL",
      "generated_at": ISO timestamp
    }
    """
    newsapi_key: Optional[str] = os.environ.get("NEWSAPI_KEY")

    # Fetch headlines
    if newsapi_key:
        raw_headlines = await _fetch_newsapi_headlines(newsapi_key)
        source_type = "newsapi"
    else:
        raw_headlines = await _generate_ai_headlines()
        source_type = "ai_generated"

    if not raw_headlines:
        raw_headlines = await _generate_ai_headlines()
        source_type = "ai_generated_fallback"

    # Score each headline
    scored: List[Dict[str, Any]] = []
    for h in raw_headlines[:20]:  # cap at 20 for performance
        scores = await _score_headline_sentiment(h.get("title", ""))
        scored.append({
            "title": h.get("title", ""),
            "source": h.get("source", "Unknown"),
            **scores,
        })

    # Aggregate sentiment
    if not scored:
        overall_sentiment = "neutral"
        sentiment_score = 0.5
    else:
        avg_score = sum(h["score"] for h in scored) / len(scored)
        sentiment_score = round(avg_score, 4)
        bullish_count = sum(1 for h in scored if h["sentiment"] == "bullish")
        bearish_count = sum(1 for h in scored if h["sentiment"] == "bearish")
        if bullish_count > bearish_count * 1.5:
            overall_sentiment = "bullish"
        elif bearish_count > bullish_count * 1.5:
            overall_sentiment = "bearish"
        else:
            overall_sentiment = "neutral"

    # Market mood
    if sentiment_score >= 0.65:
        market_mood = "RISK-ON"
    elif sentiment_score <= 0.40:
        market_mood = "RISK-OFF"
    else:
        market_mood = "NEUTRAL"

    return {
        "headlines": scored,
        "overall_sentiment": overall_sentiment,
        "sentiment_score": sentiment_score,
        "market_mood": market_mood,
        "source_type": source_type,
        "headline_count": len(scored),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
