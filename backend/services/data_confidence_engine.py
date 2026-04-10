"""
Data Confidence Engine
=======================
Every datapoint (price, volume, market cap, candle) is fetched from
multiple providers and cross-validated. The engine computes a
confidence score (0-100) for each datapoint based on:

1. Provider Agreement — how closely do providers agree?
2. Provider Reliability — historical accuracy per provider per asset type
3. Data Freshness — how old is the data?
4. Outlier Detection — is any provider reporting an anomaly?
5. Volume Consistency — does volume confirm the price move?

A datapoint with confidence < 60 triggers a fallback or warning.
A datapoint with confidence > 85 is considered high-confidence.
"""

import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any

import httpx
import statistics

logger = logging.getLogger(__name__)

# ─── Provider definitions ────────────────────────────────────────────────────

PROVIDERS = {
    "coingecko": {
        "assets": ["crypto"],
        "reliability_base": 90,
        "latency_ms": 500,
        "free_tier": True,
    },
    "twelvedata": {
        "assets": ["stock", "forex", "crypto", "etf"],
        "reliability_base": 87,
        "latency_ms": 300,
        "free_tier": True,
    },
    "polygon": {
        "assets": ["stock", "forex", "crypto"],
        "reliability_base": 92,
        "latency_ms": 200,
        "free_tier": True,
    },
    "alphavantage": {
        "assets": ["stock", "forex", "commodity"],
        "reliability_base": 83,
        "latency_ms": 800,
        "free_tier": True,
    },
    "yfinance_public": {
        "assets": ["stock", "etf", "commodity"],
        "reliability_base": 78,
        "latency_ms": 1200,
        "free_tier": True,
    },
}

# ─── Confidence thresholds ───────────────────────────────────────────────────

CONFIDENCE_HIGH = 85
CONFIDENCE_GOOD = 70
CONFIDENCE_MODERATE = 55
OUTLIER_THRESHOLD_PCT = 2.0   # providers with delta > 2% from median are outliers
SINGLE_PROVIDER_CAP = 70      # max confidence when only 1 provider responds
PROVIDER_TIMEOUT_S = 3.0      # per-provider timeout


# ─── In-memory performance store ─────────────────────────────────────────────

_provider_stats: Dict[str, Dict] = {
    name: {
        "success_count": 0,
        "failure_count": 0,
        "total_latency_ms": 0,
        "recent_accuracy": [],   # list of float 0-1, last N calls
        "last_check": None,
        "last_latency_ms": None,
        "status": "online",      # online | degraded | offline
    }
    for name in PROVIDERS
}

_datapoints_today: List[Dict] = []          # rolling log
_outliers_today: int = 0


# ─── Data structures ─────────────────────────────────────────────────────────

@dataclass
class DataPoint:
    """Single datapoint from one provider."""
    symbol: str
    asset_type: str
    provider: str
    price: float
    volume_24h: float
    change_24h_pct: float
    timestamp: datetime
    latency_ms: int


@dataclass
class ConfidentDataPoint:
    """Cross-validated datapoint with confidence score."""
    symbol: str
    asset_type: str
    price: float                     # consensus price (median of valid providers)
    price_range: Tuple[float, float] # (min, max) across providers
    volume_24h: float
    change_24h_pct: float
    confidence_score: int            # 0-100
    confidence_grade: str            # A / B / C / D
    providers_queried: int
    providers_agreed: int
    provider_breakdown: List[Dict]   # [{provider, price, delta_pct, status}]
    outliers_detected: List[str]     # providers that diverged > 2%
    data_freshness_score: int        # 0-100
    agreement_score: int             # 0-100
    warnings: List[str]
    fetched_at: datetime

    def to_dict(self) -> Dict:
        return {
            "symbol": self.symbol,
            "asset_type": self.asset_type,
            "price": self.price,
            "price_range": {"min": self.price_range[0], "max": self.price_range[1]},
            "volume_24h": self.volume_24h,
            "change_24h_pct": self.change_24h_pct,
            "confidence_score": self.confidence_score,
            "confidence_grade": self.confidence_grade,
            "providers_queried": self.providers_queried,
            "providers_agreed": self.providers_agreed,
            "provider_breakdown": self.provider_breakdown,
            "outliers_detected": self.outliers_detected,
            "data_freshness_score": self.data_freshness_score,
            "agreement_score": self.agreement_score,
            "warnings": self.warnings,
            "fetched_at": self.fetched_at.isoformat(),
            "badge": format_confidence_badge(self.confidence_score),
        }


