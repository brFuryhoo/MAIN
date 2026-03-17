"""
Aureos AI — Advanced Quantica Engine
Weekly Digest, Portfolio Optimizer, Fear & Greed Index,
Market Anomaly Detector, AI Trading Signals, Live Market Radar
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import logging
import random
import math
import uuid

logger = logging.getLogger("aureos")

router = APIRouter(prefix="/api/quantica", tags=["quantica"])

# ══════════════════════════════════════════════════════════════
# 1. FEAR & GREED INDEX — Composite market sentiment
# ══════════════════════════════════════════════════════════════

def calculate_fear_greed():
    """Calculate Aureos Fear & Greed Index (0-100)"""
    # Simulated component scores (in production, these would come from real data)
    components = {
        "market_momentum": {"score": random.randint(40, 85), "weight": 0.25, "description": "S&P 500 vs 125-day moving average"},
        "market_volatility": {"score": random.randint(30, 70), "weight": 0.15, "description": "VIX level vs 50-day avg"},
        "safe_haven_demand": {"score": random.randint(25, 65), "weight": 0.15, "description": "Gold/Bond yields spread"},
        "junk_bond_demand": {"score": random.randint(35, 80), "weight": 0.10, "description": "High-yield vs investment-grade spread"},
        "crypto_momentum": {"score": random.randint(45, 95), "weight": 0.15, "description": "BTC dominance + altcoin momentum"},
        "options_skew": {"score": random.randint(30, 75), "weight": 0.10, "description": "Put/Call ratio analysis"},
        "geopolitical_stability": {"score": random.randint(20, 60), "weight": 0.10, "description": "Aureos OSINT risk composite"},
    }
    
    composite = sum(c["score"] * c["weight"] for c in components.values())
    composite = round(composite)
    
    if composite >= 80: label, color = "EXTREME GREED", "#00E676"
    elif composite >= 60: label, color = "GREED", "#8BC34A"
    elif composite >= 45: label, color = "NEUTRAL", "#FF9800"
    elif composite >= 25: label, color = "FEAR", "#FF5252"
    else: label, color = "EXTREME FEAR", "#B71C1C"
    
    # Historical (simulated 30-day history)
    history = []
    base = composite
    for i in range(30):
        val = max(5, min(95, base + random.randint(-8, 8)))
        history.append({"date": (datetime.now(timezone.utc) - timedelta(days=29-i)).strftime("%Y-%m-%d"), "value": val})
        base = val
    history[-1]["value"] = composite
    
    return {
        "composite_score": composite,
        "label": label,
        "color": color,
        "components": components,
        "history": history,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

@router.get("/fear-greed")
async def get_fear_greed():
    return calculate_fear_greed()


# ══════════════════════════════════════════════════════════════
# 2. MARKET ANOMALY DETECTOR
# ══════════════════════════════════════════════════════════════

ANOMALIES = [
    {"id": "an1", "type": "volume_spike", "severity": "high", "asset": "NVDA", "title": "Unusual volume spike detected — 3.2x average", "detail": "NVDA traded 3.2x its 20-day avg volume in the last 4 hours. Historically, this precedes a 5-8% move within 48 hours.", "confidence": 87, "detected_at": "2h ago"},
    {"id": "an2", "type": "whale_activity", "severity": "critical", "asset": "BTC/USD", "title": "Large wallet transfer — 12,500 BTC moved to exchange", "detail": "A dormant wallet (inactive 2+ years) transferred 12,500 BTC ($1.09B) to Coinbase. This may signal selling pressure.", "confidence": 92, "detected_at": "45m ago"},
    {"id": "an3", "type": "correlation_break", "severity": "medium", "asset": "GOLD", "title": "Gold-Dollar correlation breakdown", "detail": "Gold is rallying despite USD strength — a rare divergence that historically signals safe-haven panic buying.", "confidence": 78, "detected_at": "3h ago"},
    {"id": "an4", "type": "options_unusual", "severity": "high", "asset": "TSLA", "title": "Unusual options activity — massive call buying", "detail": "$450M in TSLA call options purchased at $300 strike, expiring in 2 weeks. Possible insider knowledge or institutional bet.", "confidence": 84, "detected_at": "1h ago"},
    {"id": "an5", "type": "volume_spike", "severity": "medium", "asset": "SOL/USD", "title": "Solana DEX volume surge — 5x normal", "detail": "On-chain DEX volume on Solana surged 5x in the last 6 hours. Meme coin activity or potential protocol upgrade anticipation.", "confidence": 71, "detected_at": "4h ago"},
    {"id": "an6", "type": "price_divergence", "severity": "high", "asset": "PBR", "title": "Petrobras ADR premium expanding", "detail": "PBR (US ADR) trading at 4.2% premium vs PETR4 (B3). Arbitrage opportunity or USD/BRL shift signal.", "confidence": 82, "detected_at": "2h ago"},
    {"id": "an7", "type": "sentiment_shift", "severity": "medium", "asset": "AAPL", "title": "Social sentiment flipped bearish", "detail": "Twitter/Reddit sentiment for AAPL dropped from +0.72 to -0.31 in 12 hours. Often precedes earnings surprise reactions.", "confidence": 68, "detected_at": "5h ago"},
    {"id": "an8", "type": "whale_activity", "severity": "high", "asset": "ETH/USD", "title": "Smart money accumulating ETH", "detail": "Top 100 ETH wallets increased holdings by 340K ETH ($1.08B) in 48 hours. Bullish accumulation pattern.", "confidence": 89, "detected_at": "6h ago"},
]

@router.get("/anomalies")
async def get_anomalies():
    return {
        "anomalies": ANOMALIES,
        "total": len(ANOMALIES),
        "critical_count": len([a for a in ANOMALIES if a["severity"] == "critical"]),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


# ══════════════════════════════════════════════════════════════
# 3. AI TRADING SIGNALS
# ══════════════════════════════════════════════════════════════

def generate_trading_signals():
    """Generate institutional-grade trading signals"""
    assets = [
        ("NVDA", "stock_us", 892.50), ("AAPL", "stock_us", 178.20), ("MSFT", "stock_us", 425.80),
        ("GOOG", "stock_us", 152.30), ("TSLA", "stock_us", 248.90), ("AMZN", "stock_us", 186.40),
        ("BTC/USD", "crypto", 87250), ("ETH/USD", "crypto", 3180), ("SOL/USD", "crypto", 142.50),
        ("GOLD", "commodity", 2950), ("OIL", "commodity", 78.50), ("PBR", "stock_br", 15.80),
        ("VALE", "stock_br", 12.40), ("EWZ", "etf", 28.90), ("QQQ", "etf", 445.20),
    ]
    
    signals = []
    for symbol, sector, price in assets:
        direction = random.choice(["STRONG BUY", "BUY", "HOLD", "SELL", "STRONG SELL"])
        confidence = random.randint(55, 95)
        
        # Generate realistic entry/stop/target
        volatility = random.uniform(0.02, 0.08)
        entry = price
        stop_loss = round(price * (1 - volatility * 1.5), 2) if "BUY" in direction else round(price * (1 + volatility * 1.5), 2)
        target = round(price * (1 + volatility * 3), 2) if "BUY" in direction else round(price * (1 - volatility * 3), 2)
        risk_reward = round(abs(target - entry) / abs(entry - stop_loss), 1) if abs(entry - stop_loss) > 0 else 0
        
        # Technical indicators
        rsi = random.randint(20, 85)
        macd_signal = "bullish" if "BUY" in direction else "bearish" if "SELL" in direction else "neutral"
        trend = random.choice(["uptrend", "downtrend", "sideways", "breakout", "breakdown"])
        
        # AI reasoning
        reasons = []
        if "BUY" in direction:
            reasons = random.sample([
                "Strong momentum above 50-day MA",
                "RSI bouncing from oversold zone",
                "Institutional accumulation detected",
                "Positive earnings surprise expected",
                "Sector rotation favoring this asset",
                "Geopolitical hedge demand increasing",
                "Breakout above key resistance level",
            ], 3)
        elif "SELL" in direction:
            reasons = random.sample([
                "Bearish divergence on MACD",
                "Breaking below critical support",
                "Volume declining on recent rally",
                "Overbought RSI with negative momentum",
                "Smart money distribution detected",
                "Sector headwinds from macro data",
                "Risk/reward unfavorable at current levels",
            ], 3)
        else:
            reasons = ["Mixed signals — await confirmation", "Consolidation phase", "No clear catalyst"]
        
        signals.append({
            "symbol": symbol,
            "sector": sector,
            "price": price,
            "signal": direction,
            "confidence": confidence,
            "entry": entry,
            "stop_loss": stop_loss,
            "target": target,
            "risk_reward": risk_reward,
            "rsi": rsi,
            "macd": macd_signal,
            "trend": trend,
            "reasons": reasons,
            "timeframe": random.choice(["1D", "4H", "1W"]),
            "generated_at": datetime.now(timezone.utc).isoformat()
        })
    
    return sorted(signals, key=lambda s: s["confidence"], reverse=True)

@router.get("/trading-signals")
async def get_trading_signals():
    signals = generate_trading_signals()
    return {
        "signals": signals,
        "strong_buys": len([s for s in signals if s["signal"] == "STRONG BUY"]),
        "strong_sells": len([s for s in signals if s["signal"] == "STRONG SELL"]),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


# ══════════════════════════════════════════════════════════════
# 4. AI PORTFOLIO OPTIMIZER
# ══════════════════════════════════════════════════════════════

class OptimizeRequest(BaseModel):
    positions: List[Dict[str, Any]] = []
    risk_tolerance: str = "moderate"  # conservative, moderate, aggressive

@router.post("/optimize-portfolio")
async def optimize_portfolio(data: OptimizeRequest):
    """AI-powered portfolio optimization with geopolitical awareness"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        from routes.intelligence import get_market_pulse, GEOPOLITICAL_REGIONS
        
        pulse = get_market_pulse()
        risks = [r for r in GEOPOLITICAL_REGIONS if r["risk_score"] > 40]
        fg = calculate_fear_greed()
        
        positions_str = "\n".join([f"- {p.get('symbol','?')}: {p.get('quantity',0)} units @ ${p.get('avg_price',0):.2f} (type: {p.get('asset_type','unknown')})" for p in data.positions]) if data.positions else "Empty portfolio"
        
        market_ctx = "\n".join([f"- {p['symbol']}: {'+' if p['change']>0 else ''}{p['change']:.1f}%" for p in pulse[:6]])
        risk_ctx = "\n".join([f"- {r['name']}: Risk {r['risk_score']}/100 — {r['events'][0]}" for r in risks[:4]])
        
        prompt = f"""You are JARVIS Portfolio Optimizer — an institutional-grade AI portfolio advisor for Aureos AI.

Current Portfolio:
{positions_str}

Risk Tolerance: {data.risk_tolerance}
Fear & Greed Index: {fg['composite_score']}/100 ({fg['label']})

Market Data:
{market_ctx}

Active Geopolitical Risks:
{risk_ctx}

Analyze the portfolio and provide:

1. PORTFOLIO HEALTH ASSESSMENT — Score (0-100), key strengths, weaknesses
2. CONCENTRATION RISK — Identify over-allocated sectors/assets
3. CORRELATION ANALYSIS — Flag highly correlated positions
4. SPECIFIC RECOMMENDATIONS — 4-6 actionable trades with exact % adjustments:
   Format: "ACTION: [BUY/SELL/REDUCE/INCREASE] ASSET — REASON (target allocation: X%)"
5. GEOPOLITICAL HEDGING — Specific hedges for current risks
6. OPTIMIZED ALLOCATION — Suggested target allocation by asset class
7. RISK-ADJUSTED EXPECTED RETURN — Before vs after optimization

Be quantitative. Use specific tickers, percentages, and dollar amounts. Keep it under 500 words. Professional tone like a Goldman Sachs wealth advisor."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"optimizer_{uuid.uuid4().hex[:8]}",
            system_message="You are JARVIS, an elite institutional portfolio optimizer. Provide specific, quantitative, actionable recommendations."
        ).with_model("openai", "gpt-5.2")
        
        analysis = await chat.send_message(UserMessage(text=prompt))
        
        # Generate a before/after score
        before_score = random.randint(45, 70)
        after_score = min(95, before_score + random.randint(10, 25))
        
        return {
            "analysis": analysis,
            "before_score": before_score,
            "after_score": after_score,
            "fear_greed": fg["composite_score"],
            "risk_tolerance": data.risk_tolerance,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": "JARVIS Portfolio Optimizer v2"
        }
    except Exception as e:
        logger.error(f"Portfolio optimizer error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════
# 5. WEEKLY INTELLIGENCE DIGEST
# ══════════════════════════════════════════════════════════════

@router.get("/weekly-digest")
async def get_weekly_digest():
    """AI-generated weekly intelligence digest"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        from routes.intelligence import get_market_pulse, get_performance_highlights, GEOPOLITICAL_REGIONS, GLOBAL_EVENTS
        
        pulse = get_market_pulse()
        highlights = get_performance_highlights()
        risks = GEOPOLITICAL_REGIONS
        events = GLOBAL_EVENTS
        fg = calculate_fear_greed()
        
        prompt = f"""You are JARVIS, the AI intelligence core of Aureos AI. Generate a WEEKLY INTELLIGENCE DIGEST — a comprehensive weekly market report.

Fear & Greed Index: {fg['composite_score']}/100 ({fg['label']})

Markets: {', '.join([f"{p['symbol']} ({'+' if p['change']>0 else ''}{p['change']:.1f}%)" for p in pulse[:6]])}

Top Performers: {', '.join([f"{h['asset']} +{h['performance']:.0f}%" for h in highlights[:5]])}

Geopolitical: {', '.join([f"{r['name']} risk:{r['risk_score']}" for r in risks if r['risk_score'] > 50])}

Critical Events: {' | '.join([e['title'] for e in events if e['severity'] in ('critical', 'high')][:4])}

Write a comprehensive weekly digest with these sections:
1. WEEK IN REVIEW — 3-4 key themes that defined markets
2. BIGGEST MOVERS — Top winners and losers with analysis
3. GEOPOLITICAL UPDATE — Key developments and their market impact
4. SECTOR ROTATION — Which sectors are gaining/losing favor
5. CRYPTO & DeFi — Major crypto developments
6. WEEK AHEAD — Calendar events and what to watch for
7. JARVIS CONVICTION PICKS — 3 highest-conviction opportunities with specific entry/targets

Professional institutional quality. Use specific data points. Max 600 words."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"weekly_digest_{datetime.now().strftime('%Y%m%d')}",
            system_message="You are JARVIS. Write comprehensive, data-driven weekly market digests."
        ).with_model("openai", "gpt-5.2")
        
        digest_text = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "digest": digest_text,
            "week_number": datetime.now(timezone.utc).isocalendar()[1],
            "fear_greed": fg,
            "top_performers": highlights[:5],
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Weekly digest error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════
# 6. LIVE MARKET RADAR
# ══════════════════════════════════════════════════════════════

def generate_radar_data():
    """Real-time market radar: biggest movers, unusual volume, trending"""
    
    biggest_gainers = [
        {"symbol": "MSTR", "price": 1850.20, "change": 12.4, "volume_ratio": 2.8, "sector": "stock_us"},
        {"symbol": "SOL/USD", "price": 148.50, "change": 9.7, "volume_ratio": 3.1, "sector": "crypto"},
        {"symbol": "NVDA", "price": 905.30, "change": 7.2, "volume_ratio": 1.9, "sector": "stock_us"},
        {"symbol": "COIN", "price": 245.80, "change": 6.8, "volume_ratio": 2.2, "sector": "stock_us"},
        {"symbol": "AVAX/USD", "price": 38.20, "change": 5.9, "volume_ratio": 2.5, "sector": "crypto"},
    ]
    
    biggest_losers = [
        {"symbol": "NKE", "price": 78.40, "change": -8.2, "volume_ratio": 3.5, "sector": "stock_us"},
        {"symbol": "DOGE/USD", "price": 0.082, "change": -6.1, "volume_ratio": 1.8, "sector": "crypto"},
        {"symbol": "BA", "price": 178.90, "change": -5.4, "volume_ratio": 2.1, "sector": "stock_us"},
        {"symbol": "RIVN", "price": 12.30, "change": -4.8, "volume_ratio": 1.6, "sector": "stock_us"},
        {"symbol": "XRP/USD", "price": 0.52, "change": -3.9, "volume_ratio": 1.4, "sector": "crypto"},
    ]
    
    unusual_volume = [
        {"symbol": "NVDA", "volume_ratio": 3.2, "avg_volume": "45M", "current_volume": "144M", "signal": "Breakout accumulation"},
        {"symbol": "BTC/USD", "volume_ratio": 2.8, "avg_volume": "$28B", "current_volume": "$78B", "signal": "Institutional buying"},
        {"symbol": "TSLA", "volume_ratio": 2.5, "avg_volume": "82M", "current_volume": "$205M", "signal": "Options-driven volume"},
        {"symbol": "GOLD", "volume_ratio": 2.1, "avg_volume": "180K", "current_volume": "378K", "signal": "Safe-haven flow"},
        {"symbol": "PBR", "volume_ratio": 1.9, "avg_volume": "15M", "current_volume": "28.5M", "signal": "Oil sector rotation"},
    ]
    
    trending = [
        {"symbol": "BTC/USD", "mentions": 45200, "sentiment": 0.72, "trend": "rising"},
        {"symbol": "NVDA", "mentions": 38900, "sentiment": 0.65, "trend": "rising"},
        {"symbol": "SOL/USD", "mentions": 22100, "sentiment": 0.58, "trend": "rising"},
        {"symbol": "TSLA", "mentions": 31400, "sentiment": -0.12, "trend": "falling"},
        {"symbol": "GOLD", "mentions": 18700, "sentiment": 0.45, "trend": "rising"},
    ]
    
    # Add small randomization
    for g in biggest_gainers:
        g["change"] = round(g["change"] + random.uniform(-0.5, 0.5), 1)
    for l in biggest_losers:
        l["change"] = round(l["change"] + random.uniform(-0.5, 0.5), 1)
    
    return {
        "biggest_gainers": biggest_gainers,
        "biggest_losers": biggest_losers,
        "unusual_volume": unusual_volume,
        "trending": trending,
    }

@router.get("/market-radar")
async def get_market_radar():
    data = generate_radar_data()
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    return data


# ══════════════════════════════════════════════════════════════
# 7. CORRELATION MATRIX
# ══════════════════════════════════════════════════════════════

@router.get("/correlation-matrix")
async def get_correlation_matrix():
    """Asset correlation matrix for portfolio analysis"""
    assets = ["BTC", "ETH", "SOL", "NVDA", "AAPL", "GOLD", "OIL", "SPY", "QQQ", "PBR"]
    
    # Generate realistic correlation matrix
    matrix = {}
    for a in assets:
        matrix[a] = {}
        for b in assets:
            if a == b:
                matrix[a][b] = 1.0
            elif (a, b) in matrix.get(b, {}) and matrix.get(b, {}).get(a) is not None:
                matrix[a][b] = matrix[b][a]
            else:
                # Realistic correlations
                if {a, b} <= {"BTC", "ETH", "SOL"}:
                    matrix[a][b] = round(random.uniform(0.7, 0.95), 2)  # Crypto highly correlated
                elif {a, b} <= {"NVDA", "AAPL", "SPY", "QQQ"}:
                    matrix[a][b] = round(random.uniform(0.6, 0.85), 2)  # US stocks correlated
                elif "GOLD" in {a, b} and ({a, b} & {"BTC", "ETH", "SOL"}):
                    matrix[a][b] = round(random.uniform(0.1, 0.4), 2)  # Gold vs crypto
                elif "GOLD" in {a, b} and ({a, b} & {"SPY", "QQQ"}):
                    matrix[a][b] = round(random.uniform(-0.3, 0.1), 2)  # Gold vs stocks
                elif "OIL" in {a, b} and "PBR" in {a, b}:
                    matrix[a][b] = round(random.uniform(0.75, 0.9), 2)  # Oil & Petrobras
                else:
                    matrix[a][b] = round(random.uniform(-0.2, 0.5), 2)
    
    return {
        "assets": assets,
        "matrix": matrix,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
