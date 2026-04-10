"""
Self-Improving Signal Engine
============================
Every signal JARVIS emits is stored with its prediction.
When a signal's timeframe expires, the engine checks whether
the prediction was correct and updates the model's confidence weights.

This creates a feedback loop:
  emit signal → track outcome → score accuracy → adjust weights → better signals

The "model" is a lightweight scoring system (not neural network) that
adjusts confidence multipliers per asset, per signal type, per market condition.
"""

import os
import uuid
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Any

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "aureos")

# ─── Signal Outcome Categories ─────────────────────────────────────────────
OUTCOME_HIT     = "HIT"      # price reached target
OUTCOME_STOP    = "STOP"     # price hit stop loss
OUTCOME_MISS    = "MISS"     # timeframe expired, neither hit nor stop
OUTCOME_PENDING = "PENDING"  # not yet resolved

# ─── EMA alpha for rolling accuracy ────────────────────────────────────────
EMA_ALPHA = 0.1

# ─── Timeframe → seconds mapping ───────────────────────────────────────────
TIMEFRAME_SECONDS = {
    "1h":  3600,
    "4h":  14400,
    "1d":  86400,
    "7d":  604800,
    "30d": 2592000,
}

# ─── DB helper ─────────────────────────────────────────────────────────────

def _get_db():
    """Return the MongoDB database instance.  Imports lazily to avoid circular
    imports at module load time when running inside the FastAPI process."""
    try:
        from server import db  # noqa: PLC0415
        return db
    except ImportError:
        # Standalone usage (tests / scheduler subprocess)
        _client = AsyncIOMotorClient(MONGO_URL)
        return _client[DB_NAME]


# ─── Core Functions ─────────────────────────────────────────────────────────

async def record_signal(signal: Dict) -> str:
    """
    Store a new signal emission to MongoDB (collection: signal_ledger).

    Signal document structure:
    {
      signal_id: uuid,
      symbol: str,
      asset_type: str,
      signal: "BUY" | "SELL" | "HOLD",
      confidence: int (0-100),
      entry_price: float,           # price at time of emission
      target_price: float,
      stop_loss: float,
      timeframe: "1h" | "4h" | "1d" | "7d" | "30d",
      expires_at: ISO timestamp,    # when to check outcome
      source: "jarvis_narrative" | "predictions" | "global_fusion" | "copilot",
      context: {                    # what drove this signal
        technical_score: int,
        sentiment_score: int,
        geopolitical_events: list,
        macro_regime: str,
      },
      outcome: "PENDING",
      outcome_price: null,
      outcome_checked_at: null,
      accuracy_score: null,         # 0-100, computed after outcome
      created_at: ISO timestamp
    }

    Returns signal_id.
    """
    try:
        db = _get_db()

        signal_id = signal.get("signal_id") or str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        # Determine expiry from timeframe
        timeframe = signal.get("timeframe", "1d")
        delta_secs = TIMEFRAME_SECONDS.get(timeframe, TIMEFRAME_SECONDS["1d"])
        expires_at = now + timedelta(seconds=delta_secs)

        # Extract entry price — accept both naming conventions
        entry_price = (
            signal.get("entry_price")
            or signal.get("price")
            or signal.get("entry_zone", {}).get("high", 0.0)
        )

        # Infer macro regime from context or default
        context = signal.get("context", {})
        if not context:
            context = {
                "technical_score": signal.get("technical_score", 50),
                "sentiment_score": signal.get("sentiment_score", 50),
                "geopolitical_events": [],
                "macro_regime": _infer_macro_regime(signal),
            }

        doc = {
            "signal_id":          signal_id,
            "symbol":             signal.get("symbol", "UNKNOWN").upper(),
            "asset_type":         signal.get("asset_type", "crypto"),
            "signal":             signal.get("signal", "HOLD").upper(),
            "confidence":         int(signal.get("confidence", 50)),
            "entry_price":        float(entry_price or 0.0),
            "target_price":       float(signal.get("target", signal.get("target_price", 0.0))),
            "stop_loss":          float(signal.get("stop_loss", 0.0)),
            "timeframe":          timeframe,
            "expires_at":         expires_at.isoformat(),
            "source":             signal.get("source", "predictions"),
            "context":            context,
            "outcome":            OUTCOME_PENDING,
            "outcome_price":      None,
            "outcome_checked_at": None,
            "accuracy_score":     None,
            "created_at":         now.isoformat(),
        }

        await db.signal_ledger.update_one(
            {"signal_id": signal_id},
            {"$setOnInsert": doc},
            upsert=True,
        )

        logger.info("Recorded signal %s for %s (%s)", signal_id, doc["symbol"], doc["signal"])
        return signal_id

    except Exception as exc:
        logger.error("record_signal failed: %s", exc)
        return signal.get("signal_id", str(uuid.uuid4()))


