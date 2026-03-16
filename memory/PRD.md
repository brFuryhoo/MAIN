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
├── server.py                       # Main FastAPI app, auth, stripe
├── routes/
│   ├── analysis.py                 # POST /api/analysis/start (11 steps), GET /api/analysis/history
│   ├── assets.py                   # GET /api/assets/search (global multi-provider)
│   └── jarvis.py                   # POST /api/jarvis/chat, POST /api/jarvis/explain-report
└── services/
    ├── market_data.py              # Unified Market Data Adapter (CoinGecko + Twelve Data + Polygon + Alpha Vantage + Mock)
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

### Phase 2 - Analysis Pipeline (Complete - March 16, 2026)
- 9-Step analysis pipeline, Global Asset Selector, Charts, Executive Report

### Phase 3 P0 - JARVIS Intelligence Layer (Complete - March 16, 2026)
- JARVIS AI Copilot (GPT-5.2), Analysis History (MongoDB), Regime Detection, Manipulation Detection
- Pipeline upgraded to 11 steps

### Phase 4 - Global Market Data (Complete - March 16, 2026)
- **Twelve Data integration** — Real prices for stocks (AAPL $250, TSLA $391, etc.), forex (EUR/USD), commodities from ALL global exchanges
- **Polygon.io integration** — US stock historical candle data
- **Alpha Vantage integration** — Fallback provider
- **Multi-provider parallel search** — Search returns results from Twelve Data + CoinGecko + Polygon simultaneously
- **Global exchange coverage** — NYSE, NASDAQ, JPX (Japan), KRX (Korea), LSE (London), ASX (Australia), SET (Thailand), XETRA, and more
- **Smart candle fallback** — Generates supplementary candle data when real candles < 50 for quality analysis
- **In-memory cache** — Search (5min), Price (2min), Candles (10min) to manage rate limits
- Testing: 100% pass rate (12/12 backend, all frontend flows)

## Key API Endpoints
- `POST /api/auth/register` / `POST /api/auth/login` - Authentication
- `GET /api/assets/search?q=` - Global multi-provider asset search
- `POST /api/analysis/start` - 11-step analysis pipeline
- `GET /api/analysis/history` - User's analysis history
- `POST /api/jarvis/chat` - JARVIS conversational intelligence
- `POST /api/jarvis/explain-report` - Report explanation
- `POST /api/stripe/create-checkout-session` - Stripe checkout

## DB Collections
- **users**, **subscriptions**, **analysis_history**, **jarvis_conversations**

## Prioritized Backlog

### P1 (Next)
- Watchlist Automation - Save assets, auto-monitor for signal changes, notifications
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
- Email: demo@aureos.com / Password: Demo1234!

## Provider API Keys (in backend/.env)
- TWELVE_DATA_KEY, POLYGON_KEY, ALPHA_VANTAGE_KEY, EMERGENT_LLM_KEY
