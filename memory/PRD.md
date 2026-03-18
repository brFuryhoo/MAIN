# AUREOS AI — Product Requirements Document

## Original Problem Statement
Aureos AI is the most powerful AI-driven quantitative market intelligence platform ever built. The goal is to create a platform impossible to copy — combining Paper Trading, Aureos Score, Market Scanner, JARVIS AI, and unique differentiation features into the world's most powerful quant platform.

## What's Been Implemented

### Aureos Score — Global Scoring & Ranking System (March 2026)
- **Score Engine (0-1000):** 4 weighted components — Performance (40%), Risk Management (25%), Decision Quality (20%), Consistency (15%)
- **Tier System:** Beginner (0-300), Intermediate (301-600), Advanced (601-800), Elite (801-1000)
- **Leaderboard:** Global ranking with user scores, win rates, PnL, tier badges
- **17 Achievements:** First Trade, Rising Star, Consistent Trader, Elite Quant Mind, etc.
- **JARVIS Insights:** AI-powered score analysis with improvement suggestions
- **Anti-Manipulation:** Spam trade detection and penalization
- Backend: `/app/backend/routes/aureos_score.py` | Frontend: `/app/frontend/src/pages/LeaderboardPage.jsx`

### Ultra Differentiation Features (March 2026 - NEW)
1. **JARVIS Institutional Briefing** — Full morning briefing: panorama, regime, top 3 opportunities, risks, capital flow, conviction call (GPT-5.2)
2. **"Why This Trade?" Engine** — Deep explanation for every trade: liquidity, structure, probability, quant pattern, risk factors (GPT-5.2)
3. **Decision Replay** — Complete post-trade analysis: entry/exit timing, risk grade, what went right/wrong, lessons (GPT-5.2)
4. **Market Personality/DNA** — Every asset has a "personality": 10 tracked assets with traits, behavior, volatility/manipulation/trend/reversion scores
5. **Signal Timeline** — Netflix-style timeline of all 30 JARVIS signals with outcomes, win rates, filters
6. **Signal Confidence Lock** — Monetization: high-confidence signals (>=80%) locked for free users, require PRO
7. **Capital Flow Heatmap** — 10 global sectors with flow direction, intensity, volume, leaders, dominant trend
8. **Intelligence Mode** — Minimal UI: just regime, fear/greed, and actionable decisions for serious traders
9. **Self-Improving User Model** — JARVIS learns: profile type, risk appetite, behavior, personalized recommendations
10. **Live Cross-Analysis Engine** — The "mega brain": crosses all data sources for opportunities, warnings, insights

Backend: `/app/backend/routes/ultra_features.py` (12 endpoints)
Frontend: 6 new pages — CrossAnalysisPage, DecisionReplayPage, MarketPersonalityPage, SignalTimelinePage, CapitalFlowPage, IntelligenceModePage

### Command Center Dashboard
- Personalized greeting, Fear & Greed badge, Aureos Score badge, Global Markets bar
- Market Pulse (10 live indicators), Intelligence of the Day, OSINT Risk Monitor, Events Feed
- Daily Voice Briefing (auto-generated JARVIS podcast)

### Previous Features (All Operational)
- Global Intelligence Terminal (SVG World Map)
- AI Quantica Engine (Market Radar, AI Trading Signals, Anomaly Detector, Correlation Matrix)
- Fear & Greed Index, AI Portfolio Optimizer, Weekly Digest
- Executive Report Narration (TTS, 7 languages)
- Real Market Data (CoinGecko, Twelve Data, Alpha Vantage)
- 11-step Analysis Pipeline, JARVIS Copilot, Quant Lab, Market Scanner
- Watchlist, Paper Trading ($100K), News Sentiment
- WebSockets, PDF Export, Multi-Agent AI, Google OAuth + JWT, Stripe
- SEO, API Rate Limiting, Structured Logging

## Testing Status
- Iteration 15: Backend 18/18 (100%), Frontend 100% — All Ultra features
- Iteration 14: Backend 12/12 (100%) — Aureos Score
- Iteration 13: Backend 37/37 (100%) — All previous features

## Architecture
19 sidebar navigation pages. Backend: FastAPI + MongoDB. Frontend: React + Tailwind + Shadcn.
AI: GPT-5.2 via Emergent LLM Key for briefings, trade analysis, decision replays.

## Prioritized Backlog
- P0: Fix Gold price accuracy, Expand asset coverage
- P0: "FULL POWER MAXIMO" original features (Macro Dashboard, AI Newsfeed, Social Sentiment, etc.)
- P1: Global Market Heatmap (real institutional flow data)
- P1: "Ask JARVIS Anything" advanced mode
- P2: Self-Improving User Model with ML
- P2: Founder Dashboard, Advanced Backtesting
- P3: Redis caching, Kafka streaming
- P4: Telegram/Discord bot, Public API
