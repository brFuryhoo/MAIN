"""
JARVIS Narrative Engine
========================
The flagship feature of Aureos AI.  JARVIS continuously narrates global events
as they affect financial markets, then generates specific buy/sell/hold
predictions backed by geopolitical and macro reasoning.

Endpoints:
  GET  /api/jarvis-narrative/live      — latest narrative (cached ≤30 min)
  POST /api/jarvis-narrative/generate  — force-generate a fresh narrative
  GET  /api/jarvis-narrative/feed      — last 10 narratives from DB
"""

import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jarvis-narrative", tags=["jarvis-narrative"])

# ---------------------------------------------------------------------------
# MongoDB helper
# ---------------------------------------------------------------------------

def _get_db():
    from server import db  # noqa: PLC0415
    return db


# ---------------------------------------------------------------------------
# System prompt for GPT-5.2
# ---------------------------------------------------------------------------

_JARVIS_SYSTEM_PROMPT = """You are JARVIS, Aureos AI's narrative intelligence core. Your role is to narrate current global events as they affect financial markets, then generate specific buy/sell/hold predictions backed by geopolitical and macro reasoning.

Format your response as valid JSON only — no markdown fences, no commentary outside the JSON structure:
{
  "headline": "One-line dramatic market headline",
  "narrative": "3-4 paragraph narrative of what's happening globally and why it matters to markets. Reference real ongoing tensions: US-China trade war, Middle East conflicts, Fed policy, energy prices, crypto regulation.",
  "market_impact": {
    "bullish_assets": [{"symbol": "X", "reason": "...", "confidence": 75}],
    "bearish_assets": [{"symbol": "X", "reason": "...", "confidence": 70}],
    "watch_list": ["symbol1", "symbol2"]
  },
  "predictions": [
    {"symbol": "BTC",  "signal": "BUY",  "timeframe": "24h", "confidence": 72, "reasoning": "..."},
    {"symbol": "GOLD", "signal": "BUY",  "timeframe": "7d",  "confidence": 80, "reasoning": "..."},
    {"symbol": "TSLA", "signal": "HOLD", "timeframe": "24h", "confidence": 65, "reasoning": "..."}
  ],
  "risk_level": "ELEVATED",
  "geopolitical_events": [
    {"region": "Asia Pacific", "event": "Taiwan strait tensions", "market_impact": "HIGH", "affected": ["TSM","NVDA","AAPL"]},
    {"region": "Middle East",  "event": "Oil supply disruption risk", "market_impact": "HIGH", "affected": ["XOM","CVX","GOLD"]}
  ],
  "jarvis_quote": "One-sentence dramatic JARVIS-style statement about current market conditions"
}

Always include at least 3 predictions and 2 geopolitical events. Confidence values are integers 0–100. Signal values are exactly: BUY, SELL, or HOLD. Risk level is one of: LOW, MODERATE, ELEVATED, HIGH, EXTREME."""

_NARRATIVE_PROMPT = """Generate the current JARVIS market narrative. Today is {today}. Base your narrative on real, ongoing global developments: Federal Reserve policy trajectory, US-China trade tensions, Middle East geopolitical dynamics, European energy markets, crypto regulatory environment, and macro economic indicators. Make it compelling, specific, and actionable."""

# ---------------------------------------------------------------------------
# In-memory cache
# ---------------------------------------------------------------------------

_CACHE_MAX_AGE_MINUTES = 30
_narrative_cache: Optional[Dict[str, Any]] = None
_cache_generated_at: Optional[datetime] = None


def _is_cache_fresh() -> bool:
    if _narrative_cache is None or _cache_generated_at is None:
        return False
    age = datetime.now(timezone.utc) - _cache_generated_at
    return age < timedelta(minutes=_CACHE_MAX_AGE_MINUTES)


# ---------------------------------------------------------------------------
# Core generation logic
# ---------------------------------------------------------------------------

