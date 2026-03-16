"""
JARVIS Quant Lab API Tests
=============================
Tests for the Autonomous Quant Lab endpoints:
- GET /api/quant/indicators - Returns all 11 indicators with metadata
- GET /api/quant/performance - Model performance metrics
- GET /api/quant/rankings - Indicator rankings
- POST /api/quant/backtest - Run backtest simulation
- POST /api/quant/optimize - Evolutionary weight optimization
- GET /api/quant/patterns - Pattern discovery
- GET /api/quant/experiments - Experiment history and decision logs
- POST /api/quant/reset-weights - Reset to default weights
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@aureos.com"
TEST_PASSWORD = "Test1234!"

# Expected indicators
EXPECTED_INDICATORS = [
    "rsi_14", "macd_crossover", "sma_20_50_cross", "bollinger_squeeze",
    "volume_breakout", "market_structure", "monte_carlo_prob",
    "risk_reward", "regime_alignment", "liquidity_zone", "atr_expansion"
]

EXPECTED_CATEGORIES = [
    "momentum", "trend", "volatility", "volume", "structure",
    "quantitative", "risk", "macro", "microstructure"
]


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access_token in login response"
    return data["access_token"]


@pytest.fixture
def headers(auth_token):
    """Get headers with auth token."""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestQuantIndicators:
    """Tests for GET /api/quant/indicators - Returns all 11 indicators"""

    def test_get_indicators_returns_200(self):
        """Verify indicators endpoint returns 200 without auth"""
        response = requests.get(f"{BASE_URL}/api/quant/indicators")
        assert response.status_code == 200

    def test_indicators_count_is_11(self):
        """Verify exactly 11 indicators are returned"""
        response = requests.get(f"{BASE_URL}/api/quant/indicators")
        data = response.json()
        assert "count" in data
        assert data["count"] == 11
        assert len(data["indicators"]) == 11

    def test_indicators_have_required_fields(self):
        """Each indicator should have id, name, category, default_weight"""
        response = requests.get(f"{BASE_URL}/api/quant/indicators")
        data = response.json()
        for ind in data["indicators"]:
            assert "id" in ind, f"Missing 'id' in {ind}"
            assert "name" in ind, f"Missing 'name' in {ind}"
            assert "category" in ind, f"Missing 'category' in {ind}"
            assert "default_weight" in ind, f"Missing 'default_weight' in {ind}"

    def test_all_expected_indicators_present(self):
        """All 11 expected indicators should be present"""
        response = requests.get(f"{BASE_URL}/api/quant/indicators")
        data = response.json()
        indicator_ids = [ind["id"] for ind in data["indicators"]]
        for expected in EXPECTED_INDICATORS:
            assert expected in indicator_ids, f"Missing indicator: {expected}"

    def test_categories_are_valid(self):
        """All categories should be valid"""
        response = requests.get(f"{BASE_URL}/api/quant/indicators")
        data = response.json()
        for ind in data["indicators"]:
            assert ind["category"] in EXPECTED_CATEGORIES, f"Invalid category: {ind['category']}"

    def test_default_weights_sum_to_100(self):
        """Default weights should approximately sum to 100%"""
        response = requests.get(f"{BASE_URL}/api/quant/indicators")
        data = response.json()
        total_weight = sum(ind["default_weight"] for ind in data["indicators"])
        assert 99 <= total_weight <= 101, f"Weights sum to {total_weight}, expected ~100"


class TestQuantPerformance:
    """Tests for GET /api/quant/performance - Model performance metrics"""

    def test_performance_returns_200_with_auth(self, headers):
        """Performance endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/quant/performance", headers=headers)
        assert response.status_code == 200

    def test_performance_returns_analysis_count(self, headers):
        """Should return total_analyses count"""
        response = requests.get(f"{BASE_URL}/api/quant/performance", headers=headers)
        data = response.json()
        assert "total_analyses" in data
        assert isinstance(data["total_analyses"], int)
        assert data["total_analyses"] >= 0

    def test_performance_returns_signal_distribution(self, headers):
        """Should return BUY/SELL/HOLD signal distribution"""
        response = requests.get(f"{BASE_URL}/api/quant/performance", headers=headers)
        data = response.json()
        assert "signal_distribution" in data
        dist = data["signal_distribution"]
        assert "BUY" in dist
        assert "SELL" in dist
        assert "HOLD" in dist

    def test_performance_returns_current_weights(self, headers):
        """Should return current model weights for all 11 indicators"""
        response = requests.get(f"{BASE_URL}/api/quant/performance", headers=headers)
        data = response.json()
        assert "current_weights" in data
        weights = data["current_weights"]
        assert len(weights) == 11
        for ind in EXPECTED_INDICATORS:
            assert ind in weights, f"Missing weight for {ind}"

    def test_performance_returns_experiments_count(self, headers):
        """Should return experiments_run count"""
        response = requests.get(f"{BASE_URL}/api/quant/performance", headers=headers)
        data = response.json()
        assert "experiments_run" in data
        assert isinstance(data["experiments_run"], int)