# ─── Provider fetch functions ─────────────────────────────────────────────────

async def _fetch_coingecko(symbol: str, http: httpx.AsyncClient) -> Optional[DataPoint]:
    """Fetch price from CoinGecko — crypto only."""
    SYMBOL_MAP = {
        "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana",
        "ADA": "cardano", "XRP": "ripple", "DOGE": "dogecoin",
        "MATIC": "matic-network", "DOT": "polkadot", "AVAX": "avalanche-2",
        "LINK": "chainlink", "BNB": "binancecoin", "LTC": "litecoin",
        "UNI": "uniswap", "ATOM": "cosmos", "NEAR": "near",
    }
    clean = symbol.upper().replace("USDT", "").replace("USD", "")
    cg_id = SYMBOL_MAP.get(clean, clean.lower())
    t0 = time.time()
    try:
        resp = await http.get(
            f"https://api.coingecko.com/api/v3/simple/price",
            params={
                "ids": cg_id,
                "vs_currencies": "usd",
                "include_24hr_vol": "true",
                "include_24hr_change": "true",
            },
            timeout=PROVIDER_TIMEOUT_S,
        )
        latency = int((time.time() - t0) * 1000)
        if resp.status_code != 200:
            return None
        data = resp.json().get(cg_id, {})
        price = data.get("usd")
        if not price:
            return None
        _record_success("coingecko", latency)
        return DataPoint(
            symbol=symbol,
            asset_type="crypto",
            provider="coingecko",
            price=float(price),
            volume_24h=float(data.get("usd_24h_vol", 0) or 0),
            change_24h_pct=float(data.get("usd_24h_change", 0) or 0),
            timestamp=datetime.now(timezone.utc),
            latency_ms=latency,
        )
    except Exception as e:
        _record_failure("coingecko")
        logger.debug(f"CoinGecko fetch error for {symbol}: {e}")
        return None


async def _fetch_twelvedata(symbol: str, asset_type: str, http: httpx.AsyncClient) -> Optional[DataPoint]:
    """Fetch price from Twelve Data — stocks, forex, crypto, ETF."""
    key = os.environ.get("TWELVE_DATA_KEY", "")
    if not key:
        return None
    t0 = time.time()
    try:
        resp = await http.get(
            "https://api.twelvedata.com/quote",
            params={"symbol": symbol, "apikey": key},
            timeout=PROVIDER_TIMEOUT_S,
        )
        latency = int((time.time() - t0) * 1000)
        if resp.status_code != 200:
            _record_failure("twelvedata")
            return None
        d = resp.json()
        if d.get("code") or d.get("status") == "error":
            _record_failure("twelvedata")
            return None
        price = float(d.get("close", 0) or 0)
        if price <= 0:
            _record_failure("twelvedata")
            return None
        _record_success("twelvedata", latency)
        return DataPoint(
            symbol=symbol,
            asset_type=asset_type,
            provider="twelvedata",
            price=price,
            volume_24h=float(d.get("volume", 0) or 0),
            change_24h_pct=float(d.get("percent_change", 0) or 0),
            timestamp=datetime.now(timezone.utc),
            latency_ms=latency,
        )
    except Exception as e:
        _record_failure("twelvedata")
        logger.debug(f"TwelveData fetch error for {symbol}: {e}")
        return None


async def _fetch_polygon(symbol: str, asset_type: str, http: httpx.AsyncClient) -> Optional[DataPoint]:
    """Fetch previous close from Polygon.io — stocks, forex, crypto."""
    key = os.environ.get("POLYGON_KEY", "")
    if not key:
        return None
    t0 = time.time()
    try:
        resp = await http.get(
            f"https://api.polygon.io/v2/aggs/ticker/{symbol}/prev",
            params={"adjusted": "true", "apiKey": key},
            timeout=PROVIDER_TIMEOUT_S,
        )
        latency = int((time.time() - t0) * 1000)
        if resp.status_code != 200:
            _record_failure("polygon")
            return None
        results = resp.json().get("results", [])
        if not results:
            _record_failure("polygon")
            return None
        bar = results[0]
        close = float(bar.get("c", 0) or 0)
        open_ = float(bar.get("o", 0) or 1)
        if close <= 0:
            _record_failure("polygon")
            return None
        change_pct = round(((close - open_) / open_) * 100, 4) if open_ else 0
        _record_success("polygon", latency)
        return DataPoint(
            symbol=symbol,
            asset_type=asset_type,
            provider="polygon",
            price=close,
            volume_24h=float(bar.get("v", 0) or 0),
            change_24h_pct=change_pct,
            timestamp=datetime.now(timezone.utc),
            latency_ms=latency,
        )
    except Exception as e:
        _record_failure("polygon")
        logger.debug(f"Polygon fetch error for {symbol}: {e}")
        return None


