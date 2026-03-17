"""
Aureos AI — Phase 10 Intelligence Engine Tests
Tests for: Daily Briefing, Market Pulse, Geopolitical Risk, Events Feed, Performance Highlights, Scenario Analysis
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "fabricio@aureos.ai"
TEST_PASSWORD = "aureos2024"


class TestIntelligenceEndpoints:
    """Intelligence Engine API tests - Phase 10"""

    def test_market_pulse_returns_10_indicators(self):
        """GET /api/intelligence/market-pulse returns 10 indicators with required fields"""
        response = requests.get(f"{BASE_URL}/api/intelligence/market-pulse")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "indicators" in data, "Response missing 'indicators' key"
        assert "updated_at" in data, "Response missing 'updated_at' key"
        
        indicators = data["indicators"]
        assert len(indicators) == 10, f"Expected 10 indicators, got {len(indicators)}"
        
        # Verify each indicator has required fields
        for ind in indicators:
            assert "symbol" in ind, "Indicator missing 'symbol'"
            assert "value" in ind, "Indicator missing 'value'"
            assert "change" in ind, "Indicator missing 'change'"
            assert isinstance(ind["value"], (int, float)), "value should be numeric"
            assert isinstance(ind["change"], (int, float)), "change should be numeric"
        
        # Verify known symbols are present
        symbols = [i["symbol"] for i in indicators]
        expected = ["S&P 500", "NASDAQ", "BTC/USD", "GOLD"]
        for exp in expected:
            assert exp in symbols, f"Expected symbol '{exp}' not found in market pulse"
        
        print(f"✓ Market Pulse: {len(indicators)} indicators returned with all required fields")

    def test_geopolitical_risk_returns_regions(self):
        """GET /api/intelligence/geopolitical-risk returns regions with risk scores"""
        response = requests.get(f"{BASE_URL}/api/intelligence/geopolitical-risk")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "regions" in data, "Response missing 'regions' key"
        assert "global_risk_score" in data, "Response missing 'global_risk_score'"
        assert "global_risk_level" in data, "Response missing 'global_risk_level'"
        assert "updated_at" in data, "Response missing 'updated_at'"
        
        regions = data["regions"]
        assert len(regions) >= 5, f"Expected at least 5 regions, got {len(regions)}"
        
        # Verify each region has required fields
        for region in regions:
            assert "id" in region, "Region missing 'id'"
            assert "name" in region, "Region missing 'name'"
            assert "risk_score" in region, "Region missing 'risk_score'"
            assert "risk_level" in region, "Region missing 'risk_level'"
            assert "events" in region, "Region missing 'events'"
            assert isinstance(region["events"], list), "events should be a list"
            assert len(region["events"]) > 0, "Region should have at least one event"
            
            # Verify risk_score is between 0-100
            assert 0 <= region["risk_score"] <= 100, f"risk_score {region['risk_score']} out of bounds"
            
            # Verify risk_level is valid
            valid_levels = ["critical", "high", "elevated", "moderate", "low"]
            assert region["risk_level"] in valid_levels, f"Invalid risk_level: {region['risk_level']}"
        
        # Verify global_risk_score
        global_score = data["global_risk_score"]
        assert 0 <= global_score <= 100, f"global_risk_score {global_score} out of bounds"
        
        print(f"✓ Geopolitical Risk: {len(regions)} regions, global score: {global_score}")

    def test_events_feed_returns_categorized_events(self):
        """GET /api/intelligence/events-feed returns events with categories and severity"""
        response = requests.get(f"{BASE_URL}/api/intelligence/events-feed")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "events" in data, "Response missing 'events' key"
        assert "total" in data, "Response missing 'total' key"
        assert "categories" in data, "Response missing 'categories' key"
        assert "updated_at" in data, "Response missing 'updated_at'"
        
        events = data["events"]
        assert len(events) >= 5, f"Expected at least 5 events, got {len(events)}"
        
        # Verify each event has required fields
        for ev in events:
            assert "id" in ev, "Event missing 'id'"
            assert "category" in ev, "Event missing 'category'"
            assert "severity" in ev, "Event missing 'severity'"
            assert "title" in ev, "Event missing 'title'"
            assert "timestamp" in ev, "Event missing 'timestamp'"
            
            # Verify severity is valid
            valid_severities = ["critical", "high", "medium", "low"]
            assert ev["severity"] in valid_severities, f"Invalid severity: {ev['severity']}"
        
        # Verify categories list
        categories = data["categories"]
        expected_categories = ["geopolitics", "macro", "crypto", "commodity"]
        for cat in expected_categories:
            assert cat in categories, f"Expected category '{cat}' not in categories list"
        
        print(f"✓ Events Feed: {len(events)} events across {len(categories)} categories")

    def test_performance_highlights_returns_assets(self):
        """GET /api/intelligence/performance-highlights returns top performing assets"""
        response = requests.get(f"{BASE_URL}/api/intelligence/performance-highlights")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "highlights" in data, "Response missing 'highlights' key"
        assert "updated_at" in data, "Response missing 'updated_at'"
        
        highlights = data["highlights"]
        assert len(highlights) >= 5, f"Expected at least 5 highlights, got {len(highlights)}"
        
        # Verify each highlight has required fields
        for h in highlights:
            assert "asset" in h, "Highlight missing 'asset'"
            assert "sector" in h, "Highlight missing 'sector'"
            assert "performance" in h, "Highlight missing 'performance'"
            assert isinstance(h["performance"], (int, float)), "performance should be numeric"
        
        # Find top performer for display
        top_performer = max(highlights, key=lambda h: h["performance"])
        
        print(f"✓ Performance Highlights: {len(highlights)} assets, top performer: {top_performer['asset']} (+{top_performer['performance']:.1f}%)")

    def test_daily_briefing_returns_ai_content(self):
        """GET /api/intelligence/daily-briefing returns AI-generated briefing"""
        # This endpoint uses GPT-5.2, may take longer
        response = requests.get(f"{BASE_URL}/api/intelligence/daily-briefing", timeout=90)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "briefing" in data, "Response missing 'briefing' key"
        assert "sentiment" in data, "Response missing 'sentiment' key"
        assert "sentiment_color" in data, "Response missing 'sentiment_color'"
        assert "generated_at" in data, "Response missing 'generated_at'"
        assert "market_pulse" in data, "Response missing 'market_pulse'"
        
        # Verify briefing content
        briefing = data["briefing"]
        assert isinstance(briefing, str), "briefing should be string"
        assert len(briefing) > 100, f"Briefing too short: {len(briefing)} chars"
        
        # Verify sentiment
        valid_sentiments = ["OPTIMISTIC", "HIGH ALERT", "SLIGHTLY CAUTIOUS", "NEUTRAL"]
        assert data["sentiment"] in valid_sentiments, f"Invalid sentiment: {data['sentiment']}"
        
        # Verify sentiment_color is hex color
        color = data["sentiment_color"]
        assert color.startswith("#"), f"sentiment_color should be hex: {color}"
        
        print(f"✓ Daily Briefing: {len(briefing)} chars, sentiment: {data['sentiment']}")

    def test_scenario_analysis_accepts_question(self):
        """POST /api/intelligence/scenario-analysis accepts question and returns AI analysis"""
        payload = {
            "question": "What if oil goes to $120 per barrel?",
            "portfolio_context": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/intelligence/scenario-analysis",
            json=payload,
            timeout=90
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "question" in data, "Response missing 'question' key"
        assert "analysis" in data, "Response missing 'analysis' key"
        assert "generated_at" in data, "Response missing 'generated_at'"
        assert "model" in data, "Response missing 'model' key"
        
        # Verify question echoed back
        assert data["question"] == payload["question"], "Question should be echoed back"
        
        # Verify analysis content
        analysis = data["analysis"]
        assert isinstance(analysis, str), "analysis should be string"
        assert len(analysis) > 100, f"Analysis too short: {len(analysis)} chars"
        
        # Verify model
        assert "JARVIS" in data["model"], f"Model should mention JARVIS: {data['model']}"
        
        print(f"✓ Scenario Analysis: {len(analysis)} chars, model: {data['model']}")


class TestAuthenticatedFlows:
    """Test authenticated flows with test user"""
    
    @pytest.fixture
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Cannot login with test credentials: {response.status_code}")
        return response.json().get("access_token")
    
    def test_portfolio_with_auth(self, auth_token):
        """GET /api/portfolio returns portfolio data for authenticated user"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/portfolio", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "positions" in data, "Response missing 'positions'"
        assert "total_value" in data, "Response missing 'total_value'"
        assert "total_pnl" in data, "Response missing 'total_pnl'"
        
        print(f"✓ Portfolio: {len(data['positions'])} positions, value: ${data['total_value']:.2f}")

    def test_add_portfolio_position(self, auth_token):
        """POST /api/portfolio/add adds a position"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Add a test position
        payload = {
            "symbol": "TEST_AAPL",
            "asset_type": "stock",
            "quantity": 10,
            "avg_price": 175.00
        }
        
        response = requests.post(
            f"{BASE_URL}/api/portfolio/add",
            headers=headers,
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "portfolio" in data, "Response missing 'portfolio'"
        
        # Verify position was added
        positions = data["portfolio"]
        symbols = [p["symbol"] for p in positions]
        assert "TEST_AAPL" in symbols, "TEST_AAPL should be in portfolio"
        
        print(f"✓ Portfolio Add: TEST_AAPL position added successfully")
        
        # Cleanup - remove test position
        requests.delete(f"{BASE_URL}/api/portfolio/TEST_AAPL", headers=headers)


class TestNavigationLabels:
    """Test that navigation has correct labels (Command Center, Intel Terminal, AI Quantica Lab)"""
    
    def test_api_root(self):
        """GET /api/ returns version info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "operational"
        print(f"✓ API Root: {data['message']} v{data['version']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
