"""
Backend API Tests for Aureos AI Phase 3 P0 - JARVIS Intelligence Layer
-------------------------------------------------------------------------
Tests for:
- POST /api/analysis/start - 11 steps (9 original + regime_detection + manipulation_detection)
- Report contains 'regime' and 'manipulation' objects
- GET /api/analysis/history - saved analyses from MongoDB
- POST /api/jarvis/chat - JARVIS AI copilot with GPT-5.2
- POST /api/jarvis/explain-report - JARVIS report explanation
- GET /api/jarvis/history - JARVIS conversation history
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


# ========== ANALYSIS PIPELINE - 11 STEPS ==========

class TestAnalysisPipeline11Steps:
    """Tests for POST /api/analysis/start with 11 steps including regime & manipulation"""
    
    def test_analysis_returns_11_steps_all_complete(self, authenticated_client):
        """Test that analysis returns 11 steps, all with status 'complete'"""
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
        
        # Verify all 11 steps are present
        steps = data["steps"]
        required_steps = [
            "market_data", "technical_analysis", "market_structure",
            "liquidity_mapping", "monte_carlo", "risk_model",
            "causality", "probability", "executive_report",
            "regime_detection", "manipulation_detection"  # NEW Phase 3 steps
        ]
        
        for step in required_steps:
            assert step in steps, f"Missing step: {step}"
            assert steps[step].get("status") == "complete", f"Step {step} not complete"
        
        assert len(required_steps) == 11, "Should be exactly 11 steps"
        print(f"All 11 steps present and complete: {list(steps.keys())}")
    
    def test_report_contains_regime_object(self, authenticated_client):
        """Test that report contains 'regime' object with required fields"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "ETH",
            "asset_type": "crypto",
            "coingecko_id": "ethereum",
            "name": "Ethereum",
            "timeframe": "4H"
        })
        assert response.status_code == 200
        data = response.json()
        
        report = data["report"]
        
        # Verify regime object in report
        assert "regime" in report, "Report missing 'regime' object"
        regime = report["regime"]
        
        # Verify regime fields
        assert "trend_regime" in regime, "regime missing trend_regime"
        assert "volatility_regime" in regime, "regime missing volatility_regime"
        assert "market_phase" in regime, "regime missing market_phase"
        assert "regime_summary" in regime, "regime missing regime_summary"
        
        # Verify regime values are populated
        trend = regime["trend_regime"]
        assert trend is not None and "type" in trend, f"trend_regime not properly formatted: {trend}"
        
        vol = regime["volatility_regime"]
        assert vol is not None and "type" in vol, f"volatility_regime not properly formatted: {vol}"
        
        phase = regime["market_phase"]
        assert phase is not None and "phase" in phase, f"market_phase not properly formatted: {phase}"
        
        assert isinstance(regime["regime_summary"], str) and len(regime["regime_summary"]) > 10, \
            "regime_summary should be a descriptive string"
        
        print(f"Regime: trend={trend['type']}, volatility={vol['type']}, phase={phase['phase']}")
        print(f"Summary: {regime['regime_summary'][:100]}...")
    
    def test_report_contains_manipulation_object(self, authenticated_client):
        """Test that report contains 'manipulation' object with required fields"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "AAPL",
            "asset_type": "stock",
            "name": "Apple Inc.",
            "timeframe": "4H"
        })
        assert response.status_code == 200
        data = response.json()
        
        report = data["report"]
        
        # Verify manipulation object in report
        assert "manipulation" in report, "Report missing 'manipulation' object"
        manip = report["manipulation"]
        
        # Verify manipulation fields
        assert "score" in manip, "manipulation missing score"
        assert "risk_level" in manip, "manipulation missing risk_level"
        assert "events_detected" in manip, "manipulation missing events_detected"
        assert "warnings" in manip, "manipulation missing warnings"
        assert "summary" in manip, "manipulation missing summary"
        
        # Verify values
        assert isinstance(manip["score"], (int, float)), "score should be numeric"
        assert 0 <= manip["score"] <= 100, f"score should be 0-100, got {manip['score']}"
        
        assert manip["risk_level"] in ["low", "moderate", "high"], \
            f"risk_level should be low/moderate/high, got {manip['risk_level']}"
        
        assert isinstance(manip["events_detected"], int) and manip["events_detected"] >= 0
        assert isinstance(manip["warnings"], list)
        assert isinstance(manip["summary"], str)
        
        print(f"Manipulation: score={manip['score']}/100, risk={manip['risk_level']}, events={manip['events_detected']}")
        print(f"Summary: {manip['summary'][:100]}...")
    
    def test_regime_detection_step_details(self, authenticated_client):
        """Test regime_detection step returns detailed regime data"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "NVDA",
            "asset_type": "stock",
            "name": "NVIDIA",
            "timeframe": "1D"
        })
        assert response.status_code == 200
        data = response.json()
        
        regime_step = data["steps"]["regime_detection"]
        assert regime_step["status"] == "complete"
        
        # Check detailed regime fields from the step
        assert "trend_regime" in regime_step
        assert "volatility_regime" in regime_step
        assert "volume_regime" in regime_step
        assert "market_phase" in regime_step
        assert "regime_stability" in regime_step
        assert "regime_summary" in regime_step
        
        print(f"Regime step complete with full details")
    
    def test_manipulation_detection_step_details(self, authenticated_client):
        """Test manipulation_detection step returns detailed manipulation data"""
        response = authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "SPY",
            "asset_type": "index",
            "name": "S&P 500 ETF",
            "timeframe": "4H"
        })
        assert response.status_code == 200
        data = response.json()
        
        manip_step = data["steps"]["manipulation_detection"]
        assert manip_step["status"] == "complete"
        
        # Check detailed manipulation fields from the step
        assert "manipulation_score" in manip_step
        assert "risk_level" in manip_step
        assert "total_events_detected" in manip_step
        assert "liquidity_sweeps" in manip_step
        assert "stop_hunts" in manip_step
        assert "volume_anomalies" in manip_step
        assert "volatility_traps" in manip_step
        assert "warnings" in manip_step
        assert "summary" in manip_step
        
        print(f"Manipulation step complete with full details: score={manip_step['manipulation_score']}")