def _infer_macro_regime(signal: Dict) -> str:
    """Best-effort macro regime label derived from signal fields."""
    geo = signal.get("geopolitical_risk", "MODERATE")
    overall = signal.get("overall_score", 50)
    if overall >= 65:
        return "risk_on"
    if overall <= 35:
        return "risk_off"
    if geo in ("HIGH", "EXTREME"):
        return "risk_off"
    return "neutral"


async def resolve_pending_signals() -> Dict:
    """
    Background task — runs every 15 minutes.

    For each PENDING signal whose expires_at has passed:
    1. Fetch current price via market_data_adapter
    2. Determine outcome: HIT | STOP | MISS
    3. Compute accuracy_score (0-100):
       - HIT: 100 - distance_from_target_pct (e.g. hit exactly = 100, hit 5% away = 95)
       - STOP: 0 + partial credit if direction was right at expiry (max 30)
       - MISS: 50 if direction was right, 20 if wrong
    4. Update signal document in MongoDB
    5. Call update_model_weights(signal, outcome)

    Returns: {resolved: N, hits: N, stops: N, misses: N}
    """
    db = _get_db()
    now = datetime.now(timezone.utc)

    # Fetch all pending signals whose expiry has passed
    cursor = db.signal_ledger.find({
        "outcome": OUTCOME_PENDING,
        "expires_at": {"$lt": now.isoformat()},
    })
    pending: List[Dict] = await cursor.to_list(length=500)

    stats = {"resolved": 0, "hits": 0, "stops": 0, "misses": 0, "errors": 0}

    for signal in pending:
        try:
            symbol = signal["symbol"]
            asset_type = signal.get("asset_type", "crypto")
            entry_price = float(signal.get("entry_price") or 0.0)
            target_price = float(signal.get("target_price") or 0.0)
            stop_loss = float(signal.get("stop_loss") or 0.0)
            signal_dir = signal.get("signal", "HOLD").upper()

            # 1. Fetch current price
            current_price = await _fetch_current_price(symbol, asset_type)
            if current_price is None or current_price <= 0:
                logger.warning("Could not resolve price for %s, skipping", symbol)
                stats["errors"] += 1
                continue

            # 2. Determine outcome
            outcome, accuracy_score = _determine_outcome(
                signal_dir, entry_price, target_price, stop_loss, current_price
            )

            # 3. Update signal document
            checked_at = now.isoformat()
            await db.signal_ledger.update_one(
                {"signal_id": signal["signal_id"]},
                {"$set": {
                    "outcome":            outcome,
                    "outcome_price":      current_price,
                    "outcome_checked_at": checked_at,
                    "accuracy_score":     accuracy_score,
                }},
            )

            # 4. Update model weights
            await update_model_weights(signal, outcome, accuracy_score)

            stats["resolved"] += 1
            if outcome == OUTCOME_HIT:
                stats["hits"] += 1
            elif outcome == OUTCOME_STOP:
                stats["stops"] += 1
            else:
                stats["misses"] += 1

        except Exception as exc:
            logger.error("Error resolving signal %s: %s", signal.get("signal_id"), exc)
            stats["errors"] += 1

    logger.info("Signal resolution complete: %s", stats)
    return stats


async def _fetch_current_price(symbol: str, asset_type: str) -> Optional[float]:
    """Fetch a live price via market_data_adapter with error isolation."""
    try:
        from services.market_data import market_data_adapter  # noqa: PLC0415
        data = await market_data_adapter.get_asset_data(symbol, asset_type)
        return float(data.get("price", 0.0)) or None
    except Exception as exc:
        logger.warning("Price fetch failed for %s: %s", symbol, exc)
        return None


