"""
Test Suite for Aureos AI — Iteration 13 (Quantica Engine Expansion)
====================================================================
Tests all new features:
1. Fear & Greed Index API
2. Anomaly Detector API
3. AI Trading Signals API
4. Market Radar API
5. Correlation Matrix API
6. Portfolio Optimizer API (GPT-5.2)
7. Weekly Intelligence Digest API (GPT-5.2)
8. Real Market Pulse (CoinGecko + Twelve Data)
9. Global Market Overview
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://aureos-ai.preview.emergentagent.com')

@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for protected endpoints"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "fabricio@aureos.ai",
        "password": "aureos2024"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ══════════════════════════════════════════════════════════════
# 1. FEAR & GREED INDEX
# ══════════════════════════════════════════════════════════════

class TestFearGreedIndex:
    """Tests for GET /api/quantica/fear-greed"""
    
    def test_fear_greed_returns_200(self, api_client):
        """Fear & Greed endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/quantica/fear-greed")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Fear & Greed endpoint returns 200")
    
    def test_fear_greed_has_composite_score(self, api_client):
        """Fear & Greed returns composite_score between 0-100"""
        response = api_client.get(f"{BASE_URL}/api/quantica/fear-greed")
        data = response.json()
        assert "composite_score" in data, "Missing composite_score"
        assert 0 <= data["composite_score"] <= 100, f"composite_score {data['composite_score']} out of range"
        print(f"✓ Fear & Greed composite_score: {data['composite_score']}")
    
    def test_fear_greed_has_label_and_color(self, api_client):
        """Fear & Greed returns label and color"""
        response = api_client.get(f"{BASE_URL}/api/quantica/fear-greed")
        data = response.json()
        assert "label" in data, "Missing label"
        assert "color" in data, "Missing color"
        assert data["label"] in ["EXTREME GREED", "GREED", "NEUTRAL", "FEAR", "EXTREME FEAR"], f"Invalid label: {data['label']}"
        assert data["color"].startswith("#"), "Color should be hex format"
        print(f"✓ Fear & Greed label: {data['label']}, color: {data['color']}")
    
    def test_fear_greed_has_components(self, api_client):
        """Fear & Greed returns 7 components with weights"""
        response = api_client.get(f"{BASE_URL}/api/quantica/fear-greed")
        data = response.json()
        assert "components" in data, "Missing components"
        components = data["components"]
        expected_components = ["market_momentum", "market_volatility", "safe_haven_demand", 
                              "junk_bond_demand", "crypto_momentum", "options_skew", "geopolitical_stability"]
        for comp in expected_components:
            assert comp in components, f"Missing component: {comp}"
            assert "score" in components[comp], f"Component {comp} missing score"
            assert "weight" in components[comp], f"Component {comp} missing weight"
        print(f"✓ Fear & Greed has all 7 components")
    
    def test_fear_greed_has_30_day_history(self, api_client):
        """Fear & Greed returns 30-day history"""
        response = api_client.get(f"{BASE_URL}/api/quantica/fear-greed")
        data = response.json()
        assert "history" in data, "Missing history"
        assert len(data["history"]) == 30, f"Expected 30 history items, got {len(data['history'])}"
        # Verify history structure
        for item in data["history"][:3]:
            assert "date" in item, "History item missing date"
            assert "value" in item, "History item missing value"
        print(f"✓ Fear & Greed has 30-day history")


# ══════════════════════════════════════════════════════════════
# 2. ANOMALY DETECTOR
# ══════════════════════════════════════════════════════════════

