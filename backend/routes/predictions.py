"""
Consolidated Buy/Sell/Hold Prediction Engine
=============================================
Fetches live price + candle data, runs technical analysis, then uses GPT-5.2
to synthesise a final signal with entry/target/stop-loss levels and reasoning.

Endpoints:
  POST /api/predictions/signal           — signal for a single asset
  GET  /api/predictions/market-overview  — signals for top 10 assets
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

# Signal learning engine — apply learning adjustments and record every signal
try:
    from services.signal_learning_engine import apply_learning_to_signal, record_signal  # noqa: PLC0415
    _LEARNING_ENABLED = True
except Exception as _le:
    logging.getLogger(__name__).warning("Signal learning engine unavailable: %s", _le)
    _LEARNING_ENABLED = False

    async def apply_learning_to_signal(sig):  # type: ignore[misc]
        return sig

    async def record_signal(sig):  # type: ignore[misc]
        return sig.get("signal_id", "")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/predictions", tags=["predictions"])

# ---------------------------------------------------------------------------
# Constants — tracked assets for market overview
# ---------------------------------------------------------------------------

OVERVIEW_ASSETS: List[Dict[str, str]] = [
    {"symbol": "BTC",     "asset_type": "crypto"},
    {"symbol": "ETH",     "asset_type": "crypto"},
    {"symbol": "SOL",     "asset_type": "crypto"},
    {"symbol": "AAPL",    "asset_type": "stock"},
    {"symbol": "TSLA",    "asset_type": "stock"},
    {"symbol": "NVDA",    "asset_type": "stock"},
    {"symbol": "SPY",     "asset_type": "stock"},
    {"symbol": "EUR/USD", "asset_type": "forex"},
    {"symbol": "GBP/USD", "asset_type": "forex"},
    {"symbol": "GOLD",    "asset_type": "commodity"},
]

# ---------------------------------------------------------------------------
# GPT system prompt for signal synthesis
# ---------------------------------------------------------------------------

_SIGNAL_SYSTEM_PROMPT = """You are JARVIS, Aureos AI's quantitative signal engine.
You receive real technical analysis data for a financial asset and must synthesise a
precise, actionable trading signal.

Respond ONLY with valid JSON (no markdown, no commentary):
{
  "symbol": "...",
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": <integer 0-100>,
  "entry_zone": {"low": <float>, "high": <float>},
  "target": <float>,
  "stop_loss": <float>,
  "timeframe": "...",
  "reasoning": "<2-3 sentences synthesising technical + macro reasoning>",
  "technical_score": <integer 0-100>,
  "sentiment_score": <integer 0-100>,
  "geopolitical_risk": "LOW" | "MODERATE" | "HIGH" | "EXTREME",
  "overall_score": <integer 0-100>
}