def _determine_outcome(
    signal_dir: str,
    entry_price: float,
    target_price: float,
    stop_loss: float,
    current_price: float,
) -> tuple:
    """
    Determine HIT / STOP / MISS and compute accuracy_score (0-100).

    For BUY signals:
      - HIT  if current_price >= target_price
      - STOP if current_price <= stop_loss
      - MISS otherwise

    For SELL signals:
      - HIT  if current_price <= target_price
      - STOP if current_price >= stop_loss
      - MISS otherwise

    For HOLD signals we use directional drift heuristics.
    """
    if entry_price <= 0 or target_price <= 0:
        # Can't determine — treat as MISS with neutral score
        return OUTCOME_MISS, 20.0

    if signal_dir == "BUY":
        if current_price >= target_price:
            # Hit — score based on how close we are to target
            distance_pct = abs(current_price - target_price) / target_price * 100
            score = max(70.0, 100.0 - distance_pct)
            return OUTCOME_HIT, round(min(100.0, score), 2)
        elif stop_loss > 0 and current_price <= stop_loss:
            # Stop — partial credit if price is still above entry (rare but possible)
            direction_right = current_price > entry_price
            score = 30.0 if direction_right else 0.0
            return OUTCOME_STOP, score
        else:
            # Miss — was direction at least right?
            direction_right = current_price > entry_price
            score = 50.0 if direction_right else 20.0
            return OUTCOME_MISS, score

    elif signal_dir == "SELL":
        if current_price <= target_price:
            distance_pct = abs(current_price - target_price) / target_price * 100
            score = max(70.0, 100.0 - distance_pct)
            return OUTCOME_HIT, round(min(100.0, score), 2)
        elif stop_loss > 0 and current_price >= stop_loss:
            direction_right = current_price < entry_price
            score = 30.0 if direction_right else 0.0
            return OUTCOME_STOP, score
        else:
            direction_right = current_price < entry_price
            score = 50.0 if direction_right else 20.0
            return OUTCOME_MISS, score

    else:  # HOLD
        # HOLD: success = price stayed within ±3% of entry
        if entry_price > 0:
            drift_pct = abs(current_price - entry_price) / entry_price * 100
            if drift_pct <= 3.0:
                return OUTCOME_HIT, round(max(70.0, 100.0 - drift_pct * 5), 2)
            elif drift_pct <= 8.0:
                return OUTCOME_MISS, 50.0
            else:
                return OUTCOME_MISS, 20.0
        return OUTCOME_MISS, 20.0


async def update_model_weights(signal: Dict, outcome: str, accuracy_score: float):
    """
    Update the learning weights for this signal's pattern.

    Weights document (collection: signal_weights) structure:
    {
      key: "{symbol}_{signal_type}_{macro_regime}_{source}",
      symbol: str,
      signal_type: "BUY" | "SELL" | "HOLD",
      macro_regime: str,
      source: str,
      total_signals: int,
      hits: int,
      stops: int,
      misses: int,
      win_rate: float,              # hits / total * 100
      avg_accuracy: float,          # rolling average of accuracy_scores
      confidence_multiplier: float, # 0.5 - 1.5, applied to future signals
      last_updated: ISO timestamp,
      underperforming: bool
    }
    """
    db = _get_db()

    symbol = signal.get("symbol", "UNKNOWN").upper()
    signal_type = signal.get("signal", "HOLD").upper()
    macro_regime = signal.get("context", {}).get("macro_regime", "neutral")
    source = signal.get("source", "predictions")

    key = f"{symbol}_{signal_type}_{macro_regime}_{source}"

    now = datetime.now(timezone.utc).isoformat()

    # Fetch existing weight record
    existing = await db.signal_weights.find_one({"key": key}, {"_id": 0})

    if existing:
        total = existing.get("total_signals", 0) + 1
        hits   = existing.get("hits", 0)   + (1 if outcome == OUTCOME_HIT  else 0)
        stops  = existing.get("stops", 0)  + (1 if outcome == OUTCOME_STOP else 0)
        misses = existing.get("misses", 0) + (1 if outcome == OUTCOME_MISS else 0)

        win_rate = round(hits / total * 100, 2) if total > 0 else 0.0

        old_avg = existing.get("avg_accuracy", 50.0)
        avg_accuracy = round(old_avg * (1 - EMA_ALPHA) + accuracy_score * EMA_ALPHA, 4)

        old_multiplier = existing.get("confidence_multiplier", 1.0)
        if win_rate > 70:
            new_multiplier = min(1.5, old_multiplier * 1.05)
        elif win_rate < 40:
            new_multiplier = max(0.5, old_multiplier * 0.95)
        else:
            new_multiplier = old_multiplier

        underperforming = (total >= 10 and win_rate < 30)

        await db.signal_weights.update_one(
            {"key": key},
            {"$set": {
                "total_signals":         total,
                "hits":                  hits,
                "stops":                 stops,
                "misses":                misses,
                "win_rate":              win_rate,
                "avg_accuracy":          avg_accuracy,
                "confidence_multiplier": round(new_multiplier, 4),
                "underperforming":       underperforming,
                "last_updated":          now,
            }},
        )
    else:
        # First record for this pattern
        hits   = 1 if outcome == OUTCOME_HIT  else 0
        stops  = 1 if outcome == OUTCOME_STOP else 0
        misses = 1 if outcome == OUTCOME_MISS else 0
        win_rate = 100.0 if outcome == OUTCOME_HIT else 0.0

        await db.signal_weights.insert_one({
            "key":                   key,
            "symbol":                symbol,
            "signal_type":           signal_type,
            "macro_regime":          macro_regime,
            "source":                source,
            "total_signals":         1,
            "hits":                  hits,
            "stops":                 stops,
            "misses":                misses,
            "win_rate":              win_rate,
            "avg_accuracy":          round(accuracy_score, 4),
            "confidence_multiplier": 1.0,
            "underperforming":       False,
            "last_updated":          now,
        })