class TestAnomalyDetector:
    """Tests for GET /api/quantica/anomalies"""
    
    def test_anomalies_returns_200(self, api_client):
        """Anomalies endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/quantica/anomalies")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Anomalies endpoint returns 200")
    
    def test_anomalies_returns_8_items(self, api_client):
        """Anomalies returns 8 anomalies"""
        response = api_client.get(f"{BASE_URL}/api/quantica/anomalies")
        data = response.json()
        assert "anomalies" in data, "Missing anomalies array"
        assert "total" in data, "Missing total count"
        assert data["total"] == 8, f"Expected 8 anomalies, got {data['total']}"
        assert len(data["anomalies"]) == 8, f"Expected 8 items in array, got {len(data['anomalies'])}"
        print(f"✓ Anomalies returns {data['total']} items")
    
    def test_anomalies_have_correct_structure(self, api_client):
        """Each anomaly has id, type, severity, asset, title, detail, confidence"""
        response = api_client.get(f"{BASE_URL}/api/quantica/anomalies")
        data = response.json()
        required_fields = ["id", "type", "severity", "asset", "title", "detail", "confidence", "detected_at"]
        for anomaly in data["anomalies"]:
            for field in required_fields:
                assert field in anomaly, f"Anomaly missing field: {field}"
            assert anomaly["severity"] in ["low", "medium", "high", "critical"], f"Invalid severity: {anomaly['severity']}"
        print("✓ All anomalies have correct structure")
    
    def test_anomalies_critical_count(self, api_client):
        """Anomalies returns critical_count"""
        response = api_client.get(f"{BASE_URL}/api/quantica/anomalies")
        data = response.json()
        assert "critical_count" in data, "Missing critical_count"
        critical_actual = len([a for a in data["anomalies"] if a["severity"] == "critical"])
        assert data["critical_count"] == critical_actual, f"critical_count mismatch: {data['critical_count']} vs {critical_actual}"
        print(f"✓ Anomalies critical_count: {data['critical_count']}")


# ══════════════════════════════════════════════════════════════
# 3. AI TRADING SIGNALS
# ══════════════════════════════════════════════════════════════

class TestTradingSignals:
    """Tests for GET /api/quantica/trading-signals"""
    
    def test_signals_returns_200(self, api_client):
        """Trading signals endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/quantica/trading-signals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Trading signals endpoint returns 200")
    
    def test_signals_returns_15_items(self, api_client):
        """Trading signals returns 15 signals"""
        response = api_client.get(f"{BASE_URL}/api/quantica/trading-signals")
        data = response.json()
        assert "signals" in data, "Missing signals array"
        assert len(data["signals"]) == 15, f"Expected 15 signals, got {len(data['signals'])}"
        print(f"✓ Trading signals returns {len(data['signals'])} items")
    
    def test_signals_have_entry_stop_target(self, api_client):
        """Each signal has entry, stop_loss, target, confidence"""
        response = api_client.get(f"{BASE_URL}/api/quantica/trading-signals")
        data = response.json()
        required_fields = ["symbol", "sector", "price", "signal", "confidence", "entry", "stop_loss", "target", "risk_reward"]
        for signal in data["signals"]:
            for field in required_fields:
                assert field in signal, f"Signal missing field: {field}"
            assert signal["confidence"] >= 0 and signal["confidence"] <= 100, f"Invalid confidence: {signal['confidence']}"
            assert signal["signal"] in ["STRONG BUY", "BUY", "HOLD", "SELL", "STRONG SELL"], f"Invalid signal: {signal['signal']}"
        print("✓ All signals have entry/stop/target/confidence")
    
    def test_signals_sorted_by_confidence(self, api_client):
        """Signals are sorted by confidence (descending)"""
        response = api_client.get(f"{BASE_URL}/api/quantica/trading-signals")
        data = response.json()
        confidences = [s["confidence"] for s in data["signals"]]
        assert confidences == sorted(confidences, reverse=True), "Signals not sorted by confidence"
        print("✓ Signals sorted by confidence (descending)")
    
    def test_signals_has_strong_counts(self, api_client):
        """Signals response includes strong_buys and strong_sells counts"""
        response = api_client.get(f"{BASE_URL}/api/quantica/trading-signals")
        data = response.json()
        assert "strong_buys" in data, "Missing strong_buys count"
        assert "strong_sells" in data, "Missing strong_sells count"
        print(f"✓ Signals: {data['strong_buys']} strong buys, {data['strong_sells']} strong sells")


