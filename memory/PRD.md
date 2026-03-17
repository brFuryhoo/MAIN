# AUREOS AI — Product Requirements Document

## Original Problem Statement
Aureos AI is a sophisticated fintech platform powered by an AI core named "JARVIS". The goal is to build an institutional-grade market analysis tool with a premium UI/UX — inspired by Cyber MoneyLab but **MORE POWERFUL and UNIQUE** as "AI Quantica".

## Core User Persona
**Fabricio Teodoroves** — An investor who wants a 24/7 intelligent system that crosses news, speculations, geopolitical events, and market data across ALL asset classes (crypto, stocks, forex, commodities) globally, with all values in **USD**.

## What's Been Implemented

### Phase 1 — Dashboard Command Center (COMPLETE)
- Personalized greeting with date/time
- Portfolio overview with USD values and donut chart allocation
- Market Pulse: 10 real-time indicators (S&P 500, NASDAQ, IBOVESPA, BTC/USD, ETH/USD, USD/BRL, GOLD, OIL, EUR/USD, DXY)
- Intelligence of the Day: AI-generated daily briefing via GPT-5.2
- OSINT Geopolitical Risk Monitor: 8 global regions with risk scores
- Live Events Feed: Categorized events (geopolitics, macro, crypto, terrorism, etc.)
- Performance Highlights: Top performing assets table
- JARVIS Sentiment Banner: Dynamic market sentiment classification

### Phase 2 — Global Intelligence Terminal (COMPLETE)
- Professional SVG World Map with detailed continent outlines, animated risk hotspots, connection lines between high-risk regions, hover interactions, risk legend, and "AUREOS AI QUANTICA" watermark
- Region detail panel with events, risk score, and impacted assets
- Intelligence Feed with category filter buttons (8 categories)
- AI-powered Scenario Analysis: "What if..." questions answered by GPT-5.2

### Phase 3 — Premium Portfolio (COMPLETE)
- Portfolio Health Score ring (0-100) with SVG animation
- Enhanced positions table with USD values
- Allocation pie chart
- Quick Stats: Win rate, best performer, risk score, positions count
- Market Performance Highlights: Top 10 performers

### Executive Report Narration (COMPLETE)
- JARVIS narrates executive reports in 7 languages (English, Portuguese, Spanish, French, German, Chinese, Japanese)
- Language selector dropdown in the Executive Report Modal
- GPT-5.2 generates a natural narration script in the target language
- OpenAI TTS (onyx voice) converts to audio for in-browser playback
- Audio player with play/pause controls embedded in the modal

### Previously Completed Features
- Full 11-step analysis pipeline
- JARVIS AI Copilot (GPT-5.2) with voice (TTS/STT)
- Autonomous Quant Lab (AI Quantica) with backtester
- Market Scanner, Watchlist Automation
- Paper Trading ($100K virtual)
- News Sentiment Analysis
- WebSocket Real-Time Updates
- PDF Report Export
- Multi-Agent AI System
- Google OAuth + JWT Authentication
- Premium UI/UX Design System

## Backend API Endpoints
- `GET /api/intelligence/market-pulse` — 10 market indicators
- `GET /api/intelligence/geopolitical-risk` — 8 regions with risk scores
- `GET /api/intelligence/events-feed` — Categorized global events
- `GET /api/intelligence/performance-highlights` — Top performing assets
- `GET /api/intelligence/daily-briefing` — AI daily briefing (GPT-5.2)
- `POST /api/intelligence/scenario-analysis` — AI scenario analysis (GPT-5.2)
- `POST /api/voice/narrate-report` — AI narrated report in 7 languages (GPT-5.2 + TTS)

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Shadcn UI, Recharts, Lightweight Charts
- **Backend:** FastAPI (Python), Pydantic, WebSockets, ReportLab
- **Database:** MongoDB
- **AI:** OpenAI GPT-5.2 (via emergentintegrations), OpenAI TTS
- **Auth:** JWT + Google OAuth

## Testing Status
- Iteration 10: 100% pass rate (Intelligence Engine)
- Iteration 11: 100% pass rate (Narrated Reports + Refined World Map)

## Prioritized Backlog

### P0 — Launch Prep
- [ ] SEO & Meta Tags (Open Graph, Twitter Cards)
- [ ] API Rate Limiting
- [ ] Error Monitoring / Structured Logging

### P1 — Data Integration
- [ ] Real-time data feeds from multiple providers
- [ ] On-chain data (Glassnode)
- [ ] Macroeconomic data (FRED)

### P2 — Product Enhancements
- [ ] Founder Dashboard (user metrics)
- [ ] Advanced Backtesting (Sharpe ratio, drawdown)
- [ ] Email alerts

### P3 — Infrastructure
- [ ] Redis caching
- [ ] Kafka event streaming
- [ ] TimescaleDB for time-series

### P4 — Business Differentiation
- [ ] Telegram/Discord bot for JARVIS alerts
- [ ] Public API as revenue stream
