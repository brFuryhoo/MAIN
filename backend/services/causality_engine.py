"""
Market Causality Engine
------------------------
Attempts to explain WHY price movements are occurring based on
technical indicators, volume, structure, and momentum signals.
"""

from typing import Dict, List


def explain_market_causality(technical: Dict, structure: Dict, liquidity: Dict, candles: List[Dict]) -> Dict:
    """Generate human-readable market causality explanations."""
    explanations = []
    factors = []
    sentiment = "neutral"
    confidence = 50

    price = candles[-1]["close"] if candles else 0
    volume = candles[-1]["volume"] if candles else 0

    # Trend analysis
    trend = technical.get("trend", "sideways")
    trend_strength = technical.get("trend_strength", {}).get("level", "moderate")

    if "uptrend" in trend:
        explanations.append(f"Price is in an {trend.replace('_', ' ')}, supported by momentum above key moving averages.")
        factors.append({"factor": "Trend", "impact": "bullish", "weight": 25})
        confidence += 10
    elif "downtrend" in trend:
        explanations.append(f"Price is in a {trend.replace('_', ' ')}, trading below key moving averages indicating selling pressure.")
        factors.append({"factor": "Trend", "impact": "bearish", "weight": 25})
        confidence -= 10
    else:
        explanations.append("Price is trading sideways without a clear directional bias.")
        factors.append({"factor": "Trend", "impact": "neutral", "weight": 15})

    # Volume analysis
    vol_trend = technical.get("volume_trend", "stable")
    if vol_trend == "increasing":
        explanations.append("Trading volume is expanding, confirming the current price movement with institutional participation.")
        factors.append({"factor": "Volume", "impact": "confirming", "weight": 20})
        confidence += 8
    elif vol_trend == "decreasing":
        explanations.append("Volume is declining, suggesting weakening conviction behind the current move.")
        factors.append({"factor": "Volume", "impact": "diverging", "weight": 20})
        confidence -= 5

    # RSI dynamics
    rsi = technical.get("rsi", 50)
    if rsi > 70:
        explanations.append(f"RSI at {rsi:.1f} indicates overbought conditions. Short-term pullback risk is elevated.")
        factors.append({"factor": "RSI", "impact": "caution", "weight": 15})
        confidence -= 5
    elif rsi < 30:
        explanations.append(f"RSI at {rsi:.1f} indicates oversold conditions. A bounce or reversal opportunity may be forming.")
        factors.append({"factor": "RSI", "impact": "opportunity", "weight": 15})
        confidence += 5
    elif rsi > 50:
        explanations.append(f"RSI at {rsi:.1f} shows positive momentum above the midline.")
        factors.append({"factor": "RSI", "impact": "bullish", "weight": 10})

    # MACD dynamics
    macd = technical.get("macd", {})
    crossover = macd.get("crossover", "neutral")
    histogram = macd.get("histogram", 0)
    if crossover == "bullish" and histogram > 0:
        explanations.append("MACD is bullish with expanding histogram, signaling strengthening upward momentum.")
        factors.append({"factor": "MACD", "impact": "bullish", "weight": 15})
        confidence += 8
    elif crossover == "bearish" and histogram < 0:
        explanations.append("MACD is bearish with expanding negative histogram, indicating growing downward pressure.")
        factors.append({"factor": "MACD", "impact": "bearish", "weight": 15})
        confidence -= 8

    # Market structure
    struct_bias = structure.get("bias", "neutral")
    pattern = structure.get("pattern_description", "")
    if pattern:
        explanations.append(pattern)
        factors.append({"factor": "Market Structure", "impact": struct_bias, "weight": 20})

    # Breakout analysis
    breakout = structure.get("breakout", {})
    if breakout.get("detected"):
        btype = breakout["type"].replace("_", " ").title()
        explanations.append(f"A {btype} has been detected, which could accelerate the current move.")
        factors.append({"factor": "Breakout", "impact": breakout["type"], "weight": 15})
        confidence += 10

    # Liquidity context
    pools = liquidity.get("liquidity_pools", [])
    buy_side = [p for p in pools if p["type"] == "buy_side_liquidity"]
    sell_side = [p for p in pools if p["type"] == "sell_side_liquidity"]
    if buy_side:
        explanations.append(f"Buy-side liquidity detected above at {buy_side[0]['price']:.2f}. Price may target this zone.")
    if sell_side:
        explanations.append(f"Sell-side liquidity below at {sell_side[0]['price']:.2f} could act as a magnet during corrections.")

    # Compute overall sentiment
    bullish_factors = sum(1 for f in factors if f["impact"] in ["bullish", "confirming", "opportunity"])
    bearish_factors = sum(1 for f in factors if f["impact"] in ["bearish", "caution", "diverging"])

    if bullish_factors > bearish_factors + 1:
        sentiment = "bullish"
    elif bearish_factors > bullish_factors + 1:
        sentiment = "bearish"
    else:
        sentiment = "mixed"

    confidence = max(20, min(90, confidence))

    # Create summary
    summary = _create_summary(sentiment, trend, vol_trend, rsi, crossover)

    return {
        "summary": summary,
        "detailed_explanations": explanations,
        "causal_factors": factors,
        "overall_sentiment": sentiment,
        "confidence": confidence,
    }


def _create_summary(sentiment: str, trend: str, volume: str, rsi: float, macd_cross: str) -> str:
    """Create a concise one-paragraph market summary."""
    trend_text = trend.replace("_", " ")

    if sentiment == "bullish":
        return (
            f"The market is showing bullish characteristics with price in a {trend_text}. "
            f"{'Expanding volume confirms buyer conviction. ' if volume == 'increasing' else ''}"
            f"RSI at {rsi:.0f} {'is approaching overbought territory but still has room to run' if rsi > 60 else 'supports further upside'}. "
            f"MACD {macd_cross} crossover adds confluence to the bullish thesis."
        )
    elif sentiment == "bearish":
        return (
            f"The market is displaying bearish pressure with price in a {trend_text}. "
            f"{'Declining volume suggests weakening momentum. ' if volume == 'decreasing' else ''}"
            f"RSI at {rsi:.0f} {'indicates oversold conditions - watch for a potential bounce' if rsi < 35 else 'confirms selling pressure'}. "
            f"MACD {macd_cross} signal reinforces the bearish outlook."
        )
    else:
        return (
            f"The market is in a {trend_text} with mixed signals. "
            f"Volume is {volume}, and RSI at {rsi:.0f} sits near the midline. "
            f"MACD shows a {macd_cross} stance. Traders should wait for a clearer directional signal before committing."
        )
