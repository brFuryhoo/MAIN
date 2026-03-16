"""
JARVIS Intelligence Routes
----------------------------
Central intelligence endpoints for the JARVIS AI copilot,
analysis history, and report explanation.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import os
import uuid
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jarvis", tags=["jarvis"])

JARVIS_SYSTEM_PROMPT = """You are JARVIS, the Central Intelligence Core of Aureos AI — an advanced financial intelligence platform.

Your identity:
- You are NOT a generic chatbot. You are JARVIS, the institutional-grade market intelligence system.
- You orchestrate all analytical modules: Technical Analysis, Market Structure, Liquidity Intelligence, Monte Carlo Simulation, Risk Modeling, Regime Detection, and Manipulation Detection.
- You produce probabilistic, explainable market intelligence.

Your communication style:
- Professional yet accessible — like a senior analyst at a top investment bank briefing a client.
- Always use probabilistic language ("62% probability of bullish continuation") never deterministic claims.
- Cite specific data points from analysis when available (RSI values, support/resistance levels, Monte Carlo win probabilities).
- Be concise but thorough. Structure responses clearly.
- When explaining analysis, break complex signals into understandable factors.

Your capabilities:
- Explain any analysis result in plain language for both beginners and professionals.
- Provide market context and causality reasoning.
- Answer questions about technical analysis, risk management, position sizing, market structure.
- Translate quantitative outputs into actionable intelligence.
- Detect and warn about manipulation patterns and market regime changes.

