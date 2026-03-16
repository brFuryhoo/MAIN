"""
Manipulation Detection Engine
-------------------------------
Detects potential institutional manipulation patterns:
- Liquidity sweeps (stop hunts above/below key levels)
- Volume anomalies (abnormal spikes without price follow-through)
- Volatility traps (false breakouts designed to trap traders)
- Wash trading indicators
"""

import math
from typing import Dict, List


def detect_manipulation(candles: List[Dict], technical: Dict, structure: Dict, liquidity: Dict) -> Dict:
    """Run manipulation detection across multiple dimensions."""
    if len(candles) < 30:
        return _empty_result()

    closes = [c["close"] for c in candles]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    volumes = [c["volume"] for c in candles]

    sweeps = _detect_liquidity_sweeps(candles, highs, lows, closes, structure)
    stop_hunts = _detect_stop_hunts(candles, highs, lows, closes, technical)
    vol_anomalies = _detect_volume_anomalies(candles, volumes, closes)
    vol_traps = _detect_volatility_traps(candles, highs, lows, closes, volumes)

    total_events = len(sweeps) + len(stop_hunts) + len(vol_anomalies) + len(vol_traps)
    manipulation_score = _compute_manipulation_score(sweeps, stop_hunts, vol_anomalies, vol_traps)

    return {
        "manipulation_score": manipulation_score,
        "risk_level": "low" if manipulation_score < 30 else "moderate" if manipulation_score < 60 else "high",
        "total_events_detected": total_events,
        "liquidity_sweeps": sweeps[-3:],
        "stop_hunts": stop_hunts[-3:],
        "volume_anomalies": vol_anomalies[-3:],
        "volatility_traps": vol_traps[-3:],
        "warnings": _generate_warnings(sweeps, stop_hunts, vol_anomalies, vol_traps, manipulation_score),
        "summary": _build_summary(manipulation_score, sweeps, stop_hunts, vol_anomalies, vol_traps),
    }


def _detect_liquidity_sweeps(candles: List[Dict], highs: List[float], lows: List[float], closes: List[float], structure: Dict) -> List[Dict]:
    """Detect liquidity sweeps: price briefly exceeds a key level then reverses."""
    sweeps = []
    key_levels = structure.get("key_levels", [])
    support = structure.get("consolidation", {}).get("range_low", 0)
    resistance = structure.get("consolidation", {}).get("range_high", float("inf"))

    for i in range(max(5, len(candles) - 30), len(candles)):
        c = candles[i]
        wick_up = c["high"] - max(c["open"], c["close"])
        wick_down = min(c["open"], c["close"]) - c["low"]
        body = abs(c["close"] - c["open"])

        # Sweep above resistance then close below
        if wick_up > body * 2 and c["close"] < c["open"]:
            prev_high = max(highs[max(0, i-10):i]) if i > 0 else c["high"]
            if c["high"] > prev_high:
                sweeps.append({
                    "type": "upside_sweep",
                    "candle_index": i,
                    "sweep_high": round(c["high"], 6),
                    "close_price": round(c["close"], 6),
                    "wick_size_pct": round(wick_up / c["close"] * 100, 3) if c["close"] > 0 else 0,
                    "description": "Price swept above resistance with a long upper wick, suggesting stop-loss hunting of short positions.",
                })

        # Sweep below support then close above
        if wick_down > body * 2 and c["close"] > c["open"]:
            prev_low = min(lows[max(0, i-10):i]) if i > 0 else c["low"]
            if c["low"] < prev_low:
                sweeps.append({
                    "type": "downside_sweep",
                    "candle_index": i,
                    "sweep_low": round(c["low"], 6),
                    "close_price": round(c["close"], 6),
                    "wick_size_pct": round(wick_down / c["close"] * 100, 3) if c["close"] > 0 else 0,
                    "description": "Price swept below support with a long lower wick, suggesting stop-loss hunting of long positions.",
                })

    return sweeps


def _detect_stop_hunts(candles: List[Dict], highs: List[float], lows: List[float], closes: List[float], technical: Dict) -> List[Dict]:
    """Detect stop-loss hunts: sharp moves to obvious stop levels followed by reversal."""
    hunts = []
    support = technical.get("support", 0)
    resistance = technical.get("resistance", float("inf"))

    for i in range(max(3, len(candles) - 20), len(candles) - 1):
        c = candles[i]
        next_c = candles[i + 1]

        # Sharp move down through support, then recovery
        if c["low"] < support and next_c["close"] > support:
            recovery_pct = (next_c["close"] - c["low"]) / c["low"] * 100 if c["low"] > 0 else 0
            if recovery_pct > 0.5:
                hunts.append({
                    "type": "bear_trap",
                    "candle_index": i,
                    "hunt_level": round(c["low"], 6),
                    "recovery_pct": round(recovery_pct, 2),
                    "description": "Price briefly broke below support level then quickly recovered. Classic bear trap / stop hunt pattern.",
                })

        # Sharp move up through resistance, then rejection
        if c["high"] > resistance and next_c["close"] < resistance:
            rejection_pct = (c["high"] - next_c["close"]) / c["high"] * 100 if c["high"] > 0 else 0
            if rejection_pct > 0.5:
                hunts.append({
                    "type": "bull_trap",
                    "candle_index": i,
                    "hunt_level": round(c["high"], 6),
                    "rejection_pct": round(rejection_pct, 2),
                    "description": "Price briefly broke above resistance then quickly reversed. Classic bull trap / stop hunt pattern.",
                })

    return hunts


