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
- shared_cards, copy_trading, daily_missions, referrals

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
5. **Distribution Engine / Intelligence Cards** — Shareable Score + Performance Cards
6. **Strategy Creator Wizard** — 4-step wizard to create strategies
7. **Trader Evolution Path** — 8-level gamified journey

### ECOSYSTEM BATCH 1 (NEW - March 19, 2026)
1. **Copy Trading Inteligente** — AI-filtered eligible traders, copy button, active copies tracking
2. **Liquidity Intelligence Map** — Capital flows, sector flows, liquidity zones, market regime
3. **Aureos Second Brain** — Complete trading memory, pattern detection, insights, monthly evolution
4. **Daily Missions** — 5 daily missions with token rewards, auto-generated per user/day
5. **AI Trade Journal** — Auto-analyzed trades with grades (A-F) and AI insights
6. **Correlation Matrix** — 8x8 real-time asset correlation (BTC, ETH, SPY, GOLD, NVDA, TSLA, OIL, DXY)
7. **Economic Calendar** — Events with AI impact analysis by JARVIS
8. **Portfolio Rebalancer AI** — Suggestions based on trader DNA and market conditions
9. **Trading Quiz** — Knowledge test with token rewards per correct answer
10. **Referral System** — Unique codes, sharing (Twitter/WhatsApp), token rewards

All ecosystem pages have full i18n support (PT, EN, ES with fallback to EN for other languages).

---

## API Routes
- `/api/auth/*`, `/api/portfolio`, `/api/paper-trading/*`, `/api/intelligence/*`
- `/api/quantica/*`, `/api/score/*`, `/api/tokens/*`, `/api/ultra/*`
- `/api/godmode/*`, `/api/advantage/*`, `/api/dominance/*`
- `/api/distribution/*` — Card generation + Evolution path
- `/api/ecosystem/*` — Copy Trading, Liquidity Map, Second Brain, Missions, Journal, Correlation, Calendar, Rebalancer, Quiz, Referral
- `/api/voice/*` — Briefing, TTS, STT, Universal narration

---

## Backlog

### P0 — Critical
- Data Accuracy: Verify prices for ALL assets
- Expand Asset Coverage to 500+ tradable assets

### P1 — High Priority (Ecosystem Batch 2)
- Trading Rooms / Social Trading
- Mentorship System
- Macro Regime Detector
- Volatility Dashboard
- Options Flow Detector
- On-Chain Analytics
- Achievement Badges expansion
- Seasonal Events

### P2 — Medium
- Monetization: Premium Signal Tiers, API/SDK billing, Stripe fees
- Infrastructure: WebSocket real-time, Mobile PWA
- New data providers (Polygon.io, Finnhub)
- Collapsible sidebar (icon-only mode)

### P3 — Future
- Trust: Public Audit Dashboard, Signal Backtester
- Endgame: Live Broker Integration (Binance, Interactive Brokers)
- Semi-Autonomous Trading
- Aureos Token On-Chain
- Telegram/Discord bot, Public API

### Refactoring
- Break DashboardLayout.jsx into smaller components
- Organize App.js routes into separate config files
- Structure server.py with sub-routers

---

## Testing Status
- Iteration 17: 100% (26/26) — Unfair Advantage backend
- Iteration 18: 100% (23/23) — i18n + Alpha + Narrative
- Iteration 19: 100% (18/18) — Distribution + Evolution + Strategy Creator
- Iteration 20: 100% (19/19 backend + all 9 frontend pages) — Ecosystem Batch 1
- Test credentials: test@test.com / test
