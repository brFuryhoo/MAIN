"""
JARVIS Autonomous Market Scanner
==================================
Continuously scans global markets for high-probability opportunities.
Detects breakouts, reversals, momentum shifts, and liquidity events.

Property of Aureos Corporation. All rights reserved.
"""

import logging
import random
import math
from typing import Dict, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
# SCANNER UNIVERSE — Assets to scan by category
# ═══════════════════════════════════════════════════════════════

SCAN_UNIVERSE = {
    "crypto": [
        {"symbol": "bitcoin", "name": "Bitcoin", "coingecko_id": "bitcoin", "asset_type": "crypto"},
        {"symbol": "ethereum", "name": "Ethereum", "coingecko_id": "ethereum", "asset_type": "crypto"},
        {"symbol": "solana", "name": "Solana", "coingecko_id": "solana", "asset_type": "crypto"},
        {"symbol": "ripple", "name": "XRP", "coingecko_id": "ripple", "asset_type": "crypto"},
        {"symbol": "cardano", "name": "Cardano", "coingecko_id": "cardano", "asset_type": "crypto"},
    ],
    "stocks_us": [
        {"symbol": "AAPL", "name": "Apple Inc.", "asset_type": "stock"},
        {"symbol": "NVDA", "name": "NVIDIA Corp", "asset_type": "stock"},
        {"symbol": "MSFT", "name": "Microsoft", "asset_type": "stock"},
        {"symbol": "TSLA", "name": "Tesla Inc.", "asset_type": "stock"},
        {"symbol": "AMZN", "name": "Amazon", "asset_type": "stock"},
        {"symbol": "GOOGL", "name": "Alphabet", "asset_type": "stock"},
        {"symbol": "META", "name": "Meta Platforms", "asset_type": "stock"},
    ],
    "forex": [
        {"symbol": "EUR/USD", "name": "Euro / US Dollar", "asset_type": "forex"},
        {"symbol": "GBP/USD", "name": "British Pound / USD", "asset_type": "forex"},
        {"symbol": "USD/JPY", "name": "US Dollar / Yen", "asset_type": "forex"},
    ],
    "commodities": [
        {"symbol": "XAUUSD", "name": "Gold", "asset_type": "commodity"},
        {"symbol": "XAGUSD", "name": "Silver", "asset_type": "commodity"},
    ],
}


def get_scan_assets(categories: List[str] = None) -> List[Dict]:
    """Get list of assets to scan based on selected categories."""
    if not categories:
        categories = list(SCAN_UNIVERSE.keys())
    assets = []
    for cat in categories:
        assets.extend(SCAN_UNIVERSE.get(cat, []))
    return assets


# ═══════════════════════════════════════════════════════════════
# OPPORTUNITY CLASSIFIER — Classifies analysis into opportunity
# ═══════════════════════════════════════════════════════════════

OPPORTUNITY_TYPES = {
    "breakout_bullish": {"label": "Bullish Breakout", "severity": "high", "emoji_code": "rocket"},
    "breakout_bearish": {"label": "Bearish Breakdown", "severity": "high", "emoji_code": "warning"},
    "momentum_surge": {"label": "Momentum Surge", "severity": "medium", "emoji_code": "bolt"},
    "reversal_bullish": {"label": "Bullish Reversal", "severity": "high", "emoji_code": "rotate"},
    "reversal_bearish": {"label": "Bearish Reversal", "severity": "high", "emoji_code": "rotate"},
    "oversold_bounce": {"label": "Oversold Bounce", "severity": "medium", "emoji_code": "bounce"},
    "overbought_warning": {"label": "Overbought Warning", "severity": "medium", "emoji_code": "alert"},
    "volume_spike": {"label": "Volume Spike", "severity": "low", "emoji_code": "chart"},
    "regime_shift": {"label": "Regime Shift", "severity": "high", "emoji_code": "shift"},
    "low_risk_entry": {"label": "Low Risk Entry", "severity": "medium", "emoji_code": "target"},
}


