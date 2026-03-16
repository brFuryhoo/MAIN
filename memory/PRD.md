# Aureos AI - Product Requirements Document

## Original Problem Statement
Aureos AI is the global financial intelligence platform created by Aureos Corporation, founded by Fabricio Teodoroves. JARVIS (Central Intelligence Core) democratizes institutional-grade market analysis for every asset globally.

## Architecture
- **Frontend:** React, Tailwind CSS, Framer Motion, Shadcn UI, Lightweight Charts v5
- **Backend:** FastAPI (Python), modular services architecture
- **Database:** MongoDB | **Auth:** JWT | **Payments:** Stripe
- **AI:** GPT-5.2 via Emergent LLM key (JARVIS Copilot)
- **Data:** CoinGecko, Twelve Data, Polygon.io, Alpha Vantage + smart fallback
- **Real-Time:** WebSocket | **Voice:** Web Speech API (STT/TTS) | **PDF:** fpdf2

## Backend Architecture
```
/app/backend/
├── server.py              # FastAPI app, auth, stripe, voice TTS/STT, WebSocket
├── routes/
│   ├── analysis.py        # 11-step pipeline + history
│   ├── assets.py          # Global multi-provider search
│   ├── jarvis.py          # JARVIS AI copilot
│   ├── watchlist.py       # Watchlist CRUD + scan + quant alerts
│   ├── quant_lab.py       # Autonomous Quant Lab (8 endpoints)
│   ├── scanner.py         # Market Scanner (4 endpoints)
│   ├── intelligence_map.py # Global Intelligence Map
│   └── pdf_export.py      # PDF executive report generator
└── services/
    ├── market_data.py, technical_engine.py, market_structure.py
    ├── liquidity_mapper.py, monte_carlo.py, risk_engine.py
    ├── causality_engine.py, probability_engine.py, report_generator.py
    ├── regime_detector.py, manipulation_detector.py
    ├── quant_lab.py        # Backtest, optimizer, pattern discovery
    └── market_scanner.py   # Opportunity classifier
```

## Completed Phases

### Phase 1-4: Foundation → Global Data (Complete)
### Phase 5: Watchlist Automation (Complete)
### Phase 6: Autonomous Quant Lab (Complete - March 16)
### Phase 7: Scanner + WebSocket + Quant-Watchlist (Complete - March 16)

### Phase 8: Intelligence Map + Voice + PDF (Complete - March 16, 2026)
- **Global Market Intelligence Map:**
  - 11 assets across 5 sectors (crypto, tech, auto, forex, commodity)
  - Cross-asset Pearson correlations with strength classification
  - Capital flow detection (inflow/outflow/neutral by sector)
  - Heat map with momentum scores, regime labels, RSI
  - Frontend: Heat map grid, capital flow cards, correlation bars
- **Enhanced Voice Interface:**
  - Mic button (Web Speech Recognition API) for voice input in JARVIS
  - Speaker button (Web Speech Synthesis) for TTS on all JARVIS messages
  - Visual feedback: pulsing mic when listening, "Listening..." placeholder
  - Backend TTS/STT endpoints already available at /api/voice/*
- **PDF Executive Report Export:**
  - Professional multi-page PDF with Aureos branding
  - Cover page, Signal Summary, Technical Analysis, Monte Carlo, Risk, Regime, Manipulation
  - Download button in Executive Report modal
  - Disclaimer footer
- **Testing:** 100% pass rate (10/10 backend, all frontend flows)

## Key API Endpoints
- Auth: POST /api/auth/register, /login
- Assets: GET /api/assets/search?q=
- Analysis: POST /api/analysis/start, GET /api/analysis/history
- JARVIS: POST /api/jarvis/chat, /explain-report
- Watchlist: GET/POST /api/watchlist/*, /scan, /alerts/mark-read
- Quant: GET/POST /api/quant/* (indicators, performance, rankings, backtest, optimize, patterns, experiments, reset-weights)
- Scanner: GET /api/scanner/universe, POST /api/scanner/scan, GET /api/scanner/opportunities, /history
- Intelligence: GET /api/intelligence/map
- Export: POST /api/export/pdf
- Voice: POST /api/voice/text-to-speech, /speech-to-text, /copilot-voice
- WebSocket: WS /ws/{channel}, GET /api/ws/status

## DB Collections
users, subscriptions, analysis_history, jarvis_conversations,
watchlist, watchlist_alerts, quant_experiments, quant_decision_logs,
quant_weights, scanner_history

## Prioritized Backlog

### Future
- Multi-agent AI system (Technical/Quant/Macro/Sentiment agents)
- On-chain data (Glassnode), Macro data (FRED, World Bank)
- Historical backtesting with real price validation
- Paper trading, Google OAuth
- Kafka/Redis/TimescaleDB scaling
- News sentiment analysis

## Test Credentials
- Email: test@aureos.com / Password: Test1234!

## Official Documents
- /app/Aureos_Vision_Statement.md
- /app/Aureos_NDA_Template.md
- /app/Aureos_Corporate_Manifesto.md
