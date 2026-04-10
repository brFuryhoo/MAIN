"""
JARVIS Global Data Fusion Engine
==================================
Crosses news events + price data + technical analysis + geopolitical risk
+ Reddit sentiment + macro calendar into unified market intelligence.

This is the brain that turns the internet into trading signals.
"""

import asyncio
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from emergentintegrations.llm.chat import LlmChat, UserMessage

from services.market_data import market_data_adapter
from services.world_events_engine import aggregate_world_events

logger = logging.getLogger(__name__)

# ─────────────────────────── cache ───────────────────────────────────────────

_fusion_cache: Dict[str, dict] = {}


def _cache_get(key: str) -> Optional[dict]:
    entry = _fusion_cache.get(key)
    if entry and time.time() - entry["ts"] < entry["ttl"]:
        return entry["data"]
    return None


def _cache_set(key: str, data, ttl: int):
    _fusion_cache[key] = {"data": data, "ts": time.time(), "ttl": ttl}


# ─────────────────────────── curated 25-asset universe ───────────────────────

FUSION_ASSET_UNIVERSE = [
    # Crypto
    {"symbol": "BTC",     "type": "crypto",    "cg_id": "bitcoin"},
    {"symbol": "ETH",     "type": "crypto",    "cg_id": "ethereum"},
    {"symbol": "SOL",     "type": "crypto",    "cg_id": "solana"},
    {"symbol": "XRP",     "type": "crypto",    "cg_id": "ripple"},
    # US Tech / High-beta
    {"symbol": "NVDA",    "type": "stock",     "cg_id": None},
    {"symbol": "AAPL",    "type": "stock",     "cg_id": None},
    {"symbol": "MSFT",    "type": "stock",     "cg_id": None},
    {"symbol": "TSLA",    "type": "stock",     "cg_id": None},
    {"symbol": "META",    "type": "stock",     "cg_id": None},
    {"symbol": "TSM",     "type": "stock",     "cg_id": None},
    # Broad market
    {"symbol": "SPY",     "type": "etf",       "cg_id": None},
    {"symbol": "QQQ",     "type": "etf",       "cg_id": None},
    # Energy / Commodities
    {"symbol": "XOM",     "type": "stock",     "cg_id": None},
    {"symbol": "CVX",     "type": "stock",     "cg_id": None},
    # Commodities (via forex-style Twelve Data symbols)
    {"symbol": "XAU/USD", "type": "forex",     "cg_id": None},   # Gold
    {"symbol": "XAG/USD", "type": "forex",     "cg_id": None},   # Silver
    # Forex
    {"symbol": "EUR/USD", "type": "forex",     "cg_id": None},
    {"symbol": "USD/JPY", "type": "forex",     "cg_id": None},
    {"symbol": "GBP/USD", "type": "forex",     "cg_id": None},
    {"symbol": "USD/CNY", "type": "forex",     "cg_id": None},
    # Defensive / risk-off
    {"symbol": "GLD",     "type": "etf",       "cg_id": None},   # Gold ETF
    {"symbol": "TLT",     "type": "etf",       "cg_id": None},   # 20Y Treasury
    # Emerging / China
    {"symbol": "BABA",    "type": "stock",     "cg_id": None},
    {"symbol": "EEM",     "type": "etf",       "cg_id": None},
    # Healthcare / defensive
    {"symbol": "JNJ",     "type": "stock",     "cg_id": None},
]

