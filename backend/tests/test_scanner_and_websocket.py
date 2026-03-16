"""
Test Suite for Scanner + WebSocket + Enhanced Watchlist Features
================================================================
Tests for:
1. Market Scanner - GET /api/scanner/universe, POST /api/scanner/scan, GET /api/scanner/opportunities, GET /api/scanner/history
2. WebSocket - GET /api/ws/status, /ws/{channel} endpoint
3. Enhanced Watchlist - POST /api/watchlist/scan with quant_alignment alerts
"""

import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@aureos.com",
        "password": "Test1234!"
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]

@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


# =============================================================================
# SCANNER UNIVERSE TESTS
# =============================================================================

class TestScannerUniverse:
    """Tests for GET /api/scanner/universe"""

    def test_scanner_universe_returns_4_categories(self):
        """Verify universe returns exactly 4 categories: crypto, stocks_us, forex, commodities"""
        resp = requests.get(f"{BASE_URL}/api/scanner/universe")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert "categories" in data
        categories = data["categories"]
        assert "crypto" in categories
        assert "stocks_us" in categories
        assert "forex" in categories
        assert "commodities" in categories

    def test_scanner_universe_total_17_assets(self):
        """Verify total_assets = 17"""
        resp = requests.get(f"{BASE_URL}/api/scanner/universe")
        assert resp.status_code == 200
        data = resp.json()
        
        assert data["total_assets"] == 17

    def test_scanner_universe_category_counts(self):
        """Verify each category has correct asset count"""
        resp = requests.get(f"{BASE_URL}/api/scanner/universe")
        assert resp.status_code == 200
        data = resp.json()
        
        cats = data["categories"]
        assert cats["crypto"]["count"] == 5
        assert cats["stocks_us"]["count"] == 7
        assert cats["forex"]["count"] == 3
        assert cats["commodities"]["count"] == 2

    def test_scanner_universe_assets_have_symbol_and_name(self):
        """Verify each asset has symbol and name fields"""
        resp = requests.get(f"{BASE_URL}/api/scanner/universe")
        assert resp.status_code == 200
        data = resp.json()
        
        for cat_name, cat_data in data["categories"].items():
            for asset in cat_data["assets"]:
                assert "symbol" in asset, f"Missing symbol in {cat_name}"
                assert "name" in asset, f"Missing name in {cat_name}"


# =============================================================================
# SCANNER SCAN TESTS
# =============================================================================

