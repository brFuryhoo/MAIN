# Aureos AI - Product Requirements Document

## Project Overview
**Product Name:** Aureos AI  
**Tagline:** "Clarity in every trade"  
**Version:** 1.0.0 MVP  
**Last Updated:** 2026-03-13

## Original Problem Statement
Develop a complete fintech brand and product ecosystem called "Aureos AI" - a next-generation Australian trading intelligence platform that merges advanced AI analytics, real-time market data, and a conversational copilot for traders and investors.

## User Personas
1. **Retail Traders** - Individual investors seeking AI-powered insights for stocks, crypto, and forex
2. **Day Traders** - Active traders needing real-time market data and quick analysis
3. **Portfolio Managers** - Professionals tracking multiple assets with risk analytics
4. **Beginner Investors** - Users learning trading through the Learning Hub

## Core Requirements (Static)
- Real-time Market Intelligence Dashboard (ASX, NASDAQ, Forex, Crypto)
- AI Copilot for trade analysis and suggestions
- Portfolio & Watchlist management
- Analytics with risk scoring and performance tracking
- Subscription-based monetization (Essential/Pro/Elite)
- Learning Hub with guided onboarding
- Premium dark theme design aesthetic

## Tech Stack
- **Frontend:** React 19 + Tailwind CSS + Shadcn/UI + Framer Motion
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **AI:** OpenAI GPT-5.2 via emergentintegrations
- **Payments:** Stripe (test mode)
- **Auth:** JWT-based authentication

## What's Been Implemented (MVP - 2026-03-13)

### Backend APIs (/app/backend/server.py)
- [x] JWT Authentication (register, login, me)
- [x] Market Data endpoints (stocks, crypto, forex, overview, heatmap)
- [x] AI Copilot chat with GPT-5.2 integration
- [x] Portfolio management (add/remove positions)
- [x] Watchlist management (add/remove items)
- [x] Analytics (risk score, performance)
- [x] Tutorial progress tracking
- [x] Subscription checkout with Stripe
- [x] Contact form submission

### Frontend Pages
- [x] Landing Page (hero, features, pricing, testimonials, about, contact)
- [x] Login/Register Pages with validation
- [x] Dashboard with market indices, charts, stocks/crypto/forex tabs
- [x] AI Copilot chat interface with quick prompts
- [x] Analytics page with performance charts, risk meter, heatmap
- [x] Pricing page with plan comparison
- [x] Tutorial/Learning Hub with 5 slides
- [x] Settings page
- [x] Subscription success page

### Design System
- [x] Dark theme (graphite black, titanium gray)
- [x] Gold accent color (#D4AF37)
- [x] Space Grotesk (headings) + Inter (body) + JetBrains Mono (data)
- [x] Sharp edges, architectural aesthetic
- [x] Micro-animations with Framer Motion
- [x] Responsive design

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Integrate real Alpha Vantage API for live stock data
- [ ] Integrate CoinGecko API for live crypto data
- [ ] Implement WebSocket for real-time price updates
- [ ] Add email verification on registration

### P1 - High Priority
- [ ] Password reset functionality
- [ ] Portfolio position editing
- [ ] Historical trade logging
- [ ] Backtesting simulation tool
- [ ] Export portfolio/analytics data

### P2 - Medium Priority
- [ ] Light mode theme toggle
- [ ] Custom watchlist categories
- [ ] Price alerts/notifications
- [ ] Social sharing of trade ideas
- [ ] Mobile app (React Native)

### P3 - Nice to Have
- [ ] Multi-language support
- [ ] Advanced charting (TradingView integration)
- [ ] Community features
- [ ] API access for Elite users
- [ ] Referral program

## API Documentation
Base URL: `/api`

### Authentication
- `POST /auth/register` - Create account
- `POST /auth/login` - Get JWT token
- `GET /auth/me` - Get current user

### Market Data
- `GET /market/stocks` - List all stocks
- `GET /market/stocks/{symbol}` - Stock details with chart
- `GET /market/crypto` - List cryptocurrencies
- `GET /market/crypto/{id}` - Crypto details
- `GET /market/forex` - Forex pairs
- `GET /market/overview` - Market indices
- `GET /market/heatmap` - Asset heatmap

### AI Copilot
- `POST /copilot/chat` - Send message to AI
- `GET /copilot/history` - Chat history
- `GET /copilot/quick-analysis/{symbol}` - Quick analysis

### Portfolio & Watchlist
- `GET /portfolio` - User portfolio
- `POST /portfolio/add` - Add position
- `DELETE /portfolio/{symbol}` - Remove position
- `GET /watchlist` - User watchlist
- `POST /watchlist/add` - Add to watchlist
- `DELETE /watchlist/{symbol}` - Remove from watchlist

### Subscriptions
- `GET /subscription/plans` - Available plans
- `POST /subscription/checkout` - Create Stripe session
- `GET /subscription/status/{session_id}` - Check payment status

## Testing Status
- Backend: 95% pass rate (19/20 endpoints)
- Frontend: 95% functional
- AI Copilot: Working with GPT-5.2

## Notes
- Market data currently uses mock data (live API integration pending)
- Stripe in test mode - use test card 4242 4242 4242 4242
