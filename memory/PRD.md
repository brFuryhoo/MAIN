# AUREOS AI — Product Requirements Document

## Original Problem Statement
Build "Aureos AI" / "AI Quantica" — the most powerful institutional-grade fintech platform ever made. A self-improving financial intelligence ecosystem with compounding advantages.

## Core Vision
A financial intelligence network with compounding advantage — starts simple, gets better by itself, gets stronger with more users.

---

## Architecture
- **Frontend:** React + Vite + Tailwind CSS + Shadcn UI + Framer Motion + Recharts
- **Backend:** FastAPI (Python) + Pydantic
- **Database:** MongoDB
- **Auth:** JWT (custom) + Google OAuth (Emergent-managed)
- **AI:** OpenAI GPT-5.2 (via Emergent LLM Key), OpenAI TTS
- **Data Providers:** Twelve Data, Alpha Vantage, CoinGecko

## Key DB Collections
- users, paper_trades, paper_portfolios, aureos_scores, aureos_tokens, token_transactions
- weekly_challenges, strategies, strategy_subscriptions, trader_dna, score_history

---

## Implemented Features (as of March 18, 2026)

### Core Platform
- Landing page, Login/Register (JWT + Google OAuth)
- Dashboard with Market Pulse, Portfolio, Fear & Greed, Aureos Score, Token Balance
- Paper Trading with full CRUD
- Portfolio Management
- Watchlist
- JARVIS Copilot (AI chat assistant)
- Market Scanner, Deep Analysis, Signal Timeline
- Capital Flow, Market DNA, Sentiment Analysis
- Intel Terminal, Intel Mode
- AI Quantica Analysis Engine
- Weekly Digest
- Settings, Subscription Management

### Aureos Score System
- Score calculation (0-1000) based on performance, risk, consistency
- Global leaderboard, tier system, achievements
- Weekly challenge competitions

### Aureos Token Economy ($AT)
- Internal token wallet with balance tracking
- Transaction history, earning mechanisms
- Integration with paper trading (rewards on profitable trades)

### UNFAIR ADVANTAGE LAYER (NEW - March 18, 2026)
1. **Trader DNA System** — Behavioral Intelligence Engine analyzing risk tolerance, entry timing, emotional patterns, asset preferences, volatility reaction. Generates personalized profile types (Sniper, Maverick, Operator, etc.)
2. **Strategy Marketplace** — Users browse/subscribe to trading strategies with performance metrics (win rate, return, Sharpe). Filters by asset class and sort options.
3. **Global Intelligence Layer** — Network effect system showing crowd positioning, Smart Money vs Crowd signals, sentiment shifts. Aggregates anonymous user behavior.
4. **Opportunity Scanner** — Real-time scanner detecting breakouts, reversals, momentum, liquidity zones, divergences. Auto-refreshes every 30 seconds.
5. **Social Proof Engine** — Public trader profiles with verified performance, top traders leaderboard with tier badges.
6. **JARVIS Challenge Mode** — Devil's advocate AI that challenges trading decisions. Uses GPT-5.2 to stress-test user reasoning before trade entry.
7. **Trade Simulator** — Monte Carlo simulation (1,000 runs) showing best/worst/expected outcomes, edge score, risk metrics.
8. **Verified Track Record** — Public performance dashboard with signal win rate, strategy breakdown, monthly returns.

### Bug Fix
- Dashboard was stuck on "Initializing JARVIS Intelligence Core..." due to voice briefing endpoint (GPT-5.2 + TTS) blocking the async event loop for ~15s. Fixed by making voice briefing user-triggered only (via "Daily Intelligence" button).

---

## API Routes
- `/api/auth/*` — Authentication
- `/api/portfolio`, `/api/paper-trading/*` — Trading
- `/api/intelligence/*` — Market intelligence
- `/api/quantica/*` — AI analysis
- `/api/score/*` — Aureos Score
- `/api/tokens/*` — Token economy
- `/api/ultra/*` — Ultra features
- `/api/godmode/*` — Trust layer, simulation, edge score
- `/api/advantage/*` — UNFAIR ADVANTAGE (trader-dna, strategies, global-intelligence, opportunity-scanner, top-traders, jarvis-challenge)
- `/api/voice/*` — Voice briefing, TTS, STT

---

## Backlog / Upcoming Tasks

### P0 — Critical
- Data Accuracy: Verify prices for ALL assets across providers (Twelve Data, Alpha Vantage, CoinGecko). Normalization layer exists but needs comprehensive testing.
- Expand Asset Coverage to 500+ tradable assets

### P1 — High Priority
- Self-Improving Signal Engine: Track signal outcomes, automatically adjust model weightings
- Predictive User Engine: JARVIS detects potential user mistakes proactively
- Strategy Marketplace enhancements: Create/publish strategies, rating system, monetization
- WebSocket for real-time price updates without page refreshes

### P2 — Medium Priority
- New data providers: Polygon.io, Finnhub, Financial Modeling Prep
- Collapsible sidebar (icon-only mode)
- Decision Replay enhancements
- JARVIS Evolution: Continuous learning from user interactions

### P3 — Future
- Live Broker Integration (Binance, Interactive Brokers)
- Semi-Autonomous Trading (one-click trade execution)
- Aureos Token On-Chain migration
- Telegram/Discord bot
- Public API

---

## Testing Status
- Backend: 100% pass rate (26/26 tests - Iteration 17)
- Frontend: 100% pass rate (all 8 Unfair Advantage pages functional)
- Test credentials: test@test.com / test
