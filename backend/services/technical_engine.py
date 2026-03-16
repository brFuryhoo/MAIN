"""
Technical Analysis Engine
--------------------------
Computes RSI, MACD, Moving Averages, Bollinger Bands,
trend strength, and support/resistance levels from candle data.
"""

import math
from typing import Dict, List


def compute_technical_analysis(candles: List[Dict], price: float) -> Dict:
    """Run full technical analysis on OHLCV candle data."""
    closes = [c["close"] for c in candles]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    volumes = [c["volume"] for c in candles]

    rsi = _compute_rsi(closes, 14)
    macd_data = _compute_macd(closes)
    sma_20 = _sma(closes, 20)
    sma_50 = _sma(closes, 50)
    sma_200 = _sma(closes, 200)
    ema_12 = _ema(closes, 12)
    ema_26 = _ema(closes, 26)
    bb = _bollinger_bands(closes, 20)
    atr = _compute_atr(highs, lows, closes, 14)
    trend = _detect_trend(closes, sma_20, sma_50)
    trend_strength = _compute_trend_strength(closes, sma_20, sma_50, rsi)
    support, resistance = _find_support_resistance(highs, lows, closes)
    avg_volume = sum(volumes[-20:]) / 20 if len(volumes) >= 20 else sum(volumes) / max(len(volumes), 1)
    volume_trend = "increasing" if volumes[-1] > avg_volume * 1.2 else "decreasing" if volumes[-1] < avg_volume * 0.8 else "stable"

    return {
        "rsi": round(rsi, 2),
        "rsi_signal": "overbought" if rsi > 70 else "oversold" if rsi < 30 else "neutral",
        "macd": macd_data,
        "moving_averages": {
            "sma_20": round(sma_20, 6),
            "sma_50": round(sma_50, 6),
            "sma_200": round(sma_200, 6),
            "ema_12": round(ema_12, 6),
            "ema_26": round(ema_26, 6),
            "price_vs_sma20": "above" if price > sma_20 else "below",
            "price_vs_sma50": "above" if price > sma_50 else "below",
            "golden_cross": sma_50 > sma_200 if sma_200 > 0 else False,
        },
        "bollinger_bands": bb,
        "atr": round(atr, 6),
        "atr_percent": round((atr / price) * 100, 2) if price > 0 else 0,
        "trend": trend,
        "trend_strength": trend_strength,
        "support": round(support, 6),
        "resistance": round(resistance, 6),
        "volume_trend": volume_trend,
        "avg_volume": int(avg_volume),
    }


def _compute_rsi(closes: List[float], period: int = 14) -> float:
    if len(closes) < period + 1:
        return 50.0
    gains, losses = [], []
    for i in range(1, len(closes)):
        diff = closes[i] - closes[i - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def _compute_macd(closes: List[float]) -> Dict:
    ema12 = _ema_series(closes, 12)
    ema26 = _ema_series(closes, 26)
    if not ema12 or not ema26:
        return {"line": 0, "signal_line": 0, "histogram": 0, "crossover": "neutral"}

    min_len = min(len(ema12), len(ema26))
    macd_line = [ema12[-(min_len - i)] - ema26[-(min_len - i)] for i in range(min_len)]
    signal_line = _ema_series(macd_line, 9)

    if not signal_line:
        return {"line": round(macd_line[-1], 6), "signal_line": 0, "histogram": 0, "crossover": "neutral"}

    current_macd = macd_line[-1]
    current_signal = signal_line[-1]
    histogram = current_macd - current_signal

    crossover = "bullish" if current_macd > current_signal else "bearish"

    return {
        "line": round(current_macd, 6),
        "signal_line": round(current_signal, 6),
        "histogram": round(histogram, 6),
        "crossover": crossover,
    }


def _sma(data: List[float], period: int) -> float:
    if len(data) < period:
        return sum(data) / max(len(data), 1)
    return sum(data[-period:]) / period


def _ema(data: List[float], period: int) -> float:
    series = _ema_series(data, period)
    return series[-1] if series else (sum(data) / max(len(data), 1))


def _ema_series(data: List[float], period: int) -> List[float]:
    if len(data) < period:
        return data
    k = 2 / (period + 1)
    ema_vals = [sum(data[:period]) / period]
    for val in data[period:]:
        ema_vals.append(val * k + ema_vals[-1] * (1 - k))
    return ema_vals


def _bollinger_bands(closes: List[float], period: int = 20) -> Dict:
    if len(closes) < period:
        mid = sum(closes) / max(len(closes), 1)
        return {"upper": mid, "middle": mid, "lower": mid, "width": 0}
    window = closes[-period:]
    mid = sum(window) / period
    variance = sum((x - mid) ** 2 for x in window) / period
    std = math.sqrt(variance)
    return {
        "upper": round(mid + 2 * std, 6),
        "middle": round(mid, 6),
        "lower": round(mid - 2 * std, 6),
        "width": round(4 * std / mid * 100, 2) if mid > 0 else 0,
    }


def _compute_atr(highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> float:
    if len(closes) < 2:
        return 0
    trs = []
    for i in range(1, len(closes)):
        tr = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))
        trs.append(tr)
    if len(trs) < period:
        return sum(trs) / max(len(trs), 1)
    atr = sum(trs[:period]) / period
    for tr in trs[period:]:
        atr = (atr * (period - 1) + tr) / period
    return atr


def _detect_trend(closes: List[float], sma20: float, sma50: float) -> str:
    if len(closes) < 20:
        return "insufficient_data"
    current = closes[-1]
    if current > sma20 > sma50:
        return "strong_uptrend"
    elif current > sma20:
        return "uptrend"
    elif current < sma20 < sma50:
        return "strong_downtrend"
    elif current < sma20:
        return "downtrend"
    return "sideways"


def _compute_trend_strength(closes: List[float], sma20: float, sma50: float, rsi: float) -> Dict:
    score = 50
    if closes[-1] > sma20:
        score += 10
    if closes[-1] > sma50:
        score += 10
    if sma20 > sma50:
        score += 10
    if rsi > 50:
        score += 5
    if rsi > 60:
        score += 5
    if rsi < 50:
        score -= 5
    if rsi < 40:
        score -= 5
    score = max(0, min(100, score))
    level = "strong" if score >= 75 else "moderate" if score >= 45 else "weak"
    return {"score": score, "level": level}


def _find_support_resistance(highs: List[float], lows: List[float], closes: List[float]) -> tuple:
    if len(closes) < 20:
        c = closes[-1] if closes else 100
        return c * 0.95, c * 1.05
    recent_lows = sorted(lows[-50:])
    recent_highs = sorted(highs[-50:], reverse=True)
    support = sum(recent_lows[:5]) / 5
    resistance = sum(recent_highs[:5]) / 5
    return support, resistance
