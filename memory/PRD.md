# Aureos AI - Product Requirements Document

## Original Problem Statement
Aureos AI is an advanced AI-driven financial intelligence platform. The project includes:
- **UI/UX:** Premium, futuristic, minimalistic design (Deep Black, Aureos Gold, Cyber Blue, Soft Grey)
- **Global Free-Asset Selector:** Universal search for any asset type (stock, crypto, commodity, forex, index)
- **9-Step Analysis Pipeline:** Institutional-grade analysis workflow with animated progress
- **Analysis Engines:** Technical Analysis, Market Structure, Liquidity Mapping, Monte Carlo, Risk, Causality, Probability
- **Executive Report Modal:** Detailed premium-styled report with all analysis results
- **Voice + Chat Copilot:** Floating window with voice commands (Whisper), narration (OpenAI TTS)
- **Dashboard:** Premium redesigned pages (Home, Analysis, Signals, Portfolio, Settings)

## Architecture
- **Frontend:** React, Tailwind CSS, Framer Motion, Shadcn UI, Lightweight Charts v5
- **Backend:** FastAPI (Python), modular services architecture
- **Database:** MongoDB
- **Auth:** JWT
- **Payments:** Stripe (3-tier subscription)
- **AI:** OpenAI GPT-5.2, Whisper (STT), TTS-1 (planned/partial)
- **Data:** CoinGecko (crypto, live), Mock layer (stocks, forex, commodities, indices)

## Backend Module Architecture
```
/app/backend/
├── server.py                  # Main FastAPI app, auth, stripe, copilot
├── routes/
│   ├── analysis.py            # POST /api/analysis/start
│   └── assets.py              # GET /api/assets/search
└── services/
    ├── market_data.py          # Market Data Adapter (CoinGecko + Mock)
    ├── technical_engine.py     # RSI, MACD, MAs, BBands, ATR, Support/Resistance
    ├── market_structure.py     # HH/HL/LH/LL, consolidation, breakout detection
    ├── liquidity_mapper.py     # Volume clusters, volatility zones, liquidity pools
    ├── monte_carlo.py          # 5000 simulation Monte Carlo
    ├── risk_engine.py          # VaR, drawdown, position sizing, risk scoring
    ├── causality_engine.py     # Market explanation engine
    ├── probability_engine.py   # Combined signal probabilities (BUY/SELL/HOLD)
    └── report_generator.py     # Executive report generation
```

## What's Been Implemented

### Phase 1 - Foundation (Complete)
- JWT Authentication (Login/Register)
- Stripe 3-tier subscription integration
- Basic dashboard and landing page with premium Aureos theme
- MongoDB integration

### Phase 2 - Full Analysis Pipeline (Complete - March 16, 2026)
- **9-Step Analysis Pipeline Backend:**
  1. Market Data Aggregation (CoinGecko + mock)
  2. Technical Analysis Engine (RSI, MACD, MAs, BBands, ATR, S/R)
  3. Market Structure Detection (swing points, HH/HL/LH/LL, breakouts)
  4. Liquidity Mapping (volume clusters, volatility zones, liquidity pools)
  5. Quantitative Scenario Modeling (5000 Monte Carlo simulations)
  6. Risk Modeling Engine (VaR, drawdown, position sizing, Kelly criterion)
  7. Market Causality Engine (explains WHY price moves)
  8. Probability Engine (combined BUY/SELL/HOLD signal with confidence)
  9. Executive Market Report Generator
- **Frontend Integration:**
  - GlobalAssetSelector connected to /api/assets/search (CoinGecko live search)
  - AnalysisPipeline with animated 9-step progress visualization
  - ProbabilityEngine with scenario probability bars
  - ExecutiveReportModal with 8 sections (Signal, Action Plan, Technical, Structure, Monte Carlo, Risk, Causality, Signals/Risks)
  - Lightweight Charts v5 integration (candlestick + volume + support/resistance lines)
- **Testing:** 100% pass rate (14/14 backend, all frontend flows)

## Key API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - JWT login
- `GET /api/assets/search?q=` - Global asset search
- `POST /api/analysis/start` - 9-step analysis pipeline
- `POST /api/stripe/create-checkout-session` - Stripe checkout
- `POST /api/copilot` - AI copilot chat
- `POST /api/voice/stt` - Speech to text
- `POST /api/voice/tts` - Text to speech

## DB Schema
- **users**: `{email, hashed_password, full_name, created_at}`
- **subscriptions**: `{user_id, stripe_customer_id, plan, status}`

## Prioritized Backlog

### P0 (Next)
- Save analysis results to MongoDB (analysis_history collection)
- Wire AI Copilot (GPT-5.2) to explain analysis results and answer trading questions

### P1
- Integrate real data providers (Alpha Vantage for stocks, NewsAPI for sentiment)
- WebSocket layer for real-time data updates
- Voice copilot with Whisper STT + TTS narration of reports
- Signals page with live tracking of analyzed assets

### P2
- PDF export for executive reports
- Portfolio page with analysis history
- Historical backtesting
- Paper trading mode with virtual currency
- Google OAuth

### Future (Multi-Agent AI Evolution)
- Technical Analyst Agent
- Quantitative Modeling Agent
- Macro Intelligence Agent
- Sentiment Analysis Agent
- Liquidity Detection Agent
- Market Intelligence Graph (cross-asset correlation mapping)

## Test Credentials
- Email: demo@aureos.com
- Password: Demo1234!

## Notes
- Stocks, forex, commodities, indices use MOCK data (designed for easy plug-in of real providers)
- Only crypto uses real CoinGecko API data
- Lightweight Charts v5 requires CandlestickSeries/HistogramSeries class imports
