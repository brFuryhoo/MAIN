"""
Aureos AI - DISTRIBUTION ENGINE + TRADER EVOLUTION Tests
=========================================================
Testing: Share Cards, Trader Evolution Path, Strategy Creator
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://aureos-hub.preview.emergentagent.com"

# Test credentials
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "test"


class TestHealthAndAuth:
    """Basic health and authentication tests"""

    def test_api_health(self):
        """API health check"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "operational"
        print("API health check: PASSED")

    def test_login_success(self):
        """Login with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Login successful: {data['user']['email']}")
        return data["access_token"]


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDistributionScoreCard:
    """Test Score Card endpoint"""

    def test_score_card_generation(self, auth_headers):
        """GET /api/distribution/card/score returns score card data"""
        response = requests.get(
            f"{BASE_URL}/api/distribution/card/score",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "card_id" in data
        assert "card_type" in data
        assert data["card_type"] == "score"
        assert "score" in data
        assert "tier" in data
        assert "tier_color" in data
        assert "total_trades" in data
        assert "win_rate" in data
        assert "share_text" in data
        assert "share_url" in data
        assert "generated_at" in data
        
        print(f"Score Card: score={data['score']}, tier={data['tier']}, win_rate={data['win_rate']}%")
        print(f"Share text: {data['share_text']}")

    def test_score_card_requires_auth(self):
        """Score card requires authentication"""
        response = requests.get(f"{BASE_URL}/api/distribution/card/score")
        assert response.status_code == 401
        print("Score card auth check: PASSED (401 without auth)")


class TestDistributionPerformanceCard:
    """Test Performance Card endpoint"""

    def test_performance_card_generation(self, auth_headers):
        """GET /api/distribution/card/performance returns performance card data"""
        response = requests.get(
            f"{BASE_URL}/api/distribution/card/performance",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "card_id" in data
        assert "card_type" in data
        assert data["card_type"] == "performance"
        assert "total_pnl" in data
        assert "best_trade" in data
        assert "worst_trade" in data
        assert "total_trades" in data
        assert "win_rate" in data
        assert "aureos_score" in data
        assert "tier" in data
        assert "verified" in data
        assert data["verified"] == True
        assert "share_text" in data
        assert "share_url" in data
        
        print(f"Performance Card: P&L=${data['total_pnl']}, best=${data['best_trade']}, trades={data['total_trades']}")
        print(f"Share text: {data['share_text']}")

    def test_performance_card_requires_auth(self):
        """Performance card requires authentication"""
        response = requests.get(f"{BASE_URL}/api/distribution/card/performance")
        assert response.status_code == 401
        print("Performance card auth check: PASSED (401 without auth)")


class TestTraderEvolution:
    """Test Trader Evolution Path endpoint"""

    def test_evolution_path(self, auth_headers):
        """GET /api/distribution/evolution returns evolution data"""
        response = requests.get(
            f"{BASE_URL}/api/distribution/evolution",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "current_level" in data
        assert "next_level" in data or data["next_level"] is None  # Can be None at max level
        assert "progress_to_next" in data
        assert "score" in data
        assert "total_trades" in data
        assert "unlocked_features" in data
        assert "all_levels" in data
        
        # Verify current level structure
        current = data["current_level"]
        assert "level" in current
        assert "name" in current
        assert "tier" in current
        assert "min_score" in current
        assert "min_trades" in current
        assert "color" in current
        assert "unlocks" in current
        
        # Verify all 8 levels exist
        assert len(data["all_levels"]) == 8
        
        # Verify level names match expected evolution path
        expected_names = ["Novice", "Apprentice", "Trader", "Strategist", "Operator", "Quantitative", "Elite", "Legendary"]
        actual_names = [lvl["name"] for lvl in data["all_levels"]]
        assert actual_names == expected_names, f"Expected {expected_names}, got {actual_names}"
        
        # Verify each level has required fields
        for lvl in data["all_levels"]:
            assert "level" in lvl
            assert "name" in lvl
            assert "is_current" in lvl
            assert "is_unlocked" in lvl
            assert "is_locked" in lvl
            assert "unlocks" in lvl
        
        print(f"Evolution: Level {current['level']} ({current['name']}) - {current['tier']}")
        print(f"Progress: {data['progress_to_next']}% to next level")
        print(f"Score: {data['score']}, Trades: {data['total_trades']}")
        print(f"Unlocked features: {len(data['unlocked_features'])}")

    def test_evolution_requires_auth(self):
        """Evolution path requires authentication"""
        response = requests.get(f"{BASE_URL}/api/distribution/evolution")
        assert response.status_code == 401
        print("Evolution auth check: PASSED (401 without auth)")

    def test_evolution_level_progression(self, auth_headers):
        """Verify evolution levels have correct min requirements"""
        response = requests.get(
            f"{BASE_URL}/api/distribution/evolution",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify min requirements increase with levels
        prev_score = -1
        prev_trades = -1
        for lvl in data["all_levels"]:
            assert lvl["min_score"] >= prev_score, f"Level {lvl['name']} score requirement should increase"
            assert lvl["min_trades"] >= prev_trades, f"Level {lvl['name']} trades requirement should increase"
            prev_score = lvl["min_score"]
            prev_trades = lvl["min_trades"]
        
        print("Evolution level progression: PASSED (requirements increase correctly)")


class TestStrategyCreator:
    """Test Strategy Creator endpoint"""

    def test_create_strategy(self, auth_headers):
        """POST /api/advantage/strategies/create creates a strategy"""
        import uuid
        strategy_data = {
            "name": f"TEST_Strategy_{uuid.uuid4().hex[:6]}",
            "description": "Test strategy for automated testing - momentum breakout approach",
            "asset_class": "stocks",
            "timeframe": "1D",
            "risk_level": "moderate",
            "rules": [
                "Enter on breakout above 20-day high",
                "Stop loss at 2x ATR",
                "Target 3x risk"
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/advantage/strategies/create",
            json=strategy_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "success" in data
        assert data["success"] == True
        assert "strategy" in data
        
        strategy = data["strategy"]
        assert "id" in strategy
        assert strategy["name"] == strategy_data["name"]
        assert strategy["description"] == strategy_data["description"]
        assert strategy["asset_class"] == strategy_data["asset_class"]
        assert strategy["timeframe"] == strategy_data["timeframe"]
        assert strategy["risk_level"] == strategy_data["risk_level"]
        assert strategy["rules"] == strategy_data["rules"]
        assert strategy["status"] == "active"
        assert "created_at" in strategy
        
        print(f"Created strategy: {strategy['name']} (ID: {strategy['id']})")
        return strategy["id"]

    def test_create_strategy_requires_auth(self):
        """Strategy creation requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/advantage/strategies/create",
            json={"name": "Test", "description": "Test description for validation"}
        )
        assert response.status_code == 401
        print("Strategy create auth check: PASSED (401 without auth)")

    def test_my_strategies(self, auth_headers):
        """GET /api/advantage/strategies/my-strategies returns user strategies"""
        response = requests.get(
            f"{BASE_URL}/api/advantage/strategies/my-strategies",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "created" in data
        assert "subscribed" in data
        assert isinstance(data["created"], list)
        assert isinstance(data["subscribed"], list)
        
        print(f"My strategies: {len(data['created'])} created, {len(data['subscribed'])} subscribed")


class TestStrategyMarketplace:
    """Test existing Strategy Marketplace endpoint"""

    def test_marketplace_list(self):
        """GET /api/advantage/strategies/marketplace returns strategies"""
        response = requests.get(f"{BASE_URL}/api/advantage/strategies/marketplace")
        assert response.status_code == 200
        data = response.json()
        
        assert "strategies" in data
        assert "total" in data
        assert isinstance(data["strategies"], list)
        
        if data["strategies"]:
            strategy = data["strategies"][0]
            assert "id" in strategy
            assert "name" in strategy
            assert "description" in strategy
            
        print(f"Marketplace: {data['total']} strategies available")


class TestSharedCardRetrieval:
    """Test shared card public retrieval"""

    def test_get_shared_card(self, auth_headers):
        """Generate and retrieve a shared card"""
        # First generate a score card
        gen_response = requests.get(
            f"{BASE_URL}/api/distribution/card/score",
            headers=auth_headers
        )
        assert gen_response.status_code == 200
        card_id = gen_response.json()["card_id"]
        
        # Now retrieve it (public endpoint)
        response = requests.get(f"{BASE_URL}/api/distribution/card/{card_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["card_id"] == card_id
        assert data["card_type"] == "score"
        print(f"Shared card retrieval: PASSED (card_id: {card_id})")

    def test_get_nonexistent_card(self):
        """Nonexistent card returns 404"""
        response = requests.get(f"{BASE_URL}/api/distribution/card/nonexistent_card_123")
        assert response.status_code == 404
        print("Nonexistent card check: PASSED (404)")


class TestExistingFeatures:
    """Verify existing features still work"""

    def test_dashboard_data(self, auth_headers):
        """Dashboard endpoints still working"""
        response = requests.get(f"{BASE_URL}/api/market/overview")
        assert response.status_code == 200
        print("Market overview: PASSED")

    def test_subscription_plans(self):
        """Subscription plans endpoint"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        print(f"Subscription plans: {len(data['plans'])} plans available")

    def test_tutorial_steps(self):
        """Tutorial endpoint"""
        response = requests.get(f"{BASE_URL}/api/tutorial/steps")
        assert response.status_code == 200
        data = response.json()
        assert "steps" in data
        print(f"Tutorial: {len(data['steps'])} steps available")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
