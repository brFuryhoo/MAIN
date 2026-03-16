"""
Batch 7 Features Testing
========================
Tests for: News Sentiment, Paper Trading, Multi-Agent System, Google OAuth endpoint

Features tested:
- GET /api/news/sentiment - Market sentiment with fear/greed index
- GET /api/paper/portfolio - Paper trading portfolio
- POST /api/paper/trade - Execute paper trade
- POST /api/paper/close - Close paper trade
- POST /api/paper/reset - Reset portfolio
- POST /api/agents/analyze - Multi-agent AI analysis (GPT-5.2)
- GET /api/agents/history - Agent analysis history
- POST /api/auth/google-session - Google OAuth session exchange
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = "test@aureos.com"
TEST_PASSWORD = "Test1234!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for protected endpoints."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - cannot test protected endpoints")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token."""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ==================== NEWS SENTIMENT TESTS ====================

class TestNewsSentiment:
    """News sentiment API tests."""
    
    def test_sentiment_endpoint_returns_200(self):
        """GET /api/news/sentiment returns 200."""
        response = requests.get(f"{BASE_URL}/api/news/sentiment", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_sentiment_has_required_fields(self):
        """Sentiment response has required fields."""
        response = requests.get(f"{BASE_URL}/api/news/sentiment", timeout=30)
        data = response.json()
        
        assert data.get("status") == "complete", "Expected status='complete'"
        assert "sentiment_score" in data, "Missing sentiment_score"
        assert "market_mood" in data, "Missing market_mood"
        assert "interpretation" in data, "Missing interpretation"
        assert isinstance(data["sentiment_score"], (int, float)), "sentiment_score should be numeric"
        assert 0 <= data["sentiment_score"] <= 100, "sentiment_score should be 0-100"
    
    def test_sentiment_fear_greed_history(self):
        """Sentiment has fear/greed history."""
        response = requests.get(f"{BASE_URL}/api/news/sentiment", timeout=30)
        data = response.json()
        
        assert "fear_greed" in data, "Missing fear_greed"
        fg = data["fear_greed"]
        assert "current" in fg, "Missing fear_greed.current"
        assert "history" in fg, "Missing fear_greed.history"
        assert isinstance(fg["history"], list), "history should be a list"
    
    def test_sentiment_trending_coins(self):
        """Sentiment has trending coins."""
        response = requests.get(f"{BASE_URL}/api/news/sentiment", timeout=30)
        data = response.json()
        
        assert "trending_coins" in data, "Missing trending_coins"
        assert isinstance(data["trending_coins"], list), "trending_coins should be a list"
        # Trending coins may be empty if CoinGecko rate limited
    
    def test_sentiment_global_market(self):
        """Sentiment has global market data."""
        response = requests.get(f"{BASE_URL}/api/news/sentiment", timeout=30)
        data = response.json()
        
        assert "global_market" in data, "Missing global_market"
        gm = data["global_market"]
        # Global market may be empty if CoinGecko rate limited, but field should exist


# ==================== PAPER TRADING TESTS ====================

class TestPaperTrading:
    """Paper trading API tests."""
    
    def test_portfolio_returns_200(self, auth_headers):
        """GET /api/paper/portfolio returns 200."""
        response = requests.get(f"{BASE_URL}/api/paper/portfolio", headers=auth_headers, timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_portfolio_has_required_fields(self, auth_headers):
        """Portfolio has required fields."""
        response = requests.get(f"{BASE_URL}/api/paper/portfolio", headers=auth_headers, timeout=10)
        data = response.json()
        
        assert "balance" in data, "Missing balance"
        assert "total_pnl" in data, "Missing total_pnl"
        assert "total_return_pct" in data, "Missing total_return_pct"
        assert "win_rate" in data, "Missing win_rate"
        assert "open_positions" in data, "Missing open_positions"
        assert "closed_trades" in data, "Missing closed_trades"
        assert isinstance(data["open_positions"], list), "open_positions should be list"
        assert isinstance(data["closed_trades"], list), "closed_trades should be list"
    
    def test_reset_portfolio(self, auth_headers):
        """POST /api/paper/reset resets portfolio."""
        response = requests.post(f"{BASE_URL}/api/paper/reset", headers=auth_headers, json={}, timeout=10)
        assert response.status_code == 200, f"Reset failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "reset", "Expected status='reset'"
        assert data.get("balance") == 100000, "Expected balance=100000 after reset"
    
    def test_execute_buy_trade(self, auth_headers):
        """POST /api/paper/trade executes a buy trade."""
        # First reset to clean state
        requests.post(f"{BASE_URL}/api/paper/reset", headers=auth_headers, json={}, timeout=10)
        
        trade_payload = {
            "symbol": "BTC",
            "name": "Bitcoin",
            "action": "buy",
            "quantity": 0.5,
            "price": 84000,
            "asset_type": "crypto"
        }
        response = requests.post(f"{BASE_URL}/api/paper/trade", headers=auth_headers, json=trade_payload, timeout=10)
        assert response.status_code == 200, f"Trade failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "executed", "Expected status='executed'"
        assert "trade_id" in data, "Missing trade_id"
        assert data.get("action") == "buy", "Expected action='buy'"
        assert data.get("symbol") == "BTC", "Expected symbol='BTC'"
        assert data.get("cost") == 42000, f"Expected cost=42000 (0.5 * 84000), got {data.get('cost')}"
        
        return data.get("trade_id")
    
    def test_trade_appears_in_open_positions(self, auth_headers):
        """After buy trade, position appears in open_positions."""
        # Reset and execute trade
        requests.post(f"{BASE_URL}/api/paper/reset", headers=auth_headers, json={}, timeout=10)
        
        trade_payload = {"symbol": "ETH", "name": "Ethereum", "action": "buy", "quantity": 2, "price": 3000, "asset_type": "crypto"}
        trade_resp = requests.post(f"{BASE_URL}/api/paper/trade", headers=auth_headers, json=trade_payload, timeout=10)
        trade_id = trade_resp.json().get("trade_id")
        
        # Check portfolio
        portfolio_resp = requests.get(f"{BASE_URL}/api/paper/portfolio", headers=auth_headers, timeout=10)
        portfolio = portfolio_resp.json()
        
        assert len(portfolio["open_positions"]) > 0, "Expected at least one open position"
        eth_positions = [p for p in portfolio["open_positions"] if p["symbol"] == "ETH"]
        assert len(eth_positions) == 1, "Expected ETH position in open_positions"
        assert eth_positions[0]["trade_id"] == trade_id, "Trade ID mismatch"
    
    def test_close_trade_with_profit(self, auth_headers):
        """POST /api/paper/close closes trade and calculates P&L."""
        # Reset and buy BTC at 84000
        requests.post(f"{BASE_URL}/api/paper/reset", headers=auth_headers, json={}, timeout=10)
        
        trade_payload = {"symbol": "BTC", "name": "Bitcoin", "action": "buy", "quantity": 0.5, "price": 84000, "asset_type": "crypto"}
        trade_resp = requests.post(f"{BASE_URL}/api/paper/trade", headers=auth_headers, json=trade_payload, timeout=10)
        trade_id = trade_resp.json().get("trade_id")
        
        # Close at 85000 (profit)
        close_payload = {"trade_id": trade_id, "close_price": 85000}
        close_resp = requests.post(f"{BASE_URL}/api/paper/close", headers=auth_headers, json=close_payload, timeout=10)
        assert close_resp.status_code == 200, f"Close failed: {close_resp.text}"
        
        data = close_resp.json()
        assert data.get("status") == "closed", "Expected status='closed'"
        assert data.get("pnl") == 500, f"Expected pnl=500, got {data.get('pnl')}"  # (85000-84000)*0.5
        assert data.get("is_win") == True, "Expected is_win=True"
    
    def test_closed_trade_in_history(self, auth_headers):
        """After closing, trade appears in closed_trades."""
        # Reset and execute trade
        requests.post(f"{BASE_URL}/api/paper/reset", headers=auth_headers, json={}, timeout=10)
        
        trade_payload = {"symbol": "SOL", "name": "Solana", "action": "buy", "quantity": 10, "price": 100, "asset_type": "crypto"}
        trade_resp = requests.post(f"{BASE_URL}/api/paper/trade", headers=auth_headers, json=trade_payload, timeout=10)
        trade_id = trade_resp.json().get("trade_id")
        
        # Close with loss
        close_payload = {"trade_id": trade_id, "close_price": 95}
        requests.post(f"{BASE_URL}/api/paper/close", headers=auth_headers, json=close_payload, timeout=10)
        
        # Check portfolio
        portfolio_resp = requests.get(f"{BASE_URL}/api/paper/portfolio", headers=auth_headers, timeout=10)
        portfolio = portfolio_resp.json()
        
        sol_trades = [t for t in portfolio["closed_trades"] if t["symbol"] == "SOL"]
        assert len(sol_trades) >= 1, "Expected SOL in closed_trades"
        assert sol_trades[0]["pnl"] == -50, f"Expected pnl=-50, got {sol_trades[0]['pnl']}"  # (95-100)*10
    
    def test_insufficient_balance_error(self, auth_headers):
        """Trade exceeding balance returns 400."""
        requests.post(f"{BASE_URL}/api/paper/reset", headers=auth_headers, json={}, timeout=10)
        
        # Try to buy $200,000 worth (exceeds $100,000 balance)
        trade_payload = {"symbol": "BTC", "name": "Bitcoin", "action": "buy", "quantity": 3, "price": 70000, "asset_type": "crypto"}
        response = requests.post(f"{BASE_URL}/api/paper/trade", headers=auth_headers, json=trade_payload, timeout=10)
        assert response.status_code == 400, f"Expected 400 for insufficient balance, got {response.status_code}"


# ==================== MULTI-AGENT TESTS ====================

class TestMultiAgent:
    """Multi-agent AI analysis tests (GPT-5.2)."""
    
    def test_agent_history_returns_200(self, auth_headers):
        """GET /api/agents/history returns 200."""
        response = requests.get(f"{BASE_URL}/api/agents/history", headers=auth_headers, timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "history" in data, "Missing history"
        assert "count" in data, "Missing count"
        assert isinstance(data["history"], list), "history should be list"
    
    def test_multi_agent_analyze(self, auth_headers):
        """POST /api/agents/analyze runs multi-agent analysis."""
        analysis_payload = {
            "symbol": "BTC",
            "asset_type": "crypto",
            "analysis_data": {
                "price": 84000,
                "report": {
                    "signal_summary": {
                        "direction": "LONG",
                        "confidence": 72,
                        "bullish_probability": 65,
                        "bearish_probability": 35
                    }
                },
                "steps": {
                    "technical_analysis": {"rsi": 55, "trend": "bullish", "macd": {"crossover": "bullish"}, "volume_trend": "increasing"},
                    "monte_carlo": {"win_probability": 62},
                    "risk_model": {"risk_score": 45},
                    "regime_detection": {"market_phase": {"phase": "accumulation"}},
                    "manipulation_detection": {"manipulation_score": 15}
                }
            }
        }
        
        # Multi-agent takes 10-20 seconds due to 5 LLM calls
        response = requests.post(f"{BASE_URL}/api/agents/analyze", headers=auth_headers, json=analysis_payload, timeout=60)
        assert response.status_code == 200, f"Multi-agent analysis failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "complete", "Expected status='complete'"
        assert data.get("symbol") == "BTC", "Expected symbol='BTC'"
        assert "agents" in data, "Missing agents"
        assert "synthesis" in data, "Missing synthesis (JARVIS verdict)"
        
        # Check all 4 agents responded
        agents = data["agents"]
        for agent_name in ["technical", "quant", "macro", "sentiment"]:
            assert agent_name in agents, f"Missing {agent_name} agent"
            assert len(agents[agent_name]) > 10, f"{agent_name} agent response too short"


# ==================== GOOGLE OAUTH TESTS ====================

class TestGoogleOAuth:
    """Google OAuth endpoint tests."""
    
    def test_google_session_endpoint_exists(self):
        """POST /api/auth/google-session returns proper error without session_id."""
        response = requests.post(f"{BASE_URL}/api/auth/google-session", json={}, timeout=10)
        # Should return 400 for missing session_id, not 404
        assert response.status_code == 400, f"Expected 400 for missing session_id, got {response.status_code}"
        
        data = response.json()
        assert "session_id" in data.get("detail", "").lower() or "session" in data.get("detail", "").lower(), \
            "Error should mention session_id"
    
    def test_google_session_invalid_session(self):
        """POST /api/auth/google-session with invalid session returns 401."""
        response = requests.post(f"{BASE_URL}/api/auth/google-session", json={"session_id": "invalid_test_session"}, timeout=15)
        # Should return 401 for invalid session
        assert response.status_code in [401, 500], f"Expected 401/500 for invalid session, got {response.status_code}"


# ==================== FULL WORKFLOW TEST ====================

class TestPaperTradingWorkflow:
    """End-to-end paper trading workflow."""
    
    def test_full_trading_workflow(self, auth_headers):
        """Complete workflow: Reset -> Buy BTC -> Verify -> Close with profit -> Verify stats."""
        # 1. Reset portfolio
        reset_resp = requests.post(f"{BASE_URL}/api/paper/reset", headers=auth_headers, json={}, timeout=10)
        assert reset_resp.status_code == 200
        
        # 2. Buy BTC at $84,000
        buy_resp = requests.post(f"{BASE_URL}/api/paper/trade", headers=auth_headers, json={
            "symbol": "BTC", "name": "Bitcoin", "action": "buy", "quantity": 1, "price": 84000, "asset_type": "crypto"
        }, timeout=10)
        assert buy_resp.status_code == 200
        trade_id = buy_resp.json()["trade_id"]
        
        # 3. Verify position in portfolio
        portfolio_resp = requests.get(f"{BASE_URL}/api/paper/portfolio", headers=auth_headers, timeout=10)
        portfolio = portfolio_resp.json()
        assert portfolio["balance"] == 16000, f"Expected balance=16000 (100000-84000), got {portfolio['balance']}"
        assert len(portfolio["open_positions"]) == 1
        
        # 4. Close at $85,000 (profit)
        close_resp = requests.post(f"{BASE_URL}/api/paper/close", headers=auth_headers, json={
            "trade_id": trade_id, "close_price": 85000
        }, timeout=10)
        assert close_resp.status_code == 200
        assert close_resp.json()["pnl"] == 1000  # (85000-84000)*1
        
        # 5. Verify final stats
        final_portfolio = requests.get(f"{BASE_URL}/api/paper/portfolio", headers=auth_headers, timeout=10).json()
        assert final_portfolio["balance"] == 101000, f"Expected balance=101000 (16000+85000), got {final_portfolio['balance']}"
        assert final_portfolio["total_pnl"] == 1000, f"Expected total_pnl=1000, got {final_portfolio['total_pnl']}"
        assert final_portfolio["win_rate"] == 100, f"Expected win_rate=100, got {final_portfolio['win_rate']}"
        assert len(final_portfolio["open_positions"]) == 0
        assert len(final_portfolio["closed_trades"]) >= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
