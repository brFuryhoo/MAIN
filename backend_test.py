#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, List, Any

class AureosAPITester:
    def __init__(self, base_url="https://fintech-powerhouse.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test credentials
        self.test_email = f"test_user_{int(time.time())}@example.com"
        self.test_password = "TestPass123!"
        self.test_name = "Test User"

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append(f"{name}: {details}")
        print()

    def make_request(self, method: str, endpoint: str, data: dict = None, headers: dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.api_url}{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            default_headers.update(headers)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=10)
            else:
                return False, {}, 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_content": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0

    def test_api_health(self):
        """Test basic API connectivity"""
        success, data, status = self.make_request('GET', '/')
        if success and data.get('message'):
            self.log_test("API Health Check", True, f"API responding: {data['message']}")
        else:
            self.log_test("API Health Check", False, f"Status: {status}, Data: {data}")

    def test_user_registration(self):
        """Test user registration"""
        success, data, status = self.make_request('POST', '/auth/register', {
            'email': self.test_email,
            'password': self.test_password,
            'full_name': self.test_name
        })
        
        if success and data.get('access_token'):
            self.token = data['access_token']
            self.user_data = data.get('user', {})
            self.log_test("User Registration", True, f"User created: {self.user_data.get('email')}")
        else:
            self.log_test("User Registration", False, f"Status: {status}, Error: {data.get('detail', 'Unknown')}")

    def test_user_login(self):
        """Test user login with created account"""
        success, data, status = self.make_request('POST', '/auth/login', {
            'email': self.test_email,
            'password': self.test_password
        })
        
        if success and data.get('access_token'):
            self.token = data['access_token']
            self.user_data = data.get('user', {})
            self.log_test("User Login", True, f"Login successful: {self.user_data.get('email')}")
        else:
            self.log_test("User Login", False, f"Status: {status}, Error: {data.get('detail', 'Unknown')}")

    def test_protected_route(self):
        """Test protected route access"""
        success, data, status = self.make_request('GET', '/auth/me')
        
        if success and data.get('email'):
            self.log_test("Protected Route (/auth/me)", True, f"User data retrieved: {data.get('email')}")
        else:
            self.log_test("Protected Route (/auth/me)", False, f"Status: {status}, Error: {data.get('detail', 'Unauthorized')}")

    def test_market_data_endpoints(self):
        """Test market data endpoints"""
        endpoints = [
            ('/market/stocks', 'Stocks'),
            ('/market/crypto', 'Crypto'),
            ('/market/forex', 'Forex'),
            ('/market/overview', 'Market Overview'),
            ('/market/heatmap', 'Market Heatmap')
        ]
        
        for endpoint, name in endpoints:
            success, data, status = self.make_request('GET', endpoint)
            
            if success:
                has_data = False
                if 'stocks' in data and len(data['stocks']) > 0:
                    has_data = True
                elif 'crypto' in data and len(data['crypto']) > 0:
                    has_data = True
                elif 'forex' in data and len(data['forex']) > 0:
                    has_data = True
                elif 'indices' in data or 'heatmap' in data:
                    has_data = True
                
                self.log_test(f"Market Data - {name}", has_data, 
                            f"Data available: {has_data}" if has_data else "No data returned")
            else:
                self.log_test(f"Market Data - {name}", False, f"Status: {status}, Error: {data.get('detail', 'Unknown')}")

    def test_stock_detail(self):
        """Test individual stock data"""
        success, data, status = self.make_request('GET', '/market/stocks/AAPL')
        
        if success and data.get('symbol') == 'AAPL':
            has_chart = 'chart_data' in data and len(data['chart_data']) > 0
            self.log_test("Stock Detail (AAPL)", True, f"Chart data available: {has_chart}")
        else:
            self.log_test("Stock Detail (AAPL)", False, f"Status: {status}, Error: {data.get('detail', 'Unknown')}")

    def test_crypto_detail(self):
        """Test individual crypto data"""
        success, data, status = self.make_request('GET', '/market/crypto/bitcoin')
        
        if success and data.get('id') == 'bitcoin':
            has_chart = 'chart_data' in data and len(data['chart_data']) > 0
            self.log_test("Crypto Detail (Bitcoin)", True, f"Chart data available: {has_chart}")
        else:
            self.log_test("Crypto Detail (Bitcoin)", False, f"Status: {status}, Error: {data.get('detail', 'Unknown')}")

    def test_watchlist_functionality(self):
        """Test watchlist add/remove functionality"""
        # Test get empty watchlist
        success, data, status = self.make_request('GET', '/watchlist')
        if success:
            self.log_test("Get Watchlist", True, f"Watchlist items: {len(data.get('watchlist', []))}")
        else:
            self.log_test("Get Watchlist", False, f"Status: {status}")
            return
        
        # Test add to watchlist
        success, data, status = self.make_request('POST', '/watchlist/add', {
            'symbol': 'AAPL',
            'asset_type': 'stock',
            'name': 'Apple Inc.'
        })
        
        if success:
            self.log_test("Add to Watchlist", True, "AAPL added successfully")
            
            # Test remove from watchlist
            success, data, status = self.make_request('DELETE', '/watchlist/AAPL')
            if success:
                self.log_test("Remove from Watchlist", True, "AAPL removed successfully")
            else:
                self.log_test("Remove from Watchlist", False, f"Status: {status}")
        else:
            self.log_test("Add to Watchlist", False, f"Status: {status}, Error: {data.get('detail', 'Unknown')}")

    def test_portfolio_functionality(self):
        """Test portfolio endpoints"""
        success, data, status = self.make_request('GET', '/portfolio')
        
        if success:
            portfolio_value = data.get('total_value', 0)
            self.log_test("Get Portfolio", True, f"Portfolio value: ${portfolio_value}")
        else:
            self.log_test("Get Portfolio", False, f"Status: {status}, Error: {data.get('detail', 'Unknown')}")

    def test_ai_copilot(self):
        """Test AI Copilot functionality"""
        success, data, status = self.make_request('POST', '/copilot/chat', {
            'message': 'What is the outlook for AAPL?',
            'context': {'symbol': 'AAPL'}
        })
        
        if success and data.get('response'):
            has_suggestion = data.get('trade_suggestion') is not None
            self.log_test("AI Copilot Chat", True, f"Response received, Trade suggestion: {has_suggestion}")
        else:
            self.log_test("AI Copilot Chat", False, f"Status: {status}, Error: {data.get('detail', 'AI service error')}")

    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        endpoints = [
            ('/analytics/risk-score', 'Risk Score'),
            ('/analytics/performance', 'Performance Analytics')
        ]
        
        for endpoint, name in endpoints:
            success, data, status = self.make_request('GET', endpoint)
            
            if success:
                self.log_test(f"Analytics - {name}", True, "Data retrieved successfully")
            else:
                self.log_test(f"Analytics - {name}", False, f"Status: {status}, Error: {data.get('detail', 'Unknown')}")

    def test_subscription_plans(self):
        """Test subscription plans endpoint"""
        success, data, status = self.make_request('GET', '/subscription/plans')
        
        if success and data.get('plans'):
            plans = data['plans']
            plan_count = len(plans)
            self.log_test("Subscription Plans", True, f"Found {plan_count} plans")
        else:
            self.log_test("Subscription Plans", False, f"Status: {status}, Error: {data.get('detail', 'Unknown')}")

    def test_contact_form(self):
        """Test contact form submission"""
        success, data, status = self.make_request('POST', '/contact', {
            'name': 'Test User',
            'email': self.test_email,
            'subject': 'API Test',
            'message': 'This is a test message from the automated test suite.'
        })
        
        if success and data.get('message'):
            self.log_test("Contact Form", True, "Contact form submitted successfully")
        else:
            self.log_test("Contact Form", False, f"Status: {status}, Error: {data.get('detail', 'Unknown')}")

    def test_tutorial_endpoints(self):
        """Test tutorial-related endpoints"""
        success, data, status = self.make_request('GET', '/tutorial/steps')
        
        if success and data.get('steps'):
            step_count = len(data['steps'])
            self.log_test("Tutorial Steps", True, f"Found {step_count} tutorial steps")
        else:
            self.log_test("Tutorial Steps", False, f"Status: {status}")

    def run_all_tests(self):
        """Run all test cases"""
        print("🚀 Starting Aureos AI API Test Suite")
        print("=" * 50)
        print()
        
        # Basic connectivity
        self.test_api_health()
        
        # Authentication flow
        self.test_user_registration()
        if self.token:  # Only continue if registration successful
            self.test_protected_route()
            
            # Market data tests
            self.test_market_data_endpoints()
            self.test_stock_detail()
            self.test_crypto_detail()
            
            # User features
            self.test_watchlist_functionality()
            self.test_portfolio_functionality()
            
            # AI features
            self.test_ai_copilot()
            
            # Analytics
            self.test_analytics_endpoints()
            
            # Other features
            self.test_subscription_plans()
            self.test_contact_form()
            self.test_tutorial_endpoints()
        
        else:
            # Test login with existing user if registration fails
            print("Registration failed, testing login...")
            self.test_user_login()
        
        # Print summary
        print("=" * 50)
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {len(self.failed_tests)}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"   - {failure}")
        
        return len(self.failed_tests) == 0

def main():
    tester = AureosAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())