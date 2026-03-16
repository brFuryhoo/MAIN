"""
JARVIS Multi-Agent Intelligence System
=========================================
Specialized AI agents that analyze from different perspectives,
then JARVIS synthesizes a unified intelligence brief.

Agents:
- Technical Agent: Price action, indicators, chart patterns
- Quant Agent: Probabilistic models, backtesting signals
- Macro Agent: Market regime, capital flows, sector analysis
- Sentiment Agent: Market sentiment, fear/greed interpretation

Property of Aureos Corporation. All rights reserved.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents", tags=["multi-agent"])


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


AGENT_PROMPTS = {
    "technical": """You are the TECHNICAL ANALYSIS AGENT of Aureos AI.
Analyze ONLY from a technical perspective: price action, RSI, MACD, Bollinger Bands, moving averages, support/resistance, chart patterns, volume.
Be specific with numbers. Identify the most important technical signals.
Keep response under 200 words. Be direct and professional.""",

    "quant": """You are the QUANTITATIVE AGENT of Aureos AI.
Analyze ONLY from a quantitative perspective: Monte Carlo win probability, risk/reward ratios, VaR, position sizing, Sharpe ratio, statistical edge.
Focus on probabilities and risk metrics. Quantify everything.
Keep response under 200 words. Be direct and data-driven.""",

    "macro": """You are the MACRO INTELLIGENCE AGENT of Aureos AI.
Analyze ONLY from a macro perspective: market regime (expansion/contraction/accumulation/distribution), sector rotation, capital flows, volatility regime, correlation shifts.
Focus on the big picture and how this asset fits within global market dynamics.
Keep response under 200 words. Be analytical and strategic.""",

    "sentiment": """You are the SENTIMENT & BEHAVIORAL AGENT of Aureos AI.
Analyze ONLY from a sentiment/behavioral perspective: Is the market fearful or greedy? Are there signs of manipulation? Is the crowd positioned wrong? What would contrarian analysis suggest?
Interpret RSI extremes as sentiment, volume spikes as crowd behavior.
Keep response under 200 words. Be insightful and contrarian when warranted.""",
}

SYNTHESIS_PROMPT = """You are JARVIS, the Central Intelligence Core of Aureos AI.
You have received analysis from 4 specialized agents:
1. Technical Agent - price action & indicators
2. Quant Agent - probabilities & risk
3. Macro Agent - regime & capital flows
4. Sentiment Agent - market psychology

SYNTHESIZE their views into ONE unified intelligence brief. Identify where agents AGREE (high conviction) and where they DISAGREE (uncertainty).
End with a clear VERDICT: BUY, SELL, or HOLD with conviction level (Low/Medium/High).
Keep response under 300 words. Be decisive."""


class MultiAgentRequest(BaseModel):
    analysis_data: Dict
    symbol: str
    asset_type: str = "crypto"


@router.post("/analyze")
async def multi_agent_analysis(req: MultiAgentRequest, request: Request):
    """Run multi-agent analysis with 4 specialized agents + JARVIS synthesis."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)
        api_key = os.environ.get("EMERGENT_LLM_KEY")

        # Build context from analysis data
        report = req.analysis_data.get("report", {})
        steps = req.analysis_data.get("steps", {})
        signal = report.get("signal_summary", {})
        tech = steps.get("technical_analysis", {})
        mc = steps.get("monte_carlo", {})
        risk = steps.get("risk_model", {})
        regime = steps.get("regime_detection", {})
        manip = steps.get("manipulation_detection", {})

        context = f"""Asset: {req.symbol.upper()} ({req.asset_type})
Price: ${req.analysis_data.get('price', 0):,.2f}
Signal: {signal.get('direction', 'HOLD')} ({signal.get('confidence', 0)}% confidence)
RSI: {tech.get('rsi', 50)} | MACD: {tech.get('macd', {}).get('crossover', 'neutral')}
Trend: {tech.get('trend', 'sideways')} | Volume: {tech.get('volume_trend', 'stable')}
Monte Carlo Win: {mc.get('win_probability', 50)}% | Risk Score: {risk.get('risk_score', 50)}/100
Regime: {regime.get('market_phase', {}).get('phase', 'unknown')} | Manipulation: {manip.get('manipulation_score', 0)}/100
Bullish Prob: {signal.get('bullish_probability', 0)}% | Bearish Prob: {signal.get('bearish_probability', 0)}%"""

        # Run all 4 agents
        agent_responses = {}
        for agent_name, system_prompt in AGENT_PROMPTS.items():
            try:
                chat = LlmChat(api_key=api_key, model="gpt-5.2")
                response = await chat.send_message(
                    system_message=system_prompt,
                    message=UserMessage(content=f"Analyze this asset:\n\n{context}"),
                )
                agent_responses[agent_name] = response.content
            except Exception as e:
                agent_responses[agent_name] = f"Agent unavailable: {str(e)[:100]}"

        # JARVIS Synthesis
        synthesis_context = f"ANALYSIS DATA:\n{context}\n\n"
        for agent_name, response in agent_responses.items():
            synthesis_context += f"--- {agent_name.upper()} AGENT ---\n{response}\n\n"

        try:
            chat = LlmChat(api_key=api_key, model="gpt-5.2")
            synthesis = await chat.send_message(
                system_message=SYNTHESIS_PROMPT,
                message=UserMessage(content=synthesis_context),
            )
            jarvis_verdict = synthesis.content
        except Exception as e:
            jarvis_verdict = f"Synthesis unavailable: {str(e)[:100]}"

        # Save to DB
        doc = {
            "user_id": user_id,
            "symbol": req.symbol,
            "asset_type": req.asset_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agents": agent_responses,
            "synthesis": jarvis_verdict,
            "context_signal": signal.get("direction", "HOLD"),
        }
        await db.agent_analyses.insert_one(doc)

        return {
            "status": "complete",
            "symbol": req.symbol,
            "agents": agent_responses,
            "synthesis": jarvis_verdict,
            "timestamp": doc["timestamp"],
        }

    except Exception as e:
        logger.error(f"Multi-agent error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_agent_history(request: Request, limit: int = 20):
    """Get history of multi-agent analyses."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)
        history = await db.agent_analyses.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        return {"history": history, "count": len(history)}
    except Exception:
        return {"history": [], "count": 0}
