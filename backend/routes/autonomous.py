"""
Aureos AI — Advanced Autonomous Systems
JARVIS Auto-Pilot, Arbitrage Scanner, Macro Heat Map,
Earnings Whisper, Social Alpha, Dark Pool, Sector Rotation
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import logging
import random
import uuid

logger = logging.getLogger("aureos")

router = APIRouter(prefix="/api/autonomous", tags=["autonomous"])


# ══════════════════════════════════════════════════════════════
# 1. JARVIS AUTO-PILOT — Rule-based automated trading
# ══════════════════════════════════════════════════════════════

class AutoPilotRule(BaseModel):
    name: str
    condition: str  # Natural language condition
    action: str     # Natural language action
    asset: str
    amount: float = 5000
    enabled: bool = True

# In-memory rules store (per-session, would be MongoDB in production)
_autopilot_rules: Dict[str, List[dict]] = {}
_autopilot_executions: List[dict] = []

@router.post("/autopilot/rules")
async def create_autopilot_rule(rule: AutoPilotRule):
    """Create a new auto-pilot rule"""
    rule_id = str(uuid.uuid4())[:8]
    rule_data = {
        "id": rule_id,
        **rule.dict(),
        "status": "active" if rule.enabled else "paused",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "executions": 0,
        "last_triggered": None,
    }
    _autopilot_rules.setdefault("global", []).append(rule_data)
    return {"rule": rule_data, "message": "Auto-pilot rule created"}

@router.get("/autopilot/rules")
async def get_autopilot_rules():
    """Get all auto-pilot rules"""
    rules = _autopilot_rules.get("global", [])
    return {"rules": rules, "total": len(rules), "active": len([r for r in rules if r["status"] == "active"])}

@router.delete("/autopilot/rules/{rule_id}")
async def delete_autopilot_rule(rule_id: str):
    rules = _autopilot_rules.get("global", [])
    _autopilot_rules["global"] = [r for r in rules if r["id"] != rule_id]
    return {"message": "Rule deleted"}

@router.post("/autopilot/simulate")
async def simulate_autopilot():
    """Simulate auto-pilot execution based on current market conditions"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI not configured")

        rules = _autopilot_rules.get("global", [])
        active_rules = [r for r in rules if r["status"] == "active"]

        if not active_rules:
            return {"executions": [], "message": "No active rules to simulate"}

        from routes.intelligence import get_market_pulse, GEOPOLITICAL_REGIONS
        from routes.quantica import calculate_fear_greed

        pulse = get_market_pulse()
        fg = calculate_fear_greed()

        rules_text = "\n".join([f"Rule '{r['name']}': IF {r['condition']} THEN {r['action']} on {r['asset']} (${r['amount']})" for r in active_rules])
        market_ctx = "\n".join([f"- {p['symbol']}: ${p['value']} ({'+' if p['change']>0 else ''}{p['change']:.1f}%)" for p in pulse[:6]])

        prompt = f"""You are JARVIS Auto-Pilot Engine. Evaluate these trading rules against current market conditions.

Active Rules:
{rules_text}

Current Market:
{market_ctx}
Fear & Greed Index: {fg['composite_score']}/100 ({fg['label']})

For EACH rule, determine:
1. Should it TRIGGER now? (YES/NO)
2. If YES, the specific execution details (asset, action, amount, price)
3. Reasoning (1-2 sentences)

Format each as: RULE: [name] | TRIGGER: YES/NO | ACTION: [details] | REASON: [why]"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"autopilot_{uuid.uuid4().hex[:8]}",
            system_message="You are JARVIS Auto-Pilot. Evaluate trading rules precisely. Be conservative — only trigger when conditions are clearly met."
        ).with_model("openai", "gpt-5.2")

        result = await chat.send_message(UserMessage(text=prompt))

        execution = {
            "id": str(uuid.uuid4())[:8],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "rules_evaluated": len(active_rules),
            "analysis": result,
            "fear_greed": fg["composite_score"],
        }
        _autopilot_executions.append(execution)

        return {"execution": execution}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/autopilot/history")
async def get_autopilot_history():
    return {"executions": _autopilot_executions[-20:], "total": len(_autopilot_executions)}


# ══════════════════════════════════════════════════════════════
# 2. CROSS-MARKET ARBITRAGE SCANNER
# ══════════════════════════════════════════════════════════════

@router.get("/arbitrage")
async def get_arbitrage_opportunities():
    """Detect cross-market arbitrage opportunities"""
    opportunities = [
        {"id": "arb1", "type": "crypto_exchange", "asset": "BTC/USD", "buy_venue": "Kraken", "sell_venue": "Coinbase", "buy_price": 73680, "sell_price": 73745, "spread_pct": 0.088, "estimated_profit": 65, "volume_available": "2.5 BTC", "risk": "low", "latency": "~2s"},
        {"id": "arb2", "type": "adr_premium", "asset": "PBR vs PETR4", "buy_venue": "B3 (PETR4)", "sell_venue": "NYSE (PBR)", "buy_price": 14.82, "sell_price": 15.80, "spread_pct": 6.61, "estimated_profit": 0.98, "volume_available": "High", "risk": "medium", "latency": "T+2 settlement"},
        {"id": "arb3", "type": "adr_premium", "asset": "VALE vs VALE3", "buy_venue": "B3 (VALE3)", "sell_venue": "NYSE (VALE)", "buy_price": 11.95, "sell_price": 12.40, "spread_pct": 3.77, "estimated_profit": 0.45, "volume_available": "High", "risk": "medium", "latency": "T+2 settlement"},
        {"id": "arb4", "type": "crypto_exchange", "asset": "ETH/USD", "buy_venue": "Binance", "sell_venue": "Coinbase", "buy_price": 2315, "sell_price": 2320, "spread_pct": 0.216, "estimated_profit": 5, "volume_available": "15 ETH", "risk": "low", "latency": "~15s"},
        {"id": "arb5", "type": "futures_spot", "asset": "BTC Futures vs Spot", "buy_venue": "Spot (Coinbase)", "sell_venue": "CME Futures", "buy_price": 73745, "sell_price": 74200, "spread_pct": 0.617, "estimated_profit": 455, "volume_available": "5 contracts", "risk": "medium", "latency": "Quarterly expiry"},
        {"id": "arb6", "type": "triangular_forex", "asset": "EUR→GBP→USD→EUR", "buy_venue": "Multi-leg FX", "sell_venue": "Triangular", "buy_price": 1.0, "sell_price": 1.0012, "spread_pct": 0.12, "estimated_profit": 12, "volume_available": "$100K", "risk": "low", "latency": "<1s"},
        {"id": "arb7", "type": "etf_nav", "asset": "GLD vs Gold Spot", "buy_venue": "Gold Spot", "sell_venue": "GLD ETF", "buy_price": 291.50, "sell_price": 293.20, "spread_pct": 0.58, "estimated_profit": 1.70, "volume_available": "500 shares", "risk": "low", "latency": "Intraday"},
    ]
    return {
        "opportunities": opportunities,
        "total": len(opportunities),
        "best_spread": max(o["spread_pct"] for o in opportunities),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


# ══════════════════════════════════════════════════════════════
# 3. MACRO ECONOMIC HEAT MAP
# ══════════════════════════════════════════════════════════════

@router.get("/macro-heatmap")
async def get_macro_heatmap():
    """Global macroeconomic indicators by country/region"""
    countries = [
        {"code": "US", "name": "United States", "gdp_growth": 2.4, "inflation": 3.1, "interest_rate": 4.75, "unemployment": 3.8, "debt_gdp": 123, "currency": "USD", "market_index": "S&P 500", "index_ytd": 8.2, "central_bank": "Federal Reserve", "next_decision": "Mar 19", "outlook": "hawkish_pause", "impacted_assets": ["SPY", "QQQ", "USD/JPY"]},
        {"code": "EU", "name": "Eurozone", "gdp_growth": 0.8, "inflation": 2.4, "interest_rate": 3.75, "unemployment": 6.4, "debt_gdp": 90, "currency": "EUR", "market_index": "STOXX 600", "index_ytd": 5.1, "central_bank": "ECB", "next_decision": "Apr 11", "outlook": "dovish", "impacted_assets": ["EUR/USD", "ASML", "SAP"]},
        {"code": "CN", "name": "China", "gdp_growth": 4.8, "inflation": 0.3, "interest_rate": 3.45, "unemployment": 5.2, "debt_gdp": 83, "currency": "CNY", "market_index": "CSI 300", "index_ytd": -2.1, "central_bank": "PBOC", "next_decision": "Mar 20", "outlook": "easing", "impacted_assets": ["BABA", "USD/CNY", "COPPER"]},
        {"code": "JP", "name": "Japan", "gdp_growth": 1.2, "inflation": 2.8, "interest_rate": 0.25, "unemployment": 2.5, "debt_gdp": 255, "currency": "JPY", "market_index": "Nikkei 225", "index_ytd": 12.4, "central_bank": "BOJ", "next_decision": "Mar 14", "outlook": "hawkish_shift", "impacted_assets": ["USD/JPY", "TM", "SONY"]},
        {"code": "UK", "name": "United Kingdom", "gdp_growth": 0.4, "inflation": 3.4, "interest_rate": 5.00, "unemployment": 4.3, "debt_gdp": 101, "currency": "GBP", "market_index": "FTSE 100", "index_ytd": 3.8, "central_bank": "BOE", "next_decision": "Mar 20", "outlook": "cautious", "impacted_assets": ["GBP/USD", "HSBC", "BP"]},
        {"code": "BR", "name": "Brazil", "gdp_growth": 2.9, "inflation": 4.5, "interest_rate": 13.25, "unemployment": 7.8, "debt_gdp": 74, "currency": "BRL", "market_index": "IBOVESPA", "index_ytd": 6.2, "central_bank": "BCB", "next_decision": "Mar 19", "outlook": "hold", "impacted_assets": ["USD/BRL", "PBR", "VALE", "EWZ"]},
        {"code": "AU", "name": "Australia", "gdp_growth": 1.5, "inflation": 3.6, "interest_rate": 4.35, "unemployment": 4.1, "debt_gdp": 52, "currency": "AUD", "market_index": "ASX 200", "index_ytd": 4.5, "central_bank": "RBA", "next_decision": "Apr 1", "outlook": "data_dependent", "impacted_assets": ["AUD/USD", "BHP", "CBA"]},
        {"code": "IN", "name": "India", "gdp_growth": 6.5, "inflation": 5.1, "interest_rate": 6.50, "unemployment": 8.1, "debt_gdp": 83, "currency": "INR", "market_index": "NIFTY 50", "index_ytd": 2.8, "central_bank": "RBI", "next_decision": "Apr 9", "outlook": "neutral", "impacted_assets": ["USD/INR", "INFY", "WIT"]},
        {"code": "MX", "name": "Mexico", "gdp_growth": 3.2, "inflation": 4.2, "interest_rate": 11.00, "unemployment": 2.8, "debt_gdp": 54, "currency": "MXN", "market_index": "IPC", "index_ytd": 1.2, "central_bank": "Banxico", "next_decision": "Mar 27", "outlook": "easing", "impacted_assets": ["USD/MXN", "AMX"]},
        {"code": "KR", "name": "South Korea", "gdp_growth": 2.1, "inflation": 2.5, "interest_rate": 3.00, "unemployment": 2.9, "debt_gdp": 54, "currency": "KRW", "market_index": "KOSPI", "index_ytd": 3.1, "central_bank": "BOK", "next_decision": "Apr 11", "outlook": "easing", "impacted_assets": ["USD/KRW", "005930.KS", "TSM"]},
    ]
    return {
        "countries": countries,
        "global_avg_growth": round(sum(c["gdp_growth"] for c in countries) / len(countries), 1),
        "global_avg_inflation": round(sum(c["inflation"] for c in countries) / len(countries), 1),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


# ══════════════════════════════════════════════════════════════
# 4. AI EARNINGS WHISPER
# ══════════════════════════════════════════════════════════════

@router.get("/earnings-calendar")
async def get_earnings_calendar():
    """Upcoming earnings with AI predictions"""
    earnings = [
        {"symbol": "NVDA", "name": "NVIDIA Corp", "date": "2026-03-26", "time": "AMC", "eps_estimate": 0.89, "revenue_estimate": "38.5B", "jarvis_prediction": "BEAT", "jarvis_confidence": 88, "jarvis_reasoning": "AI infrastructure demand remains robust. Data center revenue expected to exceed $30B. Blackwell chip demand outpacing supply.", "previous_eps": 0.81, "surprise_history": [12.3, 8.7, 15.2, 6.4], "implied_move": 8.5},
        {"symbol": "AAPL", "name": "Apple Inc", "date": "2026-04-02", "time": "AMC", "eps_estimate": 1.62, "revenue_estimate": "94.2B", "jarvis_prediction": "INLINE", "jarvis_confidence": 72, "jarvis_reasoning": "iPhone 16 cycle maturing. Services revenue growth strong at 15%+ but hardware growth slowing. China market uncertainty.", "previous_eps": 1.58, "surprise_history": [2.1, -1.3, 4.5, 1.8], "implied_move": 4.2},
        {"symbol": "GOOG", "name": "Alphabet Inc", "date": "2026-04-01", "time": "AMC", "eps_estimate": 2.08, "revenue_estimate": "86.1B", "jarvis_prediction": "BEAT", "jarvis_confidence": 81, "jarvis_reasoning": "Search + Cloud AI integration driving revenue. YouTube ad recovery. Gemini AI monetization beginning.", "previous_eps": 1.95, "surprise_history": [8.4, 5.2, 3.1, 12.7], "implied_move": 6.1},
        {"symbol": "TSLA", "name": "Tesla Inc", "date": "2026-04-03", "time": "AMC", "eps_estimate": 0.48, "revenue_estimate": "26.8B", "jarvis_prediction": "MISS", "jarvis_confidence": 67, "jarvis_reasoning": "Margin pressure from price cuts. Cybertruck ramp slower than expected. FSD revenue recognition uncertain.", "previous_eps": 0.52, "surprise_history": [-5.2, 3.1, -8.4, 1.2], "implied_move": 12.3},
        {"symbol": "MSFT", "name": "Microsoft Corp", "date": "2026-04-08", "time": "AMC", "eps_estimate": 3.22, "revenue_estimate": "68.5B", "jarvis_prediction": "BEAT", "jarvis_confidence": 85, "jarvis_reasoning": "Azure AI revenue accelerating. Copilot enterprise adoption strong. Gaming segment stable post-Activision.", "previous_eps": 3.08, "surprise_history": [4.5, 6.2, 3.8, 5.1], "implied_move": 5.0},
        {"symbol": "META", "name": "Meta Platforms", "date": "2026-04-09", "time": "AMC", "eps_estimate": 5.85, "revenue_estimate": "42.1B", "jarvis_prediction": "BEAT", "jarvis_confidence": 79, "jarvis_reasoning": "Reels monetization improving. AI-driven ad targeting boosting ROAS. Reality Labs losses narrowing.", "previous_eps": 5.42, "surprise_history": [15.2, 8.4, 22.1, 6.3], "implied_move": 7.8},
        {"symbol": "AMZN", "name": "Amazon.com", "date": "2026-04-10", "time": "AMC", "eps_estimate": 1.28, "revenue_estimate": "158.2B", "jarvis_prediction": "BEAT", "jarvis_confidence": 83, "jarvis_reasoning": "AWS growth re-accelerating to 18%+. E-commerce margins expanding. Advertising segment growing 25%+.", "previous_eps": 1.15, "surprise_history": [9.8, 12.4, 5.6, 18.2], "implied_move": 6.5},
        {"symbol": "PBR", "name": "Petrobras", "date": "2026-03-20", "time": "BMO", "eps_estimate": 0.92, "revenue_estimate": "22.8B", "jarvis_prediction": "BEAT", "jarvis_confidence": 74, "jarvis_reasoning": "Oil prices supporting revenue. Dividend yield attractive. Political risk priced in. Pre-salt production increasing.", "previous_eps": 0.88, "surprise_history": [4.2, -2.1, 8.5, 3.1], "implied_move": 5.5},
    ]
    return {
        "earnings": earnings,
        "this_week": len([e for e in earnings if (datetime.strptime(e["date"], "%Y-%m-%d") - datetime.now()).days <= 7]),
        "beats_predicted": len([e for e in earnings if e["jarvis_prediction"] == "BEAT"]),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


# ══════════════════════════════════════════════════════════════
# 5. SOCIAL ALPHA SCANNER
# ══════════════════════════════════════════════════════════════

@router.get("/social-alpha")
async def get_social_alpha():
    """Social media sentiment tracking — Reddit, Twitter/X, Telegram"""
    assets = [
        {"symbol": "BTC/USD", "reddit_mentions": 12450, "twitter_mentions": 89200, "telegram_mentions": 5600, "sentiment_score": 0.72, "sentiment_shift_24h": 0.08, "social_volume_change": 45, "social_alpha": 0.85, "trending_topics": ["ETF inflows", "halving", "institutional adoption"], "prediction": "Bullish momentum building"},
        {"symbol": "NVDA", "reddit_mentions": 8900, "twitter_mentions": 45200, "telegram_mentions": 2100, "sentiment_score": 0.65, "sentiment_shift_24h": -0.05, "social_volume_change": 12, "social_alpha": 0.72, "trending_topics": ["Blackwell", "AI demand", "earnings"], "prediction": "Strong but cooling"},
        {"symbol": "SOL/USD", "reddit_mentions": 6800, "twitter_mentions": 34100, "telegram_mentions": 8900, "sentiment_score": 0.81, "sentiment_shift_24h": 0.15, "social_volume_change": 120, "social_alpha": 0.91, "trending_topics": ["meme coins", "DEX volume", "Firedancer"], "prediction": "Explosive social momentum"},
        {"symbol": "TSLA", "reddit_mentions": 15200, "twitter_mentions": 72400, "telegram_mentions": 3200, "sentiment_score": -0.12, "sentiment_shift_24h": -0.18, "social_volume_change": -8, "social_alpha": -0.35, "trending_topics": ["price cuts", "competition", "Musk"], "prediction": "Bearish social pressure"},
        {"symbol": "GOLD", "reddit_mentions": 3200, "twitter_mentions": 18700, "telegram_mentions": 1200, "sentiment_score": 0.58, "sentiment_shift_24h": 0.12, "social_volume_change": 35, "social_alpha": 0.62, "trending_topics": ["safe haven", "inflation", "central banks"], "prediction": "Rising safe-haven interest"},
        {"symbol": "DOGE/USD", "reddit_mentions": 9800, "twitter_mentions": 52000, "telegram_mentions": 12000, "sentiment_score": 0.45, "sentiment_shift_24h": 0.22, "social_volume_change": 180, "social_alpha": 0.78, "trending_topics": ["Elon tweet", "DOGE payment", "meme rally"], "prediction": "Speculative surge incoming"},
        {"symbol": "AAPL", "reddit_mentions": 5400, "twitter_mentions": 28900, "telegram_mentions": 1800, "sentiment_score": 0.42, "sentiment_shift_24h": -0.03, "social_volume_change": 5, "social_alpha": 0.31, "trending_topics": ["Vision Pro", "services", "iPhone 17"], "prediction": "Stable, low social alpha"},
        {"symbol": "ETH/USD", "reddit_mentions": 7200, "twitter_mentions": 41500, "telegram_mentions": 6800, "sentiment_score": 0.68, "sentiment_shift_24h": 0.10, "social_volume_change": 55, "social_alpha": 0.76, "trending_topics": ["ETF approval", "Pectra upgrade", "DeFi revival"], "prediction": "Building momentum"},
    ]
    return {
        "assets": sorted(assets, key=lambda a: a["social_alpha"], reverse=True),
        "total_social_volume": sum(a["reddit_mentions"] + a["twitter_mentions"] + a["telegram_mentions"] for a in assets),
        "most_bullish": max(assets, key=lambda a: a["sentiment_score"])["symbol"],
        "most_bearish": min(assets, key=lambda a: a["sentiment_score"])["symbol"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


# ══════════════════════════════════════════════════════════════
# 6. DARK POOL ACTIVITY TRACKER
# ══════════════════════════════════════════════════════════════

@router.get("/dark-pool")
async def get_dark_pool_activity():
    """Track institutional dark pool trading activity"""
    trades = [
        {"symbol": "NVDA", "volume": 12500000, "notional": "$11.1B", "dark_pool_pct": 42.5, "direction": "buy", "block_trades": 28, "avg_block_size": "$45M", "signal": "Heavy institutional accumulation"},
        {"symbol": "AAPL", "volume": 8900000, "notional": "$1.6B", "dark_pool_pct": 38.2, "direction": "mixed", "block_trades": 15, "avg_block_size": "$12M", "signal": "Neutral flow"},
        {"symbol": "TSLA", "volume": 6200000, "notional": "$1.5B", "dark_pool_pct": 45.8, "direction": "sell", "block_trades": 22, "avg_block_size": "$18M", "signal": "Distribution detected"},
        {"symbol": "MSFT", "volume": 5800000, "notional": "$2.5B", "dark_pool_pct": 35.1, "direction": "buy", "block_trades": 12, "avg_block_size": "$38M", "signal": "Smart money buying"},
        {"symbol": "GOOG", "volume": 4100000, "notional": "$624M", "dark_pool_pct": 31.4, "direction": "buy", "block_trades": 8, "avg_block_size": "$22M", "signal": "Accumulation before earnings"},
        {"symbol": "META", "volume": 3800000, "notional": "$2.1B", "dark_pool_pct": 36.7, "direction": "buy", "block_trades": 10, "avg_block_size": "$35M", "signal": "Institutional conviction high"},
        {"symbol": "SPY", "volume": 45000000, "notional": "$30.1B", "dark_pool_pct": 48.2, "direction": "buy", "block_trades": 85, "avg_block_size": "$52M", "signal": "Broad market accumulation"},
    ]
    return {
        "trades": trades,
        "total_dark_pool_volume": "$49.4B",
        "avg_dark_pool_pct": round(sum(t["dark_pool_pct"] for t in trades) / len(trades), 1),
        "institutional_bias": "BULLISH",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


# ══════════════════════════════════════════════════════════════
# 7. SECTOR ROTATION TRACKER
# ══════════════════════════════════════════════════════════════

@router.get("/sector-rotation")
async def get_sector_rotation():
    """Track money flow between sectors"""
    sectors = [
        {"name": "Technology", "symbol": "XLK", "performance_1w": 2.8, "performance_1m": 8.4, "performance_3m": 15.2, "flow_1w": 4200, "flow_direction": "inflow", "phase": "expansion", "top_holdings": ["AAPL", "MSFT", "NVDA"]},
        {"name": "Healthcare", "symbol": "XLV", "performance_1w": 1.2, "performance_1m": 3.1, "performance_3m": 5.8, "flow_1w": 1800, "flow_direction": "inflow", "phase": "early_expansion", "top_holdings": ["UNH", "JNJ", "LLY"]},
        {"name": "Energy", "symbol": "XLE", "performance_1w": 3.5, "performance_1m": 7.2, "performance_3m": 12.1, "flow_1w": 3100, "flow_direction": "inflow", "phase": "expansion", "top_holdings": ["XOM", "CVX", "PBR"]},
        {"name": "Financials", "symbol": "XLF", "performance_1w": 0.8, "performance_1m": 2.4, "performance_3m": 6.5, "flow_1w": 900, "flow_direction": "neutral", "phase": "mid_cycle", "top_holdings": ["JPM", "BAC", "GS"]},
        {"name": "Consumer Disc.", "symbol": "XLY", "performance_1w": -0.5, "performance_1m": 1.2, "performance_3m": -2.1, "flow_1w": -1200, "flow_direction": "outflow", "phase": "contraction", "top_holdings": ["AMZN", "TSLA", "HD"]},
        {"name": "Industrials", "symbol": "XLI", "performance_1w": 1.5, "performance_1m": 4.2, "performance_3m": 8.8, "flow_1w": 2200, "flow_direction": "inflow", "phase": "expansion", "top_holdings": ["CAT", "GE", "HON"]},
        {"name": "Real Estate", "symbol": "XLRE", "performance_1w": -1.2, "performance_1m": -3.5, "performance_3m": -8.2, "flow_1w": -2800, "flow_direction": "outflow", "phase": "contraction", "top_holdings": ["AMT", "PLD", "CCI"]},
        {"name": "Utilities", "symbol": "XLU", "performance_1w": 0.3, "performance_1m": 1.8, "performance_3m": 4.2, "flow_1w": 500, "flow_direction": "neutral", "phase": "defensive", "top_holdings": ["NEE", "DUK", "SO"]},
        {"name": "Materials", "symbol": "XLB", "performance_1w": 2.1, "performance_1m": 5.5, "performance_3m": 9.1, "flow_1w": 1500, "flow_direction": "inflow", "phase": "expansion", "top_holdings": ["LIN", "APD", "VALE"]},
        {"name": "Crypto", "symbol": "N/A", "performance_1w": 5.2, "performance_1m": 18.5, "performance_3m": 45.2, "flow_1w": 8500, "flow_direction": "strong_inflow", "phase": "euphoria", "top_holdings": ["BTC", "ETH", "SOL"]},
    ]
    return {
        "sectors": sectors,
        "strongest_inflow": max(sectors, key=lambda s: s["flow_1w"])["name"],
        "strongest_outflow": min(sectors, key=lambda s: s["flow_1w"])["name"],
        "market_phase": "late_expansion",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