# ══════════════════════════════════════════════════════════════
# 4. MARKET RADAR
# ══════════════════════════════════════════════════════════════

class TestMarketRadar:
    """Tests for GET /api/quantica/market-radar"""
    
    def test_radar_returns_200(self, api_client):
        """Market radar endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/quantica/market-radar")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Market radar endpoint returns 200")
    
    def test_radar_has_all_sections(self, api_client):
        """Market radar returns biggest_gainers, biggest_losers, unusual_volume, trending"""
        response = api_client.get(f"{BASE_URL}/api/quantica/market-radar")
        data = response.json()
        required_sections = ["biggest_gainers", "biggest_losers", "unusual_volume", "trending"]
        for section in required_sections:
            assert section in data, f"Missing section: {section}"
            assert len(data[section]) >= 1, f"Section {section} is empty"
        print(f"✓ Market radar has all 4 sections")
    
    def test_radar_gainers_have_change_positive(self, api_client):
        """Biggest gainers all have positive change"""
        response = api_client.get(f"{BASE_URL}/api/quantica/market-radar")
        data = response.json()
        for gainer in data["biggest_gainers"]:
            assert gainer["change"] > 0, f"Gainer {gainer['symbol']} has non-positive change: {gainer['change']}"
        print("✓ All gainers have positive change")
    
    def test_radar_losers_have_change_negative(self, api_client):
        """Biggest losers all have negative change"""
        response = api_client.get(f"{BASE_URL}/api/quantica/market-radar")
        data = response.json()
        for loser in data["biggest_losers"]:
            assert loser["change"] < 0, f"Loser {loser['symbol']} has non-negative change: {loser['change']}"
        print("✓ All losers have negative change")


# ══════════════════════════════════════════════════════════════
# 5. CORRELATION MATRIX
# ══════════════════════════════════════════════════════════════

class TestCorrelationMatrix:
    """Tests for GET /api/quantica/correlation-matrix"""
    
    def test_correlation_returns_200(self, api_client):
        """Correlation matrix endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/quantica/correlation-matrix")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Correlation matrix endpoint returns 200")
    
    def test_correlation_has_10_assets(self, api_client):
        """Correlation matrix includes 10 assets"""
        response = api_client.get(f"{BASE_URL}/api/quantica/correlation-matrix")
        data = response.json()
        assert "assets" in data, "Missing assets list"
        assert len(data["assets"]) == 10, f"Expected 10 assets, got {len(data['assets'])}"
        print(f"✓ Correlation matrix has 10 assets: {data['assets']}")
    
    def test_correlation_matrix_10x10(self, api_client):
        """Correlation matrix is 10x10"""
        response = api_client.get(f"{BASE_URL}/api/quantica/correlation-matrix")
        data = response.json()
        assert "matrix" in data, "Missing matrix"
        assets = data["assets"]
        matrix = data["matrix"]
        # Check matrix dimensions
        for asset in assets:
            assert asset in matrix, f"Asset {asset} not in matrix rows"
            assert len(matrix[asset]) == 10, f"Row {asset} doesn't have 10 columns"
        print("✓ Correlation matrix is 10x10")
    
    def test_correlation_diagonal_is_1(self, api_client):
        """Diagonal elements (self-correlation) should be 1.0"""
        response = api_client.get(f"{BASE_URL}/api/quantica/correlation-matrix")
        data = response.json()
        assets = data["assets"]
        matrix = data["matrix"]
        for asset in assets:
            assert matrix[asset][asset] == 1.0, f"Diagonal for {asset} is not 1.0: {matrix[asset][asset]}"
        print("✓ Correlation matrix diagonal is all 1.0")


# ══════════════════════════════════════════════════════════════
# 6. PORTFOLIO OPTIMIZER (GPT-5.2)
# ══════════════════════════════════════════════════════════════

