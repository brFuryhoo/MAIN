"""
Real-Time Cross-Asset Correlation Matrix
==========================================
Computes rolling Pearson correlations between all tracked assets using
live price/candle data. Detects correlation breaks (divergences) that
signal regime changes or tactical trading opportunities.

All computation is done in pure Python — no pandas or numpy required.
"""

import asyncio
import logging
import math
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from services.market_data import market_data_adapter

logger = logging.getLogger(__name__)

# ─────────────────────────── cache ───────────────────────────────────────────

_matrix_cache: Dict[str, dict] = {}


def _cache_get(key: str) -> Optional[dict]:
    entry = _matrix_cache.get(key)
    if entry and time.time() - entry["ts"] < entry["ttl"]:
        return entry["data"]
    return None


def _cache_set(key: str, data, ttl: int):
    _matrix_cache[key] = {"data": data, "ts": time.time(), "ttl": ttl}


# ─────────────────────────── curated 15-asset set ───────────────────────────

CORRELATION_MATRIX_ASSETS = [
    {"symbol": "BTC",     "type": "crypto",   "cg_id": "bitcoin"},
    {"symbol": "ETH",     "type": "crypto",   "cg_id": "ethereum"},
    {"symbol": "SOL",     "type": "crypto",   "cg_id": "solana"},
    {"symbol": "SPY",     "type": "etf",      "cg_id": None},
    {"symbol": "QQQ",     "type": "etf",      "cg_id": None},
    {"symbol": "NVDA",    "type": "stock",    "cg_id": None},
    {"symbol": "TSLA",    "type": "stock",    "cg_id": None},
    {"symbol": "XAU/USD", "type": "forex",    "cg_id": None},   # Gold
    {"symbol": "XAG/USD", "type": "forex",    "cg_id": None},   # Silver
    {"symbol": "EUR/USD", "type": "forex",    "cg_id": None},
    {"symbol": "USD/JPY", "type": "forex",    "cg_id": None},
    {"symbol": "GBP/USD", "type": "forex",    "cg_id": None},
    {"symbol": "TLT",     "type": "etf",      "cg_id": None},
    {"symbol": "XOM",     "type": "stock",    "cg_id": None},
    {"symbol": "AAPL",    "type": "stock",    "cg_id": None},
]

# Historical average correlations (rough empirical baselines)
# Used to detect regime changes when current deviates significantly
HISTORICAL_AVERAGES: Dict[str, Dict[str, float]] = {
    "BTC":  {"ETH": 0.88, "SOL": 0.78, "SPY": 0.42, "NVDA": 0.45, "XAU/USD": 0.12, "TLT": -0.15, "USD/JPY": 0.20},
    "ETH":  {"BTC": 0.88, "SOL": 0.82, "SPY": 0.40, "NVDA": 0.43, "XAU/USD": 0.10, "TLT": -0.12, "USD/JPY": 0.18},
    "SOL":  {"BTC": 0.78, "ETH": 0.82, "SPY": 0.35, "NVDA": 0.40, "XAU/USD": 0.05, "TLT": -0.10},
    "SPY":  {"QQQ": 0.95, "NVDA": 0.65, "TSLA": 0.55, "BTC": 0.42, "XAU/USD": -0.08, "TLT": -0.30, "EUR/USD": 0.25},
    "QQQ":  {"SPY": 0.95, "NVDA": 0.70, "TSLA": 0.60, "BTC": 0.45, "XAU/USD": -0.10, "TLT": -0.28},
    "NVDA": {"SPY": 0.65, "QQQ": 0.70, "TSLA": 0.50, "BTC": 0.45, "XAU/USD": -0.05},
    "TSLA": {"SPY": 0.55, "QQQ": 0.60, "NVDA": 0.50, "BTC": 0.48},
    "XAU/USD": {"XAG/USD": 0.75, "TLT": 0.30, "EUR/USD": 0.40, "SPY": -0.08, "BTC": 0.12, "USD/JPY": -0.35},
    "XAG/USD": {"XAU/USD": 0.75, "TLT": 0.20, "EUR/USD": 0.35, "SPY": -0.05},
    "EUR/USD": {"GBP/USD": 0.80, "XAU/USD": 0.40, "SPY": 0.25, "USD/JPY": -0.65},
    "USD/JPY": {"EUR/USD": -0.65, "GBP/USD": -0.55, "SPY": 0.15, "XAU/USD": -0.35},
    "GBP/USD": {"EUR/USD": 0.80, "XAU/USD": 0.32, "SPY": 0.22, "USD/JPY": -0.55},
    "TLT":  {"XAU/USD": 0.30, "SPY": -0.30, "QQQ": -0.28, "BTC": -0.15, "USD/JPY": 0.05},
    "XOM":  {"SPY": 0.60, "CVX": 0.88, "XAU/USD": 0.15},
    "AAPL": {"SPY": 0.72, "QQQ": 0.78, "MSFT": 0.80, "NVDA": 0.62},
}