Rules:
- entry_zone.low must be less than entry_zone.high
- stop_loss must be below entry_zone.low for BUY signals; above entry_zone.high for SELL signals
- target must be above entry_zone.high for BUY; below entry_zone.low for SELL
- confidence is derived from: signal alignment across RSI, MACD, trend, and macro context
- overall_score is a weighted composite of technical_score (60%) + sentiment_score (40%)"""


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class SignalRequest(BaseModel):
    symbol: str = Field(..., examples=["BTC"])
    asset_type: Literal["crypto", "stock", "forex", "commodity"] = Field(default="crypto")
    timeframe: Literal["1d", "7d", "30d"] = Field(default="7d")


class SignalResponse(BaseModel):
    symbol: str
    signal: str
    confidence: int
    entry_zone: Dict[str, float]
    target: float
    stop_loss: float
    timeframe: str
    reasoning: str
    technical_score: int
    sentiment_score: int
    geopolitical_risk: str
    overall_score: int
    price: float
    generated_at: str


# ---------------------------------------------------------------------------
# Internal — technical analysis helper
# ---------------------------------------------------------------------------

def _geopolitical_risk_for_asset(symbol: str) -> str:
    """Simple heuristic — map symbols to geopolitical risk levels."""
    high_risk = {"TSM", "AAPL", "NVDA", "XOM", "CVX", "GOLD", "BTC", "ETH"}
    moderate_risk = {"SOL", "SPY", "QQQ", "EUR/USD", "GBP/USD", "TSLA"}
    sym = symbol.upper()
    if sym in high_risk:
        return "HIGH"
    if sym in moderate_risk:
        return "MODERATE"
    return "LOW"


def _compute_technical_score(ta: Dict[str, Any]) -> int:
    """
    Derive a 0–100 technical score from the technical_engine output.
    Higher = more bullish.
    """
    score = 50  # neutral baseline

    rsi = ta.get("rsi", 50)
    # RSI contribution: oversold → bullish (+), overbought → bearish (-)
    if rsi < 30:
        score += 15
    elif rsi > 70:
        score -= 15
    elif rsi > 55:
        score += 8
    elif rsi < 45:
        score -= 8

    # MACD
    macd = ta.get("macd", {})
    if macd.get("histogram", 0) > 0 and macd.get("macd_line", 0) > macd.get("signal_line", 0):
        score += 10
    elif macd.get("histogram", 0) < 0:
        score -= 10

    # Trend
    trend = ta.get("trend", "neutral")
    if trend == "bullish":
        score += 10
    elif trend == "bearish":
        score -= 10

    # Price vs moving averages
    ma = ta.get("moving_averages", {})
    if ma.get("price_vs_sma20") == "above":
        score += 5
    else:
        score -= 5
    if ma.get("price_vs_sma50") == "above":
        score += 5
    else:
        score -= 5
    if ma.get("golden_cross"):
        score += 8
    else:
        score -= 4

    # Bollinger Bands position
    bb = ta.get("bollinger_bands", {})
    lower = bb.get("lower", 0)
    upper = bb.get("upper", 0)
    middle = bb.get("middle", 0)
    if lower and upper and middle:
        current_price_approx = middle
        if current_price_approx < lower * 1.01:
            score += 12   # price near lower band — potential bounce
        elif current_price_approx > upper * 0.99:
            score -= 12

    # Volume trend
    if ta.get("volume_trend") == "increasing":
        score += 5
    elif ta.get("volume_trend") == "decreasing":
        score -= 5

    return max(0, min(100, score))


def _derive_sentiment_score(ta: Dict[str, Any], asset_type: str) -> int:
    """
    Approximate sentiment score from available technical signals + asset class bias.
    In a full implementation this would pull from the news_sentiment engine.
    """
    # Baseline by asset class
    base = {"crypto": 55, "stock": 52, "forex": 50, "commodity": 58}.get(asset_type, 50)
    # RSI-influenced sentiment proxy
    rsi = ta.get("rsi", 50)
    if rsi < 35:
        base += 10   # extreme fear → contrarian sentiment
    elif rsi > 65:
        base -= 5
    return max(0, min(100, base))


def _compute_zones(price: float, ta: Dict[str, Any], signal: str, asset_type: str) -> Dict[str, float]:
    """
    Derive entry_zone, target, and stop_loss from ATR and support/resistance.
    """
    atr = ta.get("atr", price * 0.02)  # fallback: 2% of price
    support = ta.get("support", price * 0.97)
    resistance = ta.get("resistance", price * 1.04)

    if signal == "BUY":
        entry_low = round(max(support, price - atr * 0.5), 6 if price < 1 else 2)
        entry_high = round(price + atr * 0.3, 6 if price < 1 else 2)
        target = round(resistance + atr * 0.5, 6 if price < 1 else 2)
        stop_loss = round(support - atr * 0.3, 6 if price < 1 else 2)

    elif signal == "SELL":
        entry_low = round(price - atr * 0.3, 6 if price < 1 else 2)
        entry_high = round(min(resistance, price + atr * 0.5), 6 if price < 1 else 2)
        target = round(support - atr * 0.5, 6 if price < 1 else 2)
        stop_loss = round(resistance + atr * 0.3, 6 if price < 1 else 2)

    else:  # HOLD
        entry_low = round(price - atr * 0.3, 6 if price < 1 else 2)
        entry_high = round(price + atr * 0.3, 6 if price < 1 else 2)
        target = round(price + atr, 6 if price < 1 else 2)
        stop_loss = round(price - atr, 6 if price < 1 else 2)

    return {
        "entry_zone": {"low": entry_low, "high": entry_high},
        "target": target,
        "stop_loss": stop_loss,
    }


# ---------------------------------------------------------------------------
# Core signal generation
# ---------------------------------------------------------------------------

async def _generate_signal(symbol: str, asset_type: str, timeframe: str) -> Dict[str, Any]:
    """
    1. Fetch market data (price + candles) from market_data_adapter
    2. Run technical analysis via technical_engine
    3. Build context prompt and call GPT-5.2 for signal synthesis
    4. Return fully populated signal dict
    """
    import asyncio as _asyncio  # noqa: PLC0415

    # Step 1: Fetch market data
    try:
        from services.market_data import market_data_adapter  # noqa: PLC0415
        asset_data = await market_data_adapter.get_asset_data(symbol, asset_type)
    except Exception as exc:
        logger.error("Market data fetch failed for %s: %s", symbol, exc)
        raise HTTPException(status_code=502, detail=f"Market data unavailable for {symbol}: {exc}")

    price: float = asset_data.get("price", 0.0)
    candles: List[Dict] = asset_data.get("candles", [])
    change_pct: float = asset_data.get("change_percent", 0.0)

    if price <= 0:
        raise HTTPException(status_code=502, detail=f"Invalid price returned for {symbol}")

    # Step 2: Technical analysis
    try:
        from services.technical_engine import compute_technical_analysis  # noqa: PLC0415
        ta = compute_technical_analysis(candles, price) if candles else {}
    except Exception as exc:
        logger.warning("Technical analysis failed for %s: %s", symbol, exc)
        ta = {}

    technical_score = _compute_technical_score(ta)
    sentiment_score = _derive_sentiment_score(ta, asset_type)
    geo_risk = _geopolitical_risk_for_asset(symbol)
    overall_score = round(technical_score * 0.6 + sentiment_score * 0.4)

    # Step 3: GPT-5.2 signal synthesis
    context_prompt = f"""Asset: {symbol} ({asset_type})