async def get_confidence_multiplier(
    symbol: str,
    signal_type: str,
    macro_regime: str,
    source: str,
) -> float:
    """
    Retrieve the current confidence multiplier for a given signal pattern.
    Returns 1.0 (neutral) if no history exists yet.
    Used by predictions.py and jarvis_narrative.py to adjust confidence.
    """
    try:
        db = _get_db()
        key = f"{symbol.upper()}_{signal_type.upper()}_{macro_regime}_{source}"
        doc = await db.signal_weights.find_one({"key": key}, {"_id": 0})
        if doc:
            return float(doc.get("confidence_multiplier", 1.0))
        return 1.0
    except Exception as exc:
        logger.warning("get_confidence_multiplier failed: %s", exc)
        return 1.0


async def get_signal_performance_report(
    symbol: Optional[str] = None,
    days: int = 30,
) -> Dict:
    """
    Generate a performance report for the competition pitch / trust dashboard.

    Returns a comprehensive dict covering overall stats, per-symbol/type/source
    breakdowns, top and bottom patterns, recent hits, daily confidence trend,
    and a JARVIS AI verdict generated by GPT-5.2.
    """
    db = _get_db()
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=days)).isoformat()

    # ── base filter ────────────────────────────────────────────────────────
    base_filter: Dict[str, Any] = {"created_at": {"$gte": since}}
    if symbol:
        base_filter["symbol"] = symbol.upper()

    # ── fetch all signals in window ────────────────────────────────────────
    all_signals: List[Dict] = await db.signal_ledger.find(
        base_filter, {"_id": 0}
    ).to_list(length=10000)

    total = len(all_signals)
    resolved = [s for s in all_signals if s.get("outcome") != OUTCOME_PENDING]
    pending  = [s for s in all_signals if s.get("outcome") == OUTCOME_PENDING]
    hits     = [s for s in resolved if s.get("outcome") == OUTCOME_HIT]

    overall_win_rate = round(len(hits) / len(resolved) * 100, 2) if resolved else 0.0
    accuracy_vals    = [s["accuracy_score"] for s in resolved if s.get("accuracy_score") is not None]
    overall_accuracy = round(sum(accuracy_vals) / len(accuracy_vals), 2) if accuracy_vals else 0.0

    # ── by symbol ──────────────────────────────────────────────────────────
    symbol_map: Dict[str, List] = {}
    for s in resolved:
        sym = s.get("symbol", "?")
        symbol_map.setdefault(sym, []).append(s)

    by_symbol = []
    for sym, sigs in sorted(symbol_map.items(), key=lambda x: -len(x[1])):
        sym_hits = [s for s in sigs if s.get("outcome") == OUTCOME_HIT]
        sym_acc  = [s["accuracy_score"] for s in sigs if s.get("accuracy_score") is not None]
        best  = max(sigs, key=lambda s: s.get("accuracy_score") or 0, default=None)
        worst = min(sigs, key=lambda s: s.get("accuracy_score") or 100, default=None)
        by_symbol.append({
            "symbol":       sym,
            "signals":      len(sigs),
            "win_rate":     round(len(sym_hits) / len(sigs) * 100, 2),
            "accuracy":     round(sum(sym_acc) / len(sym_acc), 2) if sym_acc else 0.0,
            "best_signal":  best.get("signal_id") if best else None,
            "worst_signal": worst.get("signal_id") if worst else None,
        })

    # ── by signal type ─────────────────────────────────────────────────────
    by_signal_type: Dict[str, Dict] = {}
    for st in ("BUY", "SELL", "HOLD"):
        group = [s for s in resolved if s.get("signal") == st]
        g_hits = [s for s in group if s.get("outcome") == OUTCOME_HIT]
        by_signal_type[st] = {
            "count":    len(group),
            "win_rate": round(len(g_hits) / len(group) * 100, 2) if group else 0.0,
        }

    # ── by source ──────────────────────────────────────────────────────────
    source_keys = ("jarvis_narrative", "predictions", "global_fusion", "copilot")
    by_source: Dict[str, Dict] = {}
    for src in source_keys:
        group = [s for s in resolved if s.get("source") == src]
        g_hits = [s for s in group if s.get("outcome") == OUTCOME_HIT]
        src_acc = [s["accuracy_score"] for s in group if s.get("accuracy_score") is not None]
        by_source[src] = {
            "count":    len(group),
            "win_rate": round(len(g_hits) / len(group) * 100, 2) if group else 0.0,
            "accuracy": round(sum(src_acc) / len(src_acc), 2) if src_acc else 0.0,
        }

    # ── top / bottom weight patterns ───────────────────────────────────────
    weight_filter: Dict[str, Any] = {}
    if symbol:
        weight_filter["symbol"] = symbol.upper()

    weight_docs: List[Dict] = await db.signal_weights.find(
        weight_filter, {"_id": 0}
    ).to_list(length=10000)

    sorted_weights = sorted(
        [w for w in weight_docs if w.get("total_signals", 0) >= 3],
        key=lambda w: w.get("win_rate", 0),
        reverse=True,
    )

    top_performing = [
        {
            "key":          w["key"],
            "win_rate":     w.get("win_rate", 0),
            "accuracy":     w.get("avg_accuracy", 0),
            "signals":      w.get("total_signals", 0),
            "multiplier":   w.get("confidence_multiplier", 1.0),
        }
        for w in sorted_weights[:5]
    ]
    underperforming = [
        {
            "key":      w["key"],
            "win_rate": w.get("win_rate", 0),
            "accuracy": w.get("avg_accuracy", 0),
            "signals":  w.get("total_signals", 0),
            "multiplier": w.get("confidence_multiplier", 1.0),
        }
        for w in reversed(sorted_weights[-5:]) if w.get("win_rate", 100) < 50
    ]

    # ── recent hits ────────────────────────────────────────────────────────
    recent_hits_cursor = db.signal_ledger.find(
        {**base_filter, "outcome": OUTCOME_HIT},
        {"_id": 0},
    ).sort("outcome_checked_at", -1).limit(10)
    recent_hits: List[Dict] = await recent_hits_cursor.to_list(length=10)

    # ── confidence trend (daily rolling avg over last 30d) ─────────────────
    confidence_trend = await _build_confidence_trend(db, days, symbol)

    # ── best performing asset ──────────────────────────────────────────────
    best_asset = ""
    if by_symbol:
        best_sym = max(by_symbol, key=lambda s: s["win_rate"])
        best_asset = best_sym["symbol"]

    # ── JARVIS verdict via GPT-5.2 ─────────────────────────────────────────
    jarvis_verdict = await _generate_jarvis_verdict(
        overall_win_rate, overall_accuracy, total, len(resolved),
        by_signal_type, top_performing
    )

    return {
        "period_days":              days,
        "total_signals":            total,
        "resolved_signals":         len(resolved),
        "pending_signals":          len(pending),
        "overall_win_rate":         overall_win_rate,
        "overall_accuracy":         overall_accuracy,
        "best_performing_asset":    best_asset,
        "by_symbol":                by_symbol,
        "by_signal_type":           by_signal_type,
        "by_source":                by_source,
        "top_performing_patterns":  top_performing,
        "underperforming_patterns": underperforming,
        "recent_hits":              recent_hits,
        "confidence_trend":         confidence_trend,
        "jarvis_verdict":           jarvis_verdict,
    }


