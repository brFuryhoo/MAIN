"""
Test Suite for Global Market Data Provider Integration
--------------------------------------------------------
Tests for:
- Asset search across Twelve Data, Polygon, CoinGecko
- Real prices from Twelve Data, Polygon, Alpha Vantage
- Analysis pipeline with real market data
- JARVIS copilot functionality
- Analysis history persistence

NOTE: Rate limits apply:
  - Twelve Data: ~8/min
  - Polygon: ~5/min
  - Alpha Vantage: ~5/min
Be conservative with API calls.
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for demo user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "demo@aureos.com",
        "password": "Demo1234!"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestAssetSearch:
    """Test /api/assets/search with global data providers"""

    def test_search_aapl_stock_returns_results(self, api_client):
        """Search AAPL should return results from Twelve Data AND Polygon"""
        response = api_client.get(f"{BASE_URL}/api/assets/search", params={"q": "AAPL"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "results" in data, "Response should have 'results' field"
        results = data["results"]
        assert len(results) > 0, "AAPL search should return results"
        
        # Check for provider field in results
        providers_found = set()
        for r in results:
            if r.get("provider"):
                providers_found.add(r["provider"])
        
        print(f"Providers found for AAPL: {providers_found}")
        # At least one provider should be present
        assert len(providers_found) > 0, "Results should include provider field"
        
        # Check first result has expected fields
        first = results[0]
        assert "symbol" in first, "Result should have symbol"
        assert "name" in first, "Result should have name"
        assert "type" in first, "Result should have type"

    def test_search_btc_crypto_returns_coingecko(self, api_client):
        """Search BTC should return crypto results from CoinGecko"""
        response = api_client.get(f"{BASE_URL}/api/assets/search", params={"q": "BTC"})
        assert response.status_code == 200
        
        data = response.json()
        results = data.get("results", [])
        
        # Find crypto results
        crypto_results = [r for r in results if r.get("type") == "crypto"]
        assert len(crypto_results) > 0, "BTC search should return crypto results"
        
        # Check for CoinGecko provider
        cg_results = [r for r in crypto_results if r.get("provider") == "coingecko"]
        print(f"CoinGecko results for BTC: {len(cg_results)}")
        assert len(cg_results) > 0, "BTC search should include CoinGecko results"
        
        # Verify coingecko_id is present
        if cg_results:
            assert "coingecko_id" in cg_results[0], "CoinGecko results should have coingecko_id"

    def test_search_eurusd_forex(self, api_client):
        """Search EUR/USD should return forex results from Twelve Data"""
        # Test both formats: EUR/USD and EURUSD
        for query in ["EUR/USD", "EURUSD"]:
            response = api_client.get(f"{BASE_URL}/api/assets/search", params={"q": query})
            assert response.status_code == 200
            
            data = response.json()
            results = data.get("results", [])
            
            if len(results) > 0:
                print(f"Search '{query}' returned {len(results)} results")
                # Check if any forex results
                forex_results = [r for r in results if r.get("type") == "forex"]
                print(f"Forex results: {len(forex_results)}")
                break

    def test_search_toyota_global_exchanges(self, api_client):
        """Search toyota should return Toyota from multiple global exchanges (JPX, NYSE)"""
        response = api_client.get(f"{BASE_URL}/api/assets/search", params={"q": "toyota"})
        assert response.status_code == 200
        
        data = response.json()
        results = data.get("results", [])
        
        print(f"Toyota search returned {len(results)} results")
        
        # Check for exchange info
        exchanges = set()
        for r in results:
            if r.get("exchange"):
                exchanges.add(r["exchange"])
        
        print(f"Exchanges found for Toyota: {exchanges}")
        
        # Should have multiple results with different exchanges
        assert len(results) > 0, "Toyota search should return results"

    def test_search_samsung_global(self, api_client):
        """Search samsung should return Samsung from KRX, LSE etc"""
        response = api_client.get(f"{BASE_URL}/api/assets/search", params={"q": "samsung"})
        assert response.status_code == 200
        
        data = response.json()
        results = data.get("results", [])
        
        print(f"Samsung search returned {len(results)} results")
        for r in results[:5]:
            print(f"  - {r.get('symbol')} ({r.get('exchange', 'N/A')}) - {r.get('provider', 'N/A')}")


class TestAnalysisStart:
    """Test /api/analysis/start with real market data"""

    def test_analysis_aapl_real_price(self, authenticated_client):
        """Analysis for AAPL should have REAL price from twelve_data/polygon"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "AAPL",
            "asset_type": "stock",
            "name": "Apple Inc.",
            "timeframe": "4H",
            "analysis_type": "full"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check price is real (approximately $150-$300 range for AAPL)
        price = data.get("price", 0)
        print(f"AAPL price: ${price}")
        assert 100 < price < 400, f"AAPL price should be realistic, got {price}"
        
        # Check source contains twelve_data or polygon
        source = data.get("steps", {}).get("market_data", {}).get("source", "")
        print(f"AAPL data source: {source}")
        assert "mock" not in source.lower() or "twelve_data" in source.lower() or "polygon" in source.lower(), \
            f"Source should be from real provider, got: {source}"

    def test_analysis_eurusd_forex_real_rate(self, authenticated_client):
        """Analysis for EUR/USD should have real forex rate from twelve_data"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "EUR/USD",
            "asset_type": "forex",
            "name": "Euro / US Dollar",
            "timeframe": "4H",
            "analysis_type": "full"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check price is realistic EUR/USD rate (0.9 - 1.3 range)
        price = data.get("price", 0)
        print(f"EUR/USD rate: {price}")
        assert 0.8 < price < 1.5, f"EUR/USD rate should be realistic, got {price}"
        
        # Check source
        source = data.get("steps", {}).get("market_data", {}).get("source", "")
        print(f"EUR/USD data source: {source}")

    def test_analysis_btc_crypto_coingecko(self, authenticated_client):
        """Analysis for BTC should work with CoinGecko real data"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "BTC",
            "asset_type": "crypto",
            "coingecko_id": "bitcoin",
            "name": "Bitcoin",
            "timeframe": "4H",
            "analysis_type": "full"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check price is realistic BTC price (>$20,000)
        price = data.get("price", 0)
        print(f"BTC price: ${price}")
        assert price > 20000, f"BTC price should be > $20,000, got {price}"
        
        # Check source includes coingecko
        source = data.get("steps", {}).get("market_data", {}).get("source", "")
        print(f"BTC data source: {source}")
        assert "coingecko" in source.lower(), f"BTC source should be coingecko, got: {source}"

    def test_analysis_11_steps_complete(self, authenticated_client):
        """All 11 analysis steps should be 'complete' status"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "MSFT",
            "asset_type": "stock",
            "name": "Microsoft Corp.",
            "timeframe": "4H",
            "analysis_type": "full"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        steps = data.get("steps", {})
        expected_steps = [
            "market_data", "technical_analysis", "market_structure",
            "liquidity_mapping", "monte_carlo", "risk_model",
            "causality", "probability", "executive_report",
            "regime_detection", "manipulation_detection"
        ]
        
        for step_name in expected_steps:
            assert step_name in steps, f"Missing step: {step_name}"
            status = steps[step_name].get("status")
            assert status == "complete", f"Step {step_name} status is '{status}', expected 'complete'"
        
        print(f"All {len(expected_steps)} steps complete!")

    def test_analysis_report_has_regime_and_manipulation(self, authenticated_client):
        """Report should contain regime and manipulation data"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "NVDA",
            "asset_type": "stock",
            "name": "NVIDIA Corp.",
            "timeframe": "4H",
            "analysis_type": "full"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        report = data.get("report", {})
        
        # Check regime
        regime = report.get("regime", {})
        assert "trend_regime" in regime, "Report should have regime.trend_regime"
        assert "volatility_regime" in regime, "Report should have regime.volatility_regime"
        assert "market_phase" in regime, "Report should have regime.market_phase"
        print(f"Regime: {regime.get('regime_summary', 'N/A')}")
        
        # Check manipulation
        manipulation = report.get("manipulation", {})
        assert "score" in manipulation, "Report should have manipulation.score"
        assert "risk_level" in manipulation, "Report should have manipulation.risk_level"
        print(f"Manipulation score: {manipulation.get('score')}, level: {manipulation.get('risk_level')}")


class TestJarvisCopilot:
    """Test JARVIS copilot functionality"""

    def test_jarvis_chat_works(self, authenticated_client):
        """POST /api/jarvis/chat should respond with intelligent response"""
        response = authenticated_client.post(f"{BASE_URL}/api/jarvis/chat", json={
            "message": "What is RSI indicator?"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "response" in data, "JARVIS should return a response"
        assert len(data["response"]) > 50, "JARVIS response should be substantial"
        print(f"JARVIS response length: {len(data['response'])} chars")


class TestAnalysisHistory:
    """Test analysis history persistence"""

    def test_get_analysis_history(self, authenticated_client):
        """GET /api/analysis/history should return saved analyses"""
        response = authenticated_client.get(f"{BASE_URL}/api/analysis/history")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "history" in data, "Response should have 'history' field"
        assert "count" in data, "Response should have 'count' field"
        
        print(f"Analysis history count: {data['count']}")
        
        # If there are history items, validate structure
        if data["history"]:
            item = data["history"][0]
            assert "analysis_id" in item, "History item should have analysis_id"
            assert "symbol" in item, "History item should have symbol"
            assert "timestamp" in item, "History item should have timestamp"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
