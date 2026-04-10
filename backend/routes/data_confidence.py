"""
Data Confidence Engine — FastAPI Routes
=========================================
Exposes the Data Confidence Engine via REST API.

Endpoints:
  GET  /api/data-confidence/price/{symbol}    Cross-validated price with confidence score
  GET  /api/data-confidence/batch             Batch cross-validation for multiple symbols
  GET  /api/data-confidence/quality-report    System-wide data quality dashboard (cached 5 min)
  GET  /api/data-confidence/provider-status   Real-time provider health (cached 60s)
  POST /api/data-confidence/validate-signal   Validate all prices in a signal object
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.data_confidence_engine import (
    ConfidentDataPoint,
    fetch_confident_batch,
    fetch_confident_price,
    format_confidence_badge,
    get_data_quality_report,
    ping_provider_status,
    validate_candle_data,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/data-confidence", tags=["data-confidence"])

# ─── In-route caches ─────────────────────────────────────────────────────────

_cache: Dict[str, dict] = {}


def _cache_get(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < entry["ttl"]:
        return entry["data"]
    return None


def _cache_set(key: str, data: Any, ttl: int):
    _cache[key] = {"data": data, "ts": time.time(), "ttl": ttl}


# ─── Pydantic models ──────────────────────────────────────────────────────────

class SignalAsset(BaseModel):
    symbol: str
    asset_type: str = "stock"
    price: Optional[float] = None


class SignalObject(BaseModel):
    """A trading signal that references one or more assets with price data."""
    signal_id: Optional[str] = None
    direction: Optional[str] = None          # BUY | SELL | HOLD
    confidence: Optional[float] = None       # original signal confidence 0-100
    assets: List[SignalAsset] = []
    entry_price: Optional[float] = None
    stop_loss: Optional[float] = None
    target: Optional[float] = None
    extra: Optional[Dict[str, Any]] = None


class ValidateSignalRequest(BaseModel):
    signal: SignalObject


class ValidateSignalResponse(BaseModel):
    signal: SignalObject
    confidence_adjusted: bool
    adjustments: List[Dict[str, Any]]
    overall_data_confidence: int
    data_confidence_grade: str
    warnings: List[str]
    validated_at: str


# ─── GET /price/{symbol} ──────────────────────────────────────────────────────

@router.get(
    "/price/{symbol}",
    summary="Cross-validated price with confidence score",
    response_description="ConfidentDataPoint with full provider breakdown",
)
async def get_confident_price(
    symbol: str,
    asset_type: str = Query(default="crypto", description="Asset class: crypto|stock|forex|etf|commodity"),
):
    """
    Fetch the price of *symbol* from all applicable providers in parallel,
    cross-validate them, and return a ConfidentDataPoint with a 0-100
    confidence score and provider-by-provider breakdown.

    - Confidence **A** (>85): all providers agree, data is fresh
    - Confidence **B** (70-85): minor spread, data is recent
    - Confidence **C** (55-70): moderate spread or single provider
    - Confidence **D** (<55): high spread, stale data, or no data
    """
    symbol = symbol.upper().strip()
    asset_type = asset_type.lower().strip()

    valid_types = {"crypto", "stock", "forex", "etf", "commodity", "index"}
    if asset_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid asset_type '{asset_type}'. Must be one of: {', '.join(sorted(valid_types))}",
        )

    try:
        cdp = await fetch_confident_price(symbol, asset_type)
        return cdp.to_dict()
    except Exception as e:
        logger.error(f"[data-confidence] price/{symbol} error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Data confidence engine error: {str(e)}")


# ─── GET /batch ───────────────────────────────────────────────────────────────

@router.get(
    "/batch",
    summary="Batch cross-validation for multiple symbols",
    response_description="Dictionary of {symbol: ConfidentDataPoint}",
)
async def get_confident_batch(
    symbols: str = Query(
        description="Comma-separated list of symbols, e.g. BTC,ETH,AAPL,GOLD"
    ),
    asset_types: str = Query(
        default="",
        description="Comma-separated list of asset types matching each symbol. "
                    "If omitted, defaults to 'crypto' for all.",
    ),
):
    """
    Fetch and cross-validate prices for multiple symbols in parallel.

    Example: `?symbols=BTC,ETH,AAPL,GOLD&asset_types=crypto,crypto,stock,commodity`
    """
    sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not sym_list:
        raise HTTPException(status_code=400, detail="No symbols provided")
    if len(sym_list) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 symbols per batch request")

    at_list = [a.strip().lower() for a in asset_types.split(",") if a.strip()] if asset_types else []
    # Pad or truncate asset_types to match symbol count
    while len(at_list) < len(sym_list):
        at_list.append("crypto")
    at_list = at_list[: len(sym_list)]

    try:
        pairs = list(zip(sym_list, at_list))
        results = await fetch_confident_batch(pairs)
        return {sym: cdp.to_dict() for sym, cdp in results.items()}
    except Exception as e:
        logger.error(f"[data-confidence] batch error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch confidence error: {str(e)}")


# ─── GET /quality-report ──────────────────────────────────────────────────────

@router.get(
    "/quality-report",
    summary="System-wide data quality dashboard",
    response_description="Quality report with provider scores, low/high confidence assets, recommendations",
)
async def get_quality_report():
    """
    Returns a system-wide data quality snapshot:
    - Overall confidence score (avg of last 100 datapoints)
    - Per-provider reliability, latency, and success rate
    - List of low-confidence (C/D grade) assets with issue descriptions
    - Top 10 high-confidence (A grade) assets
    - Recommendations (e.g. "Add a third provider for GOLD data")

    Cached for **5 minutes**.
    """
    cached = _cache_get("quality_report")
    if cached is not None:
        return {**cached, "_cache": "HIT"}

    try:
        report = await get_data_quality_report()
        _cache_set("quality_report", report, ttl=300)
        return {**report, "_cache": "MISS"}
    except Exception as e:
        logger.error(f"[data-confidence] quality-report error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Quality report error: {str(e)}")


# ─── GET /provider-status ─────────────────────────────────────────────────────

@router.get(
    "/provider-status",
    summary="Real-time status of each data provider",
    response_description="List of provider health objects",
)
async def get_provider_status():
    """
    Pings each data provider with a test symbol and returns real-time health:
    - `online` — responding normally
    - `degraded` — high error rate or elevated latency
    - `offline` — not responding

    Cached for **60 seconds** to avoid hammering provider APIs.
    """
    cached = _cache_get("provider_status")
    if cached is not None:
        return {"providers": cached, "_cache": "HIT"}

    try:
        statuses = await ping_provider_status()
        _cache_set("provider_status", statuses, ttl=60)
        return {"providers": statuses, "_cache": "MISS"}
    except Exception as e:
        logger.error(f"[data-confidence] provider-status error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Provider status error: {str(e)}")


# ─── POST /validate-signal ────────────────────────────────────────────────────

@router.post(
    "/validate-signal",
    summary="Validate all price data in a trading signal",
    response_model=ValidateSignalResponse,
)
async def validate_signal(body: ValidateSignalRequest):
    """
    Cross-validates every asset referenced in a signal against multi-provider
    consensus. Returns the original signal plus:

    - `confidence_adjusted`: whether any price in the signal diverged from consensus
    - `adjustments`: per-asset adjustment details
    - `overall_data_confidence`: aggregated confidence across all signal assets
    - `warnings`: list of data quality warnings

    Use this before executing any AI-generated trade signal to ensure the
    underlying data is trustworthy.
    """
    signal = body.signal
    if not signal.assets:
        raise HTTPException(
            status_code=400,
            detail="Signal must include at least one asset with symbol and asset_type",
        )

    adjustments: List[Dict[str, Any]] = []
    warnings: List[str] = []
    confidence_adjusted = False

    # Fetch confident prices for all signal assets in parallel
    pairs = [(a.symbol.upper(), a.asset_type.lower()) for a in signal.assets]
    try:
        cdp_map = await fetch_confident_batch(pairs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation fetch error: {str(e)}")

    confidence_scores: List[int] = []

    for asset in signal.assets:
        sym = asset.symbol.upper()
        cdp = cdp_map.get(sym)
        if not cdp:
            warnings.append(f"No data returned for {sym}")
            adjustments.append({
                "symbol": sym,
                "action": "no_data",
                "confidence": 0,
                "note": "Provider returned no data",
            })
            confidence_scores.append(0)
            continue

        confidence_scores.append(cdp.confidence_score)

        # Check if signal price diverges from consensus
        if asset.price and cdp.price > 0:
            signal_delta = abs(asset.price - cdp.price) / cdp.price * 100
            if signal_delta > 2.0:
                confidence_adjusted = True
                adjustments.append({
                    "symbol": sym,
                    "action": "price_adjusted",
                    "original_price": asset.price,
                    "consensus_price": cdp.price,
                    "delta_pct": round(signal_delta, 4),
                    "confidence": cdp.confidence_score,
                    "grade": cdp.confidence_grade,
                    "note": f"Signal price deviates {signal_delta:.1f}% from multi-provider consensus",
                })
                warnings.append(
                    f"{sym}: signal price ${asset.price} deviates {signal_delta:.1f}% from consensus ${cdp.price}"
                )
            else:
                adjustments.append({
                    "symbol": sym,
                    "action": "verified",
                    "price": cdp.price,
                    "confidence": cdp.confidence_score,
                    "grade": cdp.confidence_grade,
                    "note": "Price verified within 2% tolerance",
                })
        else:
            adjustments.append({
                "symbol": sym,
                "action": "checked",
                "consensus_price": cdp.price,
                "confidence": cdp.confidence_score,
                "grade": cdp.confidence_grade,
                "note": "No original price in signal to compare",
            })

        # Forward any data quality warnings
        for w in cdp.warnings:
            warnings.append(f"{sym}: {w}")

    # Compute overall data confidence
    if confidence_scores:
        import statistics
        overall_conf = int(round(statistics.mean(confidence_scores)))
    else:
        overall_conf = 0

    if overall_conf < 60:
        warnings.append("Overall data confidence is LOW — treat signal with caution")
    elif overall_conf < 75:
        warnings.append("Overall data confidence is MODERATE — verify before acting")

    return ValidateSignalResponse(
        signal=signal,
        confidence_adjusted=confidence_adjusted,
        adjustments=adjustments,
        overall_data_confidence=overall_conf,
        data_confidence_grade=_grade(overall_conf),
        warnings=warnings,
        validated_at=datetime.now(timezone.utc).isoformat(),
    )


# ─── GET /badge/{score} ───────────────────────────────────────────────────────

@router.get(
    "/badge/{score}",
    summary="Get display metadata for a confidence score badge",
)
async def get_confidence_badge(score: int):
    """
    Returns color, icon, grade, and label for any confidence score (0-100).
    Useful for frontend rendering without importing the engine directly.
    """
    if not 0 <= score <= 100:
        raise HTTPException(status_code=400, detail="Score must be between 0 and 100")
    return format_confidence_badge(score)


def _grade(score: int) -> str:
    if score > 85:
        return "A"
    elif score >= 70:
        return "B"
    elif score >= 55:
        return "C"
    else:
        return "D"