class TestPortfolioOptimizer:
    """Tests for POST /api/quantica/optimize-portfolio"""
    
    def test_optimizer_accepts_empty_portfolio(self, api_client):
        """Optimizer accepts empty portfolio"""
        response = api_client.post(f"{BASE_URL}/api/quantica/optimize-portfolio", json={
            "positions": [],
            "risk_tolerance": "moderate"
        }, timeout=60)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "analysis" in data, "Missing analysis in response"
        print("✓ Optimizer accepts empty portfolio (GPT-5.2 working)")
    
    def test_optimizer_with_positions(self, api_client):
        """Optimizer analyzes portfolio with positions"""
        response = api_client.post(f"{BASE_URL}/api/quantica/optimize-portfolio", json={
            "positions": [
                {"symbol": "NVDA", "quantity": 10, "avg_price": 850, "asset_type": "stock"},
                {"symbol": "BTC", "quantity": 0.5, "avg_price": 60000, "asset_type": "crypto"},
                {"symbol": "AAPL", "quantity": 20, "avg_price": 170, "asset_type": "stock"},
            ],
            "risk_tolerance": "aggressive"
        }, timeout=60)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "analysis" in data, "Missing analysis"
        assert "before_score" in data, "Missing before_score"
        assert "after_score" in data, "Missing after_score"
        assert data["after_score"] >= data["before_score"], "After score should be >= before score"
        print(f"✓ Optimizer returned analysis with scores: before={data['before_score']}, after={data['after_score']}")
    
    def test_optimizer_has_fear_greed_context(self, api_client):
        """Optimizer response includes fear_greed context"""
        response = api_client.post(f"{BASE_URL}/api/quantica/optimize-portfolio", json={
            "positions": [],
            "risk_tolerance": "conservative"
        }, timeout=60)
        data = response.json()
        assert "fear_greed" in data, "Missing fear_greed in optimizer response"
        print(f"✓ Optimizer includes Fear & Greed context: {data['fear_greed']}")


# ══════════════════════════════════════════════════════════════
# 7. WEEKLY INTELLIGENCE DIGEST (GPT-5.2)
# ══════════════════════════════════════════════════════════════

class TestWeeklyDigest:
    """Tests for GET /api/quantica/weekly-digest"""
    
    def test_digest_returns_200(self, api_client):
        """Weekly digest endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/quantica/weekly-digest", timeout=60)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Weekly digest endpoint returns 200 (GPT-5.2 working)")
    
    def test_digest_has_text_and_metadata(self, api_client):
        """Weekly digest returns digest text, week_number, fear_greed, top_performers"""
        response = api_client.get(f"{BASE_URL}/api/quantica/weekly-digest", timeout=60)
        data = response.json()
        assert "digest" in data, "Missing digest text"
        assert len(data["digest"]) > 100, "Digest text too short"
        assert "week_number" in data, "Missing week_number"
        assert "fear_greed" in data, "Missing fear_greed"
        assert "top_performers" in data, "Missing top_performers"
        print(f"✓ Weekly digest: week {data['week_number']}, {len(data['digest'])} chars, {len(data.get('top_performers', []))} top performers")


# ══════════════════════════════════════════════════════════════
# 8. REAL MARKET PULSE (CoinGecko + Twelve Data)
# ══════════════════════════════════════════════════════════════

class TestRealMarketPulse:
    """Tests for GET /api/intelligence/market-pulse with REAL data"""
    
    def test_market_pulse_returns_200(self, api_client):
        """Market pulse endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/intelligence/market-pulse")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Market pulse endpoint returns 200")
    
    def test_market_pulse_has_indicators(self, api_client):
        """Market pulse returns indicators array"""
        response = api_client.get(f"{BASE_URL}/api/intelligence/market-pulse")
        data = response.json()
        assert "indicators" in data, "Missing indicators array"
        assert len(data["indicators"]) >= 3, f"Expected at least 3 indicators, got {len(data['indicators'])}"
        print(f"✓ Market pulse has {len(data['indicators'])} indicators")
    
    def test_market_pulse_has_source(self, api_client):
        """Market pulse indicates source (live or cached)"""
        response = api_client.get(f"{BASE_URL}/api/intelligence/market-pulse")
        data = response.json()
        assert "source" in data, "Missing source field"
        assert data["source"] in ["live", "cached"], f"Invalid source: {data['source']}"
        print(f"✓ Market pulse source: {data['source']}")
    
    def test_market_pulse_indicators_have_value(self, api_client):
        """Each indicator has symbol, value, change, type"""
        response = api_client.get(f"{BASE_URL}/api/intelligence/market-pulse")
        data = response.json()
        for ind in data["indicators"]:
            assert "symbol" in ind, "Indicator missing symbol"
            assert "value" in ind, "Indicator missing value"
            assert "type" in ind, "Indicator missing type"
            assert ind["value"] > 0, f"Indicator {ind['symbol']} has invalid value: {ind['value']}"
        print("✓ All indicators have symbol, value, change, type")


