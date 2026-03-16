"""
Quantitative Scenario Modeling
-------------------------------
Simplified Monte Carlo simulation to estimate possible future price paths.
"""

import math
import random
from typing import Dict, List


def run_monte_carlo(candles: List[Dict], price: float, num_simulations: int = 5000, forecast_periods: int = 30) -> Dict:
    """Run Monte Carlo simulation on the asset."""
    closes = [c["close"] for c in candles]

    if len(closes) < 20:
        return _fallback_result(price)

    # Compute daily returns
    returns = []
    for i in range(1, len(closes)):
        if closes[i - 1] > 0:
            returns.append(math.log(closes[i] / closes[i - 1]))

    if not returns:
        return _fallback_result(price)

    mu = sum(returns) / len(returns)
    variance = sum((r - mu) ** 2 for r in returns) / len(returns)
    sigma = math.sqrt(variance)

    # Run simulations
    final_prices = []
    paths_sample = []

    for sim in range(num_simulations):
        path = [price]
        p = price
        for _ in range(forecast_periods):
            shock = random.gauss(0, 1)
            p = p * math.exp((mu - 0.5 * variance) + sigma * shock)
            path.append(round(p, 2))
        final_prices.append(p)
        if sim < 50:  # Keep 50 sample paths for visualization
            paths_sample.append(path)

    final_prices.sort()

    # Percentile analysis
    pct_5 = final_prices[int(0.05 * len(final_prices))]
    pct_25 = final_prices[int(0.25 * len(final_prices))]
    pct_50 = final_prices[int(0.50 * len(final_prices))]
    pct_75 = final_prices[int(0.75 * len(final_prices))]
    pct_95 = final_prices[int(0.95 * len(final_prices))]

    win_count = sum(1 for p in final_prices if p > price)
    win_probability = round(win_count / len(final_prices) * 100, 1)

    avg_return = round(((pct_50 / price) - 1) * 100, 2)
    max_upside = round(((pct_95 / price) - 1) * 100, 2)
    max_downside = round(((pct_5 / price) - 1) * 100, 2)
    expected_return = round(sum(final_prices) / len(final_prices), 2)

    return {
        "simulations": num_simulations,
        "forecast_periods": forecast_periods,
        "current_price": price,
        "win_probability": win_probability,
        "median_price": round(pct_50, 2),
        "expected_price": round(expected_return, 2),
        "percentiles": {
            "p5": round(pct_5, 2),
            "p25": round(pct_25, 2),
            "p50": round(pct_50, 2),
            "p75": round(pct_75, 2),
            "p95": round(pct_95, 2),
        },
        "expected_return_pct": avg_return,
        "max_upside_pct": max_upside,
        "max_drawdown_pct": max_downside,
        "volatility_annual": round(sigma * math.sqrt(365) * 100, 2),
        "sample_paths": paths_sample[:10],  # Send 10 sample paths to frontend
    }


def _fallback_result(price: float) -> Dict:
    return {
        "simulations": 0,
        "forecast_periods": 30,
        "current_price": price,
        "win_probability": 50.0,
        "median_price": price,
        "expected_price": price,
        "percentiles": {"p5": price * 0.9, "p25": price * 0.95, "p50": price, "p75": price * 1.05, "p95": price * 1.1},
        "expected_return_pct": 0,
        "max_upside_pct": 10,
        "max_drawdown_pct": -10,
        "volatility_annual": 50,
        "sample_paths": [],
    }
