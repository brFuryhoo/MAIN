"""
Market Regime Detection Engine
--------------------------------
Classifies market regimes: bull/bear/sideways, high/low volatility,
liquidity-driven vs momentum-driven phases.
"""

import math
from typing import Dict, List


def detect_regime(candles: List[Dict], technical: Dict, structure: Dict) -> Dict:
    """Classify current market regime from price data and technical signals."""
    closes = [c["close"] for c in candles]
    volumes = [c["volume"] for c in candles]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]

    trend_regime = _classify_trend_regime(closes, technical)
    volatility_regime = _classify_volatility_regime(candles, closes)
    volume_regime = _classify_volume_regime(volumes)
    market_phase = _classify_market_phase(trend_regime, volatility_regime, structure)
    regime_stability = _compute_regime_stability(closes)

    return {
        "trend_regime": trend_regime,
        "volatility_regime": volatility_regime,
        "volume_regime": volume_regime,
        "market_phase": market_phase,
        "regime_stability": regime_stability,
        "regime_summary": _build_regime_summary(trend_regime, volatility_regime, volume_regime, market_phase),
    }


def _classify_trend_regime(closes: List[float], technical: Dict) -> Dict:
    """Classify the dominant trend regime."""
    if len(closes) < 50:
        return {"type": "undefined", "strength": 0, "duration": 0}

    # Compare short, medium, long term trends
    short_ma = sum(closes[-10:]) / 10
    mid_ma = sum(closes[-30:]) / 30
    long_ma = sum(closes[-50:]) / 50
    current = closes[-1]

    rsi = technical.get("rsi", 50)
    trend_strength = technical.get("trend_strength", {}).get("score", 50)

    if current > short_ma > mid_ma > long_ma:
        regime_type = "strong_bull"
        strength = min(95, 60 + (rsi - 50) * 0.5 + trend_strength * 0.2)
    elif current > mid_ma > long_ma:
        regime_type = "bull"
        strength = min(80, 50 + (rsi - 50) * 0.3 + trend_strength * 0.15)
    elif current < short_ma < mid_ma < long_ma:
        regime_type = "strong_bear"
        strength = min(95, 60 + (50 - rsi) * 0.5 + (100 - trend_strength) * 0.2)
    elif current < mid_ma < long_ma:
        regime_type = "bear"
        strength = min(80, 50 + (50 - rsi) * 0.3 + (100 - trend_strength) * 0.15)
    else:
        regime_type = "sideways"
        spread = (max(closes[-20:]) - min(closes[-20:])) / min(closes[-20:]) * 100 if min(closes[-20:]) > 0 else 0
        strength = max(20, 50 - spread * 3)

    # Duration estimation (how long current regime has been active)
    duration = _estimate_regime_duration(closes, regime_type)

    return {
        "type": regime_type,
        "strength": round(max(0, min(100, strength)), 1),
        "duration_candles": duration,
    }


def _classify_volatility_regime(candles: List[Dict], closes: List[float]) -> Dict:
    """Classify volatility regime: calm, normal, elevated, extreme."""
    if len(closes) < 30:
        return {"type": "normal", "level": 50, "expanding": False}

    # Compute rolling volatility
    returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes)) if closes[i-1] > 0]
    if not returns:
        return {"type": "normal", "level": 50, "expanding": False}

    recent_vol = _std(returns[-14:]) if len(returns) >= 14 else _std(returns)
    historical_vol = _std(returns[-50:]) if len(returns) >= 50 else _std(returns)

    vol_ratio = recent_vol / historical_vol if historical_vol > 0 else 1
    vol_percentile = min(100, vol_ratio * 50)
    expanding = recent_vol > historical_vol * 1.2

    # ATR-based range analysis
    ranges = [(c["high"] - c["low"]) / c["low"] * 100 for c in candles[-20:] if c["low"] > 0]
    avg_range = sum(ranges) / len(ranges) if ranges else 2

    if vol_percentile < 25 or avg_range < 1.5:
        vol_type = "calm"
    elif vol_percentile < 50 or avg_range < 3:
        vol_type = "normal"
    elif vol_percentile < 75 or avg_range < 5:
        vol_type = "elevated"
    else:
        vol_type = "extreme"

    return {
        "type": vol_type,
        "level": round(vol_percentile, 1),
        "expanding": expanding,
        "recent_volatility": round(recent_vol * 100, 3),
        "avg_daily_range": round(avg_range, 2),
    }


