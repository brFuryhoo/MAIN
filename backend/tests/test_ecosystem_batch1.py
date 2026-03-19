"""
Ecosystem Batch 1 - API Tests
Tests for all 10 ecosystem features:
1. Copy Trading Inteligente (AI-Filtered)
2. Liquidity Intelligence Map
3. Aureos Second Brain
4. AI Trade Journal
5. Daily Missions
6. Correlation Matrix
7. Economic Calendar AI
8. Portfolio Rebalancer AI
9. Referral System
10. Trading Quizzes
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEcosystemPublicEndpoints:
    """Test endpoints that don't require authentication"""
    
    def test_liquidity_map_returns_valid_data(self):
        """Test GET /api/ecosystem/liquidity-map - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/liquidity-map")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify capital_flows array
        assert "capital_flows" in data, "Missing capital_flows"
        assert isinstance(data["capital_flows"], list)
        assert len(data["capital_flows"]) > 0
        flow = data["capital_flows"][0]
        assert "from" in flow and "to" in flow and "volume" in flow
        
        # Verify sector_flows
        assert "sector_flows" in data
        assert isinstance(data["sector_flows"], list)
        assert len(data["sector_flows"]) > 0
        
        # Verify liquidity_zones
        assert "liquidity_zones" in data
        assert "regime" in data
        assert data["regime"] in ["RISK-ON", "RISK-OFF"]
        print(f"Liquidity Map: {len(data['capital_flows'])} flows, regime={data['regime']}")
    
    def test_correlation_matrix_returns_8x8_matrix(self):
        """Test GET /api/ecosystem/correlation-matrix - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/correlation-matrix")
        assert response.status_code == 200
        
        data = response.json()
        assert "assets" in data
        assert "matrix" in data
        assert len(data["assets"]) == 8, f"Expected 8 assets, got {len(data['assets'])}"
        
        # Verify all expected assets
        expected_assets = ["BTC", "ETH", "SPY", "GOLD", "NVDA", "TSLA", "OIL", "DXY"]
        assert data["assets"] == expected_assets
        
        # Verify matrix structure
        for asset in expected_assets:
            assert asset in data["matrix"]
            assert data["matrix"][asset][asset] == 1.0, f"Diagonal for {asset} should be 1.0"
        
        print(f"Correlation Matrix: {len(data['assets'])} assets, BTC-ETH correlation: {data['matrix']['BTC']['ETH']}")
    
    def test_economic_calendar_returns_events(self):
        """Test GET /api/ecosystem/economic-calendar - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/economic-calendar")
        assert response.status_code == 200
        
        data = response.json()
        assert "events" in data
        assert isinstance(data["events"], list)
        assert len(data["events"]) > 0
        
        event = data["events"][0]
        assert "title" in event
        assert "date" in event
        assert "impact" in event
        assert event["impact"] in ["critical", "high", "medium", "low"]
        assert "ai_analysis" in event
        print(f"Economic Calendar: {len(data['events'])} events, first: {event['title']}")
    
    def test_copy_trading_eligible_returns_traders(self):
        """Test GET /api/ecosystem/copy-trading/eligible - returns demo traders if no real data"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/copy-trading/eligible")
        assert response.status_code == 200
        
        data = response.json()
        assert "eligible_traders" in data
        assert isinstance(data["eligible_traders"], list)
        assert len(data["eligible_traders"]) > 0
        
        trader = data["eligible_traders"][0]
        assert "user_id" in trader
        assert "name" in trader
        assert "ai_rating" in trader
        assert "win_rate" in trader
        assert "risk_level" in trader
        assert trader["risk_level"] in ["low", "moderate", "high"]
        print(f"Copy Trading: {len(data['eligible_traders'])} eligible traders")
    
    def test_quiz_returns_5_questions(self):
        """Test GET /api/ecosystem/quiz - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/quiz")
        assert response.status_code == 200
        
        data = response.json()
        assert "questions" in data
        assert "total" in data
        assert data["total"] == 5, f"Expected 5 questions, got {data['total']}"
        
        q = data["questions"][0]
        assert "q" in q
        assert "options" in q
        assert len(q["options"]) == 4
        assert "answer" in q
        assert "explanation" in q
        print(f"Quiz: {data['total']} questions loaded")


class TestEcosystemAuthenticatedEndpoints:
    """Test endpoints that require authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "test"}
        )
        if login_response.status_code == 200:
            # API returns access_token, not token
            self.token = login_response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Login failed - skipping authenticated tests")
    
    def test_second_brain_returns_memory_and_patterns(self):
        """Test GET /api/ecosystem/second-brain - requires auth"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/second-brain", headers=self.headers)
        assert response.status_code == 200, f"Got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "memory" in data
        assert "patterns" in data
        assert "insights" in data
        
        memory = data["memory"]
        assert "total_decisions" in memory
        assert "win_rate" in memory
        assert "total_pnl" in memory
        
        patterns = data["patterns"]
        assert "best_day" in patterns
        assert "worst_day" in patterns
        assert "best_asset" in patterns
        
        print(f"Second Brain: {memory['total_decisions']} decisions, win_rate: {memory['win_rate']}%")
    
    def test_daily_missions_returns_5_missions(self):
        """Test GET /api/ecosystem/missions/daily - requires auth"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/missions/daily", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "missions" in data
        assert "total_count" in data
        assert data["total_count"] == 5, f"Expected 5 missions, got {data['total_count']}"
        
        mission = data["missions"][0]
        assert "id" in mission
        assert "title" in mission
        assert "description" in mission
        assert "reward" in mission
        assert "completed" in mission
        print(f"Daily Missions: {len(data['missions'])} missions, total reward: {data.get('total_reward', 'N/A')} AT")
    
    def test_complete_mission(self):
        """Test POST /api/ecosystem/missions/complete/{id} - requires auth"""
        # First get missions to find one to complete
        missions_res = requests.get(f"{BASE_URL}/api/ecosystem/missions/daily", headers=self.headers)
        missions = missions_res.json().get("missions", [])
        
        # Find an uncompleted mission
        uncompleted = next((m for m in missions if not m.get("completed")), None)
        if not uncompleted:
            pytest.skip("All missions already completed")
        
        mission_id = uncompleted["id"]
        response = requests.post(f"{BASE_URL}/api/ecosystem/missions/complete/{mission_id}", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        # Can be success=True (just completed) or success=False (already completed)
        print(f"Mission complete response: {data}")
    
    def test_trade_journal_returns_journal(self):
        """Test GET /api/ecosystem/trade-journal - requires auth"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/trade-journal?limit=10", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "journal" in data
        assert "total" in data
        assert isinstance(data["journal"], list)
        
        if len(data["journal"]) > 0:
            entry = data["journal"][0]
            assert "symbol" in entry
            assert "pnl" in entry
            assert "ai_insight" in entry
            assert "grade" in entry
            print(f"Trade Journal: {data['total']} entries, first symbol: {entry['symbol']}")
        else:
            print("Trade Journal: Empty (no closed trades)")
    
    def test_referral_returns_code(self):
        """Test GET /api/ecosystem/referral - requires auth"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/referral", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "code" in data
        assert "referrals" in data
        assert "tokens_earned" in data
        assert "reward_per_referral" in data
        assert data["code"].startswith("AUREOS_")
        print(f"Referral: code={data['code']}, referrals={data['referrals']}")
    
    def test_copy_trading_start(self):
        """Test POST /api/ecosystem/copy-trading/start/{id} - requires auth"""
        # Get eligible traders first
        eligible_res = requests.get(f"{BASE_URL}/api/ecosystem/copy-trading/eligible", headers=self.headers)
        traders = eligible_res.json().get("eligible_traders", [])
        
        if not traders:
            pytest.skip("No eligible traders")
        
        trader_id = traders[0]["user_id"]
        response = requests.post(f"{BASE_URL}/api/ecosystem/copy-trading/start/{trader_id}", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        # Either success or already copying
        assert "success" in data or "message" in data
        print(f"Copy Trading start: {data}")
    
    def test_copy_trading_active(self):
        """Test GET /api/ecosystem/copy-trading/active - requires auth"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/copy-trading/active", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "active_copies" in data
        assert "total" in data
        print(f"Active Copies: {data['total']}")
    
    def test_rebalancer_returns_suggestions(self):
        """Test GET /api/ecosystem/rebalancer - requires auth"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/rebalancer", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "current_positions" in data
        assert "suggestions" in data
        assert "optimal_allocation" in data
        assert "risk_profile" in data
        
        allocation = data["optimal_allocation"]
        assert "crypto" in allocation
        assert "stocks" in allocation
        assert "bonds" in allocation
        print(f"Rebalancer: risk_profile={data['risk_profile']}, suggestions={len(data['suggestions'])}")
    
    def test_quiz_submit(self):
        """Test POST /api/ecosystem/quiz/submit - requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/ecosystem/quiz/submit",
            json={"correct": 3, "total": 5},
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "score" in data
        assert "correct" in data
        assert "reward" in data
        assert data["score"] == 60, f"Expected 60%, got {data['score']}%"
        assert data["reward"] == 3, f"Expected 3 tokens, got {data['reward']}"
        print(f"Quiz Submit: score={data['score']}%, reward={data['reward']} AT")


class TestEcosystemUnauthorizedAccess:
    """Test endpoints return 401 without auth"""
    
    def test_second_brain_requires_auth(self):
        """Second brain should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/second-brain")
        assert response.status_code == 401
    
    def test_daily_missions_requires_auth(self):
        """Daily missions should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/missions/daily")
        assert response.status_code == 401
    
    def test_trade_journal_requires_auth(self):
        """Trade journal should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/trade-journal")
        assert response.status_code == 401
    
    def test_referral_requires_auth(self):
        """Referral should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/referral")
        assert response.status_code == 401
    
    def test_rebalancer_requires_auth(self):
        """Rebalancer should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/ecosystem/rebalancer")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