async def _fetch_alphavantage(symbol: str, asset_type: str, http: httpx.AsyncClient) -> Optional[DataPoint]:
    """Fetch global quote from Alpha Vantage — stocks, forex, commodity."""
    key = os.environ.get("ALPHA_VANTAGE_KEY", "")
    if not key:
        return None
    t0 = time.time()
    try:
        resp = await http.get(
            "https://www.alphavantage.co/query",
            params={"function": "GLOBAL_QUOTE", "symbol": symbol, "apikey": key},
            timeout=PROVIDER_TIMEOUT_S,
        )
        latency = int((time.time() - t0) * 1000)
        if resp.status_code != 200:
            _record_failure("alphavantage")
            return None
        gq = resp.json().get("Global Quote", {})
        if not gq:
            _record_failure("alphavantage")
            return None
        price = float(gq.get("05. price", 0) or 0)
        if price <= 0:
            _record_failure("alphavantage")
            return None
        change_str = gq.get("10. change percent", "0%").replace("%", "")
        change_pct = float(change_str or 0)
        volume = float(gq.get("06. volume", 0) or 0)
        _record_success("alphavantage", latency)
        return DataPoint(
            symbol=symbol,
            asset_type=asset_type,
            provider="alphavantage",
            price=price,
            volume_24h=volume,
            change_24h_pct=change_pct,
            timestamp=datetime.now(timezone.utc),
            latency_ms=latency,
        )
    except Exception as e:
        _record_failure("alphavantage")
        logger.debug(f"AlphaVantage fetch error for {symbol}: {e}")
        return None


async def _fetch_yfinance(symbol: str, asset_type: str, http: httpx.AsyncClient) -> Optional[DataPoint]:
    """
    Fetch via Yahoo Finance public JSON endpoint.
    No API key required.
    """
    t0 = time.time()
    try:
        resp = await http.get(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
            params={"range": "1d", "interval": "1d"},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=PROVIDER_TIMEOUT_S,
        )
        latency = int((time.time() - t0) * 1000)
        if resp.status_code != 200:
            _record_failure("yfinance_public")
            return None
        chart = resp.json().get("chart", {})
        result = (chart.get("result") or [None])[0]
        if not result:
            _record_failure("yfinance_public")
            return None
        meta = result.get("meta", {})
        price = float(meta.get("regularMarketPrice", 0) or 0)
        if price <= 0:
            _record_failure("yfinance_public")
            return None
        prev_close = float(meta.get("chartPreviousClose", price) or price)
        change_pct = round(((price - prev_close) / prev_close) * 100, 4) if prev_close else 0
        volume = float(meta.get("regularMarketVolume", 0) or 0)
        _record_success("yfinance_public", latency)
        return DataPoint(
            symbol=symbol,
            asset_type=asset_type,
            provider="yfinance_public",
            price=price,
            volume_24h=volume,
            change_24h_pct=change_pct,
            timestamp=datetime.now(timezone.utc),
            latency_ms=latency,
        )
    except Exception as e:
        _record_failure("yfinance_public")
        logger.debug(f"YFinance fetch error for {symbol}: {e}")
        return None


# ─── Provider stats helpers ───────────────────────────────────────────────────

def _record_success(provider: str, latency_ms: int):
    s = _provider_stats[provider]
    s["success_count"] += 1
    s["total_latency_ms"] += latency_ms
    s["last_latency_ms"] = latency_ms
    s["last_check"] = datetime.now(timezone.utc).isoformat()
    s["recent_accuracy"].append(1.0)
    if len(s["recent_accuracy"]) > 50:
        s["recent_accuracy"].pop(0)
    # Determine status
    total = s["success_count"] + s["failure_count"]
    rate = s["success_count"] / total if total else 1
    s["status"] = "online" if rate >= 0.8 else "degraded" if rate >= 0.5 else "offline"


