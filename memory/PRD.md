# AUREOS AI — Product Requirements Document

## Original Problem Statement
Aureos AI is the most powerful AI-driven quantitative market intelligence platform ever built. The goal is to create a platform impossible to copy — combining Paper Trading, Aureos Score, Market Scanner, JARVIS AI, token economy, and unique differentiation features.

## What's Been Implemented

### Aureos Token Economy (March 2026 - LATEST)
- **Internal Token (AT):** Earn tokens via trading, daily logins, achievements, weekly challenges
- **16 Earning Rules:** trade_close (+5), trade_win (+10), trade_big_win (+25), daily_login (+3), score milestones (+100-750), achievements (+15), challenge wins (+200-500), login streaks (+25-100)
- **Token Store:** 8 purchasable items across 4 categories — Signals unlock (50 AT), JARVIS insights (75 AT), Trade analysis (30 AT), PRO access (200-1000 AT), Cosmetics (300-500 AT)
- **Paper Trading Integration:** Auto-grants tokens on trade close
- **Daily Login with Streak Bonuses:** 7-day (+25 AT), 30-day (+100 AT)
- Backend: `/app/backend/routes/aureos_tokens.py` | Frontend: `/app/frontend/src/pages/AureosTokensPage.jsx`

### Weekly Score Challenge (March 2026 - LATEST)
- Compete weekly for highest Aureos Score delta
- Prizes: 1st = 500 AT + "Weekly Champion" badge, 2nd = 300 AT, 3rd = 200 AT
- Tracks score_delta from registration point

### Price Accuracy Fix (March 2026 - LATEST)
- **Validation Layer:** `PRICE_REFERENCE` dict with expected ranges for all major assets
- **Normalization:** Auto-corrects abnormal Twelve Data prices (e.g., Gold 10oz batch price → per troy ounce)
- **TD_NORMALIZATION:** Specific fixes for Twelve Data unit issues (XAU/USD, XAG/USD)
- Applied to: market pulse, stock data, forex data functions

### Aureos Score — Global Scoring & Ranking System
- Score Engine 0-1000, 4 components (Performance 40%, Risk 25%, Decision 20%, Consistency 15%)
- Tier System (Beginner/Intermediate/Advanced/Elite), 17 Achievements, Leaderboard, JARVIS Insights

### Ultra Differentiation Features (10 Features)
1. JARVIS Institutional Briefing (GPT-5.2)
2. "Why This Trade?" Engine (GPT-5.2)
3. Decision Replay (GPT-5.2)
4. Market Personality/DNA (10 assets)
5. Signal Timeline (30 signals with outcomes)
6. Signal Confidence Lock (monetization)
7. Capital Flow Heatmap (10 sectors)
8. Intelligence Mode (minimal UI)
9. Self-Improving User Model
10. Live Cross-Analysis Engine

### Previous Features (All Operational)
- Command Center Dashboard, Global Intelligence Terminal, AI Quantica Engine
- Fear & Greed Index, AI Portfolio Optimizer, Weekly Digest, Report Narration
- Real Market Data (CoinGecko, Twelve Data, Alpha Vantage)
- 11-step Analysis, JARVIS Copilot, Quant Lab, Market Scanner
- Watchlist, Paper Trading, News Sentiment, WebSockets, PDF Export
- Multi-Agent AI, Google OAuth + JWT, Stripe, SEO, Rate Limiting

## Testing Status
- Iteration 16: 20/20 (100%) — Tokens, Weekly Challenge, Price Validation
- Iteration 15: 18/18 (100%) — Ultra features
- Iteration 14: 12/12 (100%) — Aureos Score

## Architecture
21 sidebar navigation pages. Backend: FastAPI + MongoDB. Frontend: React + Tailwind + Shadcn.
Collections: token_wallets, token_transactions, weekly_challenge, score_history, score_snapshots, paper_trades, paper_portfolios

## Prioritized Backlog
- P0: Expand asset coverage (dynamic search)
- P1: "FULL POWER MAXIMO" features (Macro Dashboard, AI Newsfeed, Social Sentiment, Regulatory Tracker, Supply Chain Intelligence)
- P1: Global Market Heatmap with real institutional flow data
- P1: Ask JARVIS Anything (advanced copilot mode)
- P2: Token → on-chain migration (future wallet withdrawal)
- P2: Founder Dashboard, Advanced Backtesting
- P3: Redis, Kafka, TimescaleDB
- P4: Telegram/Discord bot, Public API