# Asset sensitivity to event categories: higher = more sensitive
# (geopolitical, macro, crypto, equity, commodity, forex)
ASSET_SENSITIVITY: Dict[str, Dict[str, float]] = {
    "GOLD":    {"geopolitical": 0.9, "macro": 0.7, "crypto": 0.1, "equity": 0.2, "commodity": 0.8, "forex": 0.6},
    "XAU/USD": {"geopolitical": 0.9, "macro": 0.7, "crypto": 0.1, "equity": 0.2, "commodity": 0.8, "forex": 0.6},
    "GLD":     {"geopolitical": 0.9, "macro": 0.7, "crypto": 0.1, "equity": 0.2, "commodity": 0.8, "forex": 0.6},
    "XAG/USD": {"geopolitical": 0.7, "macro": 0.5, "crypto": 0.1, "equity": 0.2, "commodity": 0.8, "forex": 0.4},
    "OIL":     {"geopolitical": 0.9, "macro": 0.5, "crypto": 0.1, "equity": 0.3, "commodity": 0.95, "forex": 0.3},
    "XOM":     {"geopolitical": 0.8, "macro": 0.4, "crypto": 0.0, "equity": 0.7, "commodity": 0.9, "forex": 0.2},
    "CVX":     {"geopolitical": 0.8, "macro": 0.4, "crypto": 0.0, "equity": 0.7, "commodity": 0.9, "forex": 0.2},
    "BTC":     {"geopolitical": 0.5, "macro": 0.6, "crypto": 0.95, "equity": 0.5, "commodity": 0.1, "forex": 0.4},
    "ETH":     {"geopolitical": 0.4, "macro": 0.5, "crypto": 0.95, "equity": 0.5, "commodity": 0.1, "forex": 0.3},
    "SOL":     {"geopolitical": 0.3, "macro": 0.4, "crypto": 0.9, "equity": 0.4, "commodity": 0.0, "forex": 0.2},
    "XRP":     {"geopolitical": 0.3, "macro": 0.4, "crypto": 0.9, "equity": 0.3, "commodity": 0.0, "forex": 0.5},
    "NVDA":    {"geopolitical": 0.8, "macro": 0.5, "crypto": 0.3, "equity": 0.9, "commodity": 0.2, "forex": 0.2},
    "TSM":     {"geopolitical": 0.95, "macro": 0.5, "crypto": 0.2, "equity": 0.9, "commodity": 0.3, "forex": 0.3},
    "SPY":     {"geopolitical": 0.6, "macro": 0.85, "crypto": 0.3, "equity": 0.9, "commodity": 0.4, "forex": 0.3},
    "QQQ":     {"geopolitical": 0.5, "macro": 0.8, "crypto": 0.4, "equity": 0.9, "commodity": 0.3, "forex": 0.2},
    "TLT":     {"geopolitical": 0.7, "macro": 0.95, "crypto": 0.1, "equity": 0.3, "commodity": 0.2, "forex": 0.5},
    "EUR/USD": {"geopolitical": 0.7, "macro": 0.8, "crypto": 0.1, "equity": 0.3, "commodity": 0.3, "forex": 0.95},
    "USD/JPY": {"geopolitical": 0.6, "macro": 0.9, "crypto": 0.1, "equity": 0.4, "commodity": 0.2, "forex": 0.9},
    "GBP/USD": {"geopolitical": 0.7, "macro": 0.7, "crypto": 0.1, "equity": 0.3, "commodity": 0.2, "forex": 0.9},
    "USD/CNY": {"geopolitical": 0.9, "macro": 0.7, "crypto": 0.2, "equity": 0.5, "commodity": 0.4, "forex": 0.9},
    "AAPL":    {"geopolitical": 0.5, "macro": 0.5, "crypto": 0.2, "equity": 0.9, "commodity": 0.1, "forex": 0.3},
    "MSFT":    {"geopolitical": 0.4, "macro": 0.5, "crypto": 0.3, "equity": 0.9, "commodity": 0.1, "forex": 0.2},
    "TSLA":    {"geopolitical": 0.4, "macro": 0.5, "crypto": 0.4, "equity": 0.9, "commodity": 0.3, "forex": 0.2},
    "META":    {"geopolitical": 0.5, "macro": 0.4, "crypto": 0.3, "equity": 0.9, "commodity": 0.1, "forex": 0.2},
    "BABA":    {"geopolitical": 0.9, "macro": 0.6, "crypto": 0.2, "equity": 0.8, "commodity": 0.2, "forex": 0.5},
    "EEM":     {"geopolitical": 0.7, "macro": 0.7, "crypto": 0.2, "equity": 0.7, "commodity": 0.5, "forex": 0.6},
    "GLD":     {"geopolitical": 0.9, "macro": 0.7, "crypto": 0.1, "equity": 0.2, "commodity": 0.8, "forex": 0.6},
    "JNJ":     {"geopolitical": 0.2, "macro": 0.4, "crypto": 0.0, "equity": 0.8, "commodity": 0.1, "forex": 0.1},
}

