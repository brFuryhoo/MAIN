"""
Executive Market Report Generator
------------------------------------
Generates a structured institutional-style report combining all analysis modules.
"""

from datetime import datetime, timezone
from typing import Dict
import uuid


def generate_executive_report(
    asset: Dict,
    technical: Dict,
    structure: Dict,
    liquidity: Dict,
    monte_carlo: Dict,
    risk: Dict,
    causality: Dict,
    probability: Dict,
) -> Dict:
    """Generate the full executive market intelligence report."""

    signal = probability.get("signal", {})
    scenarios = probability.get("scenarios", {})
    direction = signal.get("direction", "HOLD")
    is_bullish = direction == "BUY"

    # Build report sections
    report = {
        "id": str(uuid.uuid4()),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "asset": {
            "symbol": asset.get("symbol", ""),
            "name": asset.get("name", ""),
            "type": asset.get("type", ""),
            "price": asset.get("price", 0),
            "change_percent": asset.get("change_percent", 0),
        },
        "signal_summary": {
            "direction": direction,
            "confidence": signal.get("confidence", 50),
            "strength": signal.get("strength", "moderate"),
            "bullish_probability": scenarios.get("bullish_continuation", 33),
            "bearish_probability": scenarios.get("bearish_reversal", 33),
            "sideways_probability": scenarios.get("sideways_consolidation", 34),
        },
        "market_structure": {
            "pattern": structure.get("pattern", ""),
            "description": structure.get("pattern_description", ""),
            "bias": structure.get("bias", "neutral"),
            "consolidation": structure.get("consolidation", {}),
            "breakout": structure.get("breakout", {}),
            "key_levels": structure.get("key_levels", [])[:5],
        },
        "technical_analysis": {
            "rsi": technical.get("rsi", 50),
            "rsi_signal": technical.get("rsi_signal", "neutral"),
            "macd": technical.get("macd", {}),
            "trend": technical.get("trend", "sideways"),
            "trend_strength": technical.get("trend_strength", {}),
            "moving_averages": technical.get("moving_averages", {}),
            "bollinger_bands": technical.get("bollinger_bands", {}),
            "atr": technical.get("atr", 0),
            "atr_percent": technical.get("atr_percent", 0),
            "support": technical.get("support", 0),
            "resistance": technical.get("resistance", 0),
        },
        "liquidity_analysis": {
            "total_zones": liquidity.get("total_zones_detected", 0),
            "high_volume_areas": liquidity.get("high_volume_areas", 0),
            "pools": liquidity.get("liquidity_pools", [])[:4],
        },
        "scenario_modeling": {
            "simulations": monte_carlo.get("simulations", 0),
            "win_probability": monte_carlo.get("win_probability", 50),
            "median_target": monte_carlo.get("median_price", 0),
            "expected_return": monte_carlo.get("expected_return_pct", 0),
            "max_upside": monte_carlo.get("max_upside_pct", 0),
            "max_downside": monte_carlo.get("max_drawdown_pct", 0),
            "volatility_annual": monte_carlo.get("volatility_annual", 0),
            "percentiles": monte_carlo.get("percentiles", {}),
        },
        "risk_assessment": {
            "risk_score": risk.get("risk_score", 50),
            "risk_level": risk.get("risk_level", "moderate"),
            "value_at_risk": risk.get("value_at_risk", {}),
            "volatility": risk.get("volatility", {}),
            "max_drawdown": risk.get("max_historical_drawdown", 0),
            "stop_loss_levels": risk.get("stop_loss_levels", {}),
            "invalidation_level": risk.get("invalidation_level", 0),
            "position_sizing": risk.get("position_sizing", {}),
        },
        "market_causality": {
            "summary": causality.get("summary", ""),
            "explanations": causality.get("detailed_explanations", []),
            "factors": causality.get("causal_factors", []),
            "sentiment": causality.get("overall_sentiment", "neutral"),
        },
        "bullish_signals": _extract_bullish_signals(technical, structure, monte_carlo, causality),
        "bearish_risks": _extract_bearish_risks(technical, structure, risk, causality),
        "action_plan": _generate_action_plan(direction, asset, technical, risk, monte_carlo),
    }

    return report