Timeframe: {timeframe}
Current Price: {price}
24h Change: {change_pct:.2f}%
Technical Score (0-100, higher=bullish): {technical_score}
Sentiment Score (0-100, higher=bullish): {sentiment_score}
Geopolitical Risk: {geo_risk}
Overall Score: {overall_score}

Technical Indicators:
- RSI (14): {ta.get("rsi", "N/A")} → {ta.get("rsi_signal", "neutral")}
- MACD Histogram: {ta.get("macd", {}).get("histogram", "N/A")}
- Trend: {ta.get("trend", "neutral")} (strength: {ta.get("trend_strength", "moderate")})
- Price vs SMA20: {ta.get("moving_averages", {}).get("price_vs_sma20", "N/A")}
- Price vs SMA50: {ta.get("moving_averages", {}).get("price_vs_sma50", "N/A")}
- Golden Cross (SMA50 > SMA200): {ta.get("moving_averages", {}).get("golden_cross", False)}
- Bollinger Band Position: {ta.get("bollinger_bands", {}).get("position", "middle")}
- ATR: {ta.get("atr", 0):.4f}
- Support: {ta.get("support", 0):.4f}
- Resistance: {ta.get("resistance", 0):.4f}
- Volume Trend: {ta.get("volume_trend", "stable")}