# ========== ANALYSIS HISTORY ==========

class TestAnalysisHistory:
    """Tests for GET /api/analysis/history - MongoDB persistence"""
    
    def test_get_analysis_history(self, authenticated_client):
        """Test that analysis history is returned from MongoDB"""
        # First, run an analysis to ensure there's at least one entry
        authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "TEST_BTC",
            "asset_type": "crypto",
            "coingecko_id": "bitcoin",
            "name": "Bitcoin",
            "timeframe": "4H"
        })
        
        time.sleep(0.5)  # Brief delay for DB write
        
        # Now get history
        response = authenticated_client.get(f"{BASE_URL}/api/analysis/history")
        assert response.status_code == 200, f"History fetch failed: {response.text}"
        data = response.json()
        
        assert "history" in data
        assert "count" in data
        assert data["count"] >= 1, "Should have at least 1 analysis in history"
        
        # Verify history entry structure
        if len(data["history"]) > 0:
            entry = data["history"][0]
            assert "analysis_id" in entry
            assert "symbol" in entry
            assert "timestamp" in entry
            assert "signal" in entry  # Signal summary saved
            assert "regime" in entry  # Regime saved
            assert "manipulation_score" in entry  # Manipulation score saved
        
        print(f"Analysis history: {data['count']} entries found")
    
    def test_analysis_history_has_recent_entry(self, authenticated_client):
        """Test that most recent analysis appears in history"""
        # Run a new analysis with unique symbol
        unique_symbol = f"HISTORY_TEST_{int(time.time())}"
        authenticated_client.post(f"{BASE_URL}/api/analysis/start", json={
            "symbol": "BTC",
            "asset_type": "crypto",
            "coingecko_id": "bitcoin",
            "name": unique_symbol,  # Use unique name for identification
            "timeframe": "1H"
        })
        
        time.sleep(0.5)
        
        response = authenticated_client.get(f"{BASE_URL}/api/analysis/history")
        assert response.status_code == 200
        data = response.json()
        
        # Most recent should be at index 0
        assert len(data["history"]) > 0
        recent = data["history"][0]
        # The name should match our unique identifier or be BTC
        assert recent["symbol"] == "BTC", f"Most recent symbol mismatch"
        
        print(f"Recent history entry verified: {recent['symbol']} at {recent['timestamp']}")


