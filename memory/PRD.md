# Aureos AI - Product Requirements Document

## Original Problem Statement
Aureos AI is the global financial intelligence platform created by Aureos Corporation, founded by Fabricio Teodoroves. JARVIS democratizes institutional-grade market analysis for every asset globally.

## Architecture
- **Frontend:** React, Tailwind CSS, Framer Motion, Shadcn UI, Lightweight Charts v5
- **Backend:** FastAPI (Python), modular services
- **Database:** MongoDB | **Auth:** JWT + Google OAuth (Emergent) | **Payments:** Stripe
- **AI:** GPT-5.2 via Emergent LLM key (JARVIS + 4 Specialized Agents)
- **Data:** CoinGecko, Twelve Data, Polygon.io, Alpha Vantage, Fear&Greed API
- **Real-Time:** WebSocket | **Voice:** Web Speech API | **PDF:** fpdf2

## Backend Architecture
```
/app/backend/
├── server.py              # Auth (JWT + Google OAuth), Stripe, Voice, WebSocket
├── routes/
│   ├── analysis.py        # 11-step pipeline
│   ├── assets.py          # Global search
│   ├── jarvis.py          # JARVIS copilot
│   ├── watchlist.py       # Watchlist + quant alerts
│   ├── quant_lab.py       # Quant Lab (8 endpoints)
│   ├── scanner.py         # Market Scanner
│   ├── intelligence_map.py # Global Intelligence Map
│   ├── pdf_export.py      # PDF reports
│   ├── multi_agent.py     # 4 Agents + JARVIS synthesis
│   ├── news_sentiment.py  # Fear/Greed, trending, global market
│   └── paper_trading.py   # Virtual portfolio simulation
└── services/
    ├── market_data.py, technical_engine.py, market_structure.py
    ├── liquidity_mapper.py, monte_carlo.py, risk_engine.py
    ├── causality_engine.py, probability_engine.py, report_generator.py
    ├── regime_detector.py, manipulation_detector.py
    ├── quant_lab.py, market_scanner.py
```

## Completed Phases (All 100% Tested)

### Phase 1-4: Foundation → Global Data
### Phase 5: Watchlist Automation
### Phase 6: Autonomous Quant Lab
### Phase 7: Scanner + WebSocket + Quant-Watchlist
### Phase 8: Intelligence Map + Voice + PDF Export

### Phase 9: Multi-Agent + Sentiment + Paper Trading + Google OAuth (March 16, 2026)
- **Multi-Agent AI System:** 4 specialized agents (Technical, Quant, Macro, Sentiment) + JARVIS synthesis via GPT-5.2
- **News Sentiment:** Fear & Greed Index (7-day history), CoinGecko trending, global crypto market data, market mood interpretation
- **Paper Trading:** Virtual $100K portfolio, BUY/SELL execution, P&L tracking, close trades, reset, trade history, win rate
- **Google OAuth:** Emergent-managed Google social login with "Continue with Google" button, session exchange
- **Testing:** 100% pass rate (18/18 backend, all frontend flows)

## All API Endpoints
- Auth: /api/auth/register, /login, /me, /google-session
- Assets: /api/assets/search
- Analysis: /api/analysis/start, /history
- JARVIS: /api/jarvis/chat, /explain-report
- Watchlist: /api/watchlist/*, /scan, /alerts/mark-read
- Quant: /api/quant/* (8 endpoints)
- Scanner: /api/scanner/universe, /scan, /opportunities, /history
- Intelligence: /api/intelligence/map
- Export: /api/export/pdf
- Multi-Agent: /api/agents/analyze, /history
- News: /api/news/sentiment
- Paper: /api/paper/portfolio, /trade, /close, /reset
- Voice: /api/voice/text-to-speech, /speech-to-text
- WebSocket: /ws/{channel}, /api/ws/status
- Stripe: /api/stripe/*

## DB Collections
users, subscriptions, analysis_history, jarvis_conversations,
watchlist, watchlist_alerts, quant_experiments, quant_decision_logs,
quant_weights, scanner_history, agent_analyses, paper_portfolios, paper_trades

## Official Documents
- /app/Aureos_Vision_Statement.md
- /app/Aureos_Corporate_Manifesto.md
- /app/Aureos_NDA_Template.md

## Remaining Backlog
- Kafka/Redis/TimescaleDB scaling (infrastructure)
- On-chain data (Glassnode - requires API key)
- Macro data (FRED - requires API key)
- Advanced backtesting with real historical price validation
- News scraping from financial news sources
