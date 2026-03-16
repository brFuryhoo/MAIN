"""
JARVIS Quant Lab API Routes
=============================
Endpoints for the Autonomous Quant Lab:
backtesting, optimization, pattern discovery, performance tracking.

All decisions and experiments are logged for IP protection.
Property of Aureos Corporation.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone
import os
import logging

from services.quant_lab import (
    run_backtest,
    optimize_weights,
    discover_patterns,
    compute_performance_metrics,
    flatten_analysis_for_quant,
    DEFAULT_WEIGHTS,
    INDICATOR_REGISTRY,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/quant", tags=["quant-lab"])


def get_db():
    from server import db
    return db


def _extract_user_id(request: Request) -> str:
    import jwt as pyjwt
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            secret = os.environ.get('JWT_SECRET', 'aureos_ai_secure_secret')
            payload = pyjwt.decode(auth.split(" ")[1], secret, algorithms=["HS256"])
            return payload.get("user_id", "anonymous")
        except Exception:
            pass
    return "anonymous"


async def _get_user_history(db, user_id: str, limit: int = 200) -> list:
    """Fetch and flatten user's analysis history for quant processing."""
    raw_history = await db.analysis_history.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)

    # Flatten for quant engine
    flattened = []
    for entry in raw_history:
        flat = {
            "symbol": entry.get("symbol", ""),
            "asset_type": entry.get("asset_type", ""),
            "price": entry.get("price", 0),
            "timestamp": entry.get("timestamp", ""),
            "signal_direction": entry.get("signal", {}).get("direction", "HOLD"),
            "signal_confidence": entry.get("signal", {}).get("confidence", 50),
            "regime_phase": entry.get("regime", {}).get("market_phase", {}).get("phase", "unknown"),
            "rsi": entry.get("rsi", 50),
            "macd": entry.get("macd", {}),
            "moving_averages": entry.get("moving_averages", {}),
            "bollinger_bands": entry.get("bollinger_bands", {}),
            "volume_trend": entry.get("volume_trend", "stable"),
            "atr_percent": entry.get("atr_percent", 2),
            "structure_bias": entry.get("structure_bias", "neutral"),
            "monte_carlo_win_prob": entry.get("monte_carlo_win_prob", 50),
            "risk_score": entry.get("risk_score", 50),
            "liquidity_signal": entry.get("liquidity_signal", 0),
            "manipulation_score": entry.get("manipulation_score", 0),
        }
        flattened.append(flat)

    return flattened


async def _get_current_weights(db, user_id: str) -> Dict:
    """Get user's current optimized weights or defaults."""
    doc = await db.quant_weights.find_one(
        {"user_id": user_id}, {"_id": 0}
    )
    if doc and "weights" in doc:
        return doc["weights"]
    return dict(DEFAULT_WEIGHTS)


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/indicators")
async def get_indicators():
    """Get all available indicators and their metadata."""
    indicators = []
    for key, meta in INDICATOR_REGISTRY.items():
        indicators.append({
            "id": key,
            "name": meta["name"],
            "category": meta["category"],
            "default_weight": round(meta["weight"] * 100, 1),
        })
    return {"indicators": indicators, "count": len(indicators)}


@router.post("/backtest")
async def run_backtest_endpoint(request: Request):
    """Run backtest on user's analysis history."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)
        history = await _get_user_history(db, user_id, limit=500)
        weights = await _get_current_weights(db, user_id)

        if len(history) < 2:
            return {
                "status": "insufficient_data",
                "message": "Need at least 2 analyses to run backtest. Run more analyses first.",
                "total_analyses": len(history),
                "required": 2,
            }

        result = run_backtest(history, weights)

        # Log experiment
        experiment = {
            "user_id": user_id,
            "type": "backtest",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "input_size": len(history),
            "result_summary": {
                "accuracy": result["accuracy"],
                "win_rate": result["win_rate"],
                "sharpe_ratio": result["sharpe_ratio"],
                "total_profit": result["total_profit_pct"],
            },
            "weights_used": result["weights_used"],
        }
        await db.quant_experiments.insert_one(experiment)

        return {"status": "complete", **result}

    except Exception as e:
        logger.error(f"Backtest error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize")
async def run_optimization(request: Request):
    """Run weight optimization cycle."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)
        history = await _get_user_history(db, user_id, limit=500)
        current_weights = await _get_current_weights(db, user_id)

        if len(history) < 3:
            return {
                "status": "insufficient_data",
                "message": "Need at least 3 analyses for optimization.",
                "total_analyses": len(history),
            }

        result = optimize_weights(history, current_weights, iterations=300)

        # Save optimized weights
        await db.quant_weights.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "weights": result["optimized_weights"],
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "score": result["optimized_score"],
            }},
            upsert=True,
        )

        # Log decision
        decision_log = {
            "user_id": user_id,
            "type": "weight_optimization",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "previous_weights": {k: round(v * 100, 1) for k, v in current_weights.items()},
            "new_weights": result["optimized_weights_pct"],
            "improvement": result["improvement"],
            "original_score": result["original_score"],
            "optimized_score": result["optimized_score"],
            "iterations": result["iterations"],
        }
        await db.quant_decision_logs.insert_one(decision_log)

        # Log experiment
        experiment = {
            "user_id": user_id,
            "type": "optimization",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "input_size": len(history),
            "result_summary": {
                "improvement": result["improvement"],
                "original_score": result["original_score"],
                "optimized_score": result["optimized_score"],
            },
        }
        await db.quant_experiments.insert_one(experiment)

        return {"status": "complete", **result}

    except Exception as e:
        logger.error(f"Optimization error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/patterns")