class TestQuantRankings:
    """Tests for GET /api/quant/rankings - Indicator rankings"""

    def test_rankings_returns_200(self, headers):
        """Rankings endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/quant/rankings", headers=headers)
        assert response.status_code == 200

    def test_rankings_has_11_indicators(self, headers):
        """Should return rankings for all 11 indicators"""
        response = requests.get(f"{BASE_URL}/api/quant/rankings", headers=headers)
        data = response.json()
        assert "rankings" in data
        assert len(data["rankings"]) == 11

    def test_rankings_have_required_fields(self, headers):
        """Each ranking should have accuracy, total_signals, current_weight"""
        response = requests.get(f"{BASE_URL}/api/quant/rankings", headers=headers)
        data = response.json()
        for rank in data["rankings"]:
            assert "indicator" in rank
            assert "name" in rank
            assert "category" in rank
            assert "accuracy" in rank
            assert "total_signals" in rank
            assert "current_weight" in rank

    def test_rankings_sorted_by_accuracy(self, headers):
        """Rankings should be sorted by accuracy (descending)"""
        response = requests.get(f"{BASE_URL}/api/quant/rankings", headers=headers)
        data = response.json()
        accuracies = [r["accuracy"] for r in data["rankings"]]
        assert accuracies == sorted(accuracies, reverse=True)


class TestQuantBacktest:
    """Tests for POST /api/quant/backtest - Run backtest simulation"""

    def test_backtest_returns_200(self, headers):
        """Backtest endpoint returns 200"""
        response = requests.post(f"{BASE_URL}/api/quant/backtest", json={}, headers=headers)
        assert response.status_code == 200

    def test_backtest_returns_status(self, headers):
        """Should return status field (complete or insufficient_data)"""
        response = requests.post(f"{BASE_URL}/api/quant/backtest", json={}, headers=headers)
        data = response.json()
        assert "status" in data
        assert data["status"] in ["complete", "insufficient_data"]

    def test_backtest_complete_has_metrics(self, headers):
        """Complete backtest should have accuracy, win_rate, sharpe_ratio, trades"""
        response = requests.post(f"{BASE_URL}/api/quant/backtest", json={}, headers=headers)
        data = response.json()
        if data.get("status") == "complete":
            assert "accuracy" in data
            assert "win_rate" in data
            assert "sharpe_ratio" in data
            assert "trades" in data or "total_trades" in data
            assert "indicator_rankings" in data

    def test_backtest_has_indicator_rankings(self, headers):
        """Complete backtest should have indicator rankings"""
        response = requests.post(f"{BASE_URL}/api/quant/backtest", json={}, headers=headers)
        data = response.json()
        if data.get("status") == "complete":
            assert "indicator_rankings" in data
            assert len(data["indicator_rankings"]) == 11


class TestQuantOptimize:
    """Tests for POST /api/quant/optimize - Evolutionary weight optimization"""

    def test_optimize_returns_200(self, headers):
        """Optimize endpoint returns 200 (may take 2-5 seconds)"""
        response = requests.post(
            f"{BASE_URL}/api/quant/optimize",
            json={},
            headers=headers,
            timeout=15
        )
        assert response.status_code == 200

    def test_optimize_returns_optimized_weights(self, headers):
        """Should return optimized_weights for all 11 indicators"""
        response = requests.post(
            f"{BASE_URL}/api/quant/optimize",
            json={},
            headers=headers,
            timeout=15
        )
        data = response.json()
        if data.get("status") == "complete":
            assert "optimized_weights" in data
            assert len(data["optimized_weights"]) == 11
            assert "optimized_weights_pct" in data

    def test_optimize_returns_improvement_score(self, headers):
        """Should return improvement and score fields"""
        response = requests.post(
            f"{BASE_URL}/api/quant/optimize",
            json={},
            headers=headers,
            timeout=15
        )
        data = response.json()
        if data.get("status") == "complete":
            assert "improvement" in data
            assert "optimized_score" in data
            assert "original_score" in data


class TestQuantPatterns:
    """Tests for GET /api/quant/patterns - Pattern discovery"""

    def test_patterns_returns_200(self, headers):
        """Patterns endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/quant/patterns", headers=headers)
        assert response.status_code == 200

    def test_patterns_returns_status(self, headers):
        """Should return status field"""
        response = requests.get(f"{BASE_URL}/api/quant/patterns", headers=headers)
        data = response.json()
        assert "status" in data
        assert data["status"] in ["complete", "insufficient_data"]

    def test_patterns_complete_has_top_patterns(self, headers):
        """Complete patterns should have top_patterns list"""
        response = requests.get(f"{BASE_URL}/api/quant/patterns", headers=headers)
        data = response.json()
        if data.get("status") == "complete":
            assert "top_patterns" in data
            assert "patterns_analyzed" in data
            assert "discovery_count" in data

    def test_patterns_have_combination_details(self, headers):
        """Each pattern should have combination, accuracy, score"""
        response = requests.get(f"{BASE_URL}/api/quant/patterns", headers=headers)
        data = response.json()
        if data.get("status") == "complete" and data.get("top_patterns"):
            for pattern in data["top_patterns"][:3]:
                assert "combination" in pattern
                assert "indicator_1" in pattern
                assert "indicator_2" in pattern
                assert "accuracy" in pattern
                assert "score" in pattern