def _classify_volume_regime(volumes: List[int]) -> Dict:
    """Classify volume regime: thin, normal, heavy, climactic."""
    if len(volumes) < 20:
        return {"type": "normal", "level": 50}

    recent_avg = sum(volumes[-5:]) / 5
    historical_avg = sum(volumes[-50:]) / min(len(volumes), 50)

    ratio = recent_avg / historical_avg if historical_avg > 0 else 1

    if ratio < 0.6:
        vol_type = "thin"
    elif ratio < 1.2:
        vol_type = "normal"
    elif ratio < 2.0:
        vol_type = "heavy"
    else:
        vol_type = "climactic"

    return {
        "type": vol_type,
        "level": round(min(100, ratio * 50), 1),
        "ratio_vs_average": round(ratio, 2),
    }


def _classify_market_phase(trend: Dict, volatility: Dict, structure: Dict) -> Dict:
    """Classify the overall market phase combining all signals."""
    trend_type = trend.get("type", "sideways")
    vol_type = volatility.get("type", "normal")
    struct_bias = structure.get("bias", "neutral")
    breakout = structure.get("breakout", {}).get("detected", False)
    consolidation = structure.get("consolidation", {}).get("is_consolidating", False)

    if consolidation and vol_type in ("calm", "normal"):
        phase = "accumulation"
        description = "Market is in accumulation phase with low volatility. Smart money may be building positions."
    elif breakout and "bull" in trend_type:
        phase = "markup"
        description = "Bullish breakout in progress. Price is entering a markup phase with expanding momentum."
    elif breakout and "bear" in trend_type:
        phase = "markdown"
        description = "Bearish breakdown detected. Price is entering a markdown phase with selling pressure."
    elif "bull" in trend_type and vol_type == "extreme":
        phase = "distribution"
        description = "Strong trend with extreme volatility may signal distribution. Late-stage euphoria is possible."
    elif "bear" in trend_type and vol_type == "extreme":
        phase = "capitulation"
        description = "Extreme selling with high volatility suggests capitulation. Watch for reversal signals."
    elif "bull" in trend_type:
        phase = "expansion"
        description = "Market is in bullish expansion. Trend is active with healthy momentum."
    elif "bear" in trend_type:
        phase = "contraction"
        description = "Market is in bearish contraction. Selling pressure dominates."
    else:
        phase = "ranging"
        description = "Market is ranging without clear direction. Wait for breakout confirmation."

    return {
        "phase": phase,
        "description": description,
        "driver": "momentum" if vol_type in ("elevated", "extreme") else "liquidity" if consolidation else "trend",
    }


def _compute_regime_stability(closes: List[float]) -> Dict:
    """How stable is the current regime? Frequent changes = unstable."""
    if len(closes) < 30:
        return {"score": 50, "label": "moderate"}

    # Count direction changes in 20-candle windows
    changes = 0
    for i in range(5, len(closes)):
        prev_dir = 1 if closes[i-1] > closes[i-5] else -1
        curr_dir = 1 if closes[i] > closes[i-4] else -1
        if prev_dir != curr_dir:
            changes += 1

    change_rate = changes / (len(closes) - 5)
    stability = max(0, min(100, 100 - change_rate * 500))

    label = "stable" if stability > 70 else "moderate" if stability > 40 else "unstable"

    return {"score": round(stability, 1), "label": label}


def _estimate_regime_duration(closes: List[float], regime_type: str) -> int:
    """Estimate how many candles the current regime has been active."""
    if len(closes) < 10:
        return len(closes)

    ma = sum(closes[-20:]) / 20 if len(closes) >= 20 else sum(closes) / len(closes)
    duration = 0

    for i in range(len(closes) - 1, max(0, len(closes) - 100), -1):
        if "bull" in regime_type and closes[i] > ma:
            duration += 1
        elif "bear" in regime_type and closes[i] < ma:
            duration += 1
        elif regime_type == "sideways":
            duration += 1
        else:
            break
        # Recalculate MA as we go back
        start = max(0, i - 20)
        ma = sum(closes[start:i]) / max(1, i - start)

    return duration


def _build_regime_summary(trend: Dict, volatility: Dict, volume: Dict, phase: Dict) -> str:
    """Build a human-readable regime summary."""
    trend_text = trend["type"].replace("_", " ").title()
    vol_text = volatility["type"]
    vol_dir = "expanding" if volatility.get("expanding") else "contracting"
    phase_text = phase["phase"]

    return (
        f"Market is in a {trend_text} regime ({phase_text} phase) "
        f"with {vol_text} volatility ({vol_dir}). "
        f"Volume is {volume['type']}. "
        f"{phase['description']}"
    )


def _std(values: List[float]) -> float:
    if not values:
        return 0
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return math.sqrt(variance)