# ─────────────────────────── math helpers ────────────────────────────────────

def _log_returns(closes: List[float]) -> List[float]:
    """Compute log returns from a list of closing prices."""
    returns = []
    for i in range(1, len(closes)):
        if closes[i - 1] > 0 and closes[i] > 0:
            returns.append(math.log(closes[i] / closes[i - 1]))
    return returns


def _pearson(x: List[float], y: List[float]) -> float:
    """Compute Pearson correlation coefficient between two equal-length series."""
    n = min(len(x), len(y))
    if n < 5:
        return 0.0
    x, y = x[:n], y[:n]

    mean_x = sum(x) / n
    mean_y = sum(y) / n

    num = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    std_x = math.sqrt(sum((v - mean_x) ** 2 for v in x))
    std_y = math.sqrt(sum((v - mean_y) ** 2 for v in y))

    if std_x == 0 or std_y == 0:
        return 0.0

    r = num / (std_x * std_y)
    # Clamp to [-1, 1] to guard against floating-point drift
    return max(-1.0, min(1.0, round(r, 4)))


def _extract_closes(candles: List[Dict], max_candles: int) -> List[float]:
    """Extract close prices from candle list, capped at max_candles."""
    closes = [c.get("close", 0) for c in candles[-max_candles:] if c.get("close", 0) > 0]
    return closes


# ─────────────────────────── interpretation helpers ──────────────────────────

def interpret_correlation(asset_a: str, asset_b: str, correlation: float) -> str:
    """Generate a human-readable interpretation of a pairwise correlation value."""
    abs_corr = abs(correlation)
    direction = "positively" if correlation >= 0 else "inversely"

    if abs_corr >= 0.85:
        strength = "very strongly"
    elif abs_corr >= 0.65:
        strength = "strongly"
    elif abs_corr >= 0.45:
        strength = "moderately"
    elif abs_corr >= 0.25:
        strength = "weakly"
    else:
        strength = "negligibly"

    # Known pairs with context
    known_pairs = {
        frozenset(["BTC", "ETH"]): "Crypto co-movement — same liquidity pool and risk-on/off flows.",
        frozenset(["SPY", "QQQ"]): "Broad equity market synchrony. QQQ has more tech concentration.",
        frozenset(["XAU/USD", "TLT"]): "Classic safe-haven duo — both rise on risk-off flows.",
        frozenset(["EUR/USD", "USD/JPY"]): "USD pairs moving inversely — dollar dominance signal.",
        frozenset(["BTC", "SPY"]): "Risk appetite proxy — high correlation signals macro-driven crypto.",
        frozenset(["XAU/USD", "SPY"]): "Negative correlation typical in risk-on markets; positive in stagflation.",
        frozenset(["NVDA", "BTC"]): "AI/tech and crypto both respond to liquidity conditions.",
        frozenset(["EUR/USD", "GBP/USD"]): "European currency block — both sensitive to USD strength.",
    }
    pair_key = frozenset([asset_a, asset_b])
    context = known_pairs.get(pair_key, "")

    base = f"{asset_a} and {asset_b} are {strength} {direction} correlated ({correlation:+.2f})."
    return f"{base} {context}".strip()


# ─────────────────────────── correlation break detection ────────────────────

def detect_correlation_breaks(
    current_matrix: Dict[str, Dict[str, float]],
    historical_avg: Dict[str, Dict[str, float]] = None,
) -> List[Dict]:
    """
    Compare current correlations to historical averages.
    A divergence of >0.3 from the historical average is flagged as a regime signal.

    Returns list of {pair, current, historical, deviation, signal, severity}
    """
    if historical_avg is None:
        historical_avg = HISTORICAL_AVERAGES

    breaks: List[Dict] = []

    for asset_a, peers in current_matrix.items():
        hist_a = historical_avg.get(asset_a, {})
        for asset_b, current_corr in peers.items():
            if asset_a >= asset_b:  # avoid duplicates
                continue
            hist_corr = hist_a.get(asset_b) or historical_avg.get(asset_b, {}).get(asset_a)
            if hist_corr is None:
                continue

            deviation = current_corr - hist_corr
            if abs(deviation) < 0.3:
                continue

            # Determine signal type
            if deviation > 0:
                direction_desc = f"{asset_a} and {asset_b} are more correlated than usual"
            else:
                direction_desc = f"{asset_a} and {asset_b} are more divergent than usual"

            # Interpret the regime signal
            pair = frozenset([asset_a, asset_b])
            signal = _regime_signal_from_break(asset_a, asset_b, current_corr, hist_corr, deviation)

            severity = "HIGH" if abs(deviation) >= 0.5 else "MEDIUM"

            breaks.append({
                "pair": [asset_a, asset_b],
                "current": current_corr,
                "historical": hist_corr,
                "deviation": round(deviation, 4),
                "direction": direction_desc,
                "signal": signal,
                "severity": severity,
            })

    # Sort by deviation magnitude
    breaks.sort(key=lambda b: abs(b["deviation"]), reverse=True)
    return breaks


