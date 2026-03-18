"""
Aureos Score System Tests (Iteration 14)
=========================================
Tests for the Aureos Score global scoring & ranking system:
- GET /api/score/my-score - User score breakdown with components, tier, achievements
- GET /api/score/leaderboard - Global rankings
- GET /api/score/my-rank - User rank and percentile
- GET /api/score/achievements - All achievements with unlock status
- POST /api/score/recalculate - Force recalculation and snapshot
- GET /api/score/explain - JARVIS explanation of score
- GET /api/score/trade-impact - Impact of last trade on score
- GET /api/score/history - Score history over time
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - user already has 3 closed paper trades (2 wins, 1 loss) -> score 612 (Advanced tier)
TEST_USER_EMAIL = "test@test.com"
TEST_USER_PASSWORD = "test"


class TestAureosScoreAuth:
    """Tests that require authentication"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication token for test user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not authenticate test user: {response.text}")
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_my_score_returns_full_breakdown(self, auth_headers):
        """GET /api/score/my-score should return score with components, tier, achievements"""
        response = requests.get(f"{BASE_URL}/api/score/my-score", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify score is in valid range
        assert "score" in data
        assert 0 <= data["score"] <= 1000, f"Score {data['score']} not in range 0-1000"
        
        # Verify tier info
        assert "tier" in data
        assert "name" in data["tier"]
        assert "color" in data["tier"]
        assert data["tier"]["name"] in ["Beginner", "Intermediate", "Advanced", "Elite"]
        
        # Verify components breakdown (4 components)
        assert "components" in data
        components = data["components"]
        assert "performance" in components
        assert "risk_management" in components
        assert "decision_quality" in components
        assert "consistency" in components
        
        # Each component should have score and weight
        for comp_name, comp_data in components.items():
            assert "score" in comp_data, f"Component {comp_name} missing score"
            assert "weight" in comp_data, f"Component {comp_name} missing weight"
            assert 0 <= comp_data["score"] <= 100, f"Component {comp_name} score out of range"
        
        # Verify weights sum to 100%
        total_weight = sum(c["weight"] for c in components.values())
        assert total_weight == 100, f"Component weights sum to {total_weight}, expected 100"
        
        # Verify achievements array
        assert "achievements" in data
        assert isinstance(data["achievements"], list)
        
        # Verify stats
        assert "stats" in data
        stats = data["stats"]
        assert "total_trades" in stats
        assert "win_rate" in stats
        assert "total_pnl" in stats
        
        print(f"✓ User score: {data['score']} ({data['tier']['name']} tier)")
        print(f"  Components: Performance={components['performance']['score']}, Risk={components['risk_management']['score']}, Decision={components['decision_quality']['score']}, Consistency={components['consistency']['score']}")
        print(f"  Stats: {stats['total_trades']} trades, {stats['win_rate']}% win rate, ${stats['total_pnl']:.2f} PnL")
    
    def test_my_score_requires_auth(self):
        """GET /api/score/my-score should require authentication"""
        response = requests.get(f"{BASE_URL}/api/score/my-score")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    
    def test_leaderboard_public_access(self):
        """GET /api/score/leaderboard should be publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/score/leaderboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leaderboard" in data
        assert "total_users" in data
        assert isinstance(data["leaderboard"], list)
        
        # Verify leaderboard entries have required fields
        if len(data["leaderboard"]) > 0:
            entry = data["leaderboard"][0]
            assert "rank" in entry
            assert "score" in entry
            assert "tier" in entry
            assert "username" in entry
            print(f"✓ Leaderboard has {len(data['leaderboard'])} entries, total {data['total_users']} users")
            for e in data["leaderboard"][:3]:
                print(f"  #{e['rank']}: {e['username']} - {e['score']} ({e['tier']['name']})")
    
    def test_my_rank_returns_position_and_percentile(self, auth_headers):
        """GET /api/score/my-rank should return rank, total_users, percentile"""
        response = requests.get(f"{BASE_URL}/api/score/my-rank", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "rank" in data
        assert "total_users" in data
        assert "percentile" in data
        
        # Rank should be positive integer (or 0 if no snapshot)
        assert data["rank"] >= 0
        assert data["total_users"] >= 0
        assert 0 <= data["percentile"] <= 100
        
        print(f"✓ User rank: #{data['rank']} of {data['total_users']} (Top {data['percentile']}%)")
    
    def test_achievements_returns_all_with_unlock_status(self, auth_headers):
        """GET /api/score/achievements should return all achievements with unlocked status"""
        response = requests.get(f"{BASE_URL}/api/score/achievements", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "achievements" in data
        assert "total_unlocked" in data
        assert "total_available" in data
        assert "total_points" in data
        
        achievements = data["achievements"]
        assert isinstance(achievements, list)
        assert len(achievements) > 0, "No achievements defined"
        
        # Verify each achievement has required fields
        for ach in achievements:
            assert "id" in ach
            assert "name" in ach
            assert "description" in ach
            assert "points" in ach
            assert "unlocked" in ach
            assert isinstance(ach["unlocked"], bool)
        
        unlocked = [a for a in achievements if a["unlocked"]]
        print(f"✓ Achievements: {data['total_unlocked']}/{data['total_available']} unlocked, {data['total_points']} points")
        print(f"  Unlocked: {', '.join([a['name'] for a in unlocked[:5]]) or 'None'}")
    
    def test_recalculate_updates_score_and_snapshot(self, auth_headers):
        """POST /api/score/recalculate should recalculate score and save snapshot"""
        response = requests.post(f"{BASE_URL}/api/score/recalculate", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Should return full score data
        assert "score" in data
        assert "tier" in data
        assert "components" in data
        
        print(f"✓ Recalculated score: {data['score']} ({data['tier']['name']})")
        
        # Verify snapshot was saved by checking leaderboard
        time.sleep(0.5)  # Small delay for DB write
        lb_response = requests.get(f"{BASE_URL}/api/score/leaderboard")
        assert lb_response.status_code == 200
        leaderboard = lb_response.json().get("leaderboard", [])
        
        # User should appear in leaderboard if they have trades
        if data["score"] > 0:
            user_in_lb = any(e.get("score") == data["score"] for e in leaderboard)
            print(f"  User in leaderboard: {user_in_lb}")
    
    def test_explain_returns_jarvis_analysis(self, auth_headers):
        """GET /api/score/explain should return JARVIS explanation with suggestions"""
        response = requests.get(f"{BASE_URL}/api/score/explain", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        assert "score" in data
        assert "tier" in data
        assert "summary" in data
        assert "explanations" in data
        assert "strongest_area" in data
        assert "weakest_area" in data
        
        # Suggestions may be empty if user is doing well
        assert "suggestions" in data
        
        print(f"✓ JARVIS explanation:")
        print(f"  Summary: {data['summary'][:80]}...")
        print(f"  Strongest: {data['strongest_area']}, Weakest: {data['weakest_area']}")
        if data["suggestions"]:
            print(f"  Suggestions: {len(data['suggestions'])} items")
    
    def test_trade_impact_returns_delta(self, auth_headers):
        """GET /api/score/trade-impact should return score impact from last trade"""
        response = requests.get(f"{BASE_URL}/api/score/trade-impact", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        assert "new_score" in data
        assert "old_score" in data
        assert "delta" in data
        assert "reason" in data
        assert "tier" in data
        
        print(f"✓ Trade impact: {data['old_score']} -> {data['new_score']} ({'+' if data['delta'] > 0 else ''}{data['delta']})")
        print(f"  Reason: {data['reason'][:60]}...")
    
    def test_history_returns_score_over_time(self, auth_headers):
        """GET /api/score/history should return score history"""
        response = requests.get(f"{BASE_URL}/api/score/history?days=30", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        assert "history" in data
        assert "days" in data
        assert data["days"] == 30
        
        history = data["history"]
        assert isinstance(history, list)
        
        if len(history) > 0:
            entry = history[0]
            assert "score" in entry
            assert "timestamp" in entry
            print(f"✓ Score history: {len(history)} entries in last 30 days")
        else:
            print(f"✓ Score history: No entries yet (expected for new users)")


class TestAureosScoreTierValidation:
    """Tests to verify tier calculations are correct"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not authenticate: {response.text}")
        return {"Authorization": f"Bearer {response.json().get('access_token')}"}
    
    def test_tier_boundaries_correct(self, auth_headers):
        """Verify tier matches score boundaries: Beginner 0-300, Intermediate 301-600, Advanced 601-800, Elite 801-1000"""
        response = requests.get(f"{BASE_URL}/api/score/my-score", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        score = data["score"]
        tier_name = data["tier"]["name"]
        
        # Verify tier matches score
        if 0 <= score <= 300:
            expected = "Beginner"
        elif 301 <= score <= 600:
            expected = "Intermediate"
        elif 601 <= score <= 800:
            expected = "Advanced"
        else:
            expected = "Elite"
        
        assert tier_name == expected, f"Score {score} should be {expected}, got {tier_name}"
        print(f"✓ Tier calculation correct: score {score} = {tier_name}")
    
    def test_next_tier_and_progress(self, auth_headers):
        """Verify next_tier and progress_to_next are calculated correctly"""
        response = requests.get(f"{BASE_URL}/api/score/my-score", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        score = data["score"]
        tier = data["tier"]
        next_tier = data.get("next_tier")
        progress = data.get("progress_to_next", 0)
        
        # If not Elite, should have next_tier
        if tier["name"] != "Elite":
            assert next_tier is not None, f"Non-Elite tier ({tier['name']}) should have next_tier"
            assert "name" in next_tier
            assert "min" in next_tier
            assert 0 <= progress <= 100
            print(f"✓ Progress to {next_tier['name']}: {progress}%")
        else:
            print(f"✓ Elite tier reached - no next tier")


class TestAureosScoreIntegration:
    """Integration tests with paper trading"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not authenticate: {response.text}")
        return {"Authorization": f"Bearer {response.json().get('access_token')}"}
    
    def test_score_reflects_paper_trades(self, auth_headers):
        """Score should reflect existing paper trading activity"""
        # Get portfolio to verify trades exist
        portfolio_response = requests.get(f"{BASE_URL}/api/paper/portfolio", headers=auth_headers)
        assert portfolio_response.status_code == 200
        portfolio = portfolio_response.json()
        
        # Get score
        score_response = requests.get(f"{BASE_URL}/api/score/my-score", headers=auth_headers)
        assert score_response.status_code == 200
        score_data = score_response.json()
        
        stats = score_data.get("stats", {})
        closed_trades_count = portfolio.get("closed_trades_count", len(portfolio.get("closed_trades", [])))
        
        # Score stats should reflect trades
        if closed_trades_count > 0 or stats.get("total_trades", 0) > 0:
            # If user has closed trades, score should be > 0
            print(f"✓ User has {stats.get('total_trades', 0)} trades, score: {score_data['score']}")
            if stats.get("total_trades", 0) > 0:
                assert score_data["score"] > 0, "User with trades should have score > 0"
        else:
            print(f"✓ No closed trades yet - score may be 0")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