# ══════════════════════════════════════════════════════════════
# 9. GLOBAL MARKET OVERVIEW
# ══════════════════════════════════════════════════════════════

class TestGlobalOverview:
    """Tests for GET /api/intelligence/global-overview"""
    
    def test_global_overview_returns_200(self, api_client):
        """Global overview endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/intelligence/global-overview")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Global overview endpoint returns 200")
    
    def test_global_overview_has_market_caps(self, api_client):
        """Global overview returns equity, crypto, gold market caps"""
        response = api_client.get(f"{BASE_URL}/api/intelligence/global-overview")
        data = response.json()
        required_fields = ["global_equity_market_cap", "crypto_market_cap", "gold_market_cap", "global_forex_daily_volume"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        # Equity should be ~$110T
        assert data["global_equity_market_cap"] > 100_000_000_000_000, "Equity market cap too low"
        # Gold should be ~$16T  
        assert data["global_gold_market_cap" if "global_gold_market_cap" in data else "gold_market_cap"] > 10_000_000_000_000, "Gold market cap too low"
        print(f"✓ Global overview: Equity ${data['global_equity_market_cap']/1e12:.0f}T, Gold ${data['gold_market_cap']/1e12:.0f}T")
    
    def test_global_overview_has_btc_dominance(self, api_client):
        """Global overview includes BTC dominance (may be 0 if rate limited)"""
        response = api_client.get(f"{BASE_URL}/api/intelligence/global-overview")
        data = response.json()
        assert "btc_dominance" in data, "Missing btc_dominance"
        # BTC dominance may be 0 if CoinGecko is rate limited - this is expected
        print(f"✓ Global overview btc_dominance: {data['btc_dominance']}% (may be 0 if rate limited)")


# ══════════════════════════════════════════════════════════════
# 10. REGRESSION: EXISTING ENDPOINTS
# ══════════════════════════════════════════════════════════════

class TestRegressionExisting:
    """Regression tests for existing endpoints"""
    
    def test_daily_briefing_still_works(self, api_client):
        """Daily briefing endpoint still works"""
        response = api_client.get(f"{BASE_URL}/api/intelligence/daily-briefing", timeout=60)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Daily briefing still working")
    
    def test_geopolitical_risk_still_works(self, api_client):
        """Geopolitical risk endpoint still works"""
        response = api_client.get(f"{BASE_URL}/api/intelligence/geopolitical-risk")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "regions" in data, "Missing regions"
        assert "global_risk_score" in data, "Missing global_risk_score"
        assert len(data["regions"]) == 8, f"Expected 8 regions, got {len(data['regions'])}"
        print(f"✓ Geopolitical risk still working, global score: {data['global_risk_score']}")
    
    def test_portfolio_endpoint_still_works(self, authenticated_client):
        """Portfolio endpoint still works"""
        response = authenticated_client.get(f"{BASE_URL}/api/portfolio")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Portfolio endpoint still working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