def _extract_bullish_signals(technical: Dict, structure: Dict, monte_carlo: Dict, causality: Dict) -> list:
    """Extract all bullish signals from the analysis."""
    signals = []
    if "uptrend" in technical.get("trend", ""):
        signals.append("Price is in an uptrend above key moving averages")
    if technical.get("macd", {}).get("crossover") == "bullish":
        signals.append("MACD bullish crossover detected")
    if technical.get("rsi", 50) > 50 and technical.get("rsi", 50) < 70:
        signals.append(f"RSI at {technical['rsi']:.0f} shows positive momentum without being overbought")
    if structure.get("bias") == "bullish":
        signals.append("Market structure shows higher highs and higher lows")
    if monte_carlo.get("win_probability", 50) > 55:
        signals.append(f"Monte Carlo simulations show {monte_carlo['win_probability']}% win probability")
    if structure.get("breakout", {}).get("detected") and "bullish" in structure.get("breakout", {}).get("type", ""):
        signals.append("Bullish breakout detected above resistance")
    for f in causality.get("causal_factors", []):
        if f["impact"] == "bullish":
            signals.append(f"{f['factor']} is contributing to bullish momentum")
    if technical.get("moving_averages", {}).get("golden_cross"):
        signals.append("Golden cross (SMA50 > SMA200) is active")
    return signals if signals else ["No strong bullish signals detected"]


def _extract_bearish_risks(technical: Dict, structure: Dict, risk: Dict, causality: Dict) -> list:
    """Extract all bearish risks."""
    risks = []
    if technical.get("rsi", 50) > 70:
        risks.append(f"RSI at {technical['rsi']:.0f} is in overbought territory - pullback risk")
    if technical.get("rsi", 50) < 30:
        risks.append(f"RSI at {technical['rsi']:.0f} is in oversold territory")
    if "downtrend" in technical.get("trend", ""):
        risks.append("Price is in a downtrend below key moving averages")
    if technical.get("macd", {}).get("crossover") == "bearish":
        risks.append("MACD bearish crossover signals weakening momentum")
    if structure.get("bias") == "bearish":
        risks.append("Market structure shows lower highs and lower lows")
    if risk.get("risk_level") == "high":
        risks.append(f"Overall risk score is high ({risk.get('risk_score', 0)}/100)")
    if risk.get("max_historical_drawdown", 0) > 15:
        risks.append(f"Historical maximum drawdown of {risk['max_historical_drawdown']:.1f}%")
    if technical.get("volume_trend") == "decreasing":
        risks.append("Declining volume suggests weakening trend conviction")
    return risks if risks else ["No significant bearish risks identified"]


def _generate_action_plan(direction: str, asset: Dict, technical: Dict, risk: Dict, monte_carlo: Dict) -> Dict:
    """Generate actionable trading plan."""
    price = asset.get("price", 0)
    stop_loss = risk.get("stop_loss_levels", {})
    pos_sizing = risk.get("position_sizing", {})

    if direction == "BUY":
        return {
            "recommendation": "Consider a LONG position",
            "entry_zone": f"${technical.get('support', price * 0.98):.2f} - ${price:.2f}",
            "stop_loss": f"${stop_loss.get('normal', price * 0.95):.2f}",
            "target_1": f"${technical.get('resistance', price * 1.05):.2f}",
            "target_2": f"${monte_carlo.get('percentiles', {}).get('p75', price * 1.08):.2f}",
            "position_size": f"{pos_sizing.get('recommended_pct', 2)}% of portfolio",
            "timeframe": "Medium-term (1-4 weeks)",
            "invalidation": f"Close below ${risk.get('invalidation_level', price * 0.92):.2f}",
        }
    elif direction == "SELL":
        return {
            "recommendation": "Consider a SHORT position or reducing exposure",
            "entry_zone": f"${price:.2f} - ${technical.get('resistance', price * 1.02):.2f}",
            "stop_loss": f"${stop_loss.get('normal', price * 1.05):.2f}",
            "target_1": f"${technical.get('support', price * 0.95):.2f}",
            "target_2": f"${monte_carlo.get('percentiles', {}).get('p25', price * 0.92):.2f}",
            "position_size": f"{pos_sizing.get('recommended_pct', 2)}% of portfolio",
            "timeframe": "Short-term (1-2 weeks)",
            "invalidation": f"Close above ${technical.get('resistance', price * 1.08):.2f}",
        }
    else:
        return {
            "recommendation": "HOLD / Wait for clearer signal",
            "entry_zone": "Wait for breakout confirmation",
            "stop_loss": "N/A",
            "target_1": f"${technical.get('resistance', price * 1.05):.2f} (if bullish)",
            "target_2": f"${technical.get('support', price * 0.95):.2f} (if bearish)",
            "position_size": "Reduce position size until clarity",
            "timeframe": "Wait for confirmation",
            "invalidation": "N/A",
        }