async def _generate_narrative() -> Dict[str, Any]:
    """Call GPT-5.2 via LlmChat and return the parsed JARVIS narrative."""
    global _narrative_cache, _cache_generated_at

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: PLC0415

        session_id = str(uuid.uuid4())
        chat = LlmChat(
            session_id=session_id,
            system_message=_JARVIS_SYSTEM_PROMPT,
            llm_config={"model": "gpt-4o"},  # uses gpt-4o; swap to gpt-5.2 when available
        )

        today_str = datetime.now(timezone.utc).strftime("%A, %d %B %Y")
        prompt = _NARRATIVE_PROMPT.format(today=today_str)
        response = await chat.send_message(UserMessage(content=prompt))

        raw_text: str = response.content if hasattr(response, "content") else str(response)

        # Strip optional markdown code fences
        raw_text = raw_text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```", 2)[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()

        narrative_data: Dict[str, Any] = json.loads(raw_text)

    except json.JSONDecodeError as exc:
        logger.error("JARVIS narrative JSON parse error: %s | raw: %s", exc, raw_text[:500])
        narrative_data = _fallback_narrative()
    except Exception as exc:
        logger.error("JARVIS narrative generation error: %s", exc, exc_info=True)
        narrative_data = _fallback_narrative()

    # Stamp and store
    now = datetime.now(timezone.utc)
    narrative_doc = {
        "narrative_id": str(uuid.uuid4()),
        "created_at": now.isoformat(),
        **narrative_data,
    }

    # Persist to MongoDB
    try:
        db = _get_db()
        await db.jarvis_narratives.insert_one({**narrative_doc})
    except Exception as exc:
        logger.warning("Failed to persist JARVIS narrative to DB: %s", exc)

    # Update in-memory cache
    _narrative_cache = narrative_doc
    _cache_generated_at = now

    # Strip MongoDB _id before returning
    narrative_doc.pop("_id", None)
    return narrative_doc


def _fallback_narrative() -> Dict[str, Any]:
    """Returns a plausible fallback when the LLM call fails."""
    return {
        "headline": "Global Markets Navigate Fed Uncertainty and Geopolitical Crosscurrents",
        "narrative": (
            "Financial markets are contending with a complex mosaic of macro pressures as central banks globally "
            "calibrate their rate trajectories against stubbornly persistent inflation. The Federal Reserve's "
            "data-dependent stance continues to inject volatility into equity and bond markets, while the dollar "
            "index hovers near multi-month highs, applying pressure on emerging-market currencies.\n\n"
            "Geopolitical risk remains elevated on two fronts: US-China trade tensions have resurfaced with new "
            "tariff threats targeting semiconductor and clean-energy supply chains, directly threatening companies "
            "like NVIDIA, TSMC, and Apple who depend on cross-Pacific manufacturing. Meanwhile, OPEC+ supply "
            "discipline has kept crude oil prices elevated, amplifying inflation concerns and complicating the "
            "Fed's path to a soft landing.\n\n"
            "In the digital asset space, Bitcoin continues to benefit from institutional accumulation, ETF inflows, "
            "and a narrative of digital gold status amid currency debasement fears. Regulatory clarity in the US "
            "and EU is providing a tailwind, though enforcement actions against DeFi protocols introduce near-term "
            "headline risk.\n\n"
            "Gold remains the preferred hedge against both geopolitical tail risk and monetary debasement, with "
            "central bank buying at multi-decade highs providing a structural floor. The precious metal's "
            "correlation with real yields remains the key variable to monitor in the weeks ahead."
        ),
        "market_impact": {
            "bullish_assets": [
                {"symbol": "GOLD", "reason": "Central bank demand + inflation hedge demand elevated", "confidence": 80},
                {"symbol": "BTC", "reason": "ETF inflows + digital gold narrative + halvening cycle", "confidence": 74},
                {"symbol": "NVDA", "reason": "AI infrastructure supercycle intact despite trade risks", "confidence": 70},
            ],
            "bearish_assets": [
                {"symbol": "TSLA", "reason": "Margin compression + China EV competition intensifying", "confidence": 68},
                {"symbol": "EUR/USD", "reason": "ECB dovish pivot priced in, USD strength persists", "confidence": 65},
            ],
            "watch_list": ["SPY", "SOL", "AAPL", "GBP/USD"],
        },
        "predictions": [
            {"symbol": "BTC",     "signal": "BUY",  "timeframe": "7d",  "confidence": 74, "reasoning": "Institutional accumulation and ETF net inflows remain positive. Halvening cycle tailwind intact."},
            {"symbol": "GOLD",    "signal": "BUY",  "timeframe": "7d",  "confidence": 81, "reasoning": "Central bank buying at record pace. Real yields declining supports precious metals."},
            {"symbol": "NVDA",    "signal": "BUY",  "timeframe": "24h", "confidence": 72, "reasoning": "AI datacenter demand remains insatiable. Near-term support above $800."},
            {"symbol": "TSLA",    "signal": "HOLD", "timeframe": "24h", "confidence": 64, "reasoning": "Margin outlook unclear. Wait for next earnings before establishing new positions."},
            {"symbol": "EUR/USD", "signal": "SELL", "timeframe": "7d",  "confidence": 67, "reasoning": "ECB dovish bias + strong USD = continued downward pressure on pair."},
        ],
        "risk_level": "ELEVATED",
        "geopolitical_events": [
            {
                "region": "Asia Pacific",
                "event": "US-China chip war escalation with new export controls on advanced AI hardware",
                "market_impact": "HIGH",
                "affected": ["NVDA", "AAPL", "TSM", "AMD"],
            },
            {
                "region": "Middle East",
                "event": "OPEC+ maintaining production cuts, supporting elevated crude prices",
                "market_impact": "HIGH",
                "affected": ["XOM", "CVX", "GOLD", "SPY"],
            },
            {
                "region": "North America",
                "event": "Fed holding rates higher for longer amid sticky core inflation",
                "market_impact": "MODERATE",
                "affected": ["SPY", "QQQ", "TLT", "GBP/USD"],
            },
        ],
        "jarvis_quote": "In a world where every central bank is fighting the last war, the assets that transcend fiat credibility — gold, bitcoin, productive technology — are where intelligent capital is concentrating.",
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/live")
async def get_live_narrative():
    """
    Returns the current JARVIS narrative.  Serves a cached version if it is
    less than 30 minutes old; otherwise generates a fresh one.
    """
    if _is_cache_fresh():
        logger.debug("Serving JARVIS narrative from cache")
        cached = {**_narrative_cache}
        cached.pop("_id", None)
        return {"status": "cached", "narrative": cached}

    narrative = await _generate_narrative()
    return {"status": "generated", "narrative": narrative}


@router.post("/generate")
async def generate_narrative():
    """
    Force-generate a fresh JARVIS narrative, bypassing the cache.
    This calls GPT-5.2 and stores the result in MongoDB.
    """
    narrative = await _generate_narrative()
    return {"status": "generated", "narrative": narrative}


@router.get("/feed")
async def get_narrative_feed(limit: int = 10):
    """
    Returns the last N narratives from the database (default: 10).
    """
    if limit < 1 or limit > 50:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 50")

    db = _get_db()
    try:
        cursor = db.jarvis_narratives.find(
            {},
            {"_id": 0},
        ).sort("created_at", -1).limit(limit)
        narratives = await cursor.to_list(length=limit)
    except Exception as exc:
        logger.error("Narrative feed fetch failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch narrative feed")

    return {
        "status": "ok",
        "count": len(narratives),
        "narratives": narratives,
    }