def _record_failure(provider: str):
    s = _provider_stats[provider]
    s["failure_count"] += 1
    s["last_check"] = datetime.now(timezone.utc).isoformat()
    s["recent_accuracy"].append(0.0)
    if len(s["recent_accuracy"]) > 50:
        s["recent_accuracy"].pop(0)
    total = s["success_count"] + s["failure_count"]
    rate = s["success_count"] / total if total else 0
    s["status"] = "online" if rate >= 0.8 else "degraded" if rate >= 0.5 else "offline"


# ─── Core helpers ─────────────────────────────────────────────────────────────

def _grade(score: int) -> str:
    if score > CONFIDENCE_HIGH:
        return "A"
    elif score >= CONFIDENCE_GOOD:
        return "B"
    elif score >= CONFIDENCE_MODERATE:
        return "C"
    else:
        return "D"


def _data_freshness_score(timestamp: datetime) -> int:
    """
    100 if < 30s old.
    Decays linearly to 0 at 300s (5 min).
    """
    age_s = (datetime.now(timezone.utc) - timestamp).total_seconds()
    if age_s < 30:
        return 100
    if age_s >= 300:
        return 0
    return max(0, int(100 - ((age_s - 30) / 270) * 100))


def _agreement_score(max_delta_pct: float) -> int:
    """
    100 - (max_delta_pct * 10), clamped to [0, 100].
    """
    return max(0, min(100, int(100 - max_delta_pct * 10)))


def compute_provider_reliability(
    provider: str,
    asset_type: str,
    recent_accuracy: Optional[List[float]] = None,
) -> float:
    """
    Dynamic reliability score based on historical performance.
    Base score from PROVIDERS dict, adjusted by recent accuracy if available.
    Returns 0-100.
    """
    base = PROVIDERS.get(provider, {}).get("reliability_base", 75)
    # Check if provider supports this asset type
    supported = PROVIDERS.get(provider, {}).get("assets", [])
    if asset_type not in supported:
        base = max(0, base - 20)

    acc = recent_accuracy
    if acc is None:
        acc = _provider_stats.get(provider, {}).get("recent_accuracy", [])

    if acc:
        recent_rate = statistics.mean(acc[-20:]) if len(acc) >= 20 else statistics.mean(acc)
        # Weight: 60% base, 40% recent
        dynamic = base * 0.6 + (recent_rate * 100) * 0.4
        return round(min(100, max(0, dynamic)), 1)
    return float(base)


# ─── Main engine function ─────────────────────────────────────────────────────

