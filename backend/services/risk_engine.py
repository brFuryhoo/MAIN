"""
Risk Modeling Engine
---------------------
Estimates downside risk, volatility exposure, and invalidation levels.
"""

import math
from typing import Dict, List


def compute_risk_model(candles: List[Dict], price: float, technical: Dict, monte_carlo: Dict) -> Dict:
    """Compute comprehensive risk metrics."""
    closes = [c["close"] for c in candles]
    atr = technical.get("atr", 0)
    atr_pct = technical.get("atr_percent", 2)

    # Value at Risk (simplified)
    var_95 = _compute_var(closes, 0.95)
    var_99 = _compute_var(closes, 0.99)

    # Volatility metrics
    daily_vol = _compute_daily_volatility(closes)
    annual_vol = daily_vol * math.sqrt(365)

    # Max drawdown from historical data
    max_dd = _compute_max_drawdown(closes)

    # Risk levels
    stop_loss_tight = round(price - 1.5 * atr, 6) if atr > 0 else round(price * 0.97, 6)
    stop_loss_normal = round(price - 2.0 * atr, 6) if atr > 0 else round(price * 0.95, 6)
    stop_loss_wide = round(price - 3.0 * atr, 6) if atr > 0 else round(price * 0.93, 6)

    invalidation = round(technical.get("support", price * 0.92), 6)

    # Position sizing (Kelly criterion simplified)
    win_prob = monte_carlo.get("win_probability", 50) / 100
    avg_win = abs(monte_carlo.get("max_upside_pct", 5))
    avg_loss = abs(monte_carlo.get("max_drawdown_pct", 5))
    if avg_loss > 0:
        kelly = max(0, (win_prob * avg_win - (1 - win_prob) * avg_loss) / avg_win)
    else:
        kelly = 0.02
    recommended_size = round(min(kelly, 0.05) * 100, 2)  # Cap at 5%

    # Overall risk score (0-100, higher = more risky)
    risk_score = _compute_risk_score(daily_vol, max_dd, atr_pct, technical)

    return {
        "risk_score": risk_score,
        "risk_level": "low" if risk_score < 35 else "moderate" if risk_score < 65 else "high",
        "value_at_risk": {
            "var_95": round(var_95 * 100, 2),
            "var_99": round(var_99 * 100, 2),
        },
        "volatility": {
            "daily": round(daily_vol * 100, 2),
            "annualized": round(annual_vol * 100, 2),
        },
        "max_historical_drawdown": round(max_dd * 100, 2),
        "stop_loss_levels": {
            "tight": stop_loss_tight,
            "normal": stop_loss_normal,
            "wide": stop_loss_wide,
        },
        "invalidation_level": invalidation,
        "position_sizing": {
            "recommended_pct": recommended_size,
            "max_risk_per_trade": "2%",
            "kelly_fraction": round(kelly, 4),
        },
    }


def _compute_var(closes: List[float], confidence: float) -> float:
    """Simplified Value at Risk."""
    if len(closes) < 20:
        return 0.05
    returns = []
    for i in range(1, len(closes)):
        if closes[i - 1] > 0:
            returns.append((closes[i] - closes[i - 1]) / closes[i - 1])
    returns.sort()
    index = int((1 - confidence) * len(returns))
    return abs(returns[index]) if index < len(returns) else 0.05


def _compute_daily_volatility(closes: List[float]) -> float:
    if len(closes) < 2:
        return 0.02
    returns = []
    for i in range(1, len(closes)):
        if closes[i - 1] > 0:
            returns.append(math.log(closes[i] / closes[i - 1]))
    if not returns:
        return 0.02
    mean = sum(returns) / len(returns)
    variance = sum((r - mean) ** 2 for r in returns) / len(returns)
    return math.sqrt(variance)


def _compute_max_drawdown(closes: List[float]) -> float:
    if len(closes) < 2:
        return 0
    peak = closes[0]
    max_dd = 0
    for c in closes:
        if c > peak:
            peak = c
        dd = (peak - c) / peak if peak > 0 else 0
        max_dd = max(max_dd, dd)
    return max_dd


def _compute_risk_score(daily_vol: float, max_dd: float, atr_pct: float, technical: Dict) -> int:
    score = 30  # Base
    score += min(daily_vol * 100 * 5, 20)  # Volatility contribution
    score += min(max_dd * 50, 20)  # Drawdown contribution
    score += min(atr_pct * 2, 15)  # ATR contribution

    rsi = technical.get("rsi", 50)
    if rsi > 75 or rsi < 25:
        score += 10  # Extreme RSI adds risk

    bb = technical.get("bollinger_bands", {})
    if bb.get("width", 0) > 8:
        score += 5

    return max(0, min(100, int(score)))
