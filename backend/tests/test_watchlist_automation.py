"""
Watchlist Automation Tests - Phase P1
--------------------------------------
Tests for the Watchlist feature:
- GET /api/watchlist/ - Get user's watchlist items
- POST /api/watchlist/add - Add asset to watchlist
- POST /api/watchlist/add duplicate handling - Returns 'already_exists'
- POST /api/watchlist/remove - Remove asset by symbol
- POST /api/watchlist/scan - Scan all watchlist assets (JARVIS analysis)
- POST /api/watchlist/alerts/mark-read - Mark alerts as read
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
API_URL = f"{BASE_URL}/api"

# Test credentials
TEST_EMAIL = "test@aureos.com"
TEST_PASSWORD = "Test1234!"


class TestWatchlistAuthentication:
    """Test authentication and get token for watchlist tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login_success(self):
        """Test that login works with test credentials"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Login successful for {TEST_EMAIL}")


class TestWatchlistCRUD:
    """Test Watchlist CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_watchlist(self, headers):
        """Test GET /api/watchlist/ - Get user's watchlist"""
        response = requests.get(f"{API_URL}/watchlist/", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "watchlist" in data, "Response should contain 'watchlist' field"
        assert "count" in data, "Response should contain 'count' field"
        assert "unread_alerts" in data, "Response should contain 'unread_alerts' field"
        assert "alerts" in data, "Response should contain 'alerts' field"
        
        assert isinstance(data["watchlist"], list)
        assert isinstance(data["count"], int)
        assert isinstance(data["alerts"], list)
        
        print(f"Watchlist has {data['count']} items, {data['unread_alerts']} unread alerts")
        return data
    
    def test_add_asset_to_watchlist(self, headers):
        """Test POST /api/watchlist/add - Add asset to watchlist"""
        # First remove TEST_ETH if it exists to ensure clean test
        requests.post(f"{API_URL}/watchlist/remove", 
                     json={"symbol": "TEST_ETH"}, 
                     headers=headers)
        
        # Add a new test asset
        payload = {
            "symbol": "TEST_ETH",
            "name": "Test Ethereum",
            "asset_type": "crypto",
            "coingecko_id": "ethereum",
            "exchange": None,
            "alert_on_signal_change": True
        }
        
        response = requests.post(f"{API_URL}/watchlist/add", 
                                json=payload, 
                                headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "added", f"Expected status 'added', got: {data.get('status')}"
        assert "symbol" in data
        assert data["symbol"] == "TEST_ETH"
        
        print(f"Added TEST_ETH to watchlist: {data.get('message')}")
        
        # Clean up
        requests.post(f"{API_URL}/watchlist/remove", 
                     json={"symbol": "TEST_ETH"}, 
                     headers=headers)
    
    def test_add_duplicate_asset(self, headers):
        """Test POST /api/watchlist/add - Duplicate returns 'already_exists'"""
        # First add an asset
        payload = {
            "symbol": "TEST_DUP",
            "name": "Test Duplicate",
            "asset_type": "stock",
            "alert_on_signal_change": True
        }
        
        # First addition
        requests.post(f"{API_URL}/watchlist/add", json=payload, headers=headers)
        
        # Try to add duplicate
        response = requests.post(f"{API_URL}/watchlist/add", 
                                json=payload, 
                                headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "already_exists", f"Expected 'already_exists', got: {data.get('status')}"
        
        print(f"Duplicate check passed: {data.get('message')}")
        
        # Clean up
        requests.post(f"{API_URL}/watchlist/remove", 
                     json={"symbol": "TEST_DUP"}, 
                     headers=headers)
    
    def test_remove_asset_from_watchlist(self, headers):
        """Test POST /api/watchlist/remove - Remove asset by symbol"""
        # First add an asset to remove
        payload = {
            "symbol": "TEST_REMOVE",
            "name": "Test Remove Asset",
            "asset_type": "stock"
        }
        requests.post(f"{API_URL}/watchlist/add", json=payload, headers=headers)
        
        # Now remove it
        response = requests.post(f"{API_URL}/watchlist/remove", 
                                json={"symbol": "TEST_REMOVE"}, 
                                headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "removed", f"Expected 'removed', got: {data.get('status')}"
        
        print(f"Remove asset passed: {data.get('message')}")
    
    def test_remove_nonexistent_asset(self, headers):
        """Test POST /api/watchlist/remove - Remove nonexistent returns 'not_found'"""
        response = requests.post(f"{API_URL}/watchlist/remove", 
                                json={"symbol": "NONEXISTENT_SYMBOL_12345"}, 
                                headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "not_found", f"Expected 'not_found', got: {data.get('status')}"
        
        print(f"Not found check passed: {data.get('message')}")


class TestWatchlistScan:
    """Test Watchlist Scan functionality (JARVIS analysis)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_scan_watchlist(self, headers):
        """Test POST /api/watchlist/scan - Scan all watchlist assets"""
        # This can take 5-10 seconds per asset
        response = requests.post(f"{API_URL}/watchlist/scan", 
                                json={}, 
                                headers=headers,
                                timeout=60)  # Extended timeout for scan
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        # Status can be 'complete' or 'empty' if watchlist is empty
        assert data["status"] in ["complete", "empty"], f"Unexpected status: {data.get('status')}"
        
        if data["status"] == "complete":
            assert "scanned" in data
            assert "alerts_generated" in data
            assert "results" in data
            assert isinstance(data["results"], list)
            
            print(f"Scan complete: {data['scanned']} assets scanned, {data['alerts_generated']} alerts generated")
            
            # Verify result structure for each scanned asset
            for result in data.get("results", []):
                assert "symbol" in result
                assert "price" in result
                assert "signal" in result
                print(f"  - {result['symbol']}: ${result.get('price', 0):,.2f}, Signal: {result.get('signal')}")
        else:
            print(f"Watchlist is empty - scan returned: {data.get('message')}")


class TestWatchlistAlerts:
    """Test Watchlist Alerts functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_mark_alerts_read(self, headers):
        """Test POST /api/watchlist/alerts/mark-read - Mark all alerts as read"""
        response = requests.post(f"{API_URL}/watchlist/alerts/mark-read", 
                                json={}, 
                                headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "ok", f"Expected 'ok', got: {data.get('status')}"
        
        print("Mark alerts read: passed")
    
    def test_alerts_count_after_mark_read(self, headers):
        """Test that unread_alerts is 0 after marking read"""
        # First mark all as read
        requests.post(f"{API_URL}/watchlist/alerts/mark-read", json={}, headers=headers)
        
        # Then check watchlist
        response = requests.get(f"{API_URL}/watchlist/", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # After marking read, unread_alerts should be 0
        assert data.get("unread_alerts", 0) == 0, "Unread alerts should be 0 after marking read"
        
        print("Unread alerts count verified: 0")


class TestAssetSearch:
    """Test Asset Search for adding to watchlist"""
    
    def test_search_assets_api(self):
        """Test GET /api/assets/search - Search for assets"""
        response = requests.get(f"{API_URL}/assets/search", params={"q": "AAPL"})
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert isinstance(data["results"], list)
        assert len(data["results"]) > 0, "Should return at least 1 result for AAPL"
        
        # Verify result structure
        result = data["results"][0]
        assert "symbol" in result
        assert "name" in result
        assert "type" in result
        
        print(f"Asset search returned {len(data['results'])} results for 'AAPL'")
        print(f"  First result: {result['symbol']} - {result['name']} ({result['type']})")
    
    def test_search_crypto_assets(self):
        """Test GET /api/assets/search - Search for crypto"""
        response = requests.get(f"{API_URL}/assets/search", params={"q": "bitcoin"})
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert isinstance(data["results"], list)
        
        print(f"Crypto search returned {len(data['results'])} results for 'bitcoin'")
    
    def test_search_forex_assets(self):
        """Test GET /api/assets/search - Search for forex"""
        response = requests.get(f"{API_URL}/assets/search", params={"q": "EUR"})
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert isinstance(data["results"], list)
        
        print(f"Forex search returned {len(data['results'])} results for 'EUR'")


class TestWatchlistIntegration:
    """Integration tests for full watchlist workflow"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_full_watchlist_workflow(self, headers):
        """Test full workflow: Add -> Get -> Scan -> Remove"""
        
        # 1. Clean up any existing test asset
        requests.post(f"{API_URL}/watchlist/remove", 
                     json={"symbol": "TEST_WORKFLOW"}, 
                     headers=headers)
        
        # 2. Add asset
        add_resp = requests.post(f"{API_URL}/watchlist/add", 
                                json={
                                    "symbol": "TEST_WORKFLOW",
                                    "name": "Workflow Test Asset",
                                    "asset_type": "stock",
                                    "alert_on_signal_change": True
                                }, 
                                headers=headers)
        assert add_resp.status_code == 200
        assert add_resp.json()["status"] == "added"
        print("Step 1: Added TEST_WORKFLOW")
        
        # 3. Get watchlist and verify asset is there
        get_resp = requests.get(f"{API_URL}/watchlist/", headers=headers)
        assert get_resp.status_code == 200
        watchlist = get_resp.json()["watchlist"]
        
        found = any(item["symbol"] == "TEST_WORKFLOW" for item in watchlist)
        assert found, "TEST_WORKFLOW not found in watchlist"
        print("Step 2: Verified TEST_WORKFLOW in watchlist")
        
        # 4. Remove asset
        remove_resp = requests.post(f"{API_URL}/watchlist/remove", 
                                   json={"symbol": "TEST_WORKFLOW"}, 
                                   headers=headers)
        assert remove_resp.status_code == 200
        assert remove_resp.json()["status"] == "removed"
        print("Step 3: Removed TEST_WORKFLOW")
        
        # 5. Verify it's gone
        get_resp2 = requests.get(f"{API_URL}/watchlist/", headers=headers)
        watchlist2 = get_resp2.json()["watchlist"]
        found2 = any(item["symbol"] == "TEST_WORKFLOW" for item in watchlist2)
        assert not found2, "TEST_WORKFLOW should not be in watchlist after removal"
        print("Step 4: Verified TEST_WORKFLOW removed")
        
        print("Full workflow test passed!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