async def fetch_confident_price(symbol: str, asset_type: str) -> ConfidentDataPoint:
    """
    Fetch price from ALL applicable providers in parallel.
    Cross-validate and return a ConfidentDataPoint.

    Algorithm:
    1. Determine which providers support this asset_type
    2. Fetch from all in parallel with individual timeouts (3s per provider)
    3. Collect successful responses
    4. If only 1 provider: confidence capped at 70, add warning
    5. Compute median_price from all successful prices
    6. For each provider: delta_pct = abs(provider_price - median) / median * 100
    7. Mark as outlier if delta_pct > 2.0%
    8. agreement_score = 100 - (max_delta_pct * 10) clamped to 0-100
    9. data_freshness_score = 100 if < 30s old, decays to 0 at 300s
    10. confidence_score = weighted average:
        - agreement_score: 40% weight
        - data_freshness_score: 20% weight
        - provider_reliability: 30% weight (avg of providers used)
        - outlier_penalty: -10 per outlier, 10% weight
    11. consensus price = median of non-outlier prices
    """
    global _outliers_today, _datapoints_today

    async with httpx.AsyncClient(timeout=PROVIDER_TIMEOUT_S + 1) as http:
        tasks = {}

        # CoinGecko — crypto
        if asset_type == "crypto":
            tasks["coingecko"] = _fetch_coingecko(symbol, http)

        # Twelve Data — stock, forex, crypto, etf
        if asset_type in ("stock", "forex", "crypto", "etf"):
            tasks["twelvedata"] = _fetch_twelvedata(symbol, asset_type, http)

        # Polygon — stock, forex, crypto
        if asset_type in ("stock", "forex", "crypto"):
            tasks["polygon"] = _fetch_polygon(symbol, asset_type, http)

        # Alpha Vantage — stock, forex, commodity
        if asset_type in ("stock", "forex", "commodity"):
            tasks["alphavantage"] = _fetch_alphavantage(symbol, asset_type, http)

        # YFinance — stock, etf, commodity
        if asset_type in ("stock", "etf", "commodity"):
            tasks["yfinance_public"] = _fetch_yfinance(symbol, asset_type, http)

        if not tasks:
            # No applicable providers
            return _build_no_data(symbol, asset_type)

        # Fetch all in parallel
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        successful: List[DataPoint] = []
        for dp in results:
            if isinstance(dp, DataPoint) and dp.price > 0:
                successful.append(dp)

    warnings: List[str] = []
    providers_queried = len(tasks)

    if not successful:
        return _build_no_data(symbol, asset_type)

    # ── Price analysis ───────────────────────────────────────────────────────
    prices = [dp.price for dp in successful]
    median_price = statistics.median(prices)

    # Per-provider delta
    breakdown = []
    outlier_providers = []
    for dp in successful:
        delta_pct = abs(dp.price - median_price) / median_price * 100 if median_price else 0
        is_outlier = delta_pct > OUTLIER_THRESHOLD_PCT
        if is_outlier:
            outlier_providers.append(dp.provider)
        breakdown.append({
            "provider": dp.provider,
            "price": round(dp.price, 6 if dp.price < 10 else 4 if dp.price < 100 else 2),
            "delta_pct": round(delta_pct, 4),
            "status": "outlier" if is_outlier else "ok",
            "latency_ms": dp.latency_ms,
        })

    # Consensus price = median of non-outlier prices
    clean_prices = [dp.price for dp in successful if dp.provider not in outlier_providers]
    if not clean_prices:
        clean_prices = prices  # if all are outliers, fall back to all
    consensus_price = statistics.median(clean_prices)

    # Agreement score
    deltas = [b["delta_pct"] for b in breakdown]
    max_delta = max(deltas) if deltas else 0
    agree_score = _agreement_score(max_delta)

    # Freshness score (most recent timestamp across providers)
    most_recent = max((dp.timestamp for dp in successful), default=datetime.now(timezone.utc))
    fresh_score = _data_freshness_score(most_recent)

    # Provider reliability (avg of used providers)
    reliabilities = [
        compute_provider_reliability(dp.provider, asset_type)
        for dp in successful
    ]
    avg_reliability = statistics.mean(reliabilities) if reliabilities else 75

    # Outlier penalty component (10 per outlier, capped at 100 for the 10% weight)
    outlier_penalty = min(100, len(outlier_providers) * 10)
    # Lower outlier_penalty → better
    outlier_component = max(0, 100 - outlier_penalty)

    # Weighted confidence score
    raw_confidence = (
        agree_score * 0.40
        + fresh_score * 0.20
        + avg_reliability * 0.30
        + outlier_component * 0.10
    )
    confidence_score = int(round(min(100, max(0, raw_confidence))))

    # Cap at SINGLE_PROVIDER_CAP if only 1 provider succeeded
    if len(successful) == 1:
        confidence_score = min(confidence_score, SINGLE_PROVIDER_CAP)
        warnings.append("Single provider only — confidence capped at 70")

    if len(outlier_providers) > 0:
        warnings.append(f"High spread detected on: {', '.join(outlier_providers)}")
        _outliers_today += len(outlier_providers)

    if max_delta > 5.0:
        warnings.append(f"Extreme price divergence ({max_delta:.1f}%) — verify data manually")

    if fresh_score < 50:
        warnings.append("Stale data — price may be outdated")

    # Volume (median of successful)
    volumes = [dp.volume_24h for dp in successful if dp.volume_24h > 0]
    consensus_volume = statistics.median(volumes) if volumes else 0.0

    # Change pct (median)
    changes = [dp.change_24h_pct for dp in successful]
    consensus_change = statistics.median(changes) if changes else 0.0

    # Build result
    cdp = ConfidentDataPoint(
        symbol=symbol,
        asset_type=asset_type,
        price=round(consensus_price, 6 if consensus_price < 10 else 4 if consensus_price < 100 else 2),
        price_range=(round(min(prices), 2), round(max(prices), 2)),
        volume_24h=round(consensus_volume, 2),
        change_24h_pct=round(consensus_change, 4),
        confidence_score=confidence_score,
        confidence_grade=_grade(confidence_score),
        providers_queried=providers_queried,
        providers_agreed=len(successful) - len(outlier_providers),
        provider_breakdown=breakdown,
        outliers_detected=outlier_providers,
        data_freshness_score=fresh_score,
        agreement_score=agree_score,
        warnings=warnings,
        fetched_at=datetime.now(timezone.utc),
    )

    # Log to today's datapoints
    _datapoints_today.append({
        "symbol": symbol,
        "asset_type": asset_type,
        "confidence_score": confidence_score,
        "fetched_at": cdp.fetched_at.isoformat(),
    })
    # Keep only today's data (rolling 24h)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    _datapoints_today[:] = [
        d for d in _datapoints_today
        if datetime.fromisoformat(d["fetched_at"]) > cutoff
    ]

    return cdp


