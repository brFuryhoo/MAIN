# AUREOS AI — Product Requirements Document

## Original Problem Statement
Build "Aureos AI" / "AI Quantica" — the most powerful institutional-grade fintech platform. A self-improving financial intelligence ecosystem with compounding advantages.

## Architecture
- **Frontend:** React + Vite + Tailwind CSS + Shadcn UI + Framer Motion + Recharts
- **Backend:** FastAPI (Python) + Pydantic
- **Database:** MongoDB
- **Auth:** JWT (custom) + Google OAuth (Emergent-managed)
- **AI:** OpenAI GPT-5.2 (via Emergent LLM Key), OpenAI TTS
- **Data Providers:** Twelve Data, Alpha Vantage, CoinGecko, Polygon.io

## Key DB Collections
- users, paper_trades, paper_portfolios, aureos_scores, aureos_tokens, token_transactions
- weekly_challenges, strategies, strategy_subscriptions, trader_dna, score_history
- shared_cards, copy_trading, daily_missions, referrals, signals_log

---

## Implemented Features (as of March 19, 2026)

### Core Platform
- Landing page, Login/Register (JWT + Google OAuth)
- Dashboard with Market Pulse, Portfolio, Fear & Greed, Aureos Score, Token Balance
- Paper Trading, Portfolio Management, Watchlist
- JARVIS Copilot, Market Scanner, Deep Analysis, Signal Timeline
- Capital Flow, Market DNA, Sentiment, Intel Terminal, Intel Mode
- AI Quantica Analysis Engine, Weekly Digest, Settings, Subscription Management

### Aureos Score System + Token Economy
- Score 0-1000, leaderboard, achievements, weekly challenges
- Internal token wallet, earning mechanisms, paper trading rewards

### UNFAIR ADVANTAGE LAYER
1. Trader DNA System
2. Strategy Marketplace + Creator Wizard
3. Global Intelligence Layer
4. Opportunity Scanner
5. Social Proof Engine
6. JARVIS Challenge Mode
7. Trade Simulator (Monte Carlo)
8. Verified Track Record

### DOMINANCE & SCALE LAYER
1. Multi-Language i18n (9 languages)
2. JARVIS Universal Narration
3. Alpha Detection System
4. Market Narrative Engine
5. Distribution Engine / Intelligence Cards
6. Trader Evolution Path

### ECOSYSTEM BATCH 1 (March 19, 2026)
1. Copy Trading Inteligente
2. Liquidity Intelligence Map
3. Aureos Second Brain
4. Daily Missions
5. AI Trade Journal
6. Correlation Matrix
7. Economic Calendar
8. Portfolio Rebalancer AI
9. Trading Quiz
10. Referral System

### DATA INFRASTRUCTURE (NEW - March 19, 2026)
1. **500+ Asset Universe** — 220 US stocks, 69 international, 99 crypto, 54 ETFs, 25 forex, 15 commodities, 18 indices
2. **Multi-Provider Data Engine** — CoinGecko, Twelve Data, Alpha Vantage, Polygon.io with failover
3. **Unified Market Schema** — Standardized symbol, price, volume, timestamp, source
4. **Data Normalization Engine** — Cross-provider consistency

### TRUST LAYER (NEW - March 19, 2026)
1. **Public Performance Dashboard** — Win rate, avg return, drawdown, risk/reward, Sharpe
2. **Verified Track Record** — All signals logged with outcomes, streak tracking
3. **Signal Transparency** — Every signal: probability, confidence, risk, reasoning, historical accuracy
4. **Signal Auto-Logging** — Decisions automatically tracked in signals_log collection
5. **Accuracy by Asset Class** — Breakdown of signal accuracy per asset type

### DECISION ENGINE (NEW - March 19, 2026)
1. **BUY/SELL/HOLD Engine** — Structured decision for any of 500+ assets
2. **"Why This Trade?"** — Multi-factor explanation: market structure, liquidity, volatility, quant signals, sentiment
3. **Technical Analysis** — RSI, MACD, Moving Averages, Momentum, Volume Analysis
4. **Risk Parameters** — Entry, Target, Stop Loss, Risk/Reward ratio per trade
5. **Top Opportunities Scanner** — Batch analysis of major assets, ranked by probability
6. **Signal Confidence Tiers** — Low/Medium/High/Very High with probability scores

---

## API Routes
- `/api/auth/*`, `/api/portfolio`, `/api/paper-trading/*`, `/api/intelligence/*`
- `/api/quantica/*`, `/api/score/*`, `/api/tokens/*`, `/api/ultra/*`
- `/api/godmode/*`, `/api/advantage/*`, `/api/dominance/*`
- `/api/distribution/*`, `/api/ecosystem/*`
- `/api/decision/*` — Decision Engine, Asset Universe, Top Opportunities
- `/api/trust/*` — Performance Dashboard, Track Record, Signal Transparency
- `/api/voice/*` — Briefing, TTS, STT, Universal narration

---

## Backlog

### P0 — Critical
- Self-Improving Signal Engine (track outcomes, reinforce winning models)
- Data Confidence Engine (cross-provider scoring per datapoint)
- Time-Series Storage (historical candles, indicators)

### P1 — High Priority
- Predictive User Engine (JARVIS proactive warnings)
- Real-Time WebSocket (live prices, signals, alerts)
- Trading Rooms / Social Trading
- Mentorship System
- Macro Regime Detector
- Volatility Dashboard
- Options Flow Detector
- On-Chain Analytics

### P2 — Medium
- Monetization: Premium Signal Tiers, API/SDK billing, Stripe fees
- Platformization (Aureos OS): API + SDK for external developers
- Defensibility System: Proprietary datasets
- Mobile PWA

### P3 — Future
- Trust: Signal Backtester, Public Audit Dashboard
- Live Broker Integration (Binance, Interactive Brokers)
- Semi-Autonomous Trading
- Aureos Token On-Chain
- Telegram/Discord bot, Public API

### Refactoring
- Break DashboardLayout.jsx into smaller components
- Organize App.js routes into config files
- Structure server.py with sub-routers

---

## Testing Status
- Iteration 17: 100% (26/26) — Unfair Advantage
- Iteration 18: 100% (23/23) — i18n + Alpha + Narrative
- Iteration 19: 100% (18/18) — Distribution + Evolution + Strategy Creator
- Iteration 20: 100% (19/19 + 9 frontend) — Ecosystem Batch 1
- Iteration 21: 100% (18/18 + full frontend) — Data Infrastructure + Trust Layer + Decision Engine
- Test credentials: test@test.com / test