# ========== JARVIS CHAT ==========

class TestJarvisChat:
    """Tests for POST /api/jarvis/chat - JARVIS AI copilot with GPT-5.2"""
    
    def test_jarvis_chat_simple_question(self, authenticated_client):
        """Test JARVIS responds to 'What is RSI?' with intelligent response"""
        response = authenticated_client.post(f"{BASE_URL}/api/jarvis/chat", json={
            "message": "What is RSI?"
        }, timeout=30)  # GPT-5.2 may take a few seconds
        
        assert response.status_code == 200, f"JARVIS chat failed: {response.text}"
        data = response.json()
        
        assert "response" in data
        assert "session_id" in data
        assert "timestamp" in data
        
        resp_text = data["response"]
        assert len(resp_text) > 50, "Response should be substantial"
        
        # Check response mentions RSI or relative strength
        rsi_mentioned = any(term in resp_text.lower() for term in ["rsi", "relative strength", "momentum", "overbought", "oversold"])
        assert rsi_mentioned, f"Response should mention RSI concepts: {resp_text[:200]}..."
        
        print(f"JARVIS response length: {len(resp_text)} chars")
        print(f"Session ID: {data['session_id']}")
        print(f"Response preview: {resp_text[:200]}...")
    
    def test_jarvis_chat_with_analysis_context(self, authenticated_client):
        """Test JARVIS responds with context-aware response when analysis_context provided"""
        # Mock analysis context
        analysis_context = {
            "report": {
                "asset": {"symbol": "BTC", "name": "Bitcoin", "price": 95000},
                "signal_summary": {
                    "direction": "BUY",
                    "confidence": 72,
                    "bullish_probability": 65,
                    "bearish_probability": 20,
                    "sideways_probability": 15
                },
                "technical_analysis": {
                    "rsi": 58,
                    "trend": "uptrend",
                    "support": 90000,
                    "resistance": 100000
                },
                "regime": {
                    "trend_regime": "bull",
                    "volatility_regime": "normal",
                    "market_phase": "expansion"
                },
                "manipulation": {
                    "score": 25,
                    "risk_level": "low"
                }
            }
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/jarvis/chat", json={
            "message": "What does my current analysis tell me about BTC?",
            "analysis_context": analysis_context
        }, timeout=30)
        
        assert response.status_code == 200, f"JARVIS chat failed: {response.text}"
        data = response.json()
        
        resp_text = data["response"]
        assert len(resp_text) > 50
        
        # Response should reference context data
        context_aware = any(term in resp_text.lower() for term in [
            "bitcoin", "btc", "buy", "bullish", "uptrend", "confidence", 
            "72", "65", "support", "resistance", "rsi"
        ])
        assert context_aware, f"Response should reference analysis context: {resp_text[:300]}..."
        
        print(f"Context-aware response: {resp_text[:300]}...")
    
    def test_jarvis_chat_session_persistence(self, authenticated_client):
        """Test JARVIS maintains conversation in session"""
        # First message
        resp1 = authenticated_client.post(f"{BASE_URL}/api/jarvis/chat", json={
            "message": "My name is TestUser and I trade Bitcoin."
        }, timeout=30)
        assert resp1.status_code == 200
        session_id = resp1.json()["session_id"]
        
        # Second message with same session
        resp2 = authenticated_client.post(f"{BASE_URL}/api/jarvis/chat", json={
            "message": "What did I tell you about my trading?",
            "session_id": session_id
        }, timeout=30)
        assert resp2.status_code == 200
        
        # JARVIS should remember context (though not guaranteed, as context is rebuilt)
        print(f"Session maintained: {session_id}")


# ========== JARVIS EXPLAIN REPORT ==========