DEFAULT_SENSITIVITY = {"geopolitical": 0.4, "macro": 0.5, "crypto": 0.2, "equity": 0.6, "commodity": 0.3, "forex": 0.3}


# ─────────────────────────── price fetching ──────────────────────────────────

async def _fetch_asset_prices(symbols: List[Dict]) -> Dict[str, Dict]:
    """Fetch live prices for all assets in parallel. Returns {symbol: {price, change_percent, ...}}"""

    async def _fetch_one(asset: Dict) -> tuple:
        sym = asset["symbol"]
        try:
            data = await market_data_adapter.get_asset_data(
                sym, asset["type"], coingecko_id=asset.get("cg_id")
            )
            return sym, data
        except Exception as exc:
            logger.warning(f"Price fetch error for {sym}: {exc}")
            return sym, None

    tasks = [_fetch_one(a) for a in symbols]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    prices: Dict[str, Dict] = {}
    for result in results:
        if isinstance(result, Exception):
            continue
        sym, data = result
        if data:
            prices[sym] = data
    return prices


# ─────────────────────────── event-price correlation ────────────────────────

async def compute_event_price_correlation(
    events: List[Dict], asset_prices: Dict
) -> List[Dict]:
    """
    For each event, identify which assets are affected and compute a
    correlation_strength based on relevance_score × asset_sensitivity.

    Returns: [{event_id, asset, correlation_strength, direction, reasoning}]
    """
    correlations: List[Dict] = []

    for event in events:
        event_id = event.get("id", "")
        category = event.get("category", "macro")
        relevance = event.get("relevance_score", 50) / 100.0
        sentiment = event.get("sentiment", "neutral")
        affected_assets = event.get("affected_assets", [])
        title = event.get("title", "")

        # All assets in our universe
        all_symbols = list(asset_prices.keys())

        # Build a combined set: explicitly mentioned + universe filtered by sensitivity
        target_assets = set(affected_assets) & set(all_symbols)

        # Also add any high-sensitivity assets for this event category
        for sym in all_symbols:
            sens = ASSET_SENSITIVITY.get(sym, DEFAULT_SENSITIVITY)
            cat_sensitivity = sens.get(category, 0.3)
            if cat_sensitivity >= 0.7 and sym not in target_assets:
                target_assets.add(sym)

        for asset_sym in target_assets:
            sens = ASSET_SENSITIVITY.get(asset_sym, DEFAULT_SENSITIVITY)
            cat_sensitivity = sens.get(category, 0.3)

            # Correlation strength = relevance × category sensitivity
            strength = round(min(1.0, relevance * cat_sensitivity * 1.3), 3)

            if strength < 0.1:
                continue

            # Direction from event sentiment (some assets invert direction)
            # Safe-haven assets (GOLD, TLT) invert during bearish macro risk
            safe_haven = asset_sym in ("GOLD", "XAU/USD", "GLD", "TLT", "XAG/USD")
            if sentiment == "bearish" and safe_haven:
                direction = "bullish"
            elif sentiment == "bearish":
                direction = "bearish"
            elif sentiment == "bullish" and safe_haven and category == "geopolitical":
                direction = "bearish"
            elif sentiment == "bullish":
                direction = "bullish"
            else:
                direction = "neutral"

            # Human-readable reasoning
            reasoning = _build_correlation_reasoning(
                asset_sym, category, sentiment, strength, title
            )

            correlations.append({
                "event_id": event_id,
                "asset": asset_sym,
                "correlation_strength": strength,
                "direction": direction,
                "reasoning": reasoning,
                "category": category,
            })

    # Sort by correlation strength descending
    correlations.sort(key=lambda c: c["correlation_strength"], reverse=True)
    return correlations


