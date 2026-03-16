# Aureos AI - Product Requirements Document

## Original Problem Statement
Aureos AI is an advanced AI-driven financial intelligence platform operated by JARVIS (Central Intelligence Core). The platform aims to democratize institutional-grade market analysis for everyday traders, covering EVERY asset available globally.

## Architecture
- **Frontend:** React, Tailwind CSS, Framer Motion, Shadcn UI, Lightweight Charts v5
- **Backend:** FastAPI (Python), modular services architecture
- **Database:** MongoDB
- **Auth:** JWT
- **Payments:** Stripe (3-tier subscription)
- **AI:** GPT-5.2 via Emergent LLM key (JARVIS Copilot)
- **Data Providers:**
  - **CoinGecko** — Crypto (primary, free)
  - **Twelve Data** — Stocks, Forex, Commodities, ETFs globally (primary)
  - **Polygon.io** — US Stocks historical candles (secondary)
  - **Alpha Vantage** — Stocks, Forex (fallback)
  - **Generated candles** — Fallback when real candles < 50

## Backend Module Architecture
```
/app/backend/
├── server.py                       # Main FastAPI app, auth, stripe, voice
├── routes/
│   ├── analysis.py                 # POST /api/analysis/start (11 steps), GET /api/analysis/history
│   ├── assets.py                   # GET /api/assets/search (global multi-provider)
│   ├── jarvis.py                   # POST /api/jarvis/chat, POST /api/jarvis/explain-report
│   └── watchlist.py                # GET/POST /api/watchlist/* (CRUD + scan + alerts)
└── services/
    ├── market_data.py              # Unified Market Data Adapter
    ├── technical_engine.py         # RSI, MACD, MAs, BBands, ATR, S/R
    ├── market_structure.py         # HH/HL/LH/LL, consolidation, breakout
    ├── liquidity_mapper.py         # Volume clusters, volatility zones
    ├── monte_carlo.py              # 5000 simulation Monte Carlo
    ├── risk_engine.py              # VaR, drawdown, position sizing
    ├── causality_engine.py         # Market explanation engine
    ├── probability_engine.py       # Combined BUY/SELL/HOLD signals
    ├── report_generator.py         # Executive report generation
    ├── regime_detector.py          # Market regime classification
    └── manipulation_detector.py    # Manipulation pattern detection
```

## Phases Completed

### Phase 1 - Foundation (Complete)
- JWT Authentication, Stripe subscriptions, premium dark/gold UI, MongoDB

### Phase 2 - Analysis Pipeline (Complete)
- 9-Step analysis pipeline, Global Asset Selector, Charts, Executive Report

### Phase 3 P0 - JARVIS Intelligence Layer (Complete)
- JARVIS AI Copilot (GPT-5.2), Analysis History (MongoDB), Regime Detection, Manipulation Detection
- Pipeline upgraded to 11 steps

### Phase 4 - Global Market Data (Complete)
- Twelve Data, Polygon.io, Alpha Vantage integrations
- Multi-provider parallel search, Global exchange coverage
- Smart candle fallback, In-memory cache

### Phase 5 - Watchlist Automation (Complete - March 16, 2026)
- Full CRUD: Add, remove, list watchlist assets
- JARVIS Scan: Automated analysis of all watchlist assets
- Signal change & price move alerts with severity levels
- Legacy duplicate routes cleaned from server.py
- Testing: 100% pass rate (13/13 backend, all frontend flows)

### Bug Fixes (March 16, 2026)
- Fixed Select Asset dropdown invisible: overflow:hidden clipping + transparent glass background

## Key API Endpoints
- `POST /api/auth/register` / `POST /api/auth/login` - Authentication
- `GET /api/assets/search?q=` - Global multi-provider asset search
- `POST /api/analysis/start` - 11-step analysis pipeline
- `GET /api/analysis/history` - User's analysis history
- `POST /api/jarvis/chat` - JARVIS conversational intelligence
- `POST /api/jarvis/explain-report` - Report explanation
- `GET /api/watchlist/` - Get user's watchlist with enriched data
- `POST /api/watchlist/add` - Add asset to watchlist
- `POST /api/watchlist/remove` - Remove asset from watchlist
- `POST /api/watchlist/scan` - JARVIS scan all watchlist assets
- `POST /api/watchlist/alerts/mark-read` - Mark alerts as read
- `POST /api/stripe/create-checkout-session` - Stripe checkout

## DB Collections
- **users**, **subscriptions**, **analysis_history**, **jarvis_conversations**
- **watchlist**, **watchlist_alerts**

## Prioritized Backlog

### P1 (Next)
- Autonomous Market Scanner - Background scan for high-probability opportunities
- WebSocket Real-Time Updates - Live data streaming to dashboard

### P2
- Global Market Intelligence Map - Visual capital flows, liquidity zones
- Autonomous Quant Lab - Self-improving indicator discovery
- Voice Interface - Whisper STT + TTS for JARVIS narration
- PDF Export for executive reports

### Future
- Multi-agent AI system (Technical/Quant/Macro/Sentiment/Liquidity agents)
- On-chain data (Glassnode, CryptoQuant), Macro data (FRED, World Bank)
- Historical backtesting, Paper trading, Google OAuth
- Market Intelligence Graph (cross-asset correlation)
- Kafka/Redis/TimescaleDB scaling

## Test Credentials
- Email: test@aureos.com / Password: Test1234!

## Provider API Keys (in backend/.env)
- TWELVE_DATA_KEY, POLYGON_KEY, ALPHA_VANTAGE_KEY, EMERGENT_LLM_KEY