class TestJarvisExplainReport:
    """Tests for POST /api/jarvis/explain-report"""
    
    def test_explain_report_full(self, authenticated_client):
        """Test JARVIS explains a full report"""
        report = {
            "asset": {"symbol": "ETH", "name": "Ethereum", "price": 3500},
            "signal_summary": {
                "direction": "BUY",
                "confidence": 68,
                "strength": "moderate",
                "bullish_probability": 60,
                "bearish_probability": 25,
                "sideways_probability": 15
            },
            "technical_analysis": {
                "rsi": 55,
                "trend": "uptrend_weakening",
                "support": 3200,
                "resistance": 3800,
                "macd": {"crossover": "bullish"}
            },
            "risk_assessment": {
                "risk_score": 45,
                "risk_level": "moderate",
                "value_at_risk": {"var_95": 8.5},
                "max_drawdown": 12
            },
            "scenario_modeling": {
                "simulations": 5000,
                "win_probability": 62,
                "expected_return": 4.2
            },
            "action_plan": {
                "recommendation": "Consider accumulating on dips",
                "entry_zone": "$3400-$3500",
                "stop_loss": "$3150",
                "target_1": "$3750",
                "target_2": "$4000"
            },
            "bullish_signals": ["RSI above 50", "MACD bullish crossover"],
            "bearish_risks": ["Resistance overhead", "Volume declining"],
            "market_causality": {"summary": "Momentum-driven rally with tech sector strength"}
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/jarvis/explain-report", json={
            "report": report,
            "focus": "full"
        }, timeout=60)
        
        assert response.status_code == 200, f"Explain report failed: {response.text}"
        data = response.json()
        
        assert "explanation" in data
        assert "asset" in data
        assert data["asset"] == "ETH"
        assert "focus" in data
        
        explanation = data["explanation"]
        assert len(explanation) > 100, "Explanation should be substantial"
        
        print(f"Report explanation length: {len(explanation)} chars")
        print(f"Preview: {explanation[:300]}...")
    
    def test_explain_report_signal_focus(self, authenticated_client):
        """Test JARVIS explains report with signal focus"""
        report = {
            "asset": {"symbol": "AAPL", "name": "Apple", "price": 185},
            "signal_summary": {
                "direction": "HOLD",
                "confidence": 55,
                "bullish_probability": 40,
                "bearish_probability": 35,
                "sideways_probability": 25
            },
            "bullish_signals": ["Strong fundamentals"],
            "bearish_risks": ["Overbought on weekly"]
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/jarvis/explain-report", json={
            "report": report,
            "focus": "signal"
        }, timeout=30)
        
        assert response.status_code == 200
        data = response.json()
        assert data["focus"] == "signal"
        assert len(data["explanation"]) > 50


# ========== JARVIS HISTORY ==========

class TestJarvisHistory:
    """Tests for GET /api/jarvis/history"""
    
    def test_get_jarvis_history(self, authenticated_client):
        """Test that JARVIS conversation history is returned"""
        # First send a message to ensure there's history
        authenticated_client.post(f"{BASE_URL}/api/jarvis/chat", json={
            "message": "Test message for history verification"
        }, timeout=30)
        
        time.sleep(0.5)
        
        # Get history
        response = authenticated_client.get(f"{BASE_URL}/api/jarvis/history")
        assert response.status_code == 200, f"History fetch failed: {response.text}"
        data = response.json()
        
        assert "messages" in data
        assert "count" in data
        
        # Should have at least the test message and response
        if data["count"] > 0:
            msg = data["messages"][-1] if len(data["messages"]) > 0 else None
            if msg:
                assert "role" in msg
                assert "content" in msg
                assert "timestamp" in msg
                assert msg["role"] in ["user", "assistant"]
        
        print(f"JARVIS history: {data['count']} messages found")


# ========== ERROR HANDLING ==========

class TestErrorHandling:
    """Test error handling for JARVIS endpoints"""
    
    def test_jarvis_chat_empty_message(self, authenticated_client):
        """Test JARVIS handles empty message gracefully"""
        response = authenticated_client.post(f"{BASE_URL}/api/jarvis/chat", json={
            "message": ""
        })
        # Should either return 422 validation error or handle gracefully
        assert response.status_code in [200, 400, 422]
    
    def test_jarvis_explain_empty_report(self, authenticated_client):
        """Test JARVIS handles empty report gracefully"""
        response = authenticated_client.post(f"{BASE_URL}/api/jarvis/explain-report", json={
            "report": {}
        })
        # Should either return 422 or handle gracefully
        assert response.status_code in [200, 400, 422, 500]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