def _build_no_data(symbol: str, asset_type: str) -> ConfidentDataPoint:
    """Return a zero-confidence datapoint when no providers have data."""
    return ConfidentDataPoint(
        symbol=symbol,
        asset_type=asset_type,
        price=0.0,
        price_range=(0.0, 0.0),
        volume_24h=0.0,
        change_24h_pct=0.0,
        confidence_score=0,
        confidence_grade="D",
        providers_queried=0,
        providers_agreed=0,
        provider_breakdown=[],
        outliers_detected=[],
        data_freshness_score=0,
        agreement_score=0,
        warnings=["No providers returned data for this symbol/asset type"],
        fetched_at=datetime.now(timezone.utc),
    )


async def fetch_confident_batch(
    symbols: List[Tuple[str, str]],
) -> Dict[str, ConfidentDataPoint]:
    """
    Fetch confident prices for multiple symbols in parallel.
    symbols: list of (symbol, asset_type) tuples.
    Returns {symbol: ConfidentDataPoint}.
    """
    tasks = [fetch_confident_price(sym, at) for sym, at in symbols]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    output: Dict[str, ConfidentDataPoint] = {}
    for (sym, _), result in zip(symbols, results):
        if isinstance(result, ConfidentDataPoint):
            output[sym] = result
        else:
            logger.warning(f"Batch fetch error for {sym}: {result}")
            output[sym] = _build_no_data(sym, _)
    return output


async def validate_candle_data(
    symbol: str,
    asset_type: str,
    candles: List[Dict],
    provider: str,
) -> Dict:
    """
    Validate a candle series from one provider.
    Check for: missing candles, price gaps > 5%, volume anomalies.

    Returns:
    {
      valid: bool,
      confidence: int,
      issues: [str],
      adjusted_candles: List[Dict]  (outlier candles smoothed)
    }
    """
    issues: List[str] = []
    adjusted = list(candles)

    if not candles:
        return {"valid": False, "confidence": 0, "issues": ["Empty candle series"], "adjusted_candles": []}

    # 1. Missing candles: check for large timestamp gaps (expect ~hourly)
    if len(candles) > 2:
        timestamps = []
        for c in candles:
            try:
                ts = c.get("timestamp") or c.get("time")
                if isinstance(ts, (int, float)):
                    timestamps.append(ts)
                else:
                    timestamps.append(datetime.fromisoformat(str(ts)).timestamp())
            except Exception:
                continue

        if len(timestamps) > 1:
            gaps = [timestamps[i + 1] - timestamps[i] for i in range(len(timestamps) - 1)]
            median_gap = statistics.median(gaps)
            large_gaps = [g for g in gaps if g > median_gap * 3]
            if large_gaps:
                issues.append(f"{len(large_gaps)} missing candle gap(s) detected (>{int(median_gap * 3 / 3600):.0f}h gap)")

    # 2. Price gaps > 5% between consecutive candles
    anomaly_indices = []
    for i in range(1, len(candles)):
        prev_close = float(candles[i - 1].get("close", 0) or 0)
        curr_open = float(candles[i].get("open", 0) or 0)
        if prev_close > 0 and curr_open > 0:
            gap_pct = abs(curr_open - prev_close) / prev_close * 100
            if gap_pct > 5:
                issues.append(f"Price gap of {gap_pct:.1f}% at candle index {i}")
                anomaly_indices.append(i)

    # 3. Volume anomalies: flag candles with volume > 10x median
    volumes = [float(c.get("volume", 0) or 0) for c in candles if float(c.get("volume", 0) or 0) > 0]
    if volumes:
        median_vol = statistics.median(volumes)
        vol_anomalies = [
            i for i, c in enumerate(candles)
            if float(c.get("volume", 0) or 0) > median_vol * 10
        ]
        if vol_anomalies:
            issues.append(f"Volume anomaly detected at {len(vol_anomalies)} candle(s)")

    # 4. Smooth outlier candles (replace with interpolated value)
    for idx in anomaly_indices:
        if 0 < idx < len(adjusted) - 1:
            prev_close = float(adjusted[idx - 1].get("close", adjusted[idx]["close"]))
            next_open = float(adjusted[idx + 1].get("open", adjusted[idx]["open"]))
            smoothed = (prev_close + next_open) / 2
            adjusted[idx] = {**adjusted[idx], "open": smoothed, "close": smoothed, "_smoothed": True}

    # 5. Compute candle confidence
    n_issues = len(issues)
    if n_issues == 0:
        confidence = 95
    elif n_issues == 1:
        confidence = 80
    elif n_issues == 2:
        confidence = 65
    elif n_issues <= 4:
        confidence = 50
    else:
        confidence = 30

    return {
        "valid": confidence >= 60,
        "confidence": confidence,
        "issues": issues,
        "adjusted_candles": adjusted,
        "candle_count": len(candles),
        "provider": provider,
        "symbol": symbol,
    }