def classify_opportunity(analysis_result: Dict) -> List[Dict]:
    """Classify an analysis result into opportunity types."""
    opportunities = []
    report = analysis_result.get("report", {})
    steps = analysis_result.get("steps", {})
    tech = steps.get("technical_analysis", {})
    struct = steps.get("market_structure", {})
    mc = steps.get("monte_carlo", {})
    risk = steps.get("risk_model", {})
    regime = steps.get("regime_detection", {})
    manip = steps.get("manipulation_detection", {})

    signal = report.get("signal_summary", {})
    direction = signal.get("direction", "HOLD")
    confidence = signal.get("confidence", 50)
    strength = signal.get("strength", "weak")

    rsi = tech.get("rsi", 50)
    macd = tech.get("macd", {})
    vol_trend = tech.get("volume_trend", "stable")
    breakout = struct.get("breakout", {})
    bias = struct.get("bias", "neutral")
    win_prob = mc.get("win_probability", 50)
    risk_score = risk.get("risk_score", 50)
    market_phase = regime.get("market_phase", {}).get("phase", "unknown")

    # Breakout detection
    if breakout.get("detected"):
        btype = breakout.get("type", "")
        if "bullish" in btype:
            opportunities.append(_make_opportunity("breakout_bullish", confidence, analysis_result))
        elif "bearish" in btype:
            opportunities.append(_make_opportunity("breakout_bearish", confidence, analysis_result))

    # RSI extremes
    if rsi < 25:
        opportunities.append(_make_opportunity("oversold_bounce", min(90, 100 - rsi), analysis_result))
    elif rsi > 75:
        opportunities.append(_make_opportunity("overbought_warning", min(90, rsi), analysis_result))

    # Strong directional signal
    if direction == "BUY" and strength == "strong" and confidence > 55:
        if risk_score < 45:
            opportunities.append(_make_opportunity("low_risk_entry", confidence, analysis_result))
        else:
            opportunities.append(_make_opportunity("momentum_surge", confidence, analysis_result))

    # Reversal detection
    if direction == "BUY" and bias == "bearish" and rsi < 35:
        opportunities.append(_make_opportunity("reversal_bullish", confidence, analysis_result))
    elif direction == "SELL" and bias == "bullish" and rsi > 65:
        opportunities.append(_make_opportunity("reversal_bearish", confidence, analysis_result))

    # Volume spike
    if vol_trend == "increasing":
        opportunities.append(_make_opportunity("volume_spike", 60, analysis_result))

    # Regime shift
    if market_phase in ["expansion", "contraction"]:
        opportunities.append(_make_opportunity("regime_shift", 65, analysis_result))

    # Filter low-confidence
    opportunities = [o for o in opportunities if o["confidence"] > 40]
    opportunities.sort(key=lambda x: x["confidence"], reverse=True)

    return opportunities[:5]  # Top 5 opportunities per asset


def _make_opportunity(opp_type: str, confidence: float, analysis: Dict) -> Dict:
    meta = OPPORTUNITY_TYPES.get(opp_type, {})
    report = analysis.get("report", {})
    signal = report.get("signal_summary", {})

    return {
        "type": opp_type,
        "label": meta.get("label", opp_type),
        "severity": meta.get("severity", "low"),
        "confidence": round(confidence, 1),
        "signal": signal.get("direction", "HOLD"),
        "price": analysis.get("price", 0),
        "symbol": analysis.get("symbol", ""),
        "name": analysis.get("name", ""),
        "asset_type": analysis.get("asset_type", ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": {
            "rsi": analysis.get("steps", {}).get("technical_analysis", {}).get("rsi", 50),
            "win_probability": analysis.get("steps", {}).get("monte_carlo", {}).get("win_probability", 50),
            "risk_score": analysis.get("steps", {}).get("risk_model", {}).get("risk_score", 50),
            "regime": analysis.get("steps", {}).get("regime_detection", {}).get("market_phase", {}).get("phase", "unknown"),
        },
    }


def compute_scanner_summary(all_opportunities: List[Dict]) -> Dict:
    """Compute summary statistics from all scanned opportunities."""
    if not all_opportunities:
        return {"total": 0, "high_priority": 0, "by_type": {}, "by_severity": {}}

    by_type = {}
    by_severity = {"high": 0, "medium": 0, "low": 0}

    for opp in all_opportunities:
        t = opp["type"]
        by_type[t] = by_type.get(t, 0) + 1
        s = opp["severity"]
        by_severity[s] = by_severity.get(s, 0) + 1

    return {
        "total": len(all_opportunities),
        "high_priority": by_severity.get("high", 0),
        "by_type": by_type,
        "by_severity": by_severity,
        "top_signal": all_opportunities[0] if all_opportunities else None,
    }