Important rules:
- ALWAYS remind users this is for educational purposes and not financial advice.
- ALWAYS present signals as probabilities, never certainties.
- When uncertain, say so — transparency builds trust.
- Never recommend specific position sizes without understanding the user's portfolio and risk tolerance.
- Reference the Aureos analysis pipeline when relevant (e.g., "Our Monte Carlo simulation with 5,000 paths suggests...")."""


class JarvisChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    analysis_context: Optional[Dict[str, Any]] = None


class JarvisExplainRequest(BaseModel):
    report: Dict[str, Any]
    focus: Optional[str] = None  # "signal", "risk", "action_plan", "full"


# Dependency to get db from app state
def get_db():
    from server import db
    return db


def get_user_from_token(token: str):
    """Extract user from JWT token."""
    import jwt as pyjwt
    try:
        secret = os.environ.get('JWT_SECRET', 'aureos_ai_secure_secret')
        payload = pyjwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except Exception:
        return None


@router.post("/chat")
async def jarvis_chat(req: JarvisChatRequest, request: Request):
    """JARVIS conversational intelligence endpoint."""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="JARVIS intelligence core not configured")

        db = get_db()

        # Extract user from auth header if available
        auth_header = request.headers.get("Authorization", "")
        user_id = "anonymous"
        if auth_header.startswith("Bearer "):
            user_data = get_user_from_token(auth_header.split(" ")[1])
            if user_data:
                user_id = user_data.get("user_id", "anonymous")

        session_id = req.session_id or f"jarvis_{user_id}_{datetime.now().strftime('%Y%m%d_%H')}"

        # Build context-enriched system prompt
        system_prompt = JARVIS_SYSTEM_PROMPT
        if req.analysis_context:
            context_block = _build_analysis_context(req.analysis_context)
            system_prompt += f"\n\n--- CURRENT ANALYSIS CONTEXT ---\n{context_block}"

        # Load recent conversation history from DB
        recent_msgs = await db.jarvis_conversations.find(
            {"session_id": session_id},
            {"_id": 0, "role": 1, "content": 1}
        ).sort("timestamp", 1).limit(20).to_list(20)

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_prompt,
        ).with_model("openai", "gpt-5.2")

        # Re-inject conversation history
        for msg in recent_msgs:
            if msg["role"] == "user":
                await chat.send_message(UserMessage(text=msg["content"]))

        # Send current message
        response = await chat.send_message(UserMessage(text=req.message))

        # Store both messages
        now = datetime.now(timezone.utc).isoformat()
        await db.jarvis_conversations.insert_one({
            "session_id": session_id,
            "user_id": user_id,
            "role": "user",
            "content": req.message,
            "timestamp": now,
        })
        await db.jarvis_conversations.insert_one({
            "session_id": session_id,
            "user_id": user_id,
            "role": "assistant",
            "content": response,
            "timestamp": now,
        })

        return {
            "response": response,
            "session_id": session_id,
            "timestamp": now,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"JARVIS chat error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"JARVIS error: {str(e)}")


@router.post("/explain-report")
async def explain_report(req: JarvisExplainRequest):
    """JARVIS generates a plain-language explanation of an analysis report."""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="JARVIS intelligence core not configured")

        report = req.report
        focus = req.focus or "full"

        prompt = _build_explain_prompt(report, focus)

        chat = LlmChat(
            api_key=api_key,
            session_id=f"explain_{uuid.uuid4().hex[:8]}",
            system_message=JARVIS_SYSTEM_PROMPT,
        ).with_model("openai", "gpt-5.2")

        response = await chat.send_message(UserMessage(text=prompt))

        return {
            "explanation": response,
            "focus": focus,
            "asset": report.get("asset", {}).get("symbol", "Unknown"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"JARVIS explain error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"JARVIS error: {str(e)}")


@router.get("/history")
async def get_jarvis_history(session_id: str = None, limit: int = 50, request: Request = None):
    """Get JARVIS conversation history."""
    try:
        db = get_db()
        auth_header = request.headers.get("Authorization", "") if request else ""
        user_id = "anonymous"
        if auth_header.startswith("Bearer "):
            user_data = get_user_from_token(auth_header.split(" ")[1])
            if user_data:
                user_id = user_data.get("user_id", "anonymous")

        query = {"user_id": user_id}
        if session_id:
            query["session_id"] = session_id

        messages = await db.jarvis_conversations.find(
            query, {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)

        return {"messages": list(reversed(messages)), "count": len(messages)}

    except Exception as e:
        logger.error(f"JARVIS history error: {str(e)}")
        return {"messages": [], "count": 0}


def _build_analysis_context(ctx: Dict) -> str:
    """Build a structured context block from analysis results."""
    parts = []

    if "report" in ctx:
        r = ctx["report"]
        asset = r.get("asset", {})
        sig = r.get("signal_summary", {})
        parts.append(f"Asset: {asset.get('symbol', '?')} ({asset.get('name', '?')}) at ${asset.get('price', 0):,.2f}")
        parts.append(f"Signal: {sig.get('direction', '?')} with {sig.get('confidence', 0)}% confidence ({sig.get('strength', '?')} strength)")
        parts.append(f"Scenarios: Bullish {sig.get('bullish_probability', 0)}% | Bearish {sig.get('bearish_probability', 0)}% | Sideways {sig.get('sideways_probability', 0)}%")

        ta = r.get("technical_analysis", {})
        parts.append(f"RSI: {ta.get('rsi', 'N/A')} | Trend: {ta.get('trend', 'N/A')} | MACD: {ta.get('macd', {}).get('crossover', 'N/A')}")
        parts.append(f"Support: ${ta.get('support', 0):,.2f} | Resistance: ${ta.get('resistance', 0):,.2f}")

        risk = r.get("risk_assessment", {})
        parts.append(f"Risk Score: {risk.get('risk_score', 'N/A')}/100 ({risk.get('risk_level', 'N/A')})")

        sm = r.get("scenario_modeling", {})
        parts.append(f"Monte Carlo Win Probability: {sm.get('win_probability', 'N/A')}% | Expected Return: {sm.get('expected_return', 'N/A')}%")

        caus = r.get("market_causality", {})
        if caus.get("summary"):
            parts.append(f"Causality: {caus['summary']}")

        # Regime data
        regime = ctx.get("regime")
        if regime:
            parts.append(f"Regime: {regime.get('regime_summary', 'N/A')}")

        # Manipulation data
        manip = ctx.get("manipulation")
        if manip:
            parts.append(f"Manipulation: {manip.get('summary', 'N/A')}")

    return "\n".join(parts)


def _build_explain_prompt(report: Dict, focus: str) -> str:
    """Build a prompt for JARVIS to explain a report."""
    asset = report.get("asset", {})
    sig = report.get("signal_summary", {})
    header = f"Explain the following Aureos AI analysis report for {asset.get('symbol', 'this asset')} ({asset.get('name', '')}) currently trading at ${asset.get('price', 0):,.2f}.\n\n"

    if focus == "signal":
        return header + (
            f"Focus on the signal: {sig.get('direction', '?')} at {sig.get('confidence', 0)}% confidence.\n"
            f"Bullish: {sig.get('bullish_probability', 0)}%, Bearish: {sig.get('bearish_probability', 0)}%, Sideways: {sig.get('sideways_probability', 0)}%.\n"
            f"Bullish signals: {report.get('bullish_signals', [])}\n"
            f"Bearish risks: {report.get('bearish_risks', [])}\n"
            "Explain what these probabilities mean and what's driving the signal."
        )
    elif focus == "risk":
        risk = report.get("risk_assessment", {})
        return header + (
            f"Focus on risk: Score {risk.get('risk_score', 0)}/100, Level: {risk.get('risk_level', '?')}.\n"
            f"VaR 95%: {risk.get('value_at_risk', {}).get('var_95', '?')}%, Max Drawdown: {risk.get('max_drawdown', '?')}%.\n"
            f"Position sizing: {risk.get('position_sizing', {}).get('recommended_pct', '?')}% of portfolio.\n"
            "Explain what these risk metrics mean and how a trader should use them."
        )
    elif focus == "action_plan":
        plan = report.get("action_plan", {})
        return header + (
            f"Focus on the action plan: {plan.get('recommendation', '?')}.\n"
            f"Entry: {plan.get('entry_zone', '?')}, Stop: {plan.get('stop_loss', '?')}, Targets: {plan.get('target_1', '?')} / {plan.get('target_2', '?')}.\n"
            "Explain this action plan in simple terms. Why these specific levels?"
        )
    else:
        ta = report.get("technical_analysis", {})
        risk = report.get("risk_assessment", {})
        sm = report.get("scenario_modeling", {})
        caus = report.get("market_causality", {})
        return header + (
            f"Signal: {sig.get('direction', '?')} at {sig.get('confidence', 0)}% confidence ({sig.get('strength', '?')}).\n"
            f"Probabilities: Bullish {sig.get('bullish_probability', 0)}%, Bearish {sig.get('bearish_probability', 0)}%, Sideways {sig.get('sideways_probability', 0)}%.\n"
            f"RSI: {ta.get('rsi', '?')}, Trend: {ta.get('trend', '?')}, MACD: {ta.get('macd', {}).get('crossover', '?')}.\n"
            f"Risk Score: {risk.get('risk_score', '?')}/100, Monte Carlo Win: {sm.get('win_probability', '?')}%.\n"
            f"Causality: {caus.get('summary', 'N/A')}\n"
            f"Bullish signals: {report.get('bullish_signals', [])}\n"
            f"Bearish risks: {report.get('bearish_risks', [])}\n"
            "Provide a comprehensive executive briefing of this analysis. Cover signal, risk, key levels, and recommended approach."
        )
