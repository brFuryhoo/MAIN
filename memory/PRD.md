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
- Portfolio Management, Watchlist
- JARVIS Copilot (AI chat assistant)
- Market Scanner, Deep Analysis, Signal Timeline
- Capital Flow, Market DNA, Sentiment Analysis
- Intel Terminal, Intel Mode, AI Quantica Analysis Engine
- Weekly Digest, Settings, Subscription Management

### Aureos Score System
- Score calculation (0-1000), global leaderboard, tier system, achievements, weekly challenge

### Aureos Token Economy ($AT)
- Internal token wallet, transaction history, earning mechanisms, paper trading rewards

### UNFAIR ADVANTAGE LAYER (March 18, 2026)
1. **Trader DNA System** — Behavioral Intelligence Engine (risk, emotions, preferences)
2. **Strategy Marketplace** — Browse/subscribe strategies with performance metrics
3. **Global Intelligence Layer** — Crowd positioning, Smart Money vs Crowd signals
4. **Opportunity Scanner** — Real-time breakout/reversal/momentum detection
5. **Social Proof Engine** — Public profiles, top traders leaderboard
6. **JARVIS Challenge Mode** — Devil's advocate AI using GPT-5.2
7. **Trade Simulator** — Monte Carlo simulation, edge score
8. **Verified Track Record** — Public performance dashboard

### DOMINANCE & SCALE LAYER (March 18, 2026 - NEW)
1. **Multi-Language i18n** — 9 languages (PT, EN, ES, FR, DE, ZH, JA, KO, AR). Language selector in header. Sidebar, buttons, labels all translated. Default: Portuguese.
2. **JARVIS Universal Narration** — POST /api/voice/narrate. Any text, any language. Translates via GPT-5.2 + converts to speech via OpenAI TTS. Reusable JarvisNarrate component.
3. **Alpha Detection System** — "Where is the edge right now?" GPT-5.2 analyzes all markets to find Top 5 opportunities with alpha score, win probability, entry/stop/target levels.
4. **Market Narrative Engine** — JARVIS generates Bloomberg-level market narrative: regime detection, capital flows, smart money positioning, risk landscape, outlook. In any language.

### Bug Fix
- Dashboard loading fix: voice briefing moved from auto-trigger to user-triggered

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
- `/api/advantage/*` — UNFAIR ADVANTAGE
- `/api/dominance/*` — Alpha detection, Market narrative
- `/api/voice/*` — Voice briefing, TTS, STT, Universal narration

---

## Backlog / Upcoming Tasks

### P0 — Critical
- Data Accuracy: Verify prices for ALL assets
- Expand Asset Coverage to 500+ tradable assets

### P1 — High Priority (DOMINANCE LAYER continued)
- **Strategy Creator Wizard** — Users create and publish strategies in Marketplace
- **Distribution Engine** — Shareable Intelligence Cards (trades, score, insights)
- **Trader Evolution Path** — Gamified journey: Beginner -> Intermediate -> Advanced -> Elite with unlocks
- Self-Improving Signal Engine
- WebSocket for real-time updates

### P2 — Medium Priority
- **Copy Trading Inteligente** — AI-filtered, JARVIS adapts to user profile
- **Liquidity Intelligence Map** — Global capital flow visualization
- **Aureos "Second Brain"** — Complete decision history + evolution tracking
- New data providers (Polygon.io, Finnhub, Financial Modeling Prep)
- Collapsible sidebar (icon-only mode)

### P3 — Future
- Aureos OS (API/SDK for third parties)
- AI Hedge Fund Mode
- Revenue Multiplier System (strategy subs, copy fees, premium signals, API billing)
- Trust Max++ (audited performance, verified signals, transparent failures)
- Live Broker Integration (Binance, Interactive Brokers)
- Semi-Autonomous Trading
- Aureos Token On-Chain
- Telegram/Discord bot, Public API

---

## Testing Status
- Iteration 17: 100% (26/26 backend, all frontend)
- Iteration 18: 100% (23/23 backend, all frontend)
- Test credentials: test@test.com / test
