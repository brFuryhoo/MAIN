"""
Iteration 15 - Ultra Differentiation Features Testing
Tests all 10 new ultra features endpoints:
1. JARVIS Institutional Briefing (AI-powered, requires auth)
2. "Why This Trade?" Engine (AI-powered)
3. Decision Replay (AI-powered, requires auth + closed trades)
4. Market Personality (static data)
5. Signal Timeline (historical signals)
6. Signal Confidence Lock (monetization, requires auth)
7. Capital Flow Heatmap (10 sectors)
8. Intelligence Mode (minimal UI data)
9. Self-Improving User Model (requires auth)
10. Live Cross-Analysis Engine (aggregates data)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicUltraEndpoints:
    """Tests for public ultra endpoints (no auth required)"""
    
    def test_cross_analysis_returns_opportunities_warnings_insights(self):
        """GET /api/ultra/cross-analysis returns market analysis"""
        response = requests.get(f"{BASE_URL}/api/ultra/cross-analysis", timeout=30)
        assert response.status_code == 200
        data = response.json()
        
        # Validate required fields
        assert "opportunities" in data
        assert "warnings" in data
        assert "insights" in data
        assert "market_regime" in data
        assert "fear_greed" in data
        assert "cross_score" in data
        assert "updated_at" in data
        
        # Validate regime values
        assert data["market_regime"] in ["RISK-ON", "RISK-OFF", "TRANSITIONAL"]
        
        # Validate fear_greed range
        assert 0 <= data["fear_greed"] <= 100
        
        # Validate cross_score range
        assert 0 <= data["cross_score"] <= 100
        
        # Validate opportunity structure
        for opp in data["opportunities"]:
            assert "type" in opp
            assert "title" in opp
            assert "confidence" in opp
            assert "action" in opp
    
    def test_market_personality_btc_returns_profile(self):
        """GET /api/ultra/market-personality/BTC returns Bitcoin personality"""
        response = requests.get(f"{BASE_URL}/api/ultra/market-personality/BTC", timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        # Validate BTC specific data
        assert data["symbol"] == "BTC"
        assert data["name"] == "Bitcoin"
        assert data["personality"] == "The Disruptor"
        assert data["risk_profile"] == "extreme"
        
        # Validate traits
        assert isinstance(data["traits"], list)
        assert "High volatility" in data["traits"]
        
        # Validate numeric metrics
        assert 0 <= data["volatility"] <= 100
        assert 0 <= data["manipulation_risk"] <= 100
        assert 0 <= data["trend_strength"] <= 100
        assert 0 <= data["mean_reversion"] <= 100
        
        # Validate BTC has high volatility
        assert data["volatility"] >= 80  # BTC should be very volatile
    
    def test_market_personality_unknown_asset_returns_generic(self):
        """GET /api/ultra/market-personality/XYZ returns generic profile for unknown"""
        response = requests.get(f"{BASE_URL}/api/ultra/market-personality/UNKNOWN123", timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        # Unknown assets get generic profile
        assert data["symbol"] == "UNKNOWN123"
        assert data["personality"] == "Unknown Entity"
        assert data["risk_profile"] == "unknown"
    
    def test_market_personalities_returns_all_tracked_assets(self):
        """GET /api/ultra/market-personalities returns all asset personalities"""
        response = requests.get(f"{BASE_URL}/api/ultra/market-personalities", timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        assert "personalities" in data
        assert "total" in data
        assert data["total"] >= 10  # At least 10 assets tracked
        
        # Validate personalities structure
        symbols = [p["symbol"] for p in data["personalities"]]
        assert "BTC" in symbols
        assert "ETH" in symbols
        assert "NVDA" in symbols
        assert "GOLD" in symbols
        
        # Each personality has required fields
        for p in data["personalities"]:
            assert "symbol" in p
            assert "name" in p
            assert "personality" in p
            assert "risk_profile" in p
            assert "volatility" in p
    
    def test_signal_timeline_returns_historical_signals(self):
        """GET /api/ultra/signal-timeline returns 30 historical signals"""
        response = requests.get(f"{BASE_URL}/api/ultra/signal-timeline", timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        assert "signals" in data
        assert "stats" in data
        assert len(data["signals"]) == 30  # Should return 30 signals
        
        # Validate stats
        stats = data["stats"]
        assert "total_signals" in stats
        assert "active" in stats
        assert "closed" in stats
        assert "winners" in stats
        assert "win_rate" in stats
        assert "avg_return" in stats
        
        # Validate signal structure
        for sig in data["signals"]:
            assert "id" in sig
            assert "symbol" in sig
            assert "direction" in sig
            assert "confidence" in sig
            assert "entry_price" in sig
            assert "current_price" in sig
            assert "outcome_pct" in sig
            assert "is_winner" in sig
            assert "status" in sig
            assert "date" in sig
            assert "timeframe" in sig
            
            # Validate direction values
            assert sig["direction"] in ["STRONG BUY", "BUY", "SELL", "STRONG SELL"]
            assert sig["status"] in ["active", "closed"]
            assert 0 <= sig["confidence"] <= 100
    
    def test_capital_flow_returns_10_sectors(self):
        """GET /api/ultra/capital-flow returns capital flow heatmap"""
        response = requests.get(f"{BASE_URL}/api/ultra/capital-flow", timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        assert "sectors" in data
        assert len(data["sectors"]) == 10  # 10 sectors
        
        # Validate summary fields
        assert "total_inflow" in data
        assert "total_outflow" in data
        assert "net_flow" in data
        assert "dominant_trend" in data
        assert data["dominant_trend"] in ["Risk-On", "Risk-Off"]
        
        # Validate sector structure
        sector_ids = []
        for sector in data["sectors"]:
            sector_ids.append(sector["id"])
            assert "id" in sector
            assert "name" in sector
            assert "flow" in sector
            assert "volume" in sector
            assert "status" in sector
            assert "leaders" in sector
            assert "color" in sector
            assert "intensity" in sector
            
            # Validate color format
            assert sector["color"].startswith("#")
            assert 0 <= sector["intensity"] <= 100
        
        # Verify expected sectors
        expected_sectors = ["tech", "crypto", "gold", "energy", "bonds", "emerging", "real_estate", "healthcare", "consumer", "forex"]
        for exp in expected_sectors:
            assert exp in sector_ids, f"Missing sector: {exp}"
    
    def test_intelligence_mode_returns_minimal_data(self):
        """GET /api/ultra/intelligence-mode returns minimal UI data"""
        response = requests.get(f"{BASE_URL}/api/ultra/intelligence-mode", timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        # Validate minimal structure
        assert "regime" in data
        assert "fear_greed" in data
        assert "decisions" in data
        assert "total_actionable" in data
        assert "timestamp" in data
        
        # Validate regime
        assert data["regime"] in ["RISK-ON", "RISK-OFF", "NEUTRAL"]
        
        # Validate fear_greed
        assert 0 <= data["fear_greed"] <= 100
        
        # Validate decisions (high-confidence signals only)
        for d in data["decisions"]:
            assert "asset" in d
            assert "action" in d
            assert "confidence" in d
            assert "entry" in d
            assert "stop" in d
            assert "target" in d
            assert "rr" in d
            assert "edge" in d
            
            # Only high confidence (>=70) should be included
            assert d["confidence"] >= 70


class TestAuthenticatedUltraEndpoints:
    """Tests for ultra endpoints requiring authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test"
        }, timeout=15)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Auth headers for authenticated requests"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_user_profile_returns_trading_profile(self, auth_headers):
        """GET /api/ultra/user-profile returns user trading profile"""
        response = requests.get(f"{BASE_URL}/api/ultra/user-profile", 
                                headers=auth_headers, timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        # Validate profile structure
        assert "profile_type" in data
        assert "risk_appetite" in data
        assert "behavior" in data
        assert "traits" in data
        assert "recommendations" in data
        assert "stats" in data
        assert "adaptation" in data
        
        # Validate stats (user has closed trades)
        stats = data["stats"]
        assert "total_trades" in stats
        assert stats["total_trades"] == 3  # User has 3 closed trades
        assert "win_rate" in stats
        assert "avg_pnl" in stats
        assert "max_win" in stats
        assert "max_loss" in stats
        assert "best_asset" in stats
        
        # Validate adaptation
        adapt = data["adaptation"]
        assert "language" in adapt
        assert "risk_level" in adapt
        assert "suggestions_style" in adapt
    
    def test_user_profile_requires_auth(self):
        """GET /api/ultra/user-profile returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/ultra/user-profile", timeout=15)
        # May return 401 or could return profile with "anonymous" - check behavior
        if response.status_code == 200:
            data = response.json()
            # Anonymous user should have profile_type indicating new/unknown
            assert data.get("profile_type") in ["New Trader", None] or "anonymous" in str(data)
        else:
            assert response.status_code == 401
    
    def test_decision_replay_list_returns_closed_trades(self, auth_headers):
        """GET /api/ultra/decision-replay-list returns closed trades"""
        response = requests.get(f"{BASE_URL}/api/ultra/decision-replay-list", 
                                headers=auth_headers, timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        assert "trades" in data
        trades = data["trades"]
        assert len(trades) == 3  # User has 3 closed trades
        
        # Validate trade structure
        for trade in trades:
            assert "trade_id" in trade
            assert "symbol" in trade
            assert "action" in trade
            assert "entry_price" in trade
            assert "close_price" in trade
            assert "pnl" in trade
            assert "pnl_pct" in trade
            assert "status" in trade
            assert trade["status"] == "closed"
        
        # Verify known trades
        symbols = [t["symbol"] for t in trades]
        assert "BTC" in symbols
        assert "ETH" in symbols
        assert "AAPL" in symbols
    
    def test_decision_replay_returns_ai_analysis(self, auth_headers):
        """GET /api/ultra/decision-replay/{trade_id} returns AI trade analysis"""
        # First get the trade ID
        list_response = requests.get(f"{BASE_URL}/api/ultra/decision-replay-list", 
                                     headers=auth_headers, timeout=15)
        assert list_response.status_code == 200
        trades = list_response.json()["trades"]
        assert len(trades) > 0
        
        trade_id = trades[0]["trade_id"]
        
        # Get replay - this calls AI, may take time
        response = requests.get(f"{BASE_URL}/api/ultra/decision-replay/{trade_id}", 
                                headers=auth_headers, timeout=90)
        assert response.status_code == 200
        data = response.json()
        
        # Validate replay structure
        assert "trade_id" in data
        assert "trade" in data
        assert "replay" in data  # AI-generated analysis
        assert "risk_grade" in data
        assert "entry_timing_score" in data
        assert "exit_timing_score" in data
        
        # Validate trade info
        trade = data["trade"]
        assert "symbol" in trade
        assert "action" in trade
        assert "entry_price" in trade
        assert "close_price" in trade
        assert "pnl" in trade
        
        # Validate scores
        assert 0 <= data["entry_timing_score"] <= 100
        assert 0 <= data["exit_timing_score"] <= 100
        
        # Risk grade should be a letter grade
        assert data["risk_grade"][0] in ["A", "B", "C", "D", "F"]
        
        # AI replay text should be substantial
        assert len(data["replay"]) > 100
    
    def test_decision_replay_invalid_trade_returns_404(self, auth_headers):
        """GET /api/ultra/decision-replay/invalid returns 404"""
        response = requests.get(f"{BASE_URL}/api/ultra/decision-replay/nonexistent_trade_123", 
                                headers=auth_headers, timeout=15)
        assert response.status_code == 404
    
    def test_locked_signals_shows_locked_for_free_user(self, auth_headers):
        """GET /api/ultra/locked-signals shows locked signals for free users"""
        response = requests.get(f"{BASE_URL}/api/ultra/locked-signals", 
                                headers=auth_headers, timeout=15)
        assert response.status_code == 200
        data = response.json()
        
        assert "signals" in data
        assert "locked_count" in data
        assert "user_plan" in data
        
        # Test user is on free plan
        assert data["user_plan"] == "free"
        
        # Should have some locked signals (high confidence ones)
        assert data["locked_count"] > 0
        
        # Validate signal structure
        for sig in data["signals"]:
            assert "symbol" in sig
            assert "signal" in sig
            assert "confidence" in sig
            assert "is_locked" in sig
            assert "required_plan" in sig
            
            # If locked, should have teaser but not full details
            if sig["is_locked"]:
                assert "teaser" in sig
                assert sig["required_plan"] == "pro"
                # Should NOT have entry/stop_loss/target
                assert "entry" not in sig or sig.get("entry") is None
            else:
                # Unlocked signals have full details
                assert "entry" in sig
                assert "stop_loss" in sig
                assert "target" in sig


class TestAIPoweredEndpoints:
    """Tests for AI-powered endpoints (JARVIS Briefing, Why This Trade)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test"
        }, timeout=15)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_why_this_trade_returns_analysis(self):
        """POST /api/ultra/why-this-trade returns AI trade explanation"""
        response = requests.post(f"{BASE_URL}/api/ultra/why-this-trade", json={
            "symbol": "BTC",
            "direction": "BUY",
            "price": 85000,
            "confidence": 80
        }, timeout=90)
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert data["symbol"] == "BTC"
        assert data["direction"] == "BUY"
        assert data["price"] == 85000
        assert data["confidence"] == 80
        assert "analysis" in data
        assert "liquidity_score" in data
        assert "structure_score" in data
        assert "probability" in data
        assert "pattern" in data
        assert "generated_at" in data
        
        # AI analysis should be substantial
        assert len(data["analysis"]) > 100
        
        # Validate scores
        assert 0 <= data["liquidity_score"] <= 100
        assert 0 <= data["structure_score"] <= 100
        assert 0 <= data["probability"] <= 1
    
    def test_jarvis_briefing_returns_institutional_brief(self, auth_token):
        """GET /api/ultra/jarvis-briefing returns AI institutional briefing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/ultra/jarvis-briefing", 
                                headers=headers, timeout=90)
        assert response.status_code == 200
        data = response.json()
        
        # Validate briefing structure
        assert "briefing" in data
        assert "fear_greed" in data
        assert "fear_greed_label" in data
        assert "market_pulse" in data
        assert "risks" in data
        assert "generated_at" in data
        assert "model" in data
        
        # AI briefing should be substantial
        assert len(data["briefing"]) > 200
        
        # Validate fear_greed
        assert 0 <= data["fear_greed"] <= 100
        # Label may be uppercase or title case
        assert data["fear_greed_label"].upper() in ["EXTREME FEAR", "FEAR", "NEUTRAL", "GREED", "EXTREME GREED"]
        
        # Validate market_pulse
        assert isinstance(data["market_pulse"], list)
        assert len(data["market_pulse"]) > 0
        
        # Model should be JARVIS
        assert "JARVIS" in data["model"]


class TestCrossAnalysisDataIntegrity:
    """Tests for cross-analysis data integrity and correlations"""
    
    def test_cross_analysis_opportunities_have_valid_structure(self):
        """Validate opportunity entries have correct structure"""
        response = requests.get(f"{BASE_URL}/api/ultra/cross-analysis", timeout=30)
        data = response.json()
        
        for opp in data["opportunities"]:
            # Type should be one of the expected types
            assert opp["type"] in ["signal", "macro", "regime"]
            # Confidence should be reasonable
            assert 50 <= opp["confidence"] <= 100
            # Action should be actionable
            assert "action" in opp
    
    def test_cross_analysis_warnings_have_valid_structure(self):
        """Validate warning entries have correct structure"""
        response = requests.get(f"{BASE_URL}/api/ultra/cross-analysis", timeout=30)
        data = response.json()
        
        for warn in data["warnings"]:
            assert "type" in warn
            assert "title" in warn
            assert "detail" in warn
            assert "confidence" in warn
            assert "action" in warn
    
    def test_cross_analysis_insights_have_valid_structure(self):
        """Validate insight entries have correct structure"""
        response = requests.get(f"{BASE_URL}/api/ultra/cross-analysis", timeout=30)
        data = response.json()
        
        for ins in data["insights"]:
            assert "type" in ins
            assert "title" in ins
            assert "detail" in ins
            assert "confidence" in ins
            assert "action" in ins


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
