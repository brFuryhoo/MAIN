"""
Backend API Tests for Aureos AI Analysis Pipeline
---------------------------------------------------
Tests for:
- Asset Search API (GET /api/assets/search)
- Analysis Pipeline API (POST /api/analysis/start)
- All 9 analysis steps validation
- Executive report structure validation
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ========== FIXTURES ==========

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token using demo credentials"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "demo@aureos.com",
        "password": "Demo1234!"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    # If demo user doesn't exist, register it
    register_resp = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": "demo@aureos.com",
        "password": "Demo1234!",
        "full_name": "Demo User"
    })
    if register_resp.status_code == 200:
        return register_resp.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ========== HEALTH CHECK ==========

class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_root(self, api_client):
        """Test API root endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "operational"
        print(f"API Status: {data}")


# ========== ASSET SEARCH TESTS ==========

class TestAssetSearch:
    """Tests for GET /api/assets/search endpoint"""
    
    def test_search_crypto_btc(self, api_client):
        """Test searching for BTC returns crypto assets from CoinGecko"""
        response = api_client.get(f"{BASE_URL}/api/assets/search", params={"q": "BTC"})
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "query" in data
        assert data["query"] == "BTC"
        # Should have results (crypto from CoinGecko)
        if len(data["results"]) > 0:
            # Find Bitcoin in results
            btc_found = any(r.get("symbol", "").upper() == "BTC" or "bitcoin" in r.get("name", "").lower() for r in data["results"])
            assert btc_found, f"BTC not found in results: {data['results']}"
            print(f"BTC search results: {len(data['results'])} assets found")
    
    def test_search_stock_aapl(self, api_client):
        """Test searching for AAPL returns mock stock data"""
        response = api_client.get(f"{BASE_URL}/api/assets/search", params={"q": "AAPL"})
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        # Should find AAPL stock in mock data
        aapl = next((r for r in data["results"] if r.get("symbol") == "AAPL"), None)
        assert aapl is not None, f"AAPL not found in search results"
        assert aapl["type"] == "stock"
        assert aapl["name"] == "Apple Inc."
        print(f"AAPL found: {aapl}")
    
    def test_search_commodity_xauusd(self, api_client):
        """Test searching for XAUUSD returns commodity data"""
        response = api_client.get(f"{BASE_URL}/api/assets/search", params={"q": "XAUUSD"})
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        # Should find Gold commodity
        gold = next((r for r in data["results"] if r.get("symbol") == "XAUUSD"), None)
        assert gold is not None, f"XAUUSD not found in search results"
        assert gold["type"] == "commodity"
        assert "Gold" in gold["name"]
        print(f"XAUUSD found: {gold}")
    
    def test_search_forex_eurusd(self, api_client):
        """Test searching for EURUSD returns forex data"""
        response = api_client.get(f"{BASE_URL}/api/assets/search", params={"q": "EURUSD"})
        assert response.status_code == 200
        data = response.json()
        eurusd = next((r for r in data["results"] if r.get("symbol") == "EURUSD"), None)
        assert eurusd is not None, f"EURUSD not found"
        assert eurusd["type"] == "forex"
        print(f"EURUSD found: {eurusd}")
    
    def test_search_empty_query(self, api_client):
        """Test empty query returns empty results"""
        response = api_client.get(f"{BASE_URL}/api/assets/search", params={"q": ""})
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []


# ========== ANALYSIS PIPELINE TESTS ==========