async def discover_patterns_endpoint(request: Request):
    """Discover new high-probability indicator patterns."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)
        history = await _get_user_history(db, user_id, limit=500)

        if len(history) < 3:
            return {
                "status": "insufficient_data",
                "message": "Need at least 3 analyses for pattern discovery.",
                "total_analyses": len(history),
            }

        result = discover_patterns(history)

        # Log
        experiment = {
            "user_id": user_id,
            "type": "pattern_discovery",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "input_size": len(history),
            "discovery_count": result["discovery_count"],
        }
        await db.quant_experiments.insert_one(experiment)

        return {"status": "complete", **result}

    except Exception as e:
        logger.error(f"Pattern discovery error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance")
async def get_performance(request: Request):
    """Get overall model performance metrics."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)
        history = await _get_user_history(db, user_id, limit=500)

        if not history:
            return {
                "status": "no_data",
                "message": "No analyses yet. Run analyses to build performance data.",
            }

        metrics = compute_performance_metrics(history)

        # Get current weights
        weights = await _get_current_weights(db, user_id)
        weights_pct = {k: round(v * 100, 1) for k, v in weights.items()}

        # Get experiment count
        exp_count = await db.quant_experiments.count_documents({"user_id": user_id})
        decision_count = await db.quant_decision_logs.count_documents({"user_id": user_id})

        return {
            "status": "complete",
            "current_weights": weights_pct,
            "experiments_run": exp_count,
            "decisions_logged": decision_count,
            **metrics,
        }

    except Exception as e:
        logger.error(f"Performance error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rankings")
async def get_rankings(request: Request):
    """Get indicator rankings based on latest backtest."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)
        history = await _get_user_history(db, user_id, limit=500)
        weights = await _get_current_weights(db, user_id)

        if len(history) < 2:
            # Return default rankings
            rankings = []
            for key, meta in INDICATOR_REGISTRY.items():
                rankings.append({
                    "indicator": key,
                    "name": meta["name"],
                    "category": meta["category"],
                    "accuracy": 0,
                    "total_signals": 0,
                    "correct_signals": 0,
                    "current_weight": round(weights.get(key, meta["weight"]) * 100, 1),
                })
            return {"status": "default", "rankings": rankings, "message": "Run analyses to build rankings"}

        result = run_backtest(history, weights)
        return {
            "status": "complete",
            "rankings": result["indicator_rankings"],
            "model_accuracy": result["accuracy"],
            "model_sharpe": result["sharpe_ratio"],
        }

    except Exception as e:
        logger.error(f"Rankings error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/experiments")
async def get_experiments(request: Request, limit: int = 50):
    """Get experiment history."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)

        experiments = await db.quant_experiments.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)

        decisions = await db.quant_decision_logs.find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)

        return {
            "experiments": experiments,
            "decisions": decisions,
            "total_experiments": len(experiments),
            "total_decisions": len(decisions),
        }

    except Exception as e:
        logger.error(f"Experiments error: {e}", exc_info=True)
        return {"experiments": [], "decisions": [], "total_experiments": 0, "total_decisions": 0}


@router.post("/reset-weights")
async def reset_weights(request: Request):
    """Reset weights to defaults."""
    try:
        db = get_db()
        user_id = _extract_user_id(request)

        await db.quant_weights.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "weights": dict(DEFAULT_WEIGHTS),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "score": 0,
            }},
            upsert=True,
        )

        # Log decision
        await db.quant_decision_logs.insert_one({
            "user_id": user_id,
            "type": "weight_reset",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "new_weights": {k: round(v * 100, 1) for k, v in DEFAULT_WEIGHTS.items()},
        })

        return {"status": "reset", "weights": {k: round(v * 100, 1) for k, v in DEFAULT_WEIGHTS.items()}}

    except Exception as e:
        logger.error(f"Reset error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