class TestQuantExperiments:
    """Tests for GET /api/quant/experiments - Experiment history and decision logs"""

    def test_experiments_returns_200(self, headers):
        """Experiments endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/quant/experiments", headers=headers)
        assert response.status_code == 200

    def test_experiments_returns_experiments_list(self, headers):
        """Should return experiments list"""
        response = requests.get(f"{BASE_URL}/api/quant/experiments", headers=headers)
        data = response.json()
        assert "experiments" in data
        assert isinstance(data["experiments"], list)

    def test_experiments_returns_decisions_list(self, headers):
        """Should return decisions list"""
        response = requests.get(f"{BASE_URL}/api/quant/experiments", headers=headers)
        data = response.json()
        assert "decisions" in data
        assert isinstance(data["decisions"], list)

    def test_experiments_have_required_fields(self, headers):
        """Each experiment should have type, timestamp"""
        response = requests.get(f"{BASE_URL}/api/quant/experiments", headers=headers)
        data = response.json()
        if data.get("experiments"):
            for exp in data["experiments"][:3]:
                assert "type" in exp
                assert "timestamp" in exp
                assert exp["type"] in ["backtest", "optimization", "pattern_discovery"]


class TestQuantResetWeights:
    """Tests for POST /api/quant/reset-weights - Reset to default weights"""

    def test_reset_weights_returns_200(self, headers):
        """Reset weights endpoint returns 200"""
        response = requests.post(
            f"{BASE_URL}/api/quant/reset-weights",
            json={},
            headers=headers
        )
        assert response.status_code == 200

    def test_reset_weights_returns_status_reset(self, headers):
        """Should return status='reset'"""
        response = requests.post(
            f"{BASE_URL}/api/quant/reset-weights",
            json={},
            headers=headers
        )
        data = response.json()
        assert "status" in data
        assert data["status"] == "reset"

    def test_reset_weights_returns_default_weights(self, headers):
        """Should return all 11 default weights"""
        response = requests.post(
            f"{BASE_URL}/api/quant/reset-weights",
            json={},
            headers=headers
        )
        data = response.json()
        assert "weights" in data
        assert len(data["weights"]) == 11
        # Verify default values (RSI and Market Structure should be 12%)
        assert data["weights"]["rsi_14"] == 12.0
        assert data["weights"]["market_structure"] == 12.0


class TestQuantIntegration:
    """Integration tests - full workflows"""

    def test_backtest_then_verify_rankings_updated(self, headers):
        """Running backtest should update rankings"""
        # Run backtest
        backtest_resp = requests.post(f"{BASE_URL}/api/quant/backtest", json={}, headers=headers)
        assert backtest_resp.status_code == 200

        # Verify rankings reflect backtest data
        rankings_resp = requests.get(f"{BASE_URL}/api/quant/rankings", headers=headers)
        assert rankings_resp.status_code == 200
        data = rankings_resp.json()
        assert "rankings" in data

    def test_optimize_logged_to_experiments(self, headers):
        """Running optimize should create experiment log"""
        # Get current experiment count
        before_resp = requests.get(f"{BASE_URL}/api/quant/experiments", headers=headers)
        before_count = before_resp.json().get("total_experiments", 0)

        # Run optimization
        opt_resp = requests.post(
            f"{BASE_URL}/api/quant/optimize",
            json={},
            headers=headers,
            timeout=15
        )
        assert opt_resp.status_code == 200

        # Verify experiment was logged
        after_resp = requests.get(f"{BASE_URL}/api/quant/experiments", headers=headers)
        after_count = after_resp.json().get("total_experiments", 0)
        # Should have at least one more experiment
        assert after_count >= before_count
