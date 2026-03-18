"""
Aureos AI - DOMINANCE & SCALE LAYER
=====================================
1. Universal JARVIS Narration (any text, any language)
2. Alpha Detection System (Where is the edge right now?)
3. Market Narrative Engine (JARVIS tells the market story)
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import logging
import random
import uuid

logger = logging.getLogger("aureos")
router = APIRouter(prefix="/api/dominance", tags=["dominance-scale"])

LANGUAGE_NAMES = {
    'pt': 'Portuguese', 'en': 'English', 'es': 'Spanish', 'fr': 'French',
    'de': 'German', 'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic',
}


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
# 1. ALPHA DETECTION SYSTEM
# ══════════════════════════════════════════════════════════════

@router.get("/alpha-detection")
async def detect_alpha(language: str = "en"):
    """Where is the edge right now? Top 5 global opportunities with score + probability."""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI not configured")

        from emergentintegrations.llm.chat import LlmChat, UserMessage
        from routes.intelligence import get_market_pulse

        pulse = get_market_pulse()
        market_ctx = ", ".join([f"{p['symbol']} at {p['value']:.2f} ({'+' if p['change']>0 else ''}{p['change']:.1f}%)" for p in pulse[:10]])

        lang_name = LANGUAGE_NAMES.get(language, 'English')

        prompt = f"""You are JARVIS Alpha Detection System. Analyze current market conditions and find the TOP 5 highest-probability trading opportunities RIGHT NOW.

Current market data: {market_ctx}

For each opportunity, provide:
1. ASSET (ticker)
2. DIRECTION (LONG or SHORT)
3. ALPHA SCORE (0-100) — how strong is this edge
4. WIN PROBABILITY (50-95%)
5. REASONING (1-2 sentences)
6. ENTRY ZONE, STOP LOSS, and TARGET levels
7. TIMEFRAME (1H, 4H, 1D, 1W)

Format your response as exactly 5 opportunities, separated by "---".
Each opportunity on its own block with clear labels.

Respond in {lang_name}. Be specific with numbers. Focus on actionable, high-conviction setups.
Maximum 400 words total."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"alpha_{datetime.now().strftime('%Y%m%d%H')}_{uuid.uuid4().hex[:6]}",
            system_message="You are JARVIS, an elite alpha detection system. Only present high-conviction opportunities."
        ).with_model("openai", "gpt-5.2")

        analysis = await chat.send_message(UserMessage(text=prompt))

        return {
            "analysis": analysis,
            "market_snapshot": [{"symbol": p["symbol"], "price": p["value"], "change": p["change"]} for p in pulse[:10]],
            "scan_time": datetime.now(timezone.utc).isoformat(),
            "language": language,
            "model": "JARVIS Alpha v2 (GPT-5.2)",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Alpha detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════
# 2. MARKET NARRATIVE ENGINE
# ══════════════════════════════════════════════════════════════

@router.get("/market-narrative")
async def get_market_narrative(language: str = "en"):
    """JARVIS generates the market narrative — the story behind the numbers."""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI not configured")

        from emergentintegrations.llm.chat import LlmChat, UserMessage
        from routes.intelligence import get_market_pulse, GEOPOLITICAL_REGIONS, GLOBAL_EVENTS

        pulse = get_market_pulse()
        market_ctx = ", ".join([f"{p['symbol']} {'+' if p['change']>0 else ''}{p['change']:.1f}%" for p in pulse[:10]])
        high_risk = [r for r in GEOPOLITICAL_REGIONS if r["risk_score"] > 50]
        risk_ctx = ", ".join([f"{r['name']} (risk {r['risk_score']})" for r in high_risk[:4]])
        events = [e for e in GLOBAL_EVENTS if e["severity"] in ("critical", "high")][:5]
        events_ctx = " | ".join([e["title"] for e in events])

        lang_name = LANGUAGE_NAMES.get(language, 'English')

        prompt = f"""You are JARVIS Market Narrative Engine. Write the market story — not just data, but the WHY behind every move.

Current market: {market_ctx}
Geopolitical risks: {risk_ctx}
Critical events: {events_ctx}

Write a comprehensive market narrative covering:

## MARKET REGIME
What mode is the market in? (Risk-on, Risk-off, Rotation, Consolidation, Panic)

## THE BIG STORY
What's the #1 theme driving markets today? Explain in 2-3 sentences.

## CAPITAL FLOWS
Where is money moving? (equities->bonds, crypto->stables, US->emerging, etc.)

## SMART MONEY POSITIONING
What are institutions doing? What does the positioning tell us?

## RISK LANDSCAPE
Key risks and tail events to watch.

## OUTLOOK
One-sentence outlook for the next 24-48 hours.

Respond in {lang_name}. Write like a Bloomberg senior macro strategist. Be specific.
Use bold for key terms. Max 500 words."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"narrative_{datetime.now().strftime('%Y%m%d%H')}_{uuid.uuid4().hex[:6]}",
            system_message="You are JARVIS, a Bloomberg-level market narrative engine. Write compelling, data-driven market stories."
        ).with_model("openai", "gpt-5.2")

        narrative = await chat.send_message(UserMessage(text=prompt))

        return {
            "narrative": narrative,
            "market_regime": _detect_regime(pulse),
            "market_snapshot": [{"symbol": p["symbol"], "price": p["value"], "change": p["change"]} for p in pulse[:8]],
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "language": language,
            "model": "JARVIS Narrative v2 (GPT-5.2)",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Market narrative error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _detect_regime(pulse):
    if not pulse:
        return {"regime": "unknown", "confidence": 0}
    avg_change = sum(p.get("change", 0) for p in pulse) / len(pulse)
    positive = sum(1 for p in pulse if p.get("change", 0) > 0)
    pct_positive = positive / len(pulse) * 100

    if avg_change > 1 and pct_positive > 70:
        return {"regime": "RISK-ON", "confidence": 85, "description": "Broad-based rally, risk appetite strong"}
    elif avg_change < -1 and pct_positive < 30:
        return {"regime": "RISK-OFF", "confidence": 80, "description": "Defensive rotation, flight to safety"}
    elif abs(avg_change) < 0.3:
        return {"regime": "CONSOLIDATION", "confidence": 70, "description": "Range-bound, waiting for catalyst"}
    elif pct_positive > 40 and pct_positive < 60:
        return {"regime": "ROTATION", "confidence": 65, "description": "Sector rotation, mixed signals"}
    else:
        return {"regime": "TRANSITIONAL", "confidence": 55, "description": "Market regime shifting"}
