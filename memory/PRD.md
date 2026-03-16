# Aureos AI - Product Requirements Document

## Original Problem Statement
Aureos AI is an advanced AI-driven financial intelligence platform operated by JARVIS (Central Intelligence Core). The platform aims to democratize institutional-grade market analysis for everyday traders, covering EVERY asset available globally. JARVIS solves the financial problem of the planet through autonomous quantitative intelligence.

## Architecture
- **Frontend:** React, Tailwind CSS, Framer Motion, Shadcn UI, Lightweight Charts v5
- **Backend:** FastAPI (Python), modular services architecture
- **Database:** MongoDB
- **Auth:** JWT
- **Payments:** Stripe (3-tier subscription)
- **AI:** GPT-5.2 via Emergent LLM key (JARVIS Copilot)
- **Data Providers:** CoinGecko, Twelve Data, Polygon.io, Alpha Vantage + smart fallback

## Backend Module Architecture
```
/app/backend/
├── server.py
├── routes/
│   ├── analysis.py        # 11-step pipeline + history (enriched for quant)
│   ├── assets.py          # Global multi-provider search
│   ├── jarvis.py          # JARVIS AI copilot
│   ├── watchlist.py       # Watchlist CRUD + scan + alerts
│   └── quant_lab.py       # Autonomous Quant Lab (8 endpoints)
└── services/
    ├── market_data.py, technical_engine.py, market_structure.py
    ├── liquidity_mapper.py, monte_carlo.py, risk_engine.py
    ├── causality_engine.py, probability_engine.py, report_generator.py
    ├── regime_detector.py, manipulation_detector.py
    └── quant_lab.py       # Quant engine: backtest, optimizer, patterns
```

## Completed Phases

### Phase 1 - Foundation (Complete)
- JWT Auth, Stripe subscriptions, premium dark/gold UI, MongoDB

### Phase 2 - Analysis Pipeline (Complete)
- 11-step analysis engine, Global Asset Selector, Charts, Executive Report

### Phase 3 - JARVIS Intelligence Layer (Complete)
- AI Copilot (GPT-5.2), Analysis History, Regime Detection, Manipulation Detection

### Phase 4 - Global Market Data (Complete)
- Twelve Data, Polygon.io, Alpha Vantage, CoinGecko integrations

### Phase 5 - Watchlist Automation (Complete)
- Full CRUD, JARVIS Scan, Signal alerts, Frontend page

### Phase 6 - Autonomous Quant Lab / AI Quantica (Complete - March 16, 2026)
- **Backend Service** (`services/quant_lab.py`):
  - 11 indicator registry (RSI, MACD, SMA, Bollinger, Volume, Structure, Monte Carlo, Risk, Regime, Liquidity, ATR)
  - Signal extractor: normalized [-1, 1] signals from analysis data
  - Backtester: evaluates weighted signals against historical outcomes
  - Evolutionary optimizer: 300-iteration weight mutation strategy
  - Pattern discovery: pairwise indicator combination analysis
  - Performance tracker: signal distribution, regime stats, model metrics
- **API Routes** (`routes/quant_lab.py`): 8 endpoints
  - GET /api/quant/indicators, /performance, /rankings, /patterns, /experiments
  - POST /api/quant/backtest, /optimize, /reset-weights
- **Frontend** (`pages/QuantLabPage.jsx`): 5-tab dashboard
  - Overview: stat cards, signal distribution, model weights with color-coded bars
  - Rankings: indicators sorted by accuracy with category badges
  - Backtest: run simulation, view accuracy/win_rate/sharpe/trades
  - Patterns: discover high-probability indicator combinations
  - Log: experiment history + IP-protected decision logs
- **Integration**: Analysis pipeline enriched with quant fields for history
- **Testing**: 100% pass rate (35/35 backend, all frontend flows)
- **DB Collections**: quant_experiments, quant_decision_logs, quant_weights

## Key API Endpoints
- Auth: POST /api/auth/register, /api/auth/login
- Assets: GET /api/assets/search?q=
- Analysis: POST /api/analysis/start, GET /api/analysis/history
- JARVIS: POST /api/jarvis/chat, /api/jarvis/explain-report
- Watchlist: GET/POST /api/watchlist/*, /api/watchlist/scan, /alerts/mark-read
- Quant Lab: GET /api/quant/indicators, /performance, /rankings, /patterns, /experiments
- Quant Lab: POST /api/quant/backtest, /optimize, /reset-weights
- Stripe: POST /api/stripe/create-checkout-session

## DB Collections
users, subscriptions, analysis_history, jarvis_conversations,
watchlist, watchlist_alerts, quant_experiments, quant_decision_logs, quant_weights

## Prioritized Backlog

### P1 (Next)
- Autonomous Market Scanner - Background service scanning for opportunities
- WebSocket Real-Time Updates - Live data push to dashboard

### P2
- Global Market Intelligence Map - Visual capital flows, liquidity zones
- Voice Interface (Whisper STT + TTS) for JARVIS
- PDF Export for executive reports

### Future
- Multi-agent AI system (Technical/Quant/Macro/Sentiment agents)
- On-chain data (Glassnode), Macro data (FRED, World Bank)
- Historical backtesting with real price validation
- Paper trading, Google OAuth
- Kafka/Redis/TimescaleDB scaling

## Test Credentials
- Email: test@aureos.com / Password: Test1234!