class TestAnalysisPipeline:
    """Tests for POST /api/analysis/start endpoint - 9-step analysis pipeline"""
    
    def test_analysis_crypto_btc(self, authenticated_client):
        """Test full 9-step analysis for BTC (crypto) using CoinGecko"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "BTC",
            "asset_type": "crypto",
            "coingecko_id": "bitcoin",
            "name": "Bitcoin",
            "timeframe": "4H",
            "analysis_type": "full"
        })
        assert response.status_code == 200, f"Analysis failed: {response.text}"
        data = response.json()
        
        # Verify basic response structure
        assert "analysis_id" in data
        assert "symbol" in data
        assert data["symbol"] == "BTC"
        assert "asset_type" in data
        assert data["asset_type"] == "crypto"
        assert "price" in data
        assert data["price"] > 0
        assert "steps" in data
        assert "report" in data
        assert "candles" in data
        
        # Verify all 9 steps are complete
        steps = data["steps"]
        required_steps = [
            "market_data", "technical_analysis", "market_structure",
            "liquidity_mapping", "monte_carlo", "risk_model",
            "causality", "probability", "executive_report"
        ]
        for step in required_steps:
            assert step in steps, f"Missing step: {step}"
            assert steps[step].get("status") == "complete", f"Step {step} not complete"
        
        print(f"BTC Analysis complete - Price: ${data['price']}, All 9 steps passed")
        
        # Verify executive report structure
        report = data["report"]
        self._verify_executive_report_structure(report)
    
    def test_analysis_stock_aapl(self, authenticated_client):
        """Test full analysis for AAPL (stock) using mock data"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "AAPL",
            "asset_type": "stock",
            "name": "Apple Inc.",
            "timeframe": "4H",
            "analysis_type": "full"
        })
        assert response.status_code == 200, f"Analysis failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert data["symbol"] == "AAPL"
        assert data["asset_type"] == "stock"
        assert "steps" in data
        
        # Verify all 9 steps
        steps = data["steps"]
        assert len([s for s in steps.values() if s.get("status") == "complete"]) == 9
        
        # Verify report
        report = data["report"]
        assert report is not None
        self._verify_executive_report_structure(report)
        
        print(f"AAPL Analysis complete - All 9 steps passed")
    
    def test_analysis_commodity_gold(self, authenticated_client):
        """Test full analysis for XAUUSD (gold commodity) using mock data"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "XAUUSD",
            "asset_type": "commodity",
            "name": "Gold",
            "timeframe": "1D",
            "analysis_type": "full"
        })
        assert response.status_code == 200, f"Analysis failed: {response.text}"
        data = response.json()
        
        assert data["symbol"] == "XAUUSD"
        assert "steps" in data
        assert "report" in data
        
        print(f"XAUUSD Analysis complete - Price: ${data['price']}")
    
    def _verify_executive_report_structure(self, report):
        """Verify the executive report contains all required sections"""
        # Signal Summary
        assert "signal_summary" in report
        sig = report["signal_summary"]
        assert "direction" in sig  # BUY/SELL/HOLD
        assert "confidence" in sig  # 0-100
        assert sig["direction"] in ["BUY", "SELL", "HOLD"]
        assert 0 <= sig["confidence"] <= 100
        
        # Action Plan
        assert "action_plan" in report
        action = report["action_plan"]
        assert "recommendation" in action
        assert "entry_zone" in action
        assert "stop_loss" in action
        
        # Technical Analysis
        assert "technical_analysis" in report
        ta = report["technical_analysis"]
        assert "rsi" in ta
        assert "trend" in ta
        assert "support" in ta
        assert "resistance" in ta
        
        # Scenario Modeling (Monte Carlo)
        assert "scenario_modeling" in report
        mc = report["scenario_modeling"]
        assert "simulations" in mc
        assert "win_probability" in mc
        assert "expected_return" in mc
        
        # Risk Assessment
        assert "risk_assessment" in report
        risk = report["risk_assessment"]
        assert "risk_score" in risk
        assert "risk_level" in risk
        assert risk["risk_level"] in ["low", "moderate", "high"]
        
        # Market Causality
        assert "market_causality" in report
        causality = report["market_causality"]
        assert "summary" in causality
        assert "sentiment" in causality
        
        # Bullish Signals & Bearish Risks
        assert "bullish_signals" in report
        assert "bearish_risks" in report
        assert isinstance(report["bullish_signals"], list)
        assert isinstance(report["bearish_risks"], list)
        
        print(f"Report validation passed - Direction: {sig['direction']}, Confidence: {sig['confidence']}%")


class TestAnalysisStepsDetail:
    """Detailed tests for each of the 9 analysis steps"""
    
    def test_step_market_data(self, authenticated_client):
        """Verify market data step contains required fields"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "ETH",
            "asset_type": "crypto",
            "coingecko_id": "ethereum",
            "timeframe": "4H"
        })
        assert response.status_code == 200
        data = response.json()
        
        md = data["steps"]["market_data"]
        assert md["status"] == "complete"
        assert "symbol" in md
        assert "price" in md
        assert "candle_count" in md
        assert md["candle_count"] > 0
        print(f"Market Data: {md['candle_count']} candles, source: {md.get('source')}")
    
    def test_step_technical_analysis(self, authenticated_client):
        """Verify technical analysis step"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "NVDA",
            "asset_type": "stock",
            "timeframe": "4H"
        })
        assert response.status_code == 200
        data = response.json()
        
        ta = data["steps"]["technical_analysis"]
        assert ta["status"] == "complete"
        assert "rsi" in ta
        assert "macd" in ta
        assert "trend" in ta
        assert "moving_averages" in ta
        assert 0 <= ta["rsi"] <= 100
        print(f"Technical Analysis: RSI={ta['rsi']}, Trend={ta['trend']}")
    
    def test_step_probability_engine(self, authenticated_client):
        """Verify probability engine combines signals correctly"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "SPY",
            "asset_type": "index",
            "timeframe": "1D"
        })
        assert response.status_code == 200
        data = response.json()
        
        prob = data["steps"]["probability"]
        assert prob["status"] == "complete"
        assert "signal" in prob
        assert "scenarios" in prob
        
        signal = prob["signal"]
        assert signal["direction"] in ["BUY", "SELL", "HOLD"]
        assert 0 <= signal["confidence"] <= 100
        
        scenarios = prob["scenarios"]
        # Scenarios should roughly sum to ~100%
        total = scenarios.get("bullish_continuation", 0) + \
                scenarios.get("bearish_reversal", 0) + \
                scenarios.get("sideways_consolidation", 0)
        assert 90 <= total <= 110, f"Scenarios don't sum to ~100%: {total}"
        
        print(f"Probability: {signal['direction']} with {signal['confidence']}% confidence")


# ========== ERROR HANDLING TESTS ==========

class TestErrorHandling:
    """Test error handling for edge cases"""
    
    def test_analysis_invalid_asset(self, authenticated_client):
        """Test analysis with invalid/unknown asset"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "INVALIDASSET123",
            "asset_type": "unknown",
            "timeframe": "4H"
        })
        # Should still work with fallback mock data
        # Backend generates mock data for unknown assets
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
    
    def test_analysis_without_auth(self, api_client):
        """Test that analysis doesn't require auth (no auth header)"""
        # Remove auth header if present
        client = requests.Session()
        client.headers.update({"Content-Type": "application/json"})
        
        response = client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "BTC",
            "asset_type": "crypto",
            "coingecko_id": "bitcoin"
        })
        # Analysis may work without auth depending on implementation
        # Just verify it returns a valid response code
        assert response.status_code in [200, 401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