def _regime_signal_from_break(
    asset_a: str, asset_b: str, current: float, historical: float, deviation: float
) -> str:
    """Infer a regime signal description from a correlation break."""
    pair = frozenset([asset_a, asset_b])

    if frozenset(["BTC", "SPY"]) == pair:
        if deviation > 0.3:
            return "RISK-ON: Crypto and equities moving together — liquidity-driven risk appetite."
        else:
            return "DIVERGENCE: Crypto decoupling from equities — idiosyncratic crypto catalyst or de-risking."

    if frozenset(["XAU/USD", "SPY"]) == pair or frozenset(["GLD", "SPY"]) == pair:
        if current > 0.3 and historical < 0:
            return "STAGFLATION SIGNAL: Gold and equities rising together — unusual; watch inflation data."
        elif current < -0.4 and historical > 0:
            return "RISK-OFF: Capital rotating from equities to gold safe haven."

    if frozenset(["TLT", "SPY"]) == pair or frozenset(["TLT", "QQQ"]) == pair:
        if deviation > 0.3:
            return "YIELD CURVE SIGNAL: Bonds and stocks co-moving — unusual; watch Fed pivot signals."
        else:
            return "FLIGHT TO SAFETY: Treasury bonds rallying as equities sell off — risk-off positioning."

    if {asset_a, asset_b} & {"BTC", "ETH", "SOL"} == {asset_a, asset_b}:
        if deviation < -0.3:
            return "CRYPTO DIVERGENCE: Altcoins decoupling from Bitcoin — potential rotation or BTC dominance shift."
        else:
            return "CRYPTO CORRELATION SURGE: All crypto assets moving in lockstep — macro driver dominant."

    if {asset_a, asset_b} <= {"EUR/USD", "GBP/USD", "USD/JPY"}:
        if deviation > 0.3:
            return "USD DOMINANCE: All major pairs moving against USD — strong dollar momentum or macro event."
        else:
            return "CURRENCY DIVERGENCE: FX pairs decoupling — region-specific macro catalyst."

    # Generic
    if deviation > 0:
        return f"CONVERGENCE SIGNAL: {asset_a}–{asset_b} correlation at {current:.2f} (historical: {historical:.2f}) — regime shift possible."
    return f"DIVERGENCE SIGNAL: {asset_a}–{asset_b} correlation at {current:.2f} (historical: {historical:.2f}) — monitor for regime change."


# ─────────────────────────── candle fetching ─────────────────────────────────

async def _fetch_all_candles(
    assets: List[Dict], lookback_candles: int
) -> Dict[str, List[float]]:
    """Fetch candles for all assets in parallel and extract close prices."""

    async def _fetch_one(asset: Dict) -> Tuple[str, List[float]]:
        sym = asset["symbol"]
        try:
            data = await market_data_adapter.get_asset_data(
                sym, asset["type"], coingecko_id=asset.get("cg_id")
            )
            closes = _extract_closes(data.get("candles", []), lookback_candles + 1)
            return sym, closes
        except Exception as exc:
            logger.warning(f"Candle fetch error for {sym}: {exc}")
            return sym, []

    results = await asyncio.gather(*[_fetch_one(a) for a in assets], return_exceptions=True)

    closes_map: Dict[str, List[float]] = {}
    for result in results:
        if isinstance(result, Exception):
            continue
        sym, closes = result
        if len(closes) >= 5:
            closes_map[sym] = closes
    return closes_map


# ─────────────────────────── main builder ────────────────────────────────────

