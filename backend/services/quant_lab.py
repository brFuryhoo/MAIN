"""
JARVIS Autonomous Quant Lab
=============================
Self-improving quantitative intelligence engine.
Backtests indicators, discovers patterns, optimizes signal weights,
and logs every decision for IP protection.

Property of Aureos Corporation. All rights reserved.
"""

import math
import random
import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════
# INDICATOR DEFINITIONS — The DNA of JARVIS Quantitative Core
# ═══════════════════════════════════════════════════════════════

INDICATOR_REGISTRY = {
    "rsi_14": {"name": "RSI (14)", "category": "momentum", "weight": 0.12},
    "macd_crossover": {"name": "MACD Crossover", "category": "momentum", "weight": 0.10},
    "sma_20_50_cross": {"name": "SMA 20/50 Cross", "category": "trend", "weight": 0.10},
    "bollinger_squeeze": {"name": "Bollinger Squeeze", "category": "volatility", "weight": 0.08},
    "volume_breakout": {"name": "Volume Breakout", "category": "volume", "weight": 0.08},
    "market_structure": {"name": "Market Structure Bias", "category": "structure", "weight": 0.12},
    "monte_carlo_prob": {"name": "Monte Carlo Win Prob", "category": "quantitative", "weight": 0.10},
    "risk_reward": {"name": "Risk/Reward Ratio", "category": "risk", "weight": 0.08},
    "regime_alignment": {"name": "Regime Alignment", "category": "macro", "weight": 0.10},
    "liquidity_zone": {"name": "Liquidity Zone Proximity", "category": "microstructure", "weight": 0.06},
    "atr_expansion": {"name": "ATR Expansion", "category": "volatility", "weight": 0.06},
}

DEFAULT_WEIGHTS = {k: v["weight"] for k, v in INDICATOR_REGISTRY.items()}


# ═══════════════════════════════════════════════════════════════
# SIGNAL EXTRACTOR — Extracts indicator signals from analysis
# ═══════════════════════════════════════════════════════════════

def extract_indicator_signals(analysis_data: Dict) -> Dict[str, float]:
    """Extract normalized [-1, 1] signals from a full analysis result."""
    signals = {}

    # RSI
    rsi = analysis_data.get("rsi", 50)
    signals["rsi_14"] = (rsi - 50) / 50  # -1 (oversold) to +1 (overbought)

    # MACD
    macd = analysis_data.get("macd", {})
    cross = macd.get("crossover", "neutral")
    signals["macd_crossover"] = 1.0 if cross == "bullish" else (-1.0 if cross == "bearish" else 0.0)

    # SMA Cross
    mas = analysis_data.get("moving_averages", {})
    above_20 = 1 if mas.get("price_vs_sma20") == "above" else -1
    above_50 = 1 if mas.get("price_vs_sma50") == "above" else -1
    golden = 1 if mas.get("golden_cross") else -1
    signals["sma_20_50_cross"] = (above_20 + above_50 + golden) / 3

    # Bollinger
    bb = analysis_data.get("bollinger_bands", {})
    bb_pos = bb.get("position", "middle")
    signals["bollinger_squeeze"] = 0.8 if bb_pos == "above_upper" else (-0.8 if bb_pos == "below_lower" else 0.0)

    # Volume
    vol_trend = analysis_data.get("volume_trend", "stable")
    signals["volume_breakout"] = 0.7 if vol_trend == "increasing" else (-0.3 if vol_trend == "decreasing" else 0.0)

    # Structure
    bias = analysis_data.get("structure_bias", "neutral")
    signals["market_structure"] = 1.0 if bias == "bullish" else (-1.0 if bias == "bearish" else 0.0)

    # Monte Carlo
    win_prob = analysis_data.get("monte_carlo_win_prob", 50)
    signals["monte_carlo_prob"] = (win_prob - 50) / 50

    # Risk/Reward
    risk_score = analysis_data.get("risk_score", 50)
    signals["risk_reward"] = (50 - risk_score) / 50  # Lower risk = positive signal

    # Regime
    regime_phase = analysis_data.get("regime_phase", "unknown")
    regime_map = {"expansion": 0.8, "accumulation": 0.4, "distribution": -0.4, "contraction": -0.8}
    signals["regime_alignment"] = regime_map.get(regime_phase, 0.0)

    # Liquidity
    signals["liquidity_zone"] = analysis_data.get("liquidity_signal", 0.0)

    # ATR
    atr_pct = analysis_data.get("atr_percent", 2)
    signals["atr_expansion"] = min(max((atr_pct - 2) / 3, -1), 1)

    return signals


