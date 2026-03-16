"""
Liquidity Mapping Engine
--------------------------
Estimates potential liquidity zones using volatility clusters and volume anomalies.
"""

import math
from typing import Dict, List


def map_liquidity(candles: List[Dict], technical: Dict) -> Dict:
    """Map liquidity zones from candle and volume data."""
    volumes = [c["volume"] for c in candles]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    closes = [c["close"] for c in candles]

    volume_clusters = _find_volume_clusters(candles)
    volatility_zones = _find_volatility_zones(candles)
    liquidity_pools = _estimate_liquidity_pools(highs, lows, volumes, closes)

    return {
        "volume_clusters": volume_clusters,
        "volatility_zones": volatility_zones,
        "liquidity_pools": liquidity_pools,
        "total_zones_detected": len(volume_clusters) + len(liquidity_pools),
        "high_volume_areas": len([c for c in volume_clusters if c["strength"] == "high"]),
    }


def _find_volume_clusters(candles: List[Dict]) -> List[Dict]:
    """Find price levels with abnormally high volume."""
    if len(candles) < 20:
        return []

    avg_vol = sum(c["volume"] for c in candles) / len(candles)
    clusters = []

    for i, c in enumerate(candles):
        if c["volume"] > avg_vol * 1.8:
            mid = (c["high"] + c["low"]) / 2
            strength = "high" if c["volume"] > avg_vol * 2.5 else "medium"
            clusters.append({
                "price_level": round(mid, 6),
                "volume": c["volume"],
                "volume_ratio": round(c["volume"] / avg_vol, 2),
                "strength": strength,
                "candle_index": i,
            })

    # Deduplicate nearby levels
    merged = []
    for cluster in clusters[-15:]:
        if not merged or abs(cluster["price_level"] - merged[-1]["price_level"]) / merged[-1]["price_level"] > 0.005:
            merged.append(cluster)

    return merged[-8:]


def _find_volatility_zones(candles: List[Dict]) -> List[Dict]:
    """Find zones with abnormal volatility."""
    if len(candles) < 20:
        return []

    ranges = [(c["high"] - c["low"]) / c["low"] * 100 if c["low"] > 0 else 0 for c in candles]
    avg_range = sum(ranges) / len(ranges)

    zones = []
    for i, r in enumerate(ranges):
        if r > avg_range * 1.5:
            zones.append({
                "high": round(candles[i]["high"], 6),
                "low": round(candles[i]["low"], 6),
                "range_percent": round(r, 2),
                "type": "expansion",
            })

    return zones[-5:]


def _estimate_liquidity_pools(highs: List[float], lows: List[float], volumes: List[float], closes: List[float]) -> List[Dict]:
    """Estimate where liquidity is likely pooled (above swing highs, below swing lows)."""
    if len(closes) < 30:
        return []

    pools = []
    current = closes[-1]

    # Liquidity above recent swing highs (stop-loss clusters of shorts)
    recent_highs = sorted(highs[-50:], reverse=True)[:5]
    for h in recent_highs:
        if h > current:
            pools.append({
                "price": round(h, 6),
                "type": "buy_side_liquidity",
                "description": "Stop losses of short positions likely clustered above this level",
                "distance_percent": round((h - current) / current * 100, 2),
            })

    # Liquidity below recent swing lows (stop-loss clusters of longs)
    recent_lows = sorted(lows[-50:])[:5]
    for l in recent_lows:
        if l < current:
            pools.append({
                "price": round(l, 6),
                "type": "sell_side_liquidity",
                "description": "Stop losses of long positions likely clustered below this level",
                "distance_percent": round((current - l) / current * 100, 2),
            })

    pools.sort(key=lambda x: x["distance_percent"])
    return pools[:6]