class TestScannerScan:
    """Tests for POST /api/scanner/scan"""

    def test_scanner_scan_all_categories(self, headers):
        """Run scan on all categories (limited to 3 for speed)"""
        resp = requests.post(
            f"{BASE_URL}/api/scanner/scan",
            json={"max_assets": 3, "categories": None},
            headers=headers,
            timeout=120
        )
        assert resp.status_code == 200, f"Scan failed: {resp.text}"
        data = resp.json()
        
        assert data["status"] == "complete"
        assert "scanned" in data
        assert data["scanned"] > 0
        assert "opportunities" in data
        assert "assets" in data
        assert "summary" in data

    def test_scanner_scan_crypto_only(self, headers):
        """Run scan filtering only crypto category"""
        resp = requests.post(
            f"{BASE_URL}/api/scanner/scan",
            json={"max_assets": 3, "categories": ["crypto"]},
            headers=headers,
            timeout=120
        )
        assert resp.status_code == 200, f"Scan failed: {resp.text}"
        data = resp.json()
        
        assert data["status"] == "complete"
        assert data["scanned"] <= 3  # max_assets
        
        # All assets should be crypto type
        for asset in data["assets"]:
            assert asset["asset_type"] == "crypto"

    def test_scanner_scan_returns_asset_summary_fields(self, headers):
        """Verify scan returns enriched asset data with all required fields"""
        resp = requests.post(
            f"{BASE_URL}/api/scanner/scan",
            json={"max_assets": 2, "categories": ["crypto"]},
            headers=headers,
            timeout=120
        )
        assert resp.status_code == 200
        data = resp.json()
        
        if data["assets"]:
            asset = data["assets"][0]
            # Required fields
            assert "symbol" in asset
            assert "name" in asset
            assert "price" in asset
            assert "change_percent" in asset
            assert "signal" in asset
            assert "confidence" in asset
            assert "rsi" in asset
            assert "risk_score" in asset
            assert "regime" in asset

    def test_scanner_scan_returns_opportunities(self, headers):
        """Verify opportunities have proper structure"""
        resp = requests.post(
            f"{BASE_URL}/api/scanner/scan",
            json={"max_assets": 3, "categories": ["crypto"]},
            headers=headers,
            timeout=120
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Opportunities may be empty or populated
        if data["opportunities"]:
            opp = data["opportunities"][0]
            assert "type" in opp
            assert "label" in opp
            assert "severity" in opp
            assert "confidence" in opp
            assert "signal" in opp
            assert "symbol" in opp

    def test_scanner_scan_summary_fields(self, headers):
        """Verify summary has total, high_priority, by_type, by_severity"""
        resp = requests.post(
            f"{BASE_URL}/api/scanner/scan",
            json={"max_assets": 2, "categories": ["crypto"]},
            headers=headers,
            timeout=120
        )
        assert resp.status_code == 200
        data = resp.json()
        
        summary = data["summary"]
        assert "total" in summary
        assert "high_priority" in summary
        assert "by_type" in summary
        assert "by_severity" in summary


# =============================================================================
# SCANNER OPPORTUNITIES TESTS
# =============================================================================

class TestScannerOpportunities:
    """Tests for GET /api/scanner/opportunities"""

    def test_get_latest_opportunities(self, headers):
        """Get latest scan summary"""
        resp = requests.get(f"{BASE_URL}/api/scanner/opportunities", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        # Either has scan results or message about no scans
        assert "last_scan" in data or "message" in data or "opportunities_found" in data


# =============================================================================
# SCANNER HISTORY TESTS
# =============================================================================

class TestScannerHistory:
    """Tests for GET /api/scanner/history"""

    def test_get_scan_history(self, headers):
        """Get scan history with timestamps and opportunity counts"""
        resp = requests.get(f"{BASE_URL}/api/scanner/history", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "history" in data
        assert "count" in data
        
        if data["history"]:
            entry = data["history"][0]
            assert "timestamp" in entry
            assert "assets_scanned" in entry
            assert "opportunities_found" in entry


# =============================================================================
# WEBSOCKET STATUS TESTS
# =============================================================================

class TestWebSocketStatus:
    """Tests for GET /api/ws/status"""

    def test_ws_status_returns_active_connections(self):
        """Verify ws/status returns active_connections"""
        resp = requests.get(f"{BASE_URL}/api/ws/status")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "active_connections" in data
        assert isinstance(data["active_connections"], int)

    def test_ws_status_returns_channels(self):
        """Verify ws/status returns channels list"""
        resp = requests.get(f"{BASE_URL}/api/ws/status")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "channels" in data
        assert isinstance(data["channels"], list)


# =============================================================================
# ENHANCED WATCHLIST SCAN TESTS
# =============================================================================

class TestEnhancedWatchlistScan:
    """Tests for POST /api/watchlist/scan with quant alignment alerts"""

    def test_watchlist_scan_returns_enriched_results(self, headers):
        """Verify watchlist scan returns rsi, risk_score, win_probability fields"""
        # First ensure BTC is in watchlist
        requests.post(
            f"{BASE_URL}/api/watchlist/add",
            json={"symbol": "BTC", "name": "Bitcoin", "asset_type": "crypto", "coingecko_id": "bitcoin"},
            headers=headers
        )
        
        # Run scan
        resp = requests.post(f"{BASE_URL}/api/watchlist/scan", headers=headers, timeout=60)
        assert resp.status_code == 200, f"Scan failed: {resp.text}"
        data = resp.json()
        
        assert data["status"] in ["complete", "empty"]
        
        if data["status"] == "complete" and data["results"]:
            result = data["results"][0]
            assert "rsi" in result
            assert "risk_score" in result
            assert "win_probability" in result
            assert "signal" in result
            assert "confidence" in result

    def test_watchlist_scan_generates_alerts(self, headers):
        """Verify scan can generate alerts (checking structure)"""
        resp = requests.post(f"{BASE_URL}/api/watchlist/scan", headers=headers, timeout=60)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "alerts_generated" in data
        assert isinstance(data["alerts_generated"], int)

    def test_watchlist_alerts_include_quant_type(self, headers):
        """Check alerts endpoint for potential quant_alignment type"""
        # Get watchlist which includes alerts
        resp = requests.get(f"{BASE_URL}/api/watchlist/", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify structure includes alerts field
        assert "alerts" in data
        assert isinstance(data["alerts"], list)
        
        # If there are quant_alignment alerts, verify structure
        for alert in data.get("alerts", []):
            assert "type" in alert
            assert "title" in alert
            assert "message" in alert
            # quant_alignment type should exist when 7+ indicators align


# =============================================================================
# INTEGRATION FLOW TEST
# =============================================================================

class TestScannerIntegrationFlow:
    """End-to-end scanner workflow test"""

    def test_full_scanner_workflow(self, headers):
        """Test: Universe -> Scan -> Opportunities -> History"""
        # Step 1: Get universe
        universe_resp = requests.get(f"{BASE_URL}/api/scanner/universe")
        assert universe_resp.status_code == 200
        assert universe_resp.json()["total_assets"] == 17
        print("Step 1: Universe fetched - 17 assets in 4 categories")

        # Step 2: Run scan (quick - 2 crypto)
        scan_resp = requests.post(
            f"{BASE_URL}/api/scanner/scan",
            json={"max_assets": 2, "categories": ["crypto"]},
            headers=headers,
            timeout=120
        )
        assert scan_resp.status_code == 200
        scan_data = scan_resp.json()
        assert scan_data["status"] == "complete"
        print(f"Step 2: Scan complete - {scan_data['scanned']} assets, {len(scan_data.get('opportunities', []))} opportunities")

        # Step 3: Get opportunities
        opps_resp = requests.get(f"{BASE_URL}/api/scanner/opportunities", headers=headers)
        assert opps_resp.status_code == 200
        print("Step 3: Opportunities fetched")

        # Step 4: Get history
        history_resp = requests.get(f"{BASE_URL}/api/scanner/history", headers=headers)
        assert history_resp.status_code == 200
        history_data = history_resp.json()
        assert history_data["count"] >= 1
        print(f"Step 4: History has {history_data['count']} scan records")

        # Step 5: Verify ws status endpoint
        ws_resp = requests.get(f"{BASE_URL}/api/ws/status")
        assert ws_resp.status_code == 200
        print(f"Step 5: WebSocket status - {ws_resp.json()['active_connections']} connections")

        print("Full scanner workflow passed!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
