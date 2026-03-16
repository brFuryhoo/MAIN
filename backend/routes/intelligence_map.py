"""
JARVIS Global Market Intelligence Map
========================================
Correlation analysis, capital flow detection, and heat map data
across all asset classes.
"""

from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import os
import logging
import math

from services.market_data import market_data_adapter
from services.technical_engine import compute_technical_analysis
from services.market_structure import detect_market_structure
from services.monte_carlo import run_monte_carlo
from services.risk_engine import compute_risk_model
from services.regime_detector import detect_regime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/intelligence", tags=["intelligence-map"])

INTEL_ASSETS = [
    {"symbol": "bitcoin", "name": "Bitcoin", "coingecko_id": "bitcoin", "asset_type": "crypto", "sector": "crypto"},
    {"symbol": "ethereum", "name": "Ethereum", "coingecko_id": "ethereum", "asset_type": "crypto", "sector": "crypto"},
    {"symbol": "solana", "name": "Solana", "coingecko_id": "solana", "asset_type": "crypto", "sector": "crypto"},
    {"symbol": "AAPL", "name": "Apple", "asset_type": "stock", "sector": "tech"},
    {"symbol": "NVDA", "name": "NVIDIA", "asset_type": "stock", "sector": "tech"},
    {"symbol": "MSFT", "name": "Microsoft", "asset_type": "stock", "sector": "tech"},
    {"symbol": "TSLA", "name": "Tesla", "asset_type": "stock", "sector": "auto"},
    {"symbol": "AMZN", "name": "Amazon", "asset_type": "stock", "sector": "tech"},
    {"symbol": "GOOGL", "name": "Alphabet", "asset_type": "stock", "sector": "tech"},
    {"symbol": "XAUUSD", "name": "Gold", "asset_type": "commodity", "sector": "commodity"},
    {"symbol": "EUR/USD", "name": "EUR/USD", "asset_type": "forex", "sector": "forex"},
]


def _compute_correlation(returns_a, returns_b):
    """Pearson correlation between two return series."""
    n = min(len(returns_a), len(returns_b))
    if n < 5:
        return 0
    a = returns_a[:n]
    b = returns_b[:n]
    mean_a = sum(a) / n
    mean_b = sum(b) / n
    cov = sum((a[i] - mean_a) * (b[i] - mean_b) for i in range(n)) / n
    std_a = math.sqrt(sum((x - mean_a) ** 2 for x in a) / n)
    std_b = math.sqrt(sum((x - mean_b) ** 2 for x in b) / n)
    if std_a == 0 or std_b == 0:
        return 0
    return round(cov / (std_a * std_b), 3)


def _get_returns(candles):
    """Get log returns from candles."""
    closes = [c["close"] for c in candles]
    returns = []
    for i in range(1, len(closes)):
        if closes[i - 1] > 0:
            returns.append(math.log(closes[i] / closes[i - 1]))
    return returns


@router.get("/map")
async def get_intelligence_map():
    """Generate the Global Market Intelligence Map data."""
    try:
        asset_data_list = []
        returns_map = {}

        for asset_info in INTEL_ASSETS:
            try:
                data = await market_data_adapter.get_asset_data(
                    symbol=asset_info["symbol"],
                    asset_type=asset_info["asset_type"],
                    coingecko_id=asset_info.get("coingecko_id"),
                )
                candles = data.get("candles", [])
                price = data.get("price", 0)
                if not candles or price <= 0:
                    continue

                tech = compute_technical_analysis(candles, price)
                struct = detect_market_structure(candles, tech)
                regime = detect_regime(candles, tech, struct)

                returns = _get_returns(candles)
                returns_map[asset_info["symbol"]] = returns

                # Compute momentum score (-100 to +100)
                rsi = tech.get("rsi", 50)
                trend = tech.get("trend", "sideways")
                momentum = (rsi - 50) * 2
                if "uptrend" in trend:
                    momentum += 20
                elif "downtrend" in trend:
                    momentum -= 20
                momentum = max(-100, min(100, momentum))

                asset_entry = {
                    "symbol": asset_info["symbol"],
                    "name": asset_info["name"],
                    "asset_type": asset_info["asset_type"],
                    "sector": asset_info["sector"],
                    "price": price,
                    "change_percent": data.get("change_percent", 0),
                    "rsi": round(rsi, 1),
                    "trend": trend,
                    "momentum": round(momentum, 1),
                    "volatility": tech.get("atr_percent", 2),
                    "regime": regime.get("market_phase", {}).get("phase", "unknown"),
                    "regime_label": regime.get("regime_summary", ""),
                    "bias": struct.get("bias", "neutral"),
                    "volume_trend": tech.get("volume_trend", "stable"),
                }
                asset_data_list.append(asset_entry)

            except Exception as e:
                logger.warning(f"Intel map: failed {asset_info['symbol']}: {e}")

        # Compute correlations
        symbols = list(returns_map.keys())
        correlations = []
        for i in range(len(symbols)):
            for j in range(i + 1, len(symbols)):
                corr = _compute_correlation(returns_map[symbols[i]], returns_map[symbols[j]])
                if abs(corr) > 0.2:
                    correlations.append({
                        "asset_a": symbols[i],
                        "asset_b": symbols[j],
                        "correlation": corr,
                        "strength": "strong" if abs(corr) > 0.7 else "moderate" if abs(corr) > 0.4 else "weak",
                    })
        correlations.sort(key=lambda x: abs(x["correlation"]), reverse=True)

        # Capital flow indicators (sector aggregation)
        sectors = {}
        for a in asset_data_list:
            s = a["sector"]
            if s not in sectors:
                sectors[s] = {"momentum_sum": 0, "count": 0, "assets": []}
            sectors[s]["momentum_sum"] += a["momentum"]
            sectors[s]["count"] += 1
            sectors[s]["assets"].append(a["symbol"])

        capital_flows = []
        for sector, data in sectors.items():
            avg_momentum = data["momentum_sum"] / data["count"] if data["count"] > 0 else 0
            capital_flows.append({
                "sector": sector,
                "avg_momentum": round(avg_momentum, 1),
                "direction": "inflow" if avg_momentum > 10 else ("outflow" if avg_momentum < -10 else "neutral"),
                "asset_count": data["count"],
                "assets": data["assets"],
            })
        capital_flows.sort(key=lambda x: x["avg_momentum"], reverse=True)

        # Market summary
        bullish = sum(1 for a in asset_data_list if a["momentum"] > 15)
        bearish = sum(1 for a in asset_data_list if a["momentum"] < -15)
        neutral = len(asset_data_list) - bullish - bearish
        avg_vol = round(sum(a["volatility"] for a in asset_data_list) / len(asset_data_list), 2) if asset_data_list else 0

        return {
            "status": "complete",
            "assets": asset_data_list,
            "correlations": correlations[:20],
            "capital_flows": capital_flows,
            "market_summary": {
                "total_assets": len(asset_data_list),
                "bullish": bullish,
                "bearish": bearish,
                "neutral": neutral,
                "avg_volatility": avg_vol,
                "dominant_regime": max(
                    set(a["regime"] for a in asset_data_list),
                    key=lambda x: sum(1 for a in asset_data_list if a["regime"] == x),
                ) if asset_data_list else "unknown",
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"Intelligence map error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