async def _build_confidence_trend(
    db, days: int, symbol: Optional[str]
) -> List[Dict]:
    """Build daily rolling accuracy averages for the confidence trend chart."""
    now = datetime.now(timezone.utc)
    trend = []

    for day_offset in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=day_offset + 1)).isoformat()
        day_end   = (now - timedelta(days=day_offset)).isoformat()

        flt: Dict[str, Any] = {
            "outcome":      {"$ne": OUTCOME_PENDING},
            "accuracy_score": {"$ne": None},
            "outcome_checked_at": {"$gte": day_start, "$lt": day_end},
        }
        if symbol:
            flt["symbol"] = symbol.upper()

        pipeline = [
            {"$match": flt},
            {"$group": {"_id": None, "avg": {"$avg": "$accuracy_score"}}},
        ]
        result = await db.signal_ledger.aggregate(pipeline).to_list(1)
        avg = round(result[0]["avg"], 2) if result else None

        date_label = (now - timedelta(days=day_offset)).strftime("%Y-%m-%d")
        trend.append({"date": date_label, "avg_accuracy": avg})

    return trend


async def _generate_jarvis_verdict(
    win_rate: float,
    accuracy: float,
    total: int,
    resolved: int,
    by_signal_type: Dict,
    top_patterns: List[Dict],
) -> str:
    """Ask GPT-5.2 to write a one-liner about JARVIS's recent performance."""
    try:
        import uuid as _uuid
        from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: PLC0415

        top_pattern_info = ", ".join(
            f"{p['key']} ({p['win_rate']}% win)" for p in top_patterns[:3]
        )

        prompt = (
            f"JARVIS signal performance summary:\n"
            f"- Win rate: {win_rate}% over {resolved} resolved signals (of {total} total)\n"
            f"- Average accuracy score: {accuracy}/100\n"
            f"- BUY signals win rate: {by_signal_type.get('BUY', {}).get('win_rate', 0)}%\n"
            f"- SELL signals win rate: {by_signal_type.get('SELL', {}).get('win_rate', 0)}%\n"
            f"- Top patterns: {top_pattern_info or 'insufficient data'}\n\n"
            "Write exactly ONE sentence (max 20 words) summarising JARVIS's recent performance "
            "in the confident, authoritative tone of a quantitative trading system. "
            "No markdown, no quotes, just the sentence."
        )

        chat = LlmChat(
            session_id=str(_uuid.uuid4()),
            system_message="You are JARVIS, Aureos AI's signal engine. Write concise, confident performance verdicts.",
            llm_config={"model": "gpt-4o"},
        )
        response = await chat.send_message(UserMessage(content=prompt))
        verdict = response.content if hasattr(response, "content") else str(response)
        return verdict.strip().strip('"').strip("'")
    except Exception as exc:
        logger.warning("JARVIS verdict generation failed: %s", exc)
        pct = win_rate
        if pct >= 65:
            return f"JARVIS achieved a {pct:.0f}% win rate — predictive accuracy remains strong."
        elif pct >= 50:
            return f"JARVIS is operating at {pct:.0f}% win rate with stable signal quality."
        else:
            return f"JARVIS is recalibrating — {pct:.0f}% win rate as learning weights adjust."


