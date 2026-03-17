# AUREOS AI — Product Requirements Document

## Original Problem Statement
Aureos AI is a sophisticated fintech platform powered by an AI core named "JARVIS". The goal is to build an institutional-grade market analysis tool with a premium UI/UX — inspired by Cyber MoneyLab but **MORE POWERFUL and UNIQUE** as "AI Quantica". All values in USD.

## What's Been Implemented

### Dashboard Command Center
- Personalized greeting, Portfolio overview (USD), Market Pulse (10 indicators)
- Intelligence of the Day (GPT-5.2), OSINT Geopolitical Risk Monitor (8 regions)
- Live Events Feed, Performance Highlights, JARVIS Sentiment Banner

### Global Intelligence Terminal
- Professional SVG World Map with detailed continent outlines, animated risk hotspots
- Region detail panel, Intelligence Feed with 8 category filters
- AI-powered Scenario Analysis ("What if...")

### Premium Portfolio
- Health Score ring (0-100), Positions table, Allocation pie chart
- Quick Stats, Market Performance Highlights

### Executive Report Narration
- JARVIS narrates reports in 7 languages via GPT-5.2 + OpenAI TTS

### Daily Voice Briefing (AUTO)
- JARVIS auto-generates 60-second morning market briefing on dashboard load
- GPT-5.2 for script + OpenAI TTS (onyx voice)
- Banner with loading/ready states, play/pause, progress bar, dismiss
- Once-per-day via localStorage

### SEO & Meta Tags (P0)
- Open Graph tags, Twitter Cards, PWA meta tags
- Professional title and description for search engines

### API Rate Limiting (P0)
- slowapi integration: 120 req/min default
- Auth endpoints: 5-10/min, AI endpoints: 3-5/min, Copilot: 20/min
- 429 responses with proper error handling

### Error Monitoring (P0)
- Structured logging: timestamp, level, source, method, path, status, duration, IP
- Request middleware logs all /api calls
- WARNING level for 4xx/5xx responses

### Previously Completed Features
- Full 11-step analysis pipeline, JARVIS Copilot (GPT-5.2 + voice)
- Quant Lab, Market Scanner, Watchlist, Paper Trading
- News Sentiment, WebSockets, PDF Export, Multi-Agent AI
- Google OAuth + JWT Auth, Stripe Payments

## Tech Stack
- **Frontend:** React, Tailwind CSS, Framer Motion, Shadcn UI, Recharts
- **Backend:** FastAPI, slowapi (rate limiting), MongoDB
- **AI:** OpenAI GPT-5.2, OpenAI TTS (via emergentintegrations)
- **Auth:** JWT + Google OAuth

## Prioritized Backlog

### P1 — Data Integration
- [ ] Real-time data feeds (Twelve Data, Polygon.io, Alpha Vantage)
- [ ] On-chain data (Glassnode) — requires API key
- [ ] Macroeconomic data (FRED) — requires API key

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