def flatten_analysis_for_quant(steps: Dict, report: Dict) -> Dict:
    """Flatten a full analysis result into a dict suitable for quant processing."""
    tech = steps.get("technical_analysis", {})
    struct = steps.get("market_structure", {})
    mc = steps.get("monte_carlo", {})
    risk = steps.get("risk_model", {})
    regime = steps.get("regime_detection", {})
    liq = steps.get("liquidity_mapping", {})

    return {
        "rsi": tech.get("rsi", 50),
        "macd": tech.get("macd", {}),
        "moving_averages": tech.get("moving_averages", {}),
        "bollinger_bands": tech.get("bollinger_bands", {}),
        "volume_trend": tech.get("volume_trend", "stable"),
        "atr_percent": tech.get("atr_percent", 2),
        "structure_bias": struct.get("bias", "neutral"),
        "monte_carlo_win_prob": mc.get("win_probability", 50),
        "risk_score": risk.get("risk_score", 50),
        "regime_phase": regime.get("market_phase", {}).get("phase", "unknown"),
        "liquidity_signal": _extract_liquidity_signal(liq),
        "signal_direction": report.get("signal_summary", {}).get("direction", "HOLD"),
        "signal_confidence": report.get("signal_summary", {}).get("confidence", 50),
    }


def _extract_liquidity_signal(liq: Dict) -> float:
    near_support = liq.get("near_support", False)
    near_resistance = liq.get("near_resistance", False)
    if near_support:
        return 0.6
    elif near_resistance:
        return -0.6
    return 0.0


# ═══════════════════════════════════════════════════════════════
# BACKTESTER — Evaluates signal accuracy against historical data
# ═══════════════════════════════════════════════════════════════

