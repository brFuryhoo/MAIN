"""
JARVIS Global Data Fusion — FastAPI Routes
============================================
Exposes the JARVIS Global Data Fusion Engine via REST API.

Endpoints:
  GET  /api/global-fusion/report             Full fusion report (cached 10 min)
  GET  /api/global-fusion/events             Live world events feed
  GET  /api/global-fusion/asset-impact/{symbol}  Per-asset impact analysis
  GET  /api/global-fusion/correlation-matrix Real-time cross-asset correlations
  GET  /api/global-fusion/pulse              Lightweight heartbeat (cached 30s)
  POST /api/global-fusion/analyze-event      Analyze arbitrary text/headline
"""

import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.global_data_fusion import (
    FUSION_ASSET_UNIVERSE,
    build_asset_impact_map,
    compute_event_price_correlation,
    generate_fusion_narrative,
    run_full_fusion,
)
from services.world_events_engine import aggregate_world_events, score_event_relevance
from services.correlation_matrix import build_correlation_matrix

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/global-fusion", tags=["global-fusion"])

# ─────────────────────────── per-endpoint caches ────────────────────────────

_cache: Dict[str, dict] = {}


def _cache_get(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < entry["ttl"]:
        return entry["data"]
    return None


def _cache_set(key: str, data: Any, ttl: int):
    _cache[key] = {"data": data, "ts": time.time(), "ttl": ttl}


# ─────────────────────────── request models ──────────────────────────────────

class AnalyzeEventRequest(BaseModel):
    text: str
    context: Optional[str] = None  # optional extra context


# ─────────────────────────── GET /report ─────────────────────────────────────

@router.get("/report", summary="Full JARVIS Global Data Fusion Report")
async def get_fusion_report():
    """
    Full fusion report — world events + live prices + event-price correlations
    + per-asset impact analysis + JARVIS GPT-5.2 intelligence narrative.

    Cached for 10 minutes. This is the heaviest endpoint — it calls all data
    sources and the LLM in parallel.
    """
    cache_key = "route:fusion_report"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {**cached, "_cache": "HIT"}

    try:
        report = await run_full_fusion()
        _cache_set(cache_key, report, ttl=600)
        return {**report, "_cache": "MISS"}
    except Exception as exc:
        logger.exception(f"Fusion report error: {exc}")
        raise HTTPException(status_code=500, detail=f"Fusion report generation failed: {str(exc)}")


# ─────────────────────────── GET /events ─────────────────────────────────────

@router.get("/events", summary="Live World Events Feed")
async def get_world_events(
    category: Optional[str] = Query(None, description="Filter by category: geopolitical|macro|crypto|equity|commodity|forex"),
    min_relevance: int = Query(0, ge=0, le=100, description="Minimum relevance score (0-100)"),
    limit: int = Query(20, ge=1, le=100, description="Max number of events to return"),
    sentiment: Optional[str] = Query(None, description="Filter by sentiment: bullish|bearish|neutral"),
    impact: Optional[str] = Query(None, description="Filter by impact level: HIGH|MEDIUM|LOW"),
):
    """
    Live world events feed with financial market relevance scores.
    Sourced from Reuters, BBC, CoinDesk, Yahoo Finance, and Reddit.

    Cached for 5 minutes.
    """
    cache_key = "route:world_events"
    cached = _cache_get(cache_key)
    if cached is None:
        try:
            events_data = await aggregate_world_events(use_cache_seconds=300)
            _cache_set(cache_key, events_data, ttl=300)
        except Exception as exc:
            logger.exception(f"World events fetch error: {exc}")
            raise HTTPException(status_code=500, detail=f"World events fetch failed: {str(exc)}")
    else:
        events_data = cached

    events: List[Dict] = events_data.get("events", [])

    # Apply filters
    valid_categories = {"geopolitical", "macro", "crypto", "equity", "commodity", "forex"}
    valid_sentiments = {"bullish", "bearish", "neutral"}
    valid_impacts = {"HIGH", "MEDIUM", "LOW"}

    if category and category in valid_categories:
        events = [e for e in events if e.get("category") == category]
    if sentiment and sentiment in valid_sentiments:
        events = [e for e in events if e.get("sentiment") == sentiment]
    if impact and impact.upper() in valid_impacts:
        events = [e for e in events if e.get("impact_level") == impact.upper()]
    if min_relevance > 0:
        events = [e for e in events if e.get("relevance_score", 0) >= min_relevance]

    return {
        "events": events[:limit],
        "total_returned": min(len(events), limit),
        "total_available": len(events),
        "market_temperature": events_data.get("market_temperature"),
        "categories": events_data.get("categories"),
        "top_themes": events_data.get("top_themes"),
        "generated_at": events_data.get("generated_at"),
        "filters_applied": {
            "category": category,
            "min_relevance": min_relevance,
            "sentiment": sentiment,
            "impact": impact,
            "limit": limit,
        },
    }


# ─────────────────────────── GET /asset-impact/{symbol} ─────────────────────

@router.get("/asset-impact/{symbol}", summary="Asset Impact Analysis")
async def get_asset_impact(symbol: str):
    """
    Impact analysis for a specific asset.
    Shows all active world events affecting it, the combined directional
    signal, impact score, and key event drivers.
    """
    symbol = symbol.upper()
    cache_key = f"route:asset_impact:{symbol}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {**cached, "_cache": "HIT"}

    try:
        # Get events
        events_data = await aggregate_world_events(use_cache_seconds=300)
        all_events = events_data.get("events", [])

        # Fetch price for this specific asset
        # Determine asset type from universe list
        asset_type = "stock"
        cg_id = None
        for a in FUSION_ASSET_UNIVERSE:
            if a["symbol"].upper() == symbol:
                asset_type = a["type"]
                cg_id = a.get("cg_id")
                break

        from services.market_data import market_data_adapter
        try:
            price_data = await market_data_adapter.get_asset_data(symbol, asset_type, coingecko_id=cg_id)
            asset_prices = {symbol: price_data}
        except Exception:
            asset_prices = {}

        # Compute correlations for this asset only
        correlations = await compute_event_price_correlation(all_events, asset_prices)
        asset_correlations = [c for c in correlations if c["asset"] == symbol]

        # Build impact map
        impact_map = build_asset_impact_map(all_events, asset_correlations)
        impact = impact_map.get(symbol, {
            "impact_score": 0,
            "bias": "neutral",
            "key_drivers": [],
            "risk_level": "LOW",
            "active_event_count": 0,
        })

        # Active events affecting this asset
        active_event_ids = {c["event_id"] for c in asset_correlations}
        event_lookup = {e["id"]: e for e in all_events}
        active_events = [
            {
                **event_lookup[eid],
                "correlation": next(
                    (c["correlation_strength"] for c in asset_correlations if c["event_id"] == eid), 0
                ),
                "direction": next(
                    (c["direction"] for c in asset_correlations if c["event_id"] == eid), "neutral"
                ),
            }
            for eid in active_event_ids
            if eid in event_lookup
        ]
        active_events.sort(key=lambda e: e.get("correlation", 0), reverse=True)

        # Current price summary
        price_summary = None
        if symbol in asset_prices and asset_prices[symbol]:
            pd = asset_prices[symbol]
            price_summary = {
                "price": pd.get("price"),
                "change_percent": pd.get("change_percent"),
                "name": pd.get("name", symbol),
                "source": pd.get("source", ""),
            }

        result = {
            "symbol": symbol,
            "price": price_summary,
            "impact_score": impact.get("impact_score", 0),
            "bias": impact.get("bias", "neutral"),
            "risk_level": impact.get("risk_level", "LOW"),
            "key_drivers": impact.get("key_drivers", []),
            "active_events": active_events[:10],
            "active_event_count": len(active_events),
            "market_temperature": events_data.get("market_temperature"),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        _cache_set(cache_key, result, ttl=300)
        return {**result, "_cache": "MISS"}

    except Exception as exc:
        logger.exception(f"Asset impact error for {symbol}: {exc}")
        raise HTTPException(status_code=500, detail=f"Asset impact analysis failed: {str(exc)}")


# ─────────────────────────── GET /correlation-matrix ────────────────────────

@router.get("/correlation-matrix", summary="Real-Time Cross-Asset Correlation Matrix")
async def get_correlation_matrix(
    lookback: int = Query(30, ge=10, le=100, description="Number of candles for rolling correlation"),
):
    """
    Real-time cross-asset Pearson correlation matrix for the top 15 assets.
    Includes correlation break (regime change) detection.

    Cached for 5 minutes.
    """
    cache_key = f"route:corr_matrix:{lookback}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {**cached, "_cache": "HIT"}

    try:
        matrix_data = await build_correlation_matrix(lookback_candles=lookback)
        _cache_set(cache_key, matrix_data, ttl=300)
        return {**matrix_data, "_cache": "MISS"}
    except Exception as exc:
        logger.exception(f"Correlation matrix error: {exc}")
        raise HTTPException(status_code=500, detail=f"Correlation matrix computation failed: {str(exc)}")


# ─────────────────────────── GET /pulse ─────────────────────────────────────

@router.get("/pulse", summary="JARVIS Market Pulse (Lightweight)")
async def get_market_pulse():
    """
    Lightweight heartbeat endpoint. Returns essential market intelligence:
    market_temperature, top 3 events, critical alerts, macro regime.

    Designed for polling every 60 seconds. Cached for 30 seconds.
    """
    cache_key = "route:pulse"
    cached = _cache_get(cache_key)
    if cached is not None:
        return {**cached, "_cache": "HIT"}

    try:
        events_data = await aggregate_world_events(use_cache_seconds=120)

        all_events = events_data.get("events", [])
        top_3 = all_events[:3] if len(all_events) >= 3 else all_events

        # Critical alerts: HIGH-impact bearish events
        critical_alerts = [
            {
                "title": e["title"],
                "source": e.get("source"),
                "affected_assets": e.get("affected_assets", [])[:4],
                "sentiment": e.get("sentiment"),
            }
            for e in all_events
            if e.get("impact_level") == "HIGH" and e.get("sentiment") == "bearish"
        ][:3]

        # Quick macro regime from event distribution
        categories = events_data.get("categories", {})
        temperature = events_data.get("market_temperature", "WARM")

        geo_count = categories.get("geopolitical", 0)
        macro_count = categories.get("macro", 0)
        crypto_count = categories.get("crypto", 0)

        if temperature == "HOT" and geo_count >= 2:
            macro_regime = "RISK-OFF"
        elif temperature == "COOL" and macro_count >= 2:
            macro_regime = "GOLDILOCKS"
        elif geo_count >= 3:
            macro_regime = "CRISIS"
        elif crypto_count >= 3:
            macro_regime = "RISK-ON"
        else:
            macro_regime = "TRANSITION"

        result = {
            "market_temperature": temperature,
            "macro_regime": macro_regime,
            "top_3_events": [
                {
                    "title": e.get("title", ""),
                    "source": e.get("source", ""),
                    "category": e.get("category", ""),
                    "sentiment": e.get("sentiment", "neutral"),
                    "impact_level": e.get("impact_level", "LOW"),
                    "affected_assets": e.get("affected_assets", [])[:4],
                    "relevance_score": e.get("relevance_score", 0),
                }
                for e in top_3
            ],
            "critical_alerts": critical_alerts,
            "top_themes": events_data.get("top_themes", []),
            "total_events_tracked": events_data.get("total", 0),
            "categories": categories,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        _cache_set(cache_key, result, ttl=30)
        return {**result, "_cache": "MISS"}

    except Exception as exc:
        logger.exception(f"Pulse endpoint error: {exc}")
        raise HTTPException(status_code=500, detail=f"Market pulse fetch failed: {str(exc)}")


# ─────────────────────────── POST /analyze-event ────────────────────────────

@router.post("/analyze-event", summary="Analyze a News Headline or Text")
async def analyze_event(request: AnalyzeEventRequest):
    """
    Takes raw text (news headline, user-submitted text, or market note),
    runs it through the scoring engine and GPT-5.2 narrative generator,
    and returns a complete impact analysis.

    No caching — always fresh analysis.
    """
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Text must be under 2000 characters")

    try:
        # Fast keyword scoring
        scoring = score_event_relevance(text, request.context or "")

        # Fetch current prices for affected assets
        from services.market_data import market_data_adapter
        affected = scoring.get("affected_assets", [])

        asset_prices: Dict[str, Dict] = {}
        if affected:
            # Map symbols to types
            sym_type_map = {
                a["symbol"]: a for a in FUSION_ASSET_UNIVERSE
            }
            tasks = []
            for sym in affected[:6]:  # limit to 6 for speed
                meta = sym_type_map.get(sym, {"symbol": sym, "type": "stock", "cg_id": None})
                tasks.append(
                    market_data_adapter.get_asset_data(
                        sym, meta["type"], coingecko_id=meta.get("cg_id")
                    )
                )
            import asyncio
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for sym, res in zip(affected[:6], results):
                if not isinstance(res, Exception) and res:
                    asset_prices[sym] = res

        # Generate event dict
        synthetic_event = {
            "id": str(uuid.uuid4())[:16],
            "title": text,
            "source": "User Submission",
            "category": scoring["category"],
            "relevance_score": scoring["relevance_score"],
            "sentiment": scoring["sentiment"],
            "affected_assets": scoring["affected_assets"],
            "impact_level": scoring["impact_level"],
            "published_at": datetime.now(timezone.utc).isoformat(),
            "url": "",
        }

        # Compute correlations for this single event
        correlations = await compute_event_price_correlation([synthetic_event], asset_prices)

        # Build narrative via GPT-5.2
        fusion_context = {
            "events": [synthetic_event],
            "prices": asset_prices,
            "correlations": correlations,
            "market_temperature": "WARM",
            "top_themes": [scoring["category"]],
        }
        narrative = await generate_fusion_narrative(fusion_context)

        return {
            "input_text": text,
            "scoring": {
                "relevance_score": scoring["relevance_score"],
                "sentiment": scoring["sentiment"],
                "category": scoring["category"],
                "impact_level": scoring["impact_level"],
                "affected_assets": scoring["affected_assets"],
            },
            "asset_correlations": correlations[:10],
            "affected_asset_prices": {
                sym: {
                    "price": d.get("price"),
                    "change_percent": d.get("change_percent"),
                    "name": d.get("name", sym),
                }
                for sym, d in asset_prices.items() if d
            },
            "jarvis_analysis": {
                "executive_summary": narrative.get("executive_summary"),
                "cross_asset_signals": narrative.get("cross_asset_signals", []),
                "macro_regime": narrative.get("macro_regime"),
                "jarvis_alert": narrative.get("jarvis_alert"),
                "narrative": narrative.get("narrative"),
            },
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as exc:
        logger.exception(f"Analyze event error: {exc}")
        raise HTTPException(status_code=500, detail=f"Event analysis failed: {str(exc)}")
