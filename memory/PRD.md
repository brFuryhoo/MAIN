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
- shared_cards (NEW)

---

## Implemented Features (as of March 18, 2026)

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
1. Trader DNA System — Behavioral Intelligence Engine
2. Strategy Marketplace — Browse/subscribe strategies
3. Global Intelligence Layer — Crowd positioning, Smart Money
4. Opportunity Scanner — Real-time breakout/reversal detection
5. Social Proof Engine — Public profiles, top traders
6. JARVIS Challenge Mode — Devil's advocate AI (GPT-5.2)
7. Trade Simulator — Monte Carlo simulation
8. Verified Track Record — Public performance dashboard

### DOMINANCE & SCALE LAYER
1. **Multi-Language i18n** — 9 languages (PT, EN, ES, FR, DE, ZH, JA, KO, AR)
2. **JARVIS Universal Narration** — Any text to speech in any language
3. **Alpha Detection System** — GPT-5.2 Top 5 opportunity finder
4. **Market Narrative Engine** — Bloomberg-level market storytelling
5. **Distribution Engine / Intelligence Cards** (NEW) — Shareable Score Card + Performance Card with Twitter, WhatsApp, Copy. Stored in DB for public retrieval.
6. **Strategy Creator Wizard** (NEW) — 4-step wizard: Name > Config > Rules > Publish. Creates strategies on the Marketplace.
7. **Trader Evolution Path** (NEW) — 8-level gamified journey: Novice > Apprentice > Trader > Strategist > Operator > Quantitative > Elite > Legendary. Each level unlocks new features.

---

## API Routes
- `/api/auth/*`, `/api/portfolio`, `/api/paper-trading/*`, `/api/intelligence/*`
- `/api/quantica/*`, `/api/score/*`, `/api/tokens/*`, `/api/ultra/*`
- `/api/godmode/*`, `/api/advantage/*`, `/api/dominance/*`
- `/api/distribution/*` (NEW) — Card generation + Evolution path
- `/api/voice/*` — Briefing, TTS, STT, Universal narration

---

## Backlog

### P0 — Critical
- Data Accuracy: Verify prices for ALL assets
- Expand Asset Coverage to 500+ tradable assets

### P1 — High Priority
- Copy Trading Inteligente — AI-filtered, JARVIS adapts
- Liquidity Intelligence Map — Global capital flow visualization
- Aureos "Second Brain" — Complete decision history + evolution
- Self-Improving Signal Engine, WebSocket real-time updates

### P2 — Medium
- New data providers (Polygon.io, Finnhub)
- Collapsible sidebar (icon-only mode)

### P3 — Future
- Aureos OS (API/SDK), AI Hedge Fund Mode
- Revenue Multiplier (strategy subs, copy fees, premium signals, API billing)
- Trust Max++, Live Broker Integration, Semi-Autonomous Trading
- Aureos Token On-Chain, Telegram/Discord bot, Public API

---

## Testing Status
- Iteration 17: 100% (26/26) — Unfair Advantage backend
- Iteration 18: 100% (23/23) — i18n + Alpha + Narrative
- Iteration 19: 100% (18/18) — Distribution + Evolution + Strategy Creator
- Test credentials: test@test.com / test
