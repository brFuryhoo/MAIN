# Aureos AI - Product Requirements Document

## Original Problem Statement
Aureos AI is an advanced AI-driven financial intelligence platform operated by JARVIS (Central Intelligence Core). The platform democratizes institutional-grade market analysis for every asset globally through autonomous quantitative intelligence.

## Architecture
- **Frontend:** React, Tailwind CSS, Framer Motion, Shadcn UI, Lightweight Charts v5
- **Backend:** FastAPI (Python), modular services architecture
- **Database:** MongoDB
- **Auth:** JWT | **Payments:** Stripe (3-tier)
- **AI:** GPT-5.2 via Emergent LLM key (JARVIS Copilot)
- **Data:** CoinGecko, Twelve Data, Polygon.io, Alpha Vantage + smart fallback
- **Real-Time:** WebSocket (FastAPI native)

## Backend Architecture
```
/app/backend/
├── server.py              # FastAPI app, auth, stripe, voice, WebSocket
├── routes/
│   ├── analysis.py        # 11-step pipeline + history (quant-enriched)
│   ├── assets.py          # Global multi-provider search
│   ├── jarvis.py          # JARVIS AI copilot
│   ├── watchlist.py       # Watchlist CRUD + scan + quant alerts
│   ├── quant_lab.py       # Autonomous Quant Lab (8 endpoints)
│   └── scanner.py         # Market Scanner (4 endpoints)
└── services/
    ├── market_data.py, technical_engine.py, market_structure.py
    ├── liquidity_mapper.py, monte_carlo.py, risk_engine.py
    ├── causality_engine.py, probability_engine.py, report_generator.py
    ├── regime_detector.py, manipulation_detector.py
    ├── quant_lab.py        # Backtest, optimizer, pattern discovery
    └── market_scanner.py   # Opportunity classifier, scan universe
```

## Completed Phases

### Phase 1 - Foundation (Complete)
- JWT Auth, Stripe subscriptions, premium dark/gold UI, MongoDB

### Phase 2 - Analysis Pipeline (Complete)
- 11-step analysis engine, Global Asset Selector, Charts, Executive Report

### Phase 3 - JARVIS Intelligence Layer (Complete)
- AI Copilot (GPT-5.2), Analysis History, Regime/Manipulation Detection

### Phase 4 - Global Market Data (Complete)
- Twelve Data, Polygon.io, Alpha Vantage, CoinGecko integrations

### Phase 5 - Watchlist Automation (Complete)
- Full CRUD, JARVIS Scan, Signal/Quant alerts

### Phase 6 - Autonomous Quant Lab (Complete - March 16, 2026)
- 11 indicators, backtester, evolutionary optimizer, pattern discovery
- 8 API endpoints, 5-tab dashboard, IP-protected decision logs

### Phase 7 - Market Scanner + WebSocket + Quant-Watchlist (Complete - March 16, 2026)
- **Autonomous Market Scanner:**
  - 17 assets across 4 categories (Crypto, US Stocks, Forex, Commodities)
  - Opportunity classifier: breakouts, reversals, momentum, oversold/overbought, regime shifts
  - Category filtering, scan history, priority scoring
  - Frontend: Radar dashboard, category filters, animated scan, opportunities table, asset grid
- **WebSocket Real-Time:**
  - ConnectionManager with channel-based pub/sub
  - /ws/{channel} endpoint, ping/pong, subscribe actions
  - Status endpoint at /api/ws/status
- **Quant Lab + Watchlist Enhancement:**
  - Watchlist scan enriched with rsi, risk_score, win_probability
  - Quant alignment alerts: triggered when 7+/11 indicators align
  - Alert type: quant_alignment with severity and details
- **Testing:** 100% pass rate (17/17 backend, all frontend flows)

## Key API Endpoints
- Auth: POST /api/auth/register, /login
- Assets: GET /api/assets/search?q=
- Analysis: POST /api/analysis/start, GET /api/analysis/history
- JARVIS: POST /api/jarvis/chat, /explain-report
- Watchlist: GET/POST /api/watchlist/*, /scan, /alerts/mark-read
- Quant: GET/POST /api/quant/indicators, /performance, /rankings, /backtest, /optimize, /patterns, /experiments, /reset-weights
- Scanner: GET /api/scanner/universe, POST /api/scanner/scan, GET /api/scanner/opportunities, /history
- WebSocket: WS /ws/{channel}, GET /api/ws/status
- Stripe: POST /api/stripe/create-checkout-session

## DB Collections
users, subscriptions, analysis_history, jarvis_conversations,
watchlist, watchlist_alerts, quant_experiments, quant_decision_logs,
quant_weights, scanner_history

## Prioritized Backlog

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