async def build_correlation_matrix(
    symbols: List[Dict] = None,
    lookback_candles: int = 30,
) -> Dict:
    """
    Fetch recent candles for all symbols, compute pairwise Pearson
    correlations on log returns.

    Returns:
    {
      "matrix": {"BTC": {"ETH": 0.87, "GOLD": -0.23, ...}, ...},
      "high_correlations": [{pair, value, interpretation}],
      "divergences": [{pair, expected, actual, signal}],
      "regime_signal": str,
      "computed_at": ISO timestamp,
    }
    """
    asset_list = symbols or CORRELATION_MATRIX_ASSETS
    cache_key = f"corr_matrix:{lookback_candles}:{len(asset_list)}"
    cached = _cache_get(cache_key)
    if cached is not None:
        logger.debug("Correlation matrix: returning cached result")
        return cached

    logger.info(f"Building correlation matrix for {len(asset_list)} assets ({lookback_candles} candles)")

    # Fetch candles
    closes_map = await _fetch_all_candles(asset_list, lookback_candles)
    available_symbols = list(closes_map.keys())

    if len(available_symbols) < 2:
        logger.warning("Insufficient data for correlation matrix")
        return {
            "matrix": {},
            "high_correlations": [],
            "divergences": [],
            "regime_signal": "Insufficient data for correlation analysis.",
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "assets_computed": 0,
        }

    # Compute log returns for each asset
    returns_map: Dict[str, List[float]] = {
        sym: _log_returns(closes) for sym, closes in closes_map.items()
    }

    # Build pairwise Pearson correlation matrix
    matrix: Dict[str, Dict[str, float]] = {sym: {} for sym in available_symbols}

    for i, sym_a in enumerate(available_symbols):
        matrix[sym_a][sym_a] = 1.0  # self-correlation
        for sym_b in available_symbols[i + 1:]:
            rets_a = returns_map[sym_a]
            rets_b = returns_map[sym_b]
            corr = _pearson(rets_a, rets_b)
            matrix[sym_a][sym_b] = corr
            if sym_b not in matrix:
                matrix[sym_b] = {}
            matrix[sym_b][sym_a] = corr

    # High correlations (|r| >= 0.65, excluding self-pairs)
    high_correlations: List[Dict] = []
    seen_pairs = set()
    for sym_a, peers in matrix.items():
        for sym_b, corr in peers.items():
            if sym_a == sym_b:
                continue
            pair_key = tuple(sorted([sym_a, sym_b]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)
            if abs(corr) >= 0.65:
                high_correlations.append({
                    "pair": list(pair_key),
                    "value": corr,
                    "interpretation": interpret_correlation(sym_a, sym_b, corr),
                })
    high_correlations.sort(key=lambda x: abs(x["value"]), reverse=True)

    # Detect correlation breaks
    divergences = detect_correlation_breaks(matrix)

    # Regime signal from top divergences
    regime_signal = _synthesize_regime_signal(high_correlations, divergences, matrix)

    result = {
        "matrix": matrix,
        "high_correlations": high_correlations[:15],
        "divergences": divergences[:10],
        "regime_signal": regime_signal,
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "assets_computed": len(available_symbols),
        "symbols": available_symbols,
    }

    _cache_set(cache_key, result, ttl=300)  # 5 min
    logger.info(
        f"Correlation matrix complete: {len(available_symbols)} assets, "
        f"{len(high_correlations)} high-corr pairs, {len(divergences)} divergences"
    )
    return result


def _synthesize_regime_signal(
    high_correlations: List[Dict],
    divergences: List[Dict],
    matrix: Dict[str, Dict[str, float]],
) -> str:
    """
    Synthesize a single regime signal string from correlation data.
    """
    # Check risk-off indicator: BTC-SPY correlation
    btc_spy = matrix.get("BTC", {}).get("SPY") or matrix.get("SPY", {}).get("BTC")
    spy_tlt = matrix.get("SPY", {}).get("TLT") or matrix.get("TLT", {}).get("SPY")
    gold_spy = matrix.get("XAU/USD", {}).get("SPY") or matrix.get("SPY", {}).get("XAU/USD")

    signals = []

    if btc_spy is not None:
        if btc_spy > 0.6:
            signals.append("RISK-ON: BTC highly correlated with SPY — macro risk appetite dominant")
        elif btc_spy < 0.1:
            signals.append("CRYPTO DECOUPLING: BTC diverging from equities — idiosyncratic crypto flow")

    if spy_tlt is not None:
        if spy_tlt > 0.2:
            signals.append("UNUSUAL: Stocks and bonds moving together — watch Fed policy signals")
        elif spy_tlt < -0.5:
            signals.append("RISK-OFF: Bonds rallying vs equities selling — classic flight to safety")

    if gold_spy is not None:
        if gold_spy > 0.3:
            signals.append("STAGFLATION RISK: Gold and equities both bid — inflation expectations rising")
        elif gold_spy < -0.3:
            signals.append("SAFE HAVEN BID: Gold inversely tracking equities — risk-off flow active")

    # High divergences
    if divergences:
        top_div = divergences[0]
        signals.append(top_div["signal"])

    if not signals:
        # Fallback: characterize by overall cross-asset correlation level
        if high_correlations:
            avg_corr = sum(abs(c["value"]) for c in high_correlations) / len(high_correlations)
            if avg_corr > 0.75:
                signals.append("HIGH SYNCHRONY: Most assets moving together — macro/liquidity-driven market")
            else:
                signals.append("LOW SYNCHRONY: Assets diverging — selective, fundamental-driven market")

    return " | ".join(signals) if signals else "Cross-asset correlations within normal ranges."