def _build_correlation_reasoning(
    asset: str, category: str, sentiment: str, strength: float, title: str
) -> str:
    """Generate concise reasoning for a correlation entry."""
    strength_label = "strong" if strength >= 0.6 else "moderate" if strength >= 0.35 else "weak"
    cat_explanations = {
        "geopolitical": f"Geopolitical events typically drive {strength_label} {sentiment} pressure on {asset}",
        "macro": f"Macro policy shifts create {strength_label} sensitivity for {asset}",
        "crypto": f"Crypto market developments have {strength_label} impact on {asset}",
        "equity": f"Equity market news carries {strength_label} correlation with {asset}",
        "commodity": f"Commodity supply/demand shifts drive {strength_label} {asset} movement",
        "forex": f"Currency dynamics produce {strength_label} {sentiment} signal for {asset}",
    }
    base = cat_explanations.get(category, f"{category} event correlates {strength_label}ly with {asset}")
    short_title = title[:60] + "..." if len(title) > 60 else title
    return f"{base}. Triggered by: \"{short_title}\""


# ─────────────────────────── asset impact map ────────────────────────────────

def build_asset_impact_map(events: List[Dict], correlations: List[Dict]) -> Dict:
    """
    Aggregate all event impacts into a per-asset impact score.

    Returns:
    {
      "BTC": {"impact_score": 72, "bias": "bullish", "key_drivers": [...], "risk_level": "MEDIUM"},
      ...
    }
    """
    # Group correlations by asset
    asset_data: Dict[str, List[Dict]] = {}
    for corr in correlations:
        sym = corr["asset"]
        if sym not in asset_data:
            asset_data[sym] = []
        asset_data[sym].append(corr)

    impact_map: Dict[str, Dict] = {}
    event_lookup = {e["id"]: e for e in events}

    for sym, corrs in asset_data.items():
        # Weighted impact score: sum(strength × relevance × 100) / count
        total_strength = sum(c["correlation_strength"] for c in corrs)
        avg_strength = total_strength / len(corrs) if corrs else 0
        impact_score = min(100, int(avg_strength * 100))

        # Bias from directional counts
        bull_count = sum(1 for c in corrs if c["direction"] == "bullish")
        bear_count = sum(1 for c in corrs if c["direction"] == "bearish")
        if bull_count > bear_count:
            bias = "bullish"
        elif bear_count > bull_count:
            bias = "bearish"
        else:
            bias = "neutral"

        # Key drivers: top 3 events by correlation strength
        top_corrs = sorted(corrs, key=lambda c: c["correlation_strength"], reverse=True)[:3]
        key_drivers = []
        for c in top_corrs:
            evt = event_lookup.get(c["event_id"], {})
            if evt.get("title"):
                key_drivers.append({
                    "event_title": evt["title"][:80],
                    "direction": c["direction"],
                    "strength": c["correlation_strength"],
                    "source": evt.get("source", ""),
                })

        # Risk level
        high_impact_events = sum(
            1 for c in corrs
            if event_lookup.get(c["event_id"], {}).get("impact_level") == "HIGH"
        )
        if impact_score >= 70 or high_impact_events >= 2:
            risk_level = "HIGH"
        elif impact_score >= 40:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        impact_map[sym] = {
            "impact_score": impact_score,
            "bias": bias,
            "key_drivers": key_drivers,
            "risk_level": risk_level,
            "active_event_count": len(corrs),
        }

    return impact_map


# ─────────────────────────── GPT-5.2 fusion narrative ───────────────────────