def run_backtest(history: List[Dict], weights: Optional[Dict] = None) -> Dict:
    """
    Run backtest across historical analyses.
    For each analysis, compute weighted signal and compare to actual outcome.
    """
    if not history or len(history) < 2:
        return {"error": "Insufficient history for backtesting", "total_trades": 0}

    w = weights or DEFAULT_WEIGHTS
    trades = []
    indicator_hits = {k: {"correct": 0, "total": 0, "signals": []} for k in INDICATOR_REGISTRY}

    # Sort by timestamp
    sorted_history = sorted(history, key=lambda x: x.get("timestamp", ""))

    for i in range(len(sorted_history) - 1):
        current = sorted_history[i]
        next_entry = sorted_history[i + 1]

        current_price = current.get("price", 0)
        next_price = next_entry.get("price", 0)
        if current_price <= 0 or next_price <= 0:
            continue

        actual_return = (next_price - current_price) / current_price * 100
        actual_direction = "BUY" if actual_return > 0.5 else ("SELL" if actual_return < -0.5 else "HOLD")

        # Extract signals
        signals = extract_indicator_signals(current)

        # Compute weighted composite signal
        composite = sum(signals.get(k, 0) * w.get(k, 0) for k in w)
        predicted_direction = "BUY" if composite > 0.1 else ("SELL" if composite < -0.1 else "HOLD")

        is_correct = predicted_direction == actual_direction
        profit = actual_return if (predicted_direction == "BUY" and actual_return > 0) or \
                                  (predicted_direction == "SELL" and actual_return < 0) else -abs(actual_return)

        trade = {
            "symbol": current.get("symbol", ""),
            "timestamp": current.get("timestamp", ""),
            "predicted": predicted_direction,
            "actual": actual_direction,
            "correct": is_correct,
            "return_pct": round(actual_return, 2),
            "profit_pct": round(profit, 2),
            "composite_signal": round(composite, 4),
            "confidence": current.get("signal_confidence", 50),
        }
        trades.append(trade)

        # Track per-indicator accuracy
        for ind_key, sig_val in signals.items():
            if ind_key in indicator_hits:
                ind_direction = "BUY" if sig_val > 0.1 else ("SELL" if sig_val < -0.1 else "HOLD")
                indicator_hits[ind_key]["total"] += 1
                if ind_direction == actual_direction:
                    indicator_hits[ind_key]["correct"] += 1
                indicator_hits[ind_key]["signals"].append({
                    "value": round(sig_val, 3),
                    "predicted": ind_direction,
                    "actual": actual_direction,
                    "correct": ind_direction == actual_direction,
                })

    # Compute metrics
    total = len(trades)
    correct = sum(1 for t in trades if t["correct"])
    accuracy = round(correct / total * 100, 1) if total > 0 else 0
    total_profit = round(sum(t["profit_pct"] for t in trades), 2)
    avg_profit = round(total_profit / total, 2) if total > 0 else 0
    win_rate = round(sum(1 for t in trades if t["profit_pct"] > 0) / total * 100, 1) if total > 0 else 0
    max_win = round(max((t["profit_pct"] for t in trades), default=0), 2)
    max_loss = round(min((t["profit_pct"] for t in trades), default=0), 2)

    # Sharpe ratio (simplified)
    profits = [t["profit_pct"] for t in trades]
    if len(profits) > 1:
        mean_p = sum(profits) / len(profits)
        std_p = math.sqrt(sum((p - mean_p) ** 2 for p in profits) / len(profits))
        sharpe = round(mean_p / std_p, 2) if std_p > 0 else 0
    else:
        sharpe = 0

    # Indicator rankings
    rankings = []
    for ind_key, data in indicator_hits.items():
        ind_accuracy = round(data["correct"] / data["total"] * 100, 1) if data["total"] > 0 else 0
        rankings.append({
            "indicator": ind_key,
            "name": INDICATOR_REGISTRY[ind_key]["name"],
            "category": INDICATOR_REGISTRY[ind_key]["category"],
            "accuracy": ind_accuracy,
            "total_signals": data["total"],
            "correct_signals": data["correct"],
            "current_weight": round(w.get(ind_key, 0) * 100, 1),
        })
    rankings.sort(key=lambda x: x["accuracy"], reverse=True)

    return {
        "total_trades": total,
        "accuracy": accuracy,
        "win_rate": win_rate,
        "total_profit_pct": total_profit,
        "avg_profit_per_trade": avg_profit,
        "max_win_pct": max_win,
        "max_loss_pct": max_loss,
        "sharpe_ratio": sharpe,
        "indicator_rankings": rankings,
        "trades": trades[-50:],  # Last 50 trades for display
        "weights_used": {k: round(v * 100, 1) for k, v in w.items()},
    }


# ═══════════════════════════════════════════════════════════════
# OPTIMIZER — Self-improving weight adjustment
# ═══════════════════════════════════════════════════════════════

