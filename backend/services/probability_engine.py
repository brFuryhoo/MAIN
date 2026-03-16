"""
Probability Engine
-------------------
Combines all analysis signals to produce scenario probabilities:
bullish continuation, bearish reversal, sideways consolidation.
"""

from typing import Dict


def compute_probabilities(technical: Dict, structure: Dict, liquidity: Dict, monte_carlo: Dict, risk: Dict, causality: Dict) -> Dict:
    """Compute weighted probability scores for each scenario."""

    # Start with base weights
    bullish_score = 0
    bearish_score = 0
    sideways_score = 0

    # --- Technical signals (weight: 30%) ---
    rsi = technical.get("rsi", 50)
    trend = technical.get("trend", "sideways")
    macd_cross = technical.get("macd", {}).get("crossover", "neutral")
    trend_str = technical.get("trend_strength", {}).get("score", 50)

    if "uptrend" in trend:
        bullish_score += 15
    elif "downtrend" in trend:
        bearish_score += 15
    else:
        sideways_score += 10

    if macd_cross == "bullish":
        bullish_score += 10
    elif macd_cross == "bearish":
        bearish_score += 10
    else:
        sideways_score += 5

    if rsi > 60:
        bullish_score += 5
    elif rsi < 40:
        bearish_score += 5
    else:
        sideways_score += 5

    # --- Market structure (weight: 25%) ---
    struct_bias = structure.get("bias", "neutral")
    if struct_bias == "bullish":
        bullish_score += 20
    elif struct_bias == "bearish":
        bearish_score += 20
    elif struct_bias == "volatile":
        sideways_score += 10
        bullish_score += 5
        bearish_score += 5
    else:
        sideways_score += 15

    breakout = structure.get("breakout", {})
    if breakout.get("detected"):
        if "bullish" in breakout.get("type", ""):
            bullish_score += 10
        elif "bearish" in breakout.get("type", ""):
            bearish_score += 10

    # --- Monte Carlo (weight: 20%) ---
    win_prob = monte_carlo.get("win_probability", 50)
    if win_prob > 60:
        bullish_score += 15
    elif win_prob < 40:
        bearish_score += 15
    else:
        sideways_score += 10

    expected_ret = monte_carlo.get("expected_return_pct", 0)
    if expected_ret > 2:
        bullish_score += 5
    elif expected_ret < -2:
        bearish_score += 5

    # --- Causality (weight: 15%) ---
    causal_sentiment = causality.get("overall_sentiment", "mixed")
    if causal_sentiment == "bullish":
        bullish_score += 12
    elif causal_sentiment == "bearish":
        bearish_score += 12
    else:
        sideways_score += 8

    # --- Risk adjustment (weight: 10%) ---
    risk_level = risk.get("risk_level", "moderate")
    if risk_level == "high":
        sideways_score += 5  # High risk increases uncertainty
        bearish_score += 3
    elif risk_level == "low":
        bullish_score += 5

    # Normalize to 100%
    total = bullish_score + bearish_score + sideways_score
    if total == 0:
        total = 1

    bullish_pct = round(bullish_score / total * 100, 1)
    bearish_pct = round(bearish_score / total * 100, 1)
    sideways_pct = round(100 - bullish_pct - bearish_pct, 1)

    # Determine primary signal
    if bullish_pct > bearish_pct and bullish_pct > sideways_pct:
        direction = "BUY"
        confidence = bullish_pct
    elif bearish_pct > bullish_pct and bearish_pct > sideways_pct:
        direction = "SELL"
        confidence = bearish_pct
    else:
        direction = "HOLD"
        confidence = sideways_pct

    # Signal strength
    spread = abs(bullish_pct - bearish_pct)
    strength = "strong" if spread > 25 else "moderate" if spread > 10 else "weak"

    return {
        "scenarios": {
            "bullish_continuation": bullish_pct,
            "bearish_reversal": bearish_pct,
            "sideways_consolidation": sideways_pct,
        },
        "signal": {
            "direction": direction,
            "confidence": round(confidence, 1),
            "strength": strength,
        },
        "scoring_breakdown": {
            "technical_contribution": {"bullish": min(bullish_score, 30), "bearish": min(bearish_score, 30)},
            "structure_contribution": struct_bias,
            "monte_carlo_contribution": f"{win_prob}% win probability",
            "causality_contribution": causal_sentiment,
            "risk_adjustment": risk_level,
        },
    }
