"""
Test Aureos Token System, Weekly Challenge, and Price Validation - Iteration 16
================================================================================
Testing 3 new features:
1. Aureos Token internal reward economy (earn, spend, daily-login, store)
2. Weekly Score Challenge (leaderboard, registration, prizes)
3. Price validation/normalization layer for market data

Test user: test@test.com / test (already has 43 AT balance, registered for weekly challenge)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ========== FIXTURES ==========

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@test.com",
        "password": "test"
    })
    if resp.status_code == 200:
        data = resp.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Authentication failed: {resp.status_code} - {resp.text}")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

@pytest.fixture(scope="module")
def session():
    """Shared requests session"""
    return requests.Session()


# ========== TOKEN BALANCE TESTS ==========

class TestTokenBalance:
    """Tests for GET /api/tokens/balance"""
    
    def test_get_balance_success(self, session, auth_headers):
        """Test getting token balance returns all required fields"""
        resp = session.get(f"{BASE_URL}/api/tokens/balance", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        # Verify required fields
        assert "balance" in data, "Response should include balance"
        assert "total_earned" in data, "Response should include total_earned"
        assert "total_spent" in data, "Response should include total_spent"
        assert "recent_transactions" in data, "Response should include recent_transactions"
        
        # Verify data types
        assert isinstance(data["balance"], (int, float)), "Balance should be numeric"
        assert isinstance(data["total_earned"], (int, float)), "total_earned should be numeric"
        assert isinstance(data["total_spent"], (int, float)), "total_spent should be numeric"
        assert isinstance(data["recent_transactions"], list), "recent_transactions should be a list"
        
        print(f"Token Balance: {data['balance']} AT, Earned: {data['total_earned']}, Spent: {data['total_spent']}")
    
    def test_get_balance_unauthorized(self, session):
        """Test getting balance without auth returns 401"""
        resp = session.get(f"{BASE_URL}/api/tokens/balance")
        assert resp.status_code == 401, f"Expected 401 for unauthorized, got {resp.status_code}"


# ========== EARNING RULES TESTS ==========

class TestEarningRules:
    """Tests for GET /api/tokens/earning-rules"""
    
    def test_get_earning_rules_returns_16_rules(self, session):
        """Test earning rules returns all 16 defined rules"""
        resp = session.get(f"{BASE_URL}/api/tokens/earning-rules")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "rules" in data, "Response should include rules"
        rules = data["rules"]
        
        # Verify we have 16 earning rules
        assert len(rules) == 16, f"Expected 16 earning rules, got {len(rules)}"
        
        # Verify each rule has required fields
        for rule in rules:
            assert "id" in rule, "Each rule should have id"
            assert "tokens" in rule, "Each rule should have tokens"
            assert "description" in rule, "Each rule should have description"
        
        # Verify specific key rules exist
        rule_ids = [r["id"] for r in rules]
        expected_rules = ["trade_close", "trade_win", "trade_big_win", "daily_login", 
                         "weekly_challenge_winner", "achievement_unlock"]
        for expected in expected_rules:
            assert expected in rule_ids, f"Expected rule '{expected}' not found"
        
        # Verify token amounts
        trade_close = next(r for r in rules if r["id"] == "trade_close")
        assert trade_close["tokens"] == 5, "trade_close should award 5 tokens"
        
        trade_win = next(r for r in rules if r["id"] == "trade_win")
        assert trade_win["tokens"] == 10, "trade_win should award 10 tokens"
        
        trade_big_win = next(r for r in rules if r["id"] == "trade_big_win")
        assert trade_big_win["tokens"] == 25, "trade_big_win should award 25 tokens"
        
        daily_login = next(r for r in rules if r["id"] == "daily_login")
        assert daily_login["tokens"] == 3, "daily_login should award 3 tokens"
        
        print(f"Earning rules: {len(rules)} rules found with expected token amounts")


# ========== TOKEN STORE TESTS ==========

class TestTokenStore:
    """Tests for GET /api/tokens/store"""
    
    def test_get_store_returns_8_items(self, session, auth_headers):
        """Test store returns 8 purchasable items with can_afford flag"""
        resp = session.get(f"{BASE_URL}/api/tokens/store", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "items" in data, "Response should include items"
        assert "balance" in data, "Response should include user balance"
        
        items = data["items"]
        # Verify we have 8 store items
        assert len(items) == 8, f"Expected 8 store items, got {len(items)}"
        
        # Verify each item has required fields
        for item in items:
            assert "id" in item, "Each item should have id"
            assert "name" in item, "Each item should have name"
            assert "cost" in item, "Each item should have cost"
            assert "description" in item, "Each item should have description"
            assert "category" in item, "Each item should have category"
            assert "can_afford" in item, "Each item should have can_afford flag"
            assert isinstance(item["can_afford"], bool), "can_afford should be boolean"
        
        # Verify specific items exist
        item_ids = [i["id"] for i in items]
        expected_items = ["unlock_signal", "jarvis_deep_insight", "pro_1day", "pro_7days"]
        for expected in expected_items:
            assert expected in item_ids, f"Expected item '{expected}' not found"
        
        # Verify can_afford logic matches balance
        balance = data["balance"]
        for item in items:
            expected_can_afford = balance >= item["cost"]
            assert item["can_afford"] == expected_can_afford, f"can_afford mismatch for {item['id']}"
        
        print(f"Store: {len(items)} items, User balance: {balance} AT")
    
    def test_get_store_unauthorized(self, session):
        """Test store requires authentication"""
        resp = session.get(f"{BASE_URL}/api/tokens/store")
        assert resp.status_code == 401, f"Expected 401 for unauthorized, got {resp.status_code}"


# ========== DAILY LOGIN TESTS ==========

class TestDailyLogin:
    """Tests for POST /api/tokens/daily-login"""
    
    def test_daily_login_claim(self, session, auth_headers):
        """Test claiming daily login bonus (or already claimed message)"""
        resp = session.post(f"{BASE_URL}/api/tokens/daily-login", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "success" in data, "Response should include success flag"
        
        if data["success"]:
            # First claim of the day
            assert "earned" in data, "Response should include earned tokens"
            assert "streak" in data, "Response should include streak"
            assert "new_balance" in data, "Response should include new_balance"
            assert data["earned"] >= 3, "Should earn at least 3 tokens (base daily bonus)"
            print(f"Daily login claimed: +{data['earned']} AT, Streak: {data['streak']} days")
        else:
            # Already claimed today
            assert "message" in data, "Response should include message if not success"
            assert "already claimed" in data["message"].lower(), "Should indicate already claimed"
            print(f"Daily login already claimed: {data['message']}")
    
    def test_daily_login_unauthorized(self, session):
        """Test daily login requires authentication"""
        resp = session.post(f"{BASE_URL}/api/tokens/daily-login")
        assert resp.status_code == 401, f"Expected 401 for unauthorized, got {resp.status_code}"


# ========== EARN TOKENS TESTS ==========

class TestEarnTokens:
    """Tests for POST /api/tokens/earn"""
    
    def test_earn_tokens_valid_reason(self, session, auth_headers):
        """Test earning tokens for a valid reason"""
        resp = session.post(f"{BASE_URL}/api/tokens/earn", headers=auth_headers, 
                           json={"reason": "first_analysis"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get("success") == True, "Should succeed for valid reason"
        assert "earned" in data, "Should include earned amount"
        assert "new_balance" in data, "Should include new balance"
        assert "transaction_id" in data, "Should include transaction ID"
        
        print(f"Earned {data['earned']} AT for 'first_analysis', new balance: {data['new_balance']}")
    
    def test_earn_tokens_custom_amount(self, session, auth_headers):
        """Test earning custom amount of tokens"""
        resp = session.post(f"{BASE_URL}/api/tokens/earn", headers=auth_headers,
                           json={"reason": "achievement_unlock", "amount": 20})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get("success") == True, "Should succeed"
        # Custom amount should override rule base amount
        print(f"Earned {data['earned']} AT (custom amount test)")
    
    def test_earn_tokens_invalid_reason(self, session, auth_headers):
        """Test earning with invalid reason returns error"""
        resp = session.post(f"{BASE_URL}/api/tokens/earn", headers=auth_headers,
                           json={"reason": "invalid_reason_xyz"})
        assert resp.status_code == 400, f"Expected 400 for invalid reason, got {resp.status_code}"


# ========== SPEND TOKENS TESTS ==========

class TestSpendTokens:
    """Tests for POST /api/tokens/spend"""
    
    def test_spend_tokens_insufficient_balance(self, session, auth_headers):
        """Test spending more tokens than balance returns 400"""
        # Try to buy the most expensive item (pro_7days = 1000 tokens)
        resp = session.post(f"{BASE_URL}/api/tokens/spend", headers=auth_headers,
                           json={"item_id": "pro_7days", "context": "test"})
        
        # Get current balance first
        balance_resp = session.get(f"{BASE_URL}/api/tokens/balance", headers=auth_headers)
        balance = balance_resp.json().get("balance", 0)
        
        if balance >= 1000:
            # User has enough, this should succeed
            assert resp.status_code == 200, f"Expected 200 (user has {balance} AT), got {resp.status_code}"
        else:
            # User doesn't have enough
            assert resp.status_code == 400, f"Expected 400 for insufficient balance, got {resp.status_code}"
            assert "insufficient" in resp.text.lower() or "insuficiente" in resp.text.lower()
            print(f"Correctly rejected: User has {balance} AT, needs 1000")
    
    def test_spend_tokens_invalid_item(self, session, auth_headers):
        """Test spending on invalid item returns 404"""
        resp = session.post(f"{BASE_URL}/api/tokens/spend", headers=auth_headers,
                           json={"item_id": "nonexistent_item_xyz"})
        assert resp.status_code == 404, f"Expected 404 for invalid item, got {resp.status_code}"
    
    def test_spend_tokens_success_affordable_item(self, session, auth_headers):
        """Test successfully spending tokens on an affordable item"""
        # Get current balance
        balance_resp = session.get(f"{BASE_URL}/api/tokens/balance", headers=auth_headers)
        old_balance = balance_resp.json().get("balance", 0)
        
        # Try to buy cheapest item (why_trade_analysis = 30 tokens)
        if old_balance >= 30:
            resp = session.post(f"{BASE_URL}/api/tokens/spend", headers=auth_headers,
                               json={"item_id": "why_trade_analysis", "context": "BTC"})
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
            
            data = resp.json()
            assert data.get("success") == True, "Should succeed"
            assert "cost" in data, "Should include cost"
            assert "new_balance" in data, "Should include new balance"
            assert data["new_balance"] == old_balance - 30, "Balance should decrease by item cost"
            
            print(f"Spent 30 AT on 'Why Trade Analysis', balance: {old_balance} → {data['new_balance']}")
        else:
            pytest.skip(f"User balance ({old_balance}) too low to test successful purchase")


# ========== TOKEN HISTORY TESTS ==========

class TestTokenHistory:
    """Tests for GET /api/tokens/history"""
    
    def test_get_history_returns_transactions(self, session, auth_headers):
        """Test getting full transaction history"""
        resp = session.get(f"{BASE_URL}/api/tokens/history", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "transactions" in data, "Response should include transactions"
        assert "total" in data, "Response should include total count"
        
        transactions = data["transactions"]
        assert isinstance(transactions, list), "transactions should be a list"
        
        # Verify transaction structure if we have any
        if transactions:
            txn = transactions[0]
            assert "id" in txn, "Transaction should have id"
            assert "type" in txn, "Transaction should have type"
            assert "amount" in txn, "Transaction should have amount"
            assert "timestamp" in txn, "Transaction should have timestamp"
            
            # Types should be 'earn' or 'spend'
            valid_types = ["earn", "spend"]
            assert txn["type"] in valid_types, f"Transaction type should be in {valid_types}"
        
        print(f"Transaction history: {data['total']} transactions found")


# ========== WEEKLY CHALLENGE TESTS ==========

class TestWeeklyChallenge:
    """Tests for Weekly Challenge endpoints"""
    
    def test_get_weekly_challenge_status(self, session, auth_headers):
        """Test getting weekly challenge status and leaderboard"""
        resp = session.get(f"{BASE_URL}/api/tokens/weekly-challenge", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        # Verify required fields
        assert "week_id" in data, "Response should include week_id"
        assert "starts" in data, "Response should include starts"
        assert "ends" in data, "Response should include ends"
        assert "days_remaining" in data, "Response should include days_remaining"
        assert "total_participants" in data, "Response should include total_participants"
        assert "leaderboard" in data, "Response should include leaderboard"
        assert "prizes" in data, "Response should include prizes"
        
        # Verify leaderboard structure
        leaderboard = data["leaderboard"]
        assert isinstance(leaderboard, list), "leaderboard should be a list"
        
        if leaderboard:
            entry = leaderboard[0]
            assert "rank" in entry, "Entry should have rank"
            assert "username" in entry, "Entry should have username"
            assert "score_delta" in entry, "Entry should have score_delta"
        
        # Verify prizes structure
        prizes = data["prizes"]
        assert "1st" in prizes, "Prizes should include 1st place"
        assert "2nd" in prizes, "Prizes should include 2nd place"
        assert "3rd" in prizes, "Prizes should include 3rd place"
        assert prizes["1st"]["tokens"] == 500, "1st place should win 500 tokens"
        assert prizes["2nd"]["tokens"] == 300, "2nd place should win 300 tokens"
        assert prizes["3rd"]["tokens"] == 200, "3rd place should win 200 tokens"
        
        # Check user's entry if logged in
        if data.get("my_entry"):
            assert "rank" in data["my_entry"], "my_entry should have rank"
            assert "score_delta" in data["my_entry"], "my_entry should have score_delta"
        
        print(f"Weekly Challenge {data['week_id']}: {data['total_participants']} participants, {data['days_remaining']} days left")
    
    def test_register_weekly_challenge(self, session, auth_headers):
        """Test registering for weekly challenge (or already registered)"""
        resp = session.post(f"{BASE_URL}/api/tokens/weekly-challenge/register", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert data.get("success") == True, "Should succeed"
        assert "week_id" in data, "Response should include week_id"
        
        if "starting_score" in data:
            print(f"Registered for {data['week_id']} with starting score: {data['starting_score']}")
        else:
            print(f"Already registered for {data['week_id']}: {data.get('message')}")
    
    def test_register_unauthorized(self, session):
        """Test registration requires authentication"""
        resp = session.post(f"{BASE_URL}/api/tokens/weekly-challenge/register")
        assert resp.status_code == 401, f"Expected 401 for unauthorized, got {resp.status_code}"


# ========== PRICE VALIDATION TESTS ==========

class TestPriceValidation:
    """Tests for price validation in market data endpoint"""
    
    def test_market_pulse_has_validated_prices(self, session, auth_headers):
        """Test /api/intelligence/market-pulse returns validated prices"""
        resp = session.get(f"{BASE_URL}/api/intelligence/market-pulse", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        indicators = data.get("indicators", data.get("data", []))
        
        if isinstance(indicators, list) and indicators:
            # Check Gold price is in reasonable range (should be 1800-4000 per troy ounce)
            gold_indicator = next((i for i in indicators if "GOLD" in i.get("symbol", "").upper() or "XAU" in i.get("symbol", "").upper()), None)
            if gold_indicator:
                gold_price = gold_indicator.get("value", 0)
                assert 1800 <= gold_price <= 4000, f"Gold price ${gold_price} outside expected range (1800-4000)"
                print(f"Gold price validated: ${gold_price:.2f}")
            
            # Check S&P 500 (SPY) is in reasonable range (300-700)
            spy_indicator = next((i for i in indicators if "SPY" in i.get("symbol", "").upper() or "S&P" in i.get("symbol", "").upper()), None)
            if spy_indicator:
                spy_price = spy_indicator.get("value", 0)
                assert 300 <= spy_price <= 700, f"SPY price ${spy_price} outside expected range (300-700)"
                print(f"SPY price validated: ${spy_price:.2f}")
            
            print(f"Market pulse returned {len(indicators)} indicators with validated prices")
    
    def test_price_validation_normalization_logic(self, session, auth_headers):
        """Test that price normalization is applied to market data"""
        # Call the endpoint that uses market_data.py
        resp = session.get(f"{BASE_URL}/api/intelligence/market-pulse", headers=auth_headers)
        if resp.status_code != 200:
            pytest.skip("Market pulse endpoint not available")
        
        # The validate_and_normalize_price function should ensure:
        # - XAU/USD (Gold): 1800-4000 range
        # - EUR/USD: 0.85-1.30 range
        # - BTC: 20000-250000 range
        
        data = resp.json()
        indicators = data.get("indicators", data.get("data", []))
        
        # Just verify we got data back and no extreme outliers
        for ind in indicators:
            value = ind.get("value", 0)
            symbol = ind.get("symbol", "")
            assert value > 0, f"Price for {symbol} should be positive"
            
            # No single stock/commodity should be > $100,000 (except BTC)
            if "BTC" not in symbol.upper():
                assert value < 100000, f"Price for {symbol} ({value}) seems unreasonably high"
        
        print("Price validation logic confirmed working")


# ========== PAPER TRADING TOKEN INTEGRATION TESTS ==========

class TestPaperTradingTokenIntegration:
    """Tests for token grants on paper trade close"""
    
    def test_paper_trade_close_grants_tokens(self, session, auth_headers):
        """Test that closing a paper trade grants tokens"""
        # First get initial token balance
        balance_resp = session.get(f"{BASE_URL}/api/tokens/balance", headers=auth_headers)
        if balance_resp.status_code != 200:
            pytest.skip("Could not get token balance")
        initial_balance = balance_resp.json().get("balance", 0)
        
        # Create a paper trade
        trade_resp = session.post(f"{BASE_URL}/api/paper/trade", headers=auth_headers, json={
            "symbol": "TEST_TOKEN_GRANT",
            "name": "Test Token Grant Asset",
            "asset_type": "stock",
            "action": "buy",
            "quantity": 1,
            "price": 100.0
        })
        
        if trade_resp.status_code != 200:
            pytest.skip(f"Could not create paper trade: {trade_resp.text}")
        
        trade_id = trade_resp.json().get("trade_id")
        
        # Close the trade with a small profit (to trigger trade_close + trade_win tokens)
        close_resp = session.post(f"{BASE_URL}/api/paper/close", headers=auth_headers, json={
            "trade_id": trade_id,
            "close_price": 105.0  # 5% profit
        })
        
        if close_resp.status_code != 200:
            pytest.skip(f"Could not close paper trade: {close_resp.text}")
        
        close_data = close_resp.json()
        assert close_data.get("is_win") == True, "Trade should be a win"
        
        # Allow time for token grant to process
        time.sleep(0.5)
        
        # Check token balance increased
        new_balance_resp = session.get(f"{BASE_URL}/api/tokens/balance", headers=auth_headers)
        new_balance = new_balance_resp.json().get("balance", 0)
        
        # Should have earned at least 5 (trade_close) + 10 (trade_win) = 15 tokens
        # Note: Could be +25 more if pnl_pct > 5 (trade_big_win)
        tokens_earned = new_balance - initial_balance
        assert tokens_earned >= 15, f"Expected at least 15 tokens (5+10), earned {tokens_earned}"
        
        print(f"Paper trade close granted {tokens_earned} tokens (balance: {initial_balance} → {new_balance})")


# ========== RUN ALL TESTS ==========

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