def optimize_weights(history: List[Dict], current_weights: Optional[Dict] = None, iterations: int = 200) -> Dict:
    """
    Run optimization to find best indicator weights.
    Uses evolutionary strategy: mutate weights, evaluate, keep best.
    """
    w = dict(current_weights or DEFAULT_WEIGHTS)
    best_weights = dict(w)
    best_score = _evaluate_weights(history, w)

    evolution_log = []

    for gen in range(iterations):
        # Mutate weights
        candidate = {}
        for k, v in best_weights.items():
            mutation = random.gauss(0, 0.02)  # Small mutations
            candidate[k] = max(0.01, min(0.25, v + mutation))

        # Normalize to sum to 1
        total = sum(candidate.values())
        candidate = {k: v / total for k, v in candidate.items()}

        score = _evaluate_weights(history, candidate)

        if score > best_score:
            best_score = score
            best_weights = dict(candidate)
            evolution_log.append({
                "generation": gen,
                "score": round(score, 4),
                "improved": True,
            })

    # Compute improvement
    original_score = _evaluate_weights(history, current_weights or DEFAULT_WEIGHTS)
    improvement = round(best_score - original_score, 4)

    return {
        "optimized_weights": {k: round(v, 4) for k, v in best_weights.items()},
        "optimized_weights_pct": {k: round(v * 100, 1) for k, v in best_weights.items()},
        "original_score": round(original_score, 4),
        "optimized_score": round(best_score, 4),
        "improvement": round(improvement * 100, 2),
        "iterations": iterations,
        "evolution_steps": len(evolution_log),
        "evolution_log": evolution_log[-20:],
    }


def _evaluate_weights(history: List[Dict], weights: Dict) -> float:
    """Evaluate a weight configuration. Returns composite score (higher = better)."""
    if not history or len(history) < 2:
        return 0.0

    sorted_h = sorted(history, key=lambda x: x.get("timestamp", ""))
    correct = 0
    total = 0
    profit_sum = 0

    for i in range(len(sorted_h) - 1):
        current = sorted_h[i]
        next_entry = sorted_h[i + 1]

        p0 = current.get("price", 0)
        p1 = next_entry.get("price", 0)
        if p0 <= 0 or p1 <= 0:
            continue

        actual_ret = (p1 - p0) / p0 * 100
        actual_dir = "BUY" if actual_ret > 0.5 else ("SELL" if actual_ret < -0.5 else "HOLD")

        signals = extract_indicator_signals(current)
        composite = sum(signals.get(k, 0) * weights.get(k, 0) for k in weights)
        predicted = "BUY" if composite > 0.1 else ("SELL" if composite < -0.1 else "HOLD")

        total += 1
        if predicted == actual_dir:
            correct += 1

        if (predicted == "BUY" and actual_ret > 0) or (predicted == "SELL" and actual_ret < 0):
            profit_sum += abs(actual_ret)
        else:
            profit_sum -= abs(actual_ret) * 0.5

    accuracy = correct / total if total > 0 else 0
    profit_factor = profit_sum / total if total > 0 else 0
    return accuracy * 0.6 + max(0, profit_factor * 0.01) * 0.4


# ═══════════════════════════════════════════════════════════════
# PATTERN DISCOVERY — Find new indicator combinations
# ═══════════════════════════════════════════════════════════════

