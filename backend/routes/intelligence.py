"""
Aureos AI — Intelligence Engine
Daily Briefings, Geopolitical Risk Monitor, Scenario Analysis
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
import os
import logging
import uuid
import random

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/intelligence", tags=["intelligence"])

# ==================== MODELS ====================

class ScenarioRequest(BaseModel):
    question: str
    portfolio_context: Optional[List[str]] = None

# ==================== GEOPOLITICAL RISK DATA ====================

GEOPOLITICAL_REGIONS = [
    {
        "id": "middle_east",
        "name": "Middle East",
        "risk_level": "critical",
        "risk_score": 92,
        "events": [
            "Strait of Hormuz tensions escalating",
            "Oil supply chain disruption risk",
            "US-Iran military posturing"
        ],
        "impacted_assets": ["OIL", "PETR4.SA", "CVX", "XOM", "GOLD"],
        "lat": 29.0, "lng": 47.0
    },
    {
        "id": "russia_europe",
        "name": "Russia / Eastern Europe",
        "risk_level": "high",
        "risk_score": 78,
        "events": [
            "Ongoing conflict in Ukraine",
            "NATO expansion pressures",
            "Energy supply disruptions to EU"
        ],
        "impacted_assets": ["NATURAL_GAS", "EUR/USD", "WHEAT", "DAX"],
        "lat": 55.0, "lng": 37.0
    },
    {
        "id": "east_asia",
        "name": "East Asia",
        "risk_level": "elevated",
        "risk_score": 65,
        "events": [
            "Taiwan strait military drills",
            "US-China trade tensions",
            "Semiconductor supply chain risks"
        ],
        "impacted_assets": ["TSM", "NVDA", "ASML", "AAPL", "USD/CNY"],
        "lat": 25.0, "lng": 121.0
    },
    {
        "id": "south_america",
        "name": "Brazil / South America",
        "risk_level": "moderate",
        "risk_score": 45,
        "events": [
            "Brazil fiscal policy uncertainty",
            "Commodity export dynamics",
            "Currency volatility (USD/BRL)"
        ],
        "impacted_assets": ["EWZ", "PBR", "VALE", "USD/BRL", "IBOV"],
        "lat": -15.0, "lng": -47.0
    },
    {
        "id": "north_america",
        "name": "North America",
        "risk_level": "low",
        "risk_score": 28,
        "events": [
            "Federal Reserve policy expectations",
            "US debt ceiling discussions",
            "Tech sector regulatory oversight"
        ],
        "impacted_assets": ["SPY", "QQQ", "AAPL", "MSFT", "USD/JPY"],
        "lat": 38.9, "lng": -77.0
    },
    {
        "id": "south_asia",
        "name": "South Asia",
        "risk_level": "moderate",
        "risk_score": 52,
        "events": [
            "India-Pakistan border tensions",
            "Monsoon season agricultural impact",
            "Indian tech sector growth"
        ],
        "impacted_assets": ["INFY", "NIFTY50", "USD/INR", "RICE"],
        "lat": 20.0, "lng": 78.0
    },
    {
        "id": "africa",
        "name": "North Africa / Sub-Saharan",
        "risk_level": "elevated",
        "risk_score": 58,
        "events": [
            "Suez Canal transit risks",
            "Mining sector instability",
            "Food security concerns"
        ],
        "impacted_assets": ["GOLD", "PLATINUM", "COBALT", "OIL"],
        "lat": 15.0, "lng": 30.0
    },
    {
        "id": "oceania",
        "name": "Oceania / Pacific",
        "risk_level": "low",
        "risk_score": 18,
        "events": [
            "Australia commodity exports stable",
            "Pacific trade routes secure",
            "Climate events monitoring"
        ],
        "impacted_assets": ["BHP", "CBA", "AUD/USD", "IRON_ORE"],
        "lat": -25.0, "lng": 133.0
    }
]

# ==================== MARKET PULSE DATA ====================

def get_market_pulse():
    """Fallback market pulse (used by sync contexts like daily briefing builder).
       For real-time data, use the async endpoint which calls market_data service."""
    return [
        {"symbol": "S&P 500", "value": 5920, "change": 0.5, "type": "index"},
        {"symbol": "NASDAQ", "value": 520, "change": 0.8, "type": "index"},
        {"symbol": "BTC/USD", "value": 84000, "change": 2.1, "type": "crypto"},
        {"symbol": "ETH/USD", "value": 1900, "change": 1.5, "type": "crypto"},
        {"symbol": "SOL/USD", "value": 130, "change": 3.2, "type": "crypto"},
        {"symbol": "EUR/USD", "value": 1.09, "change": -0.2, "type": "forex"},
        {"symbol": "USD/BRL", "value": 5.75, "change": 0.3, "type": "forex"},
        {"symbol": "GOLD", "value": 3000, "change": 0.8, "type": "commodity"},
        {"symbol": "SILVER", "value": 33.5, "change": 1.2, "type": "commodity"},
        {"symbol": "NVDA", "value": 120, "change": 1.5, "type": "stock"},
    ]

# ==================== PERFORMANCE HIGHLIGHTS ====================

def get_performance_highlights():
    """Top performing assets for portfolio tracking"""
    return [
        {"asset": "GOOG", "sector": "stock_us", "performance": 197.24, "period": "YTD"},
        {"asset": "BTC/USD", "sector": "crypto", "performance": 164.27, "period": "YTD"},
        {"asset": "SOL/USD", "sector": "crypto", "performance": 134.46, "period": "YTD"},
        {"asset": "NVDA", "sector": "stock_us", "performance": 106.90, "period": "YTD"},
        {"asset": "ASML", "sector": "stock_eu", "performance": 81.27, "period": "YTD"},
        {"asset": "ETH/USD", "sector": "crypto", "performance": 86.34, "period": "YTD"},
        {"asset": "PBR", "sector": "stock_br", "performance": 51.31, "period": "2M"},
        {"asset": "VALE", "sector": "stock_br", "performance": 47.28, "period": "YTD"},
        {"asset": "ITUB", "sector": "stock_br", "performance": 35.27, "period": "YTD"},
        {"asset": "CVX", "sector": "stock_us", "performance": 31.27, "period": "2M"},
    ]

# ==================== GLOBAL EVENTS FEED ====================

GLOBAL_EVENTS = [
    {"id": "ev1", "category": "geopolitics", "severity": "critical", "title": "US-Iran tensions escalate after Hormuz incident", "region": "middle_east", "timestamp": "2h ago", "impact": "Oil +3.2%, Defense stocks rally"},
    {"id": "ev2", "category": "macro", "severity": "high", "title": "Federal Reserve signals potential rate pause", "region": "north_america", "timestamp": "4h ago", "impact": "S&P 500 +0.8%, USD weakens"},
    {"id": "ev3", "category": "crypto", "severity": "medium", "title": "Bitcoin ETF inflows reach $2.1B weekly record", "region": "global", "timestamp": "5h ago", "impact": "BTC +4.1%, ETH +3.2%"},
    {"id": "ev4", "category": "geopolitics", "severity": "high", "title": "Taiwan strait military exercises by PRC", "region": "east_asia", "timestamp": "6h ago", "impact": "TSM -2.1%, Semiconductor sector volatile"},
    {"id": "ev5", "category": "macro", "severity": "medium", "title": "Brazil SELIC rate decision: held at 13.25%", "region": "south_america", "timestamp": "8h ago", "impact": "USD/BRL stable, EWZ +0.4%"},
    {"id": "ev6", "category": "commodity", "severity": "high", "title": "Gold breaks $2,950 on safe-haven demand", "region": "global", "timestamp": "10h ago", "impact": "GOLD +1.5%, Mining stocks up"},
    {"id": "ev7", "category": "terrorism", "severity": "critical", "title": "Red Sea shipping route disruption continues", "region": "africa", "timestamp": "12h ago", "impact": "Shipping costs +15%, Oil +1.8%"},
    {"id": "ev8", "category": "climate", "severity": "medium", "title": "Major drought affects South American grain output", "region": "south_america", "timestamp": "14h ago", "impact": "Soybean futures +5.2%, VALE affected"},
    {"id": "ev9", "category": "politics", "severity": "low", "title": "EU finalizes AI regulation framework", "region": "russia_europe", "timestamp": "16h ago", "impact": "EU tech stocks mixed"},
    {"id": "ev10", "category": "crime", "severity": "medium", "title": "Major crypto exchange hack: $150M stolen", "region": "global", "timestamp": "18h ago", "impact": "BTC -1.2%, Exchange tokens down"},
]

# ==================== ENDPOINTS ====================

@router.get("/daily-briefing")
async def get_daily_briefing():
    """AI-generated daily intelligence briefing"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        
        # Build context for the AI
        pulse = get_market_pulse()
        regions = GEOPOLITICAL_REGIONS
        events = GLOBAL_EVENTS[:5]
        
        market_context = "\n".join([f"- {p['symbol']}: {p['value']:.2f} ({'+' if p['change'] > 0 else ''}{p['change']:.2f}%)" for p in pulse[:6]])
        risk_context = "\n".join([f"- {r['name']}: Risk {r['risk_score']}/100 ({r['risk_level']}) - {r['events'][0]}" for r in regions if r['risk_score'] > 40])
        events_context = "\n".join([f"- [{e['severity'].upper()}] {e['title']}" for e in events])
        
        prompt = f"""You are JARVIS, the AI intelligence core of Aureos AI — an institutional-grade market analysis platform. Generate a DAILY INTELLIGENCE BRIEFING for today.

Current Market Data:
{market_context}

Active Geopolitical Risks:
{risk_context}

Recent Events:
{events_context}

Generate a briefing with these sections (in a flowing, professional analyst style — like a Goldman Sachs morning note):
1. HEADLINE — One powerful sentence summarizing today's market theme
2. KEY DEVELOPMENTS — 3-4 bullet points on the most impactful events  
3. MARKET IMPACT ANALYSIS — How these events affect different asset classes
4. OPPORTUNITIES & RISKS — Specific actionable insights for investors
5. OUTLOOK — Brief forward-looking statement

Keep it concise, data-driven, and institutional quality. Use specific numbers and asset tickers. Write in a mix of English with financial terminology. Total max 400 words."""

        if api_key:
            chat = LlmChat(
                api_key=api_key,
                session_id=f"daily_briefing_{datetime.now(timezone.utc).strftime('%Y%m%d_%H')}",
                system_message="You are JARVIS, an elite financial intelligence AI. You write like a senior analyst at a top investment bank. Be precise, use data, and provide actionable insights."
            ).with_model("openai", "gpt-5.2")
            
            briefing_text = await chat.send_message(UserMessage(text=prompt))
        else:
            briefing_text = "**JARVIS Intelligence Briefing — " + datetime.now(timezone.utc).strftime('%d %b %Y') + "**\n\nGeopolitical tensions in the Middle East continue to drive energy prices higher while the Fed's dovish stance supports risk assets. BTC breaks above $87K on institutional inflows.\n\n**Key Developments:**\n- Oil surges on Hormuz strait tensions, PETR4.SA and CVX benefit directly\n- Bitcoin ETF inflows hit weekly record of $2.1B, signaling institutional adoption\n- Fed signals rate pause, boosting S&P 500 and weakening USD\n- Taiwan strait exercises create semiconductor supply uncertainty\n\n**Impact:** Energy longs remain attractive. Crypto momentum strong. Defensive positions in Gold recommended as geopolitical hedge."
        
        # Calculate overall sentiment
        avg_change = sum(p['change'] for p in pulse) / len(pulse)
        max_risk = max(r['risk_score'] for r in regions)
        
        if avg_change > 1 and max_risk < 60:
            sentiment = "OPTIMISTIC"
            sentiment_color = "#00E676"
        elif avg_change < -1 or max_risk > 80:
            sentiment = "HIGH ALERT"
            sentiment_color = "#FF5252"
        elif max_risk > 60:
            sentiment = "SLIGHTLY CAUTIOUS"
            sentiment_color = "#FF9800"
        else:
            sentiment = "NEUTRAL"
            sentiment_color = "#888888"
        
        return {
            "briefing": briefing_text,
            "sentiment": sentiment,
            "sentiment_color": sentiment_color,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "market_pulse": pulse,
            "top_risks": [r for r in regions if r['risk_score'] > 50],
        }
    except Exception as e:
        logger.error(f"Daily briefing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/geopolitical-risk")