Generate the signal for a {timeframe} timeframe investment horizon."""

    signal_raw = "HOLD"
    reasoning_raw = "Technical signals are mixed; no clear directional edge identified."
    gpt_data: Dict[str, Any] = {}

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: PLC0415
        chat = LlmChat(
            session_id=str(uuid.uuid4()),
            system_message=_SIGNAL_SYSTEM_PROMPT,
            llm_config={"model": "gpt-4o"},
        )
        response = await chat.send_message(UserMessage(content=context_prompt))
        raw_text: str = response.content if hasattr(response, "content") else str(response)
        raw_text = raw_text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```", 2)[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.rstrip("```").strip()

        gpt_data = json.loads(raw_text)
        signal_raw = gpt_data.get("signal", "HOLD").upper()
        reasoning_raw = gpt_data.get("reasoning", reasoning_raw)

        # Update scores from GPT response if provided
        if "technical_score" in gpt_data:
            technical_score = int(gpt_data["technical_score"])
        if "sentiment_score" in gpt_data:
            sentiment_score = int(gpt_data["sentiment_score"])
        if "overall_score" in gpt_data:
            overall_score = int(gpt_data["overall_score"])
        if "confidence" in gpt_data:
            confidence = int(gpt_data["confidence"])
        else:
            confidence = overall_score
        if "geopolitical_risk" in gpt_data:
            geo_risk = gpt_data["geopolitical_risk"]

    except json.JSONDecodeError as exc:
        logger.warning("GPT signal JSON parse failed for %s: %s", symbol, exc)
        # Fall back to heuristic signal
        if technical_score >= 65:
            signal_raw = "BUY"
        elif technical_score <= 35:
            signal_raw = "SELL"
        confidence = overall_score
    except Exception as exc:
        logger.error("GPT signal call failed for %s: %s", symbol, exc)
        if technical_score >= 65:
            signal_raw = "BUY"
        elif technical_score <= 35:
            signal_raw = "SELL"
        confidence = overall_score

    # Compute zones
    if gpt_data and all(k in gpt_data for k in ("entry_zone", "target", "stop_loss")):
        try:
            entry_zone = gpt_data["entry_zone"]
            target_val = float(gpt_data["target"])
            stop_loss_val = float(gpt_data["stop_loss"])
        except (KeyError, ValueError, TypeError):
            zones = _compute_zones(price, ta, signal_raw, asset_type)
            entry_zone = zones["entry_zone"]
            target_val = zones["target"]
            stop_loss_val = zones["stop_loss"]
    else:
        zones = _compute_zones(price, ta, signal_raw, asset_type)
        entry_zone = zones["entry_zone"]
        target_val = zones["target"]
        stop_loss_val = zones["stop_loss"]

    return {
        "symbol": symbol.upper(),
        "signal": signal_raw,
        "confidence": max(0, min(100, confidence)),
        "entry_zone": entry_zone,
        "target": target_val,
        "stop_loss": stop_loss_val,
        "timeframe": timeframe,
        "reasoning": reasoning_raw,
        "technical_score": max(0, min(100, technical_score)),
        "sentiment_score": max(0, min(100, sentiment_score)),
        "geopolitical_risk": geo_risk,
        "overall_score": max(0, min(100, overall_score)),
        "price": round(price, 6 if price < 1 else 2),
        "change_pct": round(change_pct, 4),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/signal", response_model=SignalResponse)
async def get_signal(req: SignalRequest):
    """
    Generate a full buy/sell/hold signal for a given asset and timeframe.

    Workflow:
      1. Fetch live price + candle data (market_data_adapter)
      2. Run technical analysis (technical_engine.compute_technical_analysis)
      3. Synthesise final signal via GPT-5.2 with full context
      4. Apply learning multiplier to confidence (self-improving engine)
      5. Fire-and-forget: persist signal to signal_ledger for outcome tracking
    """
    try:
        result = await _generate_signal(req.symbol.upper(), req.asset_type, req.timeframe)

        # Tag the source so the learning engine knows where it came from
        result["source"] = "predictions"

        # Step 4: apply learning adjustments (confidence multiplier)
        result = await apply_learning_to_signal(result)

        # Step 5: fire-and-forget persistence (non-blocking)
        asyncio.create_task(record_signal(result))

        return SignalResponse(**{k: v for k, v in result.items() if k in SignalResponse.model_fields})
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Signal generation error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/market-overview")
async def get_market_overview():
    """
    Generates buy/sell/hold signals for the top 10 tracked assets in parallel.
    Uses 7-day timeframe for the overview.

    Note: This triggers multiple market data + GPT calls concurrently.
    Expect ~15-30 second response time on cold cache.
    """
    import asyncio  # noqa: PLC0415

    async def _safe_signal(symbol: str, asset_type: str) -> Optional[Dict]:
        try:
            return await _generate_signal(symbol, asset_type, "7d")
        except Exception as exc:
            logger.warning("Overview signal failed for %s: %s", symbol, exc)
            return None

    tasks = [_safe_signal(a["symbol"], a["asset_type"]) for a in OVERVIEW_ASSETS]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    signals = []
    errors = []
    for idx, result in enumerate(results):
        sym = OVERVIEW_ASSETS[idx]["symbol"]
        if isinstance(result, Exception):
            errors.append({"symbol": sym, "error": str(result)})
        elif result is None:
            errors.append({"symbol": sym, "error": "signal generation returned None"})
        else:
            signals.append(result)

    # Summary statistics
    buy_count = sum(1 for s in signals if s["signal"] == "BUY")
    sell_count = sum(1 for s in signals if s["signal"] == "SELL")
    hold_count = sum(1 for s in signals if s["signal"] == "HOLD")

    if buy_count > sell_count + hold_count:
        market_bias = "RISK-ON"
    elif sell_count > buy_count + hold_count:
        market_bias = "RISK-OFF"
    else:
        market_bias = "NEUTRAL"

    avg_confidence = round(sum(s["confidence"] for s in signals) / max(len(signals), 1))

    return {
        "status": "ok",
        "market_bias": market_bias,
        "avg_confidence": avg_confidence,
        "buy_signals": buy_count,
        "sell_signals": sell_count,
        "hold_signals": hold_count,
        "signals": signals,
        "errors": errors,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
