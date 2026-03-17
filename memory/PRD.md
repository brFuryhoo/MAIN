# AUREOS AI — Product Requirements Document

## Original Problem Statement
Aureos AI is the most powerful AI-driven quantitative market intelligence platform ever built. Inspired by Cyber MoneyLab but UNIQUE as "AI Quantica". All values in USD. Global market coverage across ALL asset classes.

## What's Been Implemented

### Command Center Dashboard
- Personalized greeting, Fear & Greed Index badge, Global Markets Overview bar ($110T equity, crypto, gold, FX)
- Portfolio overview (USD), REAL Market Pulse (10 live indicators from CoinGecko + Twelve Data)
- Intelligence of the Day (GPT-5.2), OSINT Geopolitical Risk Monitor, Live Events Feed
- Daily Voice Briefing (auto-generated 60sec podcast by JARVIS)

### Global Intelligence Terminal
- Professional SVG World Map with 8 animated risk hotspots and continent outlines
- Region detail panel, Intelligence Feed with 8 category filters
- AI Scenario Analysis ("What if..." powered by GPT-5.2)

### AI Quantica Engine (4-Tab Page)
- **Market Radar:** Biggest gainers/losers, unusual volume, social trending
- **AI Trading Signals:** 15 assets with signal/confidence/entry/stop/target/R:R
- **Anomaly Detector:** 8 anomaly types (whale activity, volume spikes, options unusual, correlation breaks)
- **Correlation Matrix:** 10x10 asset correlation heatmap

### Fear & Greed Index
- Composite score (0-100) from 7 components (market momentum, volatility, safe haven, junk bonds, crypto, options, geopolitical)
- 30-day history, color-coded labels (EXTREME FEAR → EXTREME GREED)

### AI Portfolio Optimizer
- JARVIS analyzes portfolio + geopolitical risks + market conditions
- Generates specific rebalancing recommendations
- Before/after optimization score

### Weekly Intelligence Digest
- Comprehensive weekly market report by GPT-5.2
- Podcast version (TTS narration)
- Top performers, Fear & Greed context

### Executive Report Narration
- JARVIS narrates reports in 7 languages (EN, PT, ES, FR, DE, ZH, JA)

### Real Market Data
- CoinGecko: 20 cryptocurrencies with live prices
- Twelve Data: Stocks, ETFs, Forex, Commodities (AAPL, NVDA, SPY, QQQ, XAU/USD, EUR/USD, USD/BRL)
- Global Overview: $110T equities, crypto MCap, gold, FX daily volume, BTC dominance

### Infrastructure (P0)
- SEO & Meta Tags, API Rate Limiting (slowapi), Structured Logging

### Previous Features
- 11-step analysis pipeline, JARVIS Copilot (GPT-5.2 + voice TTS/STT)
- Quant Lab, Market Scanner, Watchlist, Paper Trading ($100K), News Sentiment
- WebSockets, PDF Export, Multi-Agent AI, Google OAuth + JWT, Stripe

## Testing Status
- Iteration 13: 100% (37/37 backend, all frontend flows)

## Prioritized Backlog
- P1: Expand real data feeds (more stocks, more assets)
- P1: On-chain data (Glassnode), Macroeconomic (FRED)
- P2: Founder Dashboard, Advanced Backtesting, Email alerts
- P3: Redis caching, Kafka streaming
- P4: Telegram/Discord bot, Public API