async def apply_learning_to_signal(raw_signal: Dict) -> Dict:
    """
    Called by predictions.py and jarvis_narrative.py BEFORE returning a signal.

    1. Gets confidence_multiplier for this pattern
    2. Adjusts confidence: new_confidence = min(95, max(10, original * multiplier))
    3. Adds learning metadata to signal
    4. Returns enhanced signal
    """
    try:
        symbol      = raw_signal.get("symbol", "UNKNOWN").upper()
        signal_type = raw_signal.get("signal", "HOLD").upper()
        macro_regime = _infer_macro_regime(raw_signal)
        source       = raw_signal.get("source", "predictions")

        multiplier = await get_confidence_multiplier(symbol, signal_type, macro_regime, source)

        # Look up history count for metadata
        db = _get_db()
        key = f"{symbol}_{signal_type}_{macro_regime}_{source}"
        weight_doc = await db.signal_weights.find_one({"key": key}, {"_id": 0})

        original_confidence = int(raw_signal.get("confidence", 50))
        adjusted_confidence = min(95, max(10, round(original_confidence * multiplier)))
        was_adjusted = adjusted_confidence != original_confidence

        enhanced = dict(raw_signal)
        enhanced["confidence"] = adjusted_confidence
        enhanced["learning"] = {
            "multiplier":        round(multiplier, 4),
            "based_on_signals":  weight_doc.get("total_signals", 0) if weight_doc else 0,
            "pattern_win_rate":  weight_doc.get("win_rate", 0.0) if weight_doc else 0.0,
            "adjusted":          was_adjusted,
            "original_confidence": original_confidence,
        }

        return enhanced

    except Exception as exc:
        logger.warning("apply_learning_to_signal failed: %s", exc)
        return raw_signal
