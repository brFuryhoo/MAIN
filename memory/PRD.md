# Aureos AI - Product Requirements Document

## Original Problem Statement
Aureos AI is an advanced AI-driven financial intelligence platform operated by JARVIS (Central Intelligence Core). The platform aims to democratize institutional-grade market analysis for everyday traders.

## Architecture
- **Frontend:** React, Tailwind CSS, Framer Motion, Shadcn UI, Lightweight Charts v5
- **Backend:** FastAPI (Python), modular services architecture
- **Database:** MongoDB
- **Auth:** JWT
- **Payments:** Stripe (3-tier subscription)
- **AI:** GPT-5.2 via Emergent LLM key (JARVIS Copilot)
- **Data:** CoinGecko (crypto, live), Mock layer (stocks, forex, commodities, indices)

## Backend Module Architecture
```
/app/backend/
├── server.py                       # Main FastAPI app, auth, stripe
├── routes/
│   ├── analysis.py                 # POST /api/analysis/start (11 steps), GET /api/analysis/history
│   ├── assets.py                   # GET /api/assets/search
│   └── jarvis.py                   # POST /api/jarvis/chat, POST /api/jarvis/explain-report
└── services/
    ├── market_data.py              # Market Data Adapter (CoinGecko + Mock)
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

## What's Been Implemented

### Phase 1 - Foundation (Complete)
- JWT Authentication (Login/Register)
- Stripe 3-tier subscription integration
- Premium dashboard with Aureos dark/gold theme
- MongoDB integration

### Phase 2 - Analysis Pipeline (Complete - March 16, 2026)
- 9-Step analysis pipeline (Market Data, Technical, Structure, Liquidity, Monte Carlo, Risk, Causality, Probability, Executive Report)
- Global Asset Selector (CoinGecko live + mock data)
- Lightweight Charts v5 (candlestick + volume + support/resistance)
- Executive Report Modal
- Testing: 100% pass rate (14/14)

### Phase 3 P0 - JARVIS Intelligence Layer (Complete - March 16, 2026)
- **JARVIS AI Copilot** - GPT-5.2 via Emergent LLM key, context-aware chat, report explanation
- **Analysis History** - All analyses saved to MongoDB `analysis_history` collection
- **Market Regime Detection** - Bull/bear/sideways classification, volatility regimes (calm/normal/elevated/extreme), market phases (accumulation/markup/distribution/etc.), regime stability scoring
- **Manipulation Detection** - Liquidity sweeps, stop-loss hunts, volume anomalies, false breakouts/volatility traps, manipulation risk scoring (0-100)
- **Enhanced Pipeline** - Now 11 steps (original 9 + regime + manipulation)
- **Enhanced Executive Report** - Includes Market Regime and Manipulation Detection sections
- **JARVIS Conversations** - Stored in MongoDB `jarvis_conversations` collection
- Testing: 100% pass rate (15/15 backend, all frontend flows)

## Key API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - JWT login
- `GET /api/assets/search?q=` - Global asset search
- `POST /api/analysis/start` - 11-step analysis pipeline
- `GET /api/analysis/history` - User's analysis history
- `POST /api/jarvis/chat` - JARVIS conversational intelligence
- `POST /api/jarvis/explain-report` - Report explanation
- `GET /api/jarvis/history` - Conversation history
- `POST /api/stripe/create-checkout-session` - Stripe checkout

## DB Collections
- **users**: `{email, hashed_password, full_name, created_at}`
- **subscriptions**: `{user_id, stripe_customer_id, plan, status}`
- **analysis_history**: `{analysis_id, user_id, symbol, name, asset_type, timeframe, price, signal, regime, manipulation_score, timestamp}`
- **jarvis_conversations**: `{session_id, user_id, role, content, timestamp}`

## Prioritized Backlog

### P1 (Next)
- **Watchlist Automation** - Users save assets, JARVIS monitors for signal changes, push notifications
- **Autonomous Market Scanner** - Background scan for breakouts, reversals, momentum across all assets
- **WebSocket Real-Time Updates** - Live data feed to dashboard

### P2
- **Global Market Intelligence Map** - Visual capital flows, liquidity zones, correlation shifts
- **Autonomous Quant Lab** - Self-improving indicator discovery
- **Voice Interface** - Whisper STT + TTS for JARVIS narration
- **PDF Export** for executive reports

### Future
- Multi-agent system (Technical/Quant/Macro/Sentiment/Liquidity agents)
- On-chain data (Glassnode, CryptoQuant)
- Macro data (FRED, World Bank)
- Alpha Vantage / NewsAPI integration
- Historical backtesting
- Paper trading mode
- Google OAuth
- Market Intelligence Graph (cross-asset correlation mapping)

## Test Credentials
- Email: demo@aureos.com
- Password: Demo1234!

## Notes
- Stocks/forex/commodities/indices use MOCK data (designed for easy plug-in of real providers)
- Only crypto uses real CoinGecko API
- JARVIS uses real GPT-5.2 via Emergent LLM key
