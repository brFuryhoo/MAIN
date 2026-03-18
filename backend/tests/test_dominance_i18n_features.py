"""
Aureos AI - Iteration 18 Tests
DOMINANCE & SCALE LAYER + i18n Features
- Alpha Detection System (GET /api/dominance/alpha-detection)
- Market Narrative Engine (GET /api/dominance/market-narrative)
- JARVIS Universal Narration (POST /api/voice/narrate)
- i18n Multi-language support (9 languages)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://aureos-hub.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "test"


class TestHealthAndAuth:
    """Basic health check and authentication tests"""
    
    def test_api_health(self):
        """Test API is operational"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "operational"
        print(f"API health check: {data}")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Login success: {data['user'].get('full_name')}")


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for authenticated endpoints"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestAlphaDetection:
    """Tests for Alpha Detection System - /api/dominance/alpha-detection"""
    
    def test_alpha_detection_english(self, auth_headers):
        """Test alpha detection with English language (default)"""
        response = requests.get(
            f"{BASE_URL}/api/dominance/alpha-detection?language=en",
            headers=auth_headers,
            timeout=60  # AI endpoints may take 5-15 seconds
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "analysis" in data, "Should have analysis field"
        assert "market_snapshot" in data, "Should have market_snapshot field"
        assert "scan_time" in data, "Should have scan_time field"
        assert "language" in data, "Should have language field"
        assert "model" in data, "Should have model field"
        
        # Verify values
        assert data["language"] == "en"
        assert len(data["analysis"]) > 100, "Analysis should be substantial"
        assert len(data["market_snapshot"]) > 0, "Should have market data"
        print(f"Alpha Detection (EN): {len(data['analysis'])} chars, {len(data['market_snapshot'])} markets")
    
    def test_alpha_detection_portuguese(self, auth_headers):
        """Test alpha detection with Portuguese language"""
        response = requests.get(
            f"{BASE_URL}/api/dominance/alpha-detection?language=pt",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "analysis" in data
        assert data["language"] == "pt"
        assert len(data["analysis"]) > 100
        print(f"Alpha Detection (PT): {len(data['analysis'])} chars")
    
    def test_alpha_detection_spanish(self, auth_headers):
        """Test alpha detection with Spanish language"""
        response = requests.get(
            f"{BASE_URL}/api/dominance/alpha-detection?language=es",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "analysis" in data
        assert data["language"] == "es"
        print(f"Alpha Detection (ES): {len(data['analysis'])} chars")
    
    def test_alpha_detection_market_snapshot_structure(self, auth_headers):
        """Verify market snapshot has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/dominance/alpha-detection?language=en",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check market snapshot structure
        for market in data.get("market_snapshot", []):
            assert "symbol" in market
            assert "price" in market
            assert "change" in market
        print(f"Market snapshot: {[m['symbol'] for m in data['market_snapshot'][:5]]}")


class TestMarketNarrative:
    """Tests for Market Narrative Engine - /api/dominance/market-narrative"""
    
    def test_market_narrative_english(self, auth_headers):
        """Test market narrative with English language"""
        response = requests.get(
            f"{BASE_URL}/api/dominance/market-narrative?language=en",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "narrative" in data, "Should have narrative field"
        assert "market_regime" in data, "Should have market_regime field"
        assert "market_snapshot" in data, "Should have market_snapshot field"
        assert "generated_at" in data, "Should have generated_at field"
        assert "language" in data
        assert "model" in data
        
        # Verify market regime structure
        regime = data["market_regime"]
        assert "regime" in regime
        assert "confidence" in regime
        assert "description" in regime
        assert regime["regime"] in ["RISK-ON", "RISK-OFF", "CONSOLIDATION", "ROTATION", "TRANSITIONAL", "unknown"]
        
        print(f"Market Narrative (EN): {len(data['narrative'])} chars, Regime: {regime['regime']} ({regime['confidence']}%)")
    
    def test_market_narrative_portuguese(self, auth_headers):
        """Test market narrative with Portuguese language"""
        response = requests.get(
            f"{BASE_URL}/api/dominance/market-narrative?language=pt",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "narrative" in data
        assert data["language"] == "pt"
        assert len(data["narrative"]) > 100
        print(f"Market Narrative (PT): {len(data['narrative'])} chars")
    
    def test_market_narrative_french(self, auth_headers):
        """Test market narrative with French language"""
        response = requests.get(
            f"{BASE_URL}/api/dominance/market-narrative?language=fr",
            headers=auth_headers,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "narrative" in data
        assert data["language"] == "fr"
        print(f"Market Narrative (FR): {len(data['narrative'])} chars")


class TestVoiceNarration:
    """Tests for JARVIS Universal Narration - POST /api/voice/narrate"""
    
    def test_voice_narrate_english(self):
        """Test voice narration in English"""
        response = requests.post(
            f"{BASE_URL}/api/voice/narrate",
            json={"text": "Bitcoin is up 5% today. The market shows bullish momentum.", "language": "en"},
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        assert response.status_code == 200
        assert response.headers.get("Content-Type") == "audio/mpeg"
        assert len(response.content) > 1000, "Should return audio data"
        print(f"Voice Narrate (EN): {len(response.content)} bytes audio")
    
    def test_voice_narrate_portuguese(self):
        """Test voice narration in Portuguese (translates from EN to PT)"""
        response = requests.post(
            f"{BASE_URL}/api/voice/narrate",
            json={"text": "The market is showing strong momentum today.", "language": "pt"},
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        assert response.status_code == 200
        assert response.headers.get("Content-Type") == "audio/mpeg"
        assert len(response.content) > 1000
        print(f"Voice Narrate (PT): {len(response.content)} bytes audio")
    
    def test_voice_narrate_spanish(self):
        """Test voice narration in Spanish"""
        response = requests.post(
            f"{BASE_URL}/api/voice/narrate",
            json={"text": "Analysis shows bullish signals for NVDA.", "language": "es"},
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        assert response.status_code == 200
        assert response.headers.get("Content-Type") == "audio/mpeg"
        print(f"Voice Narrate (ES): {len(response.content)} bytes audio")
    
    def test_voice_narrate_german(self):
        """Test voice narration in German"""
        response = requests.post(
            f"{BASE_URL}/api/voice/narrate",
            json={"text": "Market outlook remains positive.", "language": "de"},
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        assert response.status_code == 200
        assert response.headers.get("Content-Type") == "audio/mpeg"
        print(f"Voice Narrate (DE): {len(response.content)} bytes audio")


class TestExistingEndpoints:
    """Verify existing endpoints still work after i18n changes"""
    
    def test_market_overview(self):
        """Test /api/market/overview still works"""
        response = requests.get(f"{BASE_URL}/api/market/overview")
        assert response.status_code == 200
        data = response.json()
        assert "indices" in data
        assert "trending_stocks" in data
        print(f"Market overview: {len(data['indices'])} indices")
    
    def test_subscription_plans(self):
        """Test /api/subscription/plans still works"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        assert len(data["plans"]) >= 3
        print(f"Subscription plans: {[p['name'] for p in data['plans']]}")
    
    def test_tutorial_steps(self):
        """Test /api/tutorial/steps still works"""
        response = requests.get(f"{BASE_URL}/api/tutorial/steps")
        assert response.status_code == 200
        data = response.json()
        assert "steps" in data
        assert len(data["steps"]) >= 5
        print(f"Tutorial steps: {len(data['steps'])}")
    
    def test_portfolio_authenticated(self, auth_headers):
        """Test /api/portfolio still works (authenticated)"""
        response = requests.get(f"{BASE_URL}/api/portfolio", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "positions" in data or "total_value" in data
        print(f"Portfolio: {data.get('total_value', 0)}")
    
    def test_watchlist_authenticated(self, auth_headers):
        """Test /api/watchlist still works (authenticated)"""
        response = requests.get(f"{BASE_URL}/api/watchlist", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "watchlist" in data or isinstance(data, list)
        print(f"Watchlist endpoint working")


class TestPreviousUnfairAdvantagePages:
    """Test all previous Unfair Advantage endpoints still work"""
    
    def test_trader_dna(self, auth_headers):
        """Test /api/advantage/trader-dna still works"""
        response = requests.get(f"{BASE_URL}/api/advantage/trader-dna", headers=auth_headers)
        assert response.status_code == 200
        print(f"Trader DNA: working")
    
    def test_strategy_marketplace(self, auth_headers):
        """Test /api/advantage/strategies/marketplace still works"""
        response = requests.get(f"{BASE_URL}/api/advantage/strategies/marketplace", headers=auth_headers)
        assert response.status_code == 200
        print(f"Strategy Marketplace: working")
    
    def test_global_intelligence(self, auth_headers):
        """Test /api/advantage/global-intelligence still works"""
        response = requests.get(f"{BASE_URL}/api/advantage/global-intelligence", headers=auth_headers)
        assert response.status_code == 200
        print(f"Global Intelligence: working")
    
    def test_opportunity_scanner(self, auth_headers):
        """Test /api/advantage/opportunity-scanner still works"""
        response = requests.get(f"{BASE_URL}/api/advantage/opportunity-scanner", headers=auth_headers)
        assert response.status_code == 200
        print(f"Opportunity Scanner: working")
    
    def test_top_traders(self, auth_headers):
        """Test /api/advantage/top-traders still works"""
        response = requests.get(f"{BASE_URL}/api/advantage/top-traders", headers=auth_headers)
        assert response.status_code == 200
        print(f"Top Traders: working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