async def generate_fusion_narrative(fusion_data: Dict) -> Dict:
    """
    Uses GPT-5.2 to write the JARVIS Global Intelligence Report.

    Returns:
    {
      "executive_summary": str,
      "narrative": str,
      "critical_events": [...],
      "cross_asset_signals": [...],
      "macro_regime": str,
      "jarvis_alert": str,
    }
    """
    events = fusion_data.get("events", [])
    prices = fusion_data.get("prices", {})
    correlations = fusion_data.get("correlations", [])
    market_temperature = fusion_data.get("market_temperature", "WARM")
    top_themes = fusion_data.get("top_themes", [])

    # Build concise context for the prompt
    top_events = sorted(events, key=lambda e: e.get("relevance_score", 0), reverse=True)[:10]

    events_text = "\n".join(
        f"[{e.get('impact_level','?')}|{e.get('sentiment','?')}] {e.get('title','')} "
        f"(source: {e.get('source','')}, category: {e.get('category','')})"
        for e in top_events
    )

    # Top 10 asset prices
    price_lines = []
    for sym, data in list(prices.items())[:12]:
        if data:
            chg = data.get("change_percent", 0)
            chg_str = f"{chg:+.2f}%" if isinstance(chg, (int, float)) else "N/A"
            price_lines.append(f"{sym}: ${data.get('price', 0):,.4g} ({chg_str})")
    prices_text = "\n".join(price_lines) if price_lines else "Price data unavailable"

    # Top correlations
    top_corrs = sorted(correlations, key=lambda c: c["correlation_strength"], reverse=True)[:8]
    corr_text = "\n".join(
        f"{c['asset']} ← {c['direction']} | strength={c['correlation_strength']:.2f}"
        for c in top_corrs
    )

    system_prompt = (
        "You are JARVIS, Aureos AI's Global Data Fusion Intelligence Core. "
        "Your role is to synthesize global macro events, price action, and cross-asset correlations "
        "into institutional-grade market intelligence. "
        "Write with the precision of a senior Goldman Sachs strategist and the clarity of a Bloomberg analyst. "
        "Always use probabilistic language. Never make deterministic predictions. "
        "Be concise, data-anchored, and actionable."
    )

    user_prompt = f"""Generate a JARVIS Global Intelligence Report based on the following real-time data:

MARKET TEMPERATURE: {market_temperature}
TOP THEMES: {', '.join(top_themes)}

TOP NEWS EVENTS (by relevance):
{events_text}

LIVE ASSET PRICES:
{prices_text}

TOP CROSS-ASSET CORRELATIONS:
{corr_text}

Produce a JSON report with exactly these keys:
{{
  "executive_summary": "2-3 sentence summary of the most critical developments right now",
  "narrative": "Four paragraphs: (1) macro regime overview, (2) geopolitical/event risks, (3) cross-asset dynamics, (4) key tactical signals",
  "critical_events": [
    {{"event": "event title", "market_impact": "specific impact description", "assets_affected": ["SYM1", "SYM2"]}}
  ],
  "cross_asset_signals": [
    {{
      "signal_type": "CORRELATION_BREAK|SAFE_HAVEN_FLOW|RISK_OFF|RISK_ON|MOMENTUM_SHIFT|REGIME_CHANGE",
      "description": "What is happening and why",
      "confidence": 0-100,
      "trade_ideas": [{{"asset": "SYM", "direction": "long|short", "reasoning": "..."}}]
    }}
  ],
  "macro_regime": "RISK-ON|RISK-OFF|STAGFLATION|GOLDILOCKS|CRISIS|TRANSITION",
  "jarvis_alert": "One critical sentence if something urgent is happening, or null if nothing critical"
}}

Return only valid JSON. No markdown. No preamble."""

    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    session_id = str(uuid.uuid4())

    fallback = {
        "executive_summary": "Market intelligence is temporarily unavailable. Data collection is active.",
        "narrative": "JARVIS narrative generation is initializing. Cross-asset data has been collected and correlation analysis is running.",
        "critical_events": [],
        "cross_asset_signals": [],
        "macro_regime": "TRANSITION",
        "jarvis_alert": None,
    }

    if not api_key:
        logger.warning("EMERGENT_LLM_KEY not set — skipping GPT narrative")
        return fallback

    try:
        llm = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_prompt,
        ).with_model("openai", "gpt-5.2")

        response = await llm.chat(UserMessage(content=user_prompt))
        text = response.strip()

        # Strip potential markdown code fences
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        import json
        parsed = json.loads(text)
        logger.info("JARVIS fusion narrative generated successfully")
        return parsed

    except Exception as exc:
        logger.error(f"GPT narrative generation failed: {exc}")
        return fallback


# ─────────────────────────── master fusion function ─────────────────────────

