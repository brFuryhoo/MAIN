"""
Market Structure Detection
---------------------------
Detects higher highs / higher lows / lower highs / lower lows,
consolidation ranges, and breakout formations.
"""

from typing import Dict, List


def detect_market_structure(candles: List[Dict], technical: Dict) -> Dict:
    """Analyze market structure from candle data."""
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    closes = [c["close"] for c in candles]

    swing_points = _find_swing_points(highs, lows, lookback=5)
    structure = _classify_structure(swing_points)
    consolidation = _detect_consolidation(closes, highs, lows)
    breakout = _detect_breakout(closes, highs, lows, technical)

    return {
        "swing_points": swing_points[-10:],  # Last 10 swings
        "pattern": structure["pattern"],
        "pattern_description": structure["description"],
        "bias": structure["bias"],
        "consolidation": consolidation,
        "breakout": breakout,
        "key_levels": _extract_key_levels(swing_points, closes[-1] if closes else 0),
    }


def _find_swing_points(highs: List[float], lows: List[float], lookback: int = 5) -> List[Dict]:
    """Identify swing highs and swing lows."""
    swings = []
    n = len(highs)
    if n < lookback * 2 + 1:
        return swings

    for i in range(lookback, n - lookback):
        # Swing High
        if highs[i] == max(highs[i - lookback:i + lookback + 1]):
            swings.append({"type": "high", "value": round(highs[i], 6), "index": i})
        # Swing Low
        if lows[i] == min(lows[i - lookback:i + lookback + 1]):
            swings.append({"type": "low", "value": round(lows[i], 6), "index": i})

    swings.sort(key=lambda x: x["index"])
    return swings


def _classify_structure(swings: List[Dict]) -> Dict:
    """Classify market structure from swing points."""
    if len(swings) < 4:
        return {"pattern": "insufficient_data", "description": "Not enough data points", "bias": "neutral"}

    swing_highs = [s for s in swings if s["type"] == "high"][-4:]
    swing_lows = [s for s in swings if s["type"] == "low"][-4:]

    hh = len(swing_highs) >= 2 and swing_highs[-1]["value"] > swing_highs[-2]["value"]
    hl = len(swing_lows) >= 2 and swing_lows[-1]["value"] > swing_lows[-2]["value"]
    lh = len(swing_highs) >= 2 and swing_highs[-1]["value"] < swing_highs[-2]["value"]
    ll = len(swing_lows) >= 2 and swing_lows[-1]["value"] < swing_lows[-2]["value"]

    if hh and hl:
        return {
            "pattern": "higher_highs_higher_lows",
            "description": "Price is forming higher highs and higher lows, indicating a strong bullish market structure.",
            "bias": "bullish",
        }
    elif lh and ll:
        return {
            "pattern": "lower_highs_lower_lows",
            "description": "Price is forming lower highs and lower lows, indicating a bearish market structure.",
            "bias": "bearish",
        }
    elif lh and hl:
        return {
            "pattern": "converging_range",
            "description": "Price is contracting into a tighter range with lower highs and higher lows. A breakout is likely.",
            "bias": "neutral",
        }
    elif hh and ll:
        return {
            "pattern": "expanding_range",
            "description": "Price is showing increasing volatility with higher highs and lower lows.",
            "bias": "volatile",
        }
    else:
        return {
            "pattern": "sideways_consolidation",
            "description": "Price is consolidating without a clear directional bias.",
            "bias": "neutral",
        }


def _detect_consolidation(closes: List[float], highs: List[float], lows: List[float]) -> Dict:
    """Detect if price is in consolidation."""
    if len(closes) < 20:
        return {"is_consolidating": False, "range_high": 0, "range_low": 0, "range_percent": 0}

    recent = closes[-20:]
    r_high = max(highs[-20:])
    r_low = min(lows[-20:])
    range_pct = ((r_high - r_low) / r_low * 100) if r_low > 0 else 0

    is_consolidating = range_pct < 5  # Less than 5% range = consolidation

    return {
        "is_consolidating": is_consolidating,
        "range_high": round(r_high, 6),
        "range_low": round(r_low, 6),
        "range_percent": round(range_pct, 2),
        "duration_candles": 20,
    }


def _detect_breakout(closes: List[float], highs: List[float], lows: List[float], technical: Dict) -> Dict:
    """Detect breakout formations."""
    if len(closes) < 30:
        return {"detected": False, "type": "none", "strength": 0}

    recent_high = max(highs[-30:-5]) if len(highs) > 30 else max(highs[:-5])
    recent_low = min(lows[-30:-5]) if len(lows) > 30 else min(lows[:-5])
    current = closes[-1]
    bb = technical.get("bollinger_bands", {})

    if current > recent_high:
        return {"detected": True, "type": "bullish_breakout", "level": round(recent_high, 6), "strength": 75}
    elif current < recent_low:
        return {"detected": True, "type": "bearish_breakdown", "level": round(recent_low, 6), "strength": 75}
    elif bb and current > bb.get("upper", float("inf")):
        return {"detected": True, "type": "bollinger_breakout", "level": round(bb["upper"], 6), "strength": 60}

    return {"detected": False, "type": "none", "strength": 0}


def _extract_key_levels(swings: List[Dict], current_price: float) -> List[Dict]:
    """Extract key price levels from swing points."""
    levels = []
    for s in swings[-20:]:
        dist = abs(s["value"] - current_price) / current_price * 100 if current_price > 0 else 0
        levels.append({
            "price": s["value"],
            "type": "resistance" if s["type"] == "high" else "support",
            "distance_percent": round(dist, 2),
        })

    # Sort by distance
    levels.sort(key=lambda x: x["distance_percent"])
    return levels[:10]