def discover_patterns(history: List[Dict]) -> Dict:
    """
    Analyze historical data to discover high-probability patterns.
    Looks for indicator combinations that consistently predict outcomes.
    """
    if not history or len(history) < 3:
        return {"patterns": [], "message": "Insufficient data for pattern discovery"}

    sorted_h = sorted(history, key=lambda x: x.get("timestamp", ""))
    pattern_candidates = []

    # Test pairwise indicator combinations
    indicator_keys = list(INDICATOR_REGISTRY.keys())
    combo_results = {}

    for i in range(len(indicator_keys)):
        for j in range(i + 1, len(indicator_keys)):
            k1, k2 = indicator_keys[i], indicator_keys[j]
            combo_key = f"{k1}+{k2}"
            combo_results[combo_key] = {"correct": 0, "total": 0, "avg_return": 0}

    for idx in range(len(sorted_h) - 1):
        current = sorted_h[idx]
        next_entry = sorted_h[idx + 1]

        p0 = current.get("price", 0)
        p1 = next_entry.get("price", 0)
        if p0 <= 0 or p1 <= 0:
            continue

        actual_ret = (p1 - p0) / p0 * 100
        actual_dir = "BUY" if actual_ret > 0.5 else ("SELL" if actual_ret < -0.5 else "HOLD")
        signals = extract_indicator_signals(current)

        for combo_key in combo_results:
            parts = combo_key.split("+")
            s1 = signals.get(parts[0], 0)
            s2 = signals.get(parts[1], 0)

            # Both agree on direction
            if (s1 > 0.1 and s2 > 0.1) or (s1 < -0.1 and s2 < -0.1):
                combo_dir = "BUY" if s1 > 0 else "SELL"
                combo_results[combo_key]["total"] += 1
                if combo_dir == actual_dir:
                    combo_results[combo_key]["correct"] += 1
                combo_results[combo_key]["avg_return"] += actual_ret

    # Rank combos
    for key, data in combo_results.items():
        if data["total"] >= 2:
            accuracy = data["correct"] / data["total"] * 100
            avg_ret = data["avg_return"] / data["total"]
            parts = key.split("+")
            pattern_candidates.append({
                "combination": key,
                "indicator_1": INDICATOR_REGISTRY[parts[0]]["name"],
                "indicator_2": INDICATOR_REGISTRY[parts[1]]["name"],
                "accuracy": round(accuracy, 1),
                "avg_return": round(avg_ret, 2),
                "occurrences": data["total"],
                "score": round(accuracy * 0.7 + max(0, avg_ret) * 3, 1),
            })

    pattern_candidates.sort(key=lambda x: x["score"], reverse=True)

    # Top patterns
    top_patterns = pattern_candidates[:10]
    new_discoveries = [p for p in top_patterns if p["accuracy"] > 60 and p["occurrences"] >= 2]

    return {
        "patterns_analyzed": len(combo_results),
        "significant_patterns": len([p for p in pattern_candidates if p["accuracy"] > 55]),
        "top_patterns": top_patterns,
        "new_discoveries": new_discoveries,
        "discovery_count": len(new_discoveries),
    }


# ═══════════════════════════════════════════════════════════════
# PERFORMANCE TRACKER — Model accuracy over time
# ═══════════════════════════════════════════════════════════════

def compute_performance_metrics(history: List[Dict]) -> Dict:
    """Compute rolling performance metrics for the model."""
    if not history:
        return {"message": "No history available", "metrics": {}}

    sorted_h = sorted(history, key=lambda x: x.get("timestamp", ""))

    # Signal distribution
    signals = {"BUY": 0, "SELL": 0, "HOLD": 0}
    regimes = {}
    symbols_analyzed = set()
    asset_types = {}

    for entry in sorted_h:
        sig = entry.get("signal_direction", entry.get("signal", {}).get("direction", "HOLD"))
        signals[sig] = signals.get(sig, 0) + 1
        symbols_analyzed.add(entry.get("symbol", ""))

        regime = entry.get("regime_phase", entry.get("regime", {}).get("market_phase", {}).get("phase", "unknown"))
        regimes[regime] = regimes.get(regime, 0) + 1

        at = entry.get("asset_type", "unknown")
        asset_types[at] = asset_types.get(at, 0) + 1

    total_analyses = len(sorted_h)
    avg_confidence = round(
        sum(e.get("signal_confidence", e.get("signal", {}).get("confidence", 50)) for e in sorted_h) / total_analyses, 1
    ) if total_analyses > 0 else 0

    # Time range
    first_ts = sorted_h[0].get("timestamp", "")
    last_ts = sorted_h[-1].get("timestamp", "")

    return {
        "total_analyses": total_analyses,
        "unique_assets": len(symbols_analyzed),
        "assets_list": list(symbols_analyzed)[:20],
        "signal_distribution": signals,
        "regime_distribution": regimes,
        "asset_type_distribution": asset_types,
        "avg_confidence": avg_confidence,
        "time_range": {"first": first_ts, "last": last_ts},
    }