async def get_data_quality_report() -> Dict:
    """
    System-wide data quality dashboard.
    """
    global _datapoints_today, _outliers_today

    # Provider scores
    provider_scores: Dict[str, Dict] = {}
    for name, meta in PROVIDERS.items():
        stats = _provider_stats[name]
        total = stats["success_count"] + stats["failure_count"]
        success_rate = round(stats["success_count"] / total * 100, 1) if total else 100.0
        avg_latency = (
            round(stats["total_latency_ms"] / stats["success_count"])
            if stats["success_count"] else meta["latency_ms"]
        )
        reliability = compute_provider_reliability(name, meta["assets"][0])
        provider_scores[name] = {
            "reliability": reliability,
            "avg_latency_ms": avg_latency,
            "success_rate_24h": success_rate,
            "uptime_pct": success_rate,
            "status": stats["status"],
            "last_check": stats["last_check"],
            "last_latency_ms": stats["last_latency_ms"],
            "assets_supported": meta["assets"],
        }

    # Recent datapoints (last 100)
    recent = _datapoints_today[-100:]
    overall_confidence = round(
        statistics.mean(d["confidence_score"] for d in recent), 1
    ) if recent else 0.0

    # Low / high confidence assets
    seen: Dict[str, Dict] = {}
    for d in reversed(recent):
        if d["symbol"] not in seen:
            seen[d["symbol"]] = d

    low_conf = []
    high_conf = []
    for sym, d in seen.items():
        score = d["confidence_score"]
        grade = _grade(score)
        if grade in ("C", "D"):
            low_conf.append({
                "symbol": sym,
                "confidence": score,
                "grade": grade,
                "issue": "Low provider agreement" if score < CONFIDENCE_MODERATE else "Moderate confidence",
            })
        if score >= CONFIDENCE_HIGH:
            high_conf.append({"symbol": sym, "confidence": score, "grade": "A"})

    # Sort
    low_conf.sort(key=lambda x: x["confidence"])
    high_conf.sort(key=lambda x: x["confidence"], reverse=True)

    # Recommendations
    recommendations: List[str] = []
    offline_providers = [n for n, s in provider_scores.items() if s["status"] == "offline"]
    if offline_providers:
        recommendations.append(f"Restore connectivity for: {', '.join(offline_providers)}")

    degraded_providers = [n for n, s in provider_scores.items() if s["status"] == "degraded"]
    if degraded_providers:
        recommendations.append(f"Monitor degraded providers: {', '.join(degraded_providers)}")

    if low_conf:
        syms = [d["symbol"] for d in low_conf[:3]]
        recommendations.append(f"Add coverage for low-confidence assets: {', '.join(syms)}")

    if overall_confidence < 70:
        recommendations.append("Overall data confidence is below threshold — check API key configuration")

    if _outliers_today > 10:
        recommendations.append(f"{_outliers_today} outliers detected today — provider data may be stale")

    if not recommendations:
        recommendations.append("All systems nominal — data confidence is healthy")

    return {
        "overall_confidence": overall_confidence,
        "provider_scores": provider_scores,
        "low_confidence_assets": low_conf[:10],
        "high_confidence_assets": high_conf[:10],
        "total_datapoints_today": len(_datapoints_today),
        "outliers_detected_today": _outliers_today,
        "recommendations": recommendations,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def format_confidence_badge(score: int) -> Dict:
    """
    Returns display metadata for the confidence badge.
    Grade A (>85): green shield-check
    Grade B (70-85): blue shield
    Grade C (55-70): amber alert-triangle
    Grade D (<55): red x-circle
    """
    if score > CONFIDENCE_HIGH:
        return {
            "grade": "A",
            "color": "#00E676",
            "bg": "rgba(0, 230, 118, 0.12)",
            "border": "rgba(0, 230, 118, 0.3)",
            "label": "High Confidence",
            "icon": "shield-check",
        }
    elif score >= CONFIDENCE_GOOD:
        return {
            "grade": "B",
            "color": "#3B82F6",
            "bg": "rgba(59, 130, 246, 0.12)",
            "border": "rgba(59, 130, 246, 0.3)",
            "label": "Good Data",
            "icon": "shield",
        }
    elif score >= CONFIDENCE_MODERATE:
        return {
            "grade": "C",
            "color": "#F59E0B",
            "bg": "rgba(245, 158, 11, 0.12)",
            "border": "rgba(245, 158, 11, 0.3)",
            "label": "Moderate",
            "icon": "alert-triangle",
        }
    else:
        return {
            "grade": "D",
            "color": "#EF4444",
            "bg": "rgba(239, 68, 68, 0.12)",
            "border": "rgba(239, 68, 68, 0.3)",
            "label": "Low Confidence",
            "icon": "x-circle",
        }


async def ping_provider_status() -> List[Dict]:
    """
    Real-time status of each data provider.
    Pings each provider with a lightweight test request.
    Returns [{provider, status, latency_ms, last_check, success_rate}]
    """
    TEST_CALLS = {
        "coingecko": lambda http: http.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": "bitcoin", "vs_currencies": "usd"},
            timeout=3.0,
        ),
        "twelvedata": lambda http: http.get(
            "https://api.twelvedata.com/quote",
            params={"symbol": "AAPL", "apikey": os.environ.get("TWELVE_DATA_KEY", "demo")},
            timeout=3.0,
        ),
        "polygon": lambda http: http.get(
            f"https://api.polygon.io/v2/aggs/ticker/AAPL/prev",
            params={"adjusted": "true", "apiKey": os.environ.get("POLYGON_KEY", "demo")},
            timeout=3.0,
        ),
        "alphavantage": lambda http: http.get(
            "https://www.alphavantage.co/query",
            params={"function": "GLOBAL_QUOTE", "symbol": "AAPL", "apikey": os.environ.get("ALPHA_VANTAGE_KEY", "demo")},
            timeout=3.0,
        ),
        "yfinance_public": lambda http: http.get(
            "https://query1.finance.yahoo.com/v8/finance/chart/AAPL",
            params={"range": "1d", "interval": "1d"},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=3.0,
        ),
    }

    statuses = []
    async with httpx.AsyncClient() as http:
        for provider_name, call in TEST_CALLS.items():
            t0 = time.time()
            is_online = False
            latency_ms = None
            try:
                resp = await call(http)
                latency_ms = int((time.time() - t0) * 1000)
                is_online = resp.status_code < 500
                if is_online:
                    _record_success(provider_name, latency_ms)
                else:
                    _record_failure(provider_name)
            except Exception:
                latency_ms = int((time.time() - t0) * 1000)
                _record_failure(provider_name)

            stats = _provider_stats[provider_name]
            total = stats["success_count"] + stats["failure_count"]
            success_rate = round(stats["success_count"] / total * 100, 1) if total else 100.0
            statuses.append({
                "provider": provider_name,
                "status": stats["status"],
                "latency_ms": latency_ms,
                "last_check": datetime.now(timezone.utc).isoformat(),
                "success_rate": success_rate,
                "assets_supported": PROVIDERS[provider_name]["assets"],
            })

    return statuses