async def run_full_fusion(asset_symbols: List[Dict] = None) -> Dict:
    """
    Master fusion function. Runs in parallel:
    1. Fetch world events
    2. Fetch live prices for all assets
    3. Cross-correlate events to price movements
    4. Build per-asset impact map
    5. Generate fusion narrative via GPT-5.2
    6. Return complete FusionReport

    Returns: FusionReport dict
    """
    cache_key = "fusion:full_report"
    cached = _cache_get(cache_key)
    if cached is not None:
        logger.debug("Full fusion: returning cached report")
        return cached

    assets = asset_symbols or FUSION_ASSET_UNIVERSE
    generated_at = datetime.now(timezone.utc).isoformat()

    logger.info(f"Running full data fusion for {len(assets)} assets...")

    # ── step 1 & 2: parallel events + prices ────────────────────────────────
    events_task = asyncio.create_task(aggregate_world_events(use_cache_seconds=300))
    prices_task = asyncio.create_task(_fetch_asset_prices(assets))

    events_result, prices_result = await asyncio.gather(
        events_task, prices_task, return_exceptions=True
    )

    # Handle errors gracefully
    if isinstance(events_result, Exception):
        logger.error(f"World events fetch failed: {events_result}")
        events_result = {
            "events": [], "total": 0, "categories": {},
            "market_temperature": "COOL", "top_themes": [],
            "generated_at": generated_at,
        }
    if isinstance(prices_result, Exception):
        logger.error(f"Price fetch failed: {prices_result}")
        prices_result = {}

    events_data: Dict = events_result
    asset_prices: Dict = prices_result
    all_events: List[Dict] = events_data.get("events", [])

    # ── step 3: cross-correlation ────────────────────────────────────────────
    correlations: List[Dict] = []
    try:
        correlations = await compute_event_price_correlation(all_events, asset_prices)
    except Exception as exc:
        logger.error(f"Correlation computation failed: {exc}")

    # ── step 4: per-asset impact map ─────────────────────────────────────────
    asset_impact_map: Dict = {}
    try:
        asset_impact_map = build_asset_impact_map(all_events, correlations)
    except Exception as exc:
        logger.error(f"Impact map build failed: {exc}")

    # ── step 5: GPT narrative ────────────────────────────────────────────────
    fusion_context = {
        "events": all_events,
        "prices": asset_prices,
        "correlations": correlations,
        "market_temperature": events_data.get("market_temperature", "WARM"),
        "top_themes": events_data.get("top_themes", []),
    }
    narrative: Dict = {}
    try:
        narrative = await generate_fusion_narrative(fusion_context)
    except Exception as exc:
        logger.error(f"Narrative generation failed: {exc}")
        narrative = {
            "executive_summary": "Fusion narrative generation encountered an error.",
            "narrative": "",
            "critical_events": [],
            "cross_asset_signals": [],
            "macro_regime": "TRANSITION",
            "jarvis_alert": None,
        }

    # ── step 6: assemble FusionReport ────────────────────────────────────────
    report = {
        "report_id": str(uuid.uuid4()),
        "generated_at": generated_at,
        # World events
        "world_events": {
            "events": all_events[:30],  # cap for response size
            "total": events_data.get("total", 0),
            "categories": events_data.get("categories", {}),
            "market_temperature": events_data.get("market_temperature", "WARM"),
            "top_themes": events_data.get("top_themes", []),
        },
        # Price snapshot
        "asset_prices": {
            sym: {
                "price": d.get("price"),
                "change_percent": d.get("change_percent"),
                "name": d.get("name", sym),
                "source": d.get("source", ""),
            }
            for sym, d in asset_prices.items() if d
        },
        # Correlations (top 50 by strength)
        "event_correlations": correlations[:50],
        # Per-asset impact
        "asset_impact_map": asset_impact_map,
        # JARVIS narrative
        "jarvis_intelligence": narrative,
        # Summary stats
        "summary": {
            "total_events_analyzed": len(all_events),
            "total_assets_priced": len(asset_prices),
            "total_correlations": len(correlations),
            "macro_regime": narrative.get("macro_regime", "TRANSITION"),
            "market_temperature": events_data.get("market_temperature", "WARM"),
            "critical_alert": narrative.get("jarvis_alert"),
        },
    }

    _cache_set(cache_key, report, ttl=600)  # 10 min cache
    logger.info(
        f"Full fusion complete: {len(all_events)} events, {len(asset_prices)} assets, "
        f"{len(correlations)} correlations, regime={narrative.get('macro_regime')}"
    )
    return report