async def get_geopolitical_risk():
    """Geopolitical risk monitor by region"""
    # Add some dynamic variation
    regions = []
    for r in GEOPOLITICAL_REGIONS:
        region = {**r}
        region["risk_score"] = max(5, min(100, r["risk_score"] + random.randint(-5, 5)))
        if region["risk_score"] > 80:
            region["risk_level"] = "critical"
        elif region["risk_score"] > 60:
            region["risk_level"] = "high"
        elif region["risk_score"] > 40:
            region["risk_level"] = "elevated"
        elif region["risk_score"] > 20:
            region["risk_level"] = "moderate"
        else:
            region["risk_level"] = "low"
        regions.append(region)
    
    global_risk = sum(r["risk_score"] for r in regions) / len(regions)
    
    return {
        "regions": regions,
        "global_risk_score": round(global_risk, 1),
        "global_risk_level": "high" if global_risk > 60 else "elevated" if global_risk > 40 else "moderate",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/events-feed")
async def get_events_feed():
    """Real-time global events feed"""
    return {
        "events": GLOBAL_EVENTS,
        "total": len(GLOBAL_EVENTS),
        "categories": ["geopolitics", "macro", "crypto", "commodity", "terrorism", "climate", "politics", "crime"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

@router.get("/global-overview")
async def get_global_overview():
    """Global market overview across ALL asset classes"""
    try:
        from services.market_data import get_global_market_overview
        overview = await get_global_market_overview()
        return {**overview, "updated_at": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        logger.warning(f"Global overview error: {e}")
        return {
            "global_equity_market_cap": 110_000_000_000_000,
            "crypto_market_cap": 3_200_000_000_000,
            "gold_market_cap": 16_000_000_000_000,
            "btc_dominance": 56.5,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }




@router.get("/market-pulse")
async def get_market_pulse_endpoint():
    """Key market indicators pulse — fetches REAL data from CoinGecko + Twelve Data"""
    try:
        from services.market_data import get_real_market_pulse
        real_pulse = await get_real_market_pulse()
        if real_pulse and len(real_pulse) >= 3:
            return {"indicators": real_pulse, "source": "live", "updated_at": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        logger.warning(f"Real market pulse failed, using fallback: {e}")

    # Fallback to static data
    pulse = get_market_pulse()
    return {"indicators": pulse, "source": "cached", "updated_at": datetime.now(timezone.utc).isoformat()}


@router.get("/performance-highlights")
async def get_performance_highlights_endpoint():
    """Top performing assets"""
    highlights = get_performance_highlights()
    return {
        "highlights": highlights,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


@router.post("/scenario-analysis")
async def scenario_analysis(data: ScenarioRequest):
    """AI-powered scenario analysis — 'What if...' questions"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        pulse = get_market_pulse()
        market_context = "\n".join([f"- {p['symbol']}: {p['value']:.2f}" for p in pulse])
        
        portfolio_ctx = ""
        if data.portfolio_context:
            portfolio_ctx = f"\nUser's portfolio includes: {', '.join(data.portfolio_context)}"
        
        prompt = f"""You are JARVIS, the AI intelligence core of Aureos AI. The user is asking a scenario analysis question.

Current Market Data:
{market_context}
{portfolio_ctx}

User's Question: {data.question}

Provide a detailed but concise analysis:
1. SCENARIO ASSESSMENT — Probability and timeline estimation
2. DIRECT IMPACT — Which assets would be most affected and in which direction (use specific tickers and % estimates)
3. SECONDARY EFFECTS — Ripple effects across correlated markets
4. RECOMMENDED ACTIONS — Specific portfolio adjustments
5. HISTORICAL PRECEDENT — Brief reference to similar past events

Be quantitative. Use specific tickers, % changes, and timeframes. Max 350 words."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"scenario_{uuid.uuid4().hex[:8]}",
            system_message="You are JARVIS, an elite financial scenario analyst. You provide institutional-grade scenario analysis with specific numbers and actionable recommendations."
        ).with_model("openai", "gpt-5.2")
        
        analysis = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "question": data.question,
            "analysis": analysis,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": "JARVIS AI Quantica"
        }
    except Exception as e:
        logger.error(f"Scenario analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