def _detect_volume_anomalies(candles: List[Dict], volumes: List[int], closes: List[float]) -> List[Dict]:
    """Detect abnormal volume spikes without corresponding price movement."""
    anomalies = []
    if len(volumes) < 20:
        return anomalies

    avg_vol = sum(volumes[-50:]) / min(50, len(volumes))

    for i in range(max(5, len(candles) - 20), len(candles)):
        c = candles[i]
        vol = c["volume"]
        price_change_pct = abs(c["close"] - c["open"]) / c["open"] * 100 if c["open"] > 0 else 0
        vol_ratio = vol / avg_vol if avg_vol > 0 else 1

        # High volume but tiny price change = suspicious
        if vol_ratio > 2.5 and price_change_pct < 0.5:
            anomalies.append({
                "type": "volume_without_movement",
                "candle_index": i,
                "volume_ratio": round(vol_ratio, 2),
                "price_change_pct": round(price_change_pct, 3),
                "description": f"Volume was {vol_ratio:.1f}x average but price moved only {price_change_pct:.2f}%. May indicate institutional accumulation or distribution.",
            })

        # Sudden volume spike (3x+)
        if vol_ratio > 3.0:
            anomalies.append({
                "type": "volume_spike",
                "candle_index": i,
                "volume_ratio": round(vol_ratio, 2),
                "price_change_pct": round(price_change_pct, 3),
                "description": f"Volume spike of {vol_ratio:.1f}x average detected. This often precedes significant price movement.",
            })

    return anomalies


def _detect_volatility_traps(candles: List[Dict], highs: List[float], lows: List[float], closes: List[float], volumes: List[int]) -> List[Dict]:
    """Detect false breakouts / volatility traps."""
    traps = []

    for i in range(max(5, len(candles) - 15), len(candles) - 2):
        c = candles[i]
        next1 = candles[i + 1]
        next2 = candles[i + 2] if i + 2 < len(candles) else None

        prev_range_high = max(highs[max(0, i-10):i])
        prev_range_low = min(lows[max(0, i-10):i])

        # False bullish breakout: breaks above range, then reverses
        if c["close"] > prev_range_high and next1["close"] < prev_range_high:
            traps.append({
                "type": "false_breakout_up",
                "candle_index": i,
                "breakout_level": round(prev_range_high, 6),
                "reversal_close": round(next1["close"], 6),
                "description": "False bullish breakout detected. Price broke above resistance but immediately reversed back below.",
            })

        # False bearish breakdown
        if c["close"] < prev_range_low and next1["close"] > prev_range_low:
            traps.append({
                "type": "false_breakdown",
                "candle_index": i,
                "breakdown_level": round(prev_range_low, 6),
                "reversal_close": round(next1["close"], 6),
                "description": "False bearish breakdown detected. Price broke below support but immediately recovered.",
            })

    return traps


def _compute_manipulation_score(sweeps, stop_hunts, vol_anomalies, vol_traps) -> int:
    """Compute overall manipulation risk score (0-100)."""
    score = 10  # Base
    score += len(sweeps) * 15
    score += len(stop_hunts) * 20
    score += len(vol_anomalies) * 8
    score += len(vol_traps) * 18
    return max(0, min(100, score))


def _generate_warnings(sweeps, stop_hunts, vol_anomalies, vol_traps, score) -> List[str]:
    """Generate human-readable manipulation warnings."""
    warnings = []
    if sweeps:
        warnings.append(f"{len(sweeps)} liquidity sweep(s) detected. Market makers may be targeting stop-loss clusters.")
    if stop_hunts:
        warnings.append(f"{len(stop_hunts)} potential stop hunt(s) identified. Be cautious with tight stop-losses near key levels.")
    if vol_anomalies:
        warnings.append(f"{len(vol_anomalies)} volume anomaly/anomalies found. Institutional activity may be distorting normal price behavior.")
    if vol_traps:
        warnings.append(f"{len(vol_traps)} false breakout(s) detected. Breakout traders may have been trapped.")
    if score >= 60:
        warnings.append("HIGH MANIPULATION RISK: Multiple manipulation indicators detected. Exercise extreme caution and use wider stops.")
    elif score >= 30:
        warnings.append("MODERATE MANIPULATION RISK: Some abnormal market behavior detected. Factor this into your risk management.")
    return warnings if warnings else ["No significant manipulation patterns detected in recent price action."]


def _build_summary(score, sweeps, stop_hunts, vol_anomalies, vol_traps) -> str:
    total = len(sweeps) + len(stop_hunts) + len(vol_anomalies) + len(vol_traps)
    if total == 0:
        return "No significant manipulation patterns detected. Market appears to be trading organically."
    level = "high" if score >= 60 else "moderate" if score >= 30 else "low"
    return (
        f"Manipulation risk is {level} (score: {score}/100) with {total} event(s) detected. "
        f"Identified: {len(sweeps)} liquidity sweep(s), {len(stop_hunts)} stop hunt(s), "
        f"{len(vol_anomalies)} volume anomaly/anomalies, {len(vol_traps)} false breakout(s)."
    )


def _empty_result() -> Dict:
    return {
        "manipulation_score": 0,
        "risk_level": "low",
        "total_events_detected": 0,
        "liquidity_sweeps": [],
        "stop_hunts": [],
        "volume_anomalies": [],
        "volatility_traps": [],
        "warnings": ["Insufficient data for manipulation detection."],
        "summary": "Insufficient data for manipulation analysis.",
    }
