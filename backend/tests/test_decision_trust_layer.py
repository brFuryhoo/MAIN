"""
Decision Engine and Trust Layer Tests - Iteration 21
=====================================================
Testing the new Data Infrastructure (500+ assets), Trust Layer, and Decision Engine systems.
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"


class TestAssetUniverse:
    """Tests for the 500+ asset universe catalog"""

    def test_asset_universe_returns_500_plus_assets(self):
        """GET /api/decision/universe/catalog returns 500+ assets"""
        response = requests.get(f"{BASE_URL}/api/decision/universe/catalog")
        assert response.status_code == 200
        data = response.json()
        
        # Verify total count
        assert 'counts' in data
        assert data['counts']['total'] >= 500
        
        # Verify asset breakdown
        counts = data['counts']
        assert counts['us_stocks'] >= 200  # Expected ~220
        assert counts['international_stocks'] >= 60  # Expected ~69
        assert counts['crypto'] >= 90  # Expected ~99
        assert counts['etfs'] >= 50  # Expected ~54
        assert counts['forex'] >= 20  # Expected ~25
        assert counts['commodities'] >= 10  # Expected ~15
        assert counts['indices'] >= 15  # Expected ~18
        
        # Verify assets array exists
        assert 'assets' in data
        assert len(data['assets']) == data['counts']['total']

    def test_asset_universe_search_btc(self):
        """GET /api/decision/universe/catalog?query=BTC returns search results"""
        response = requests.get(f"{BASE_URL}/api/decision/universe/catalog?query=BTC")
        assert response.status_code == 200
        data = response.json()
        
        assert 'results' in data
        assert 'total' in data
        assert data['total'] > 0
        assert data['query'] == 'BTC'
        
        # Verify BTC crypto is in results
        symbols = [r['symbol'] for r in data['results']]
        assert 'BTC' in symbols or any('BTC' in s for s in symbols)
        
        # Verify result structure
        for result in data['results']:
            assert 'symbol' in result
            assert 'name' in result
            assert 'type' in result

    def test_asset_universe_filter_by_crypto(self):
        """GET /api/decision/universe/catalog?asset_type=crypto filters by type"""
        response = requests.get(f"{BASE_URL}/api/decision/universe/catalog?asset_type=crypto")
        assert response.status_code == 200
        data = response.json()
        
        assert 'assets' in data
        assert len(data['assets']) >= 90  # Expected ~99 crypto assets
        
        # All assets should be crypto type
        for asset in data['assets']:
            assert asset['type'] == 'crypto'
            assert 'symbol' in asset
            assert 'name' in asset

    def test_asset_universe_filter_by_stock(self):
        """GET /api/decision/universe/catalog?asset_type=stock filters stocks"""
        response = requests.get(f"{BASE_URL}/api/decision/universe/catalog?asset_type=stock")
        assert response.status_code == 200
        data = response.json()
        
        assert 'assets' in data
        assert len(data['assets']) >= 250  # US + International stocks
        
        for asset in data['assets']:
            assert asset['type'] == 'stock'

    def test_asset_universe_search_with_filter(self):
        """Search can be combined with type filter"""
        response = requests.get(f"{BASE_URL}/api/decision/universe/catalog?query=ETH&asset_type=crypto")
        assert response.status_code == 200
        data = response.json()
        
        # Should return ETH crypto
        assert 'results' in data
        # ETH should be in results
        symbols = [r['symbol'] for r in data['results']]
        assert 'ETH' in symbols


class TestDecisionEngine:
    """Tests for the Decision Engine BUY/SELL/HOLD signals"""

    def test_decision_btc_crypto(self):
        """GET /api/decision/BTC?asset_type=crypto returns structured decision"""
        response = requests.get(f"{BASE_URL}/api/decision/BTC?asset_type=crypto")
        assert response.status_code == 200
        data = response.json()
        
        # Verify symbol and type
        assert data['symbol'] == 'BTC'
        assert data['type'] == 'crypto'
        assert 'current_price' in data
        
        # Verify decision structure
        decision = data.get('decision', {})
        assert decision['decision'] in ['BUY', 'SELL', 'HOLD']
        assert 0 <= decision['probability'] <= 1
        assert 'confidence' in decision
        assert decision['confidence_tier'] in ['low', 'medium', 'high', 'very_high']
        
        # Verify price levels
        assert 'entry_price' in decision
        assert 'target_price' in decision
        assert 'stop_loss' in decision
        assert 'risk_reward_ratio' in decision
        assert decision['risk_level'] in ['low', 'moderate', 'high']
        
        # Verify factors and reasoning
        assert 'factors' in decision
        assert 'reasoning' in decision
        assert isinstance(decision['reasoning'], list)
        assert len(decision['reasoning']) > 0
        
        # Verify technicals
        assert 'technicals' in data
        technicals = data['technicals']
        assert 'rsi' in technicals
        assert 'macd_signal' in technicals
        assert 'ma_trend' in technicals
        
        # Verify why_this_trade
        assert 'why_this_trade' in data
        why = data['why_this_trade']
        assert 'market_structure' in why
        assert 'liquidity' in why
        assert 'volatility' in why
        assert 'sentiment' in why
        assert 'quant_signals' in why
        
        # Verify signal_id is returned (for trust layer)
        assert 'signal_id' in data
        assert len(data['signal_id']) > 0

    def test_decision_aapl_stock(self):
        """GET /api/decision/AAPL?asset_type=stock returns stock decision"""
        response = requests.get(f"{BASE_URL}/api/decision/AAPL?asset_type=stock")
        assert response.status_code == 200
        data = response.json()
        
        assert data['symbol'] == 'AAPL'
        assert data['type'] == 'stock'
        
        decision = data.get('decision', {})
        assert decision['decision'] in ['BUY', 'SELL', 'HOLD']
        assert 0 <= decision['probability'] <= 1
        
        # Stock should have all decision fields
        assert 'entry_price' in decision
        assert 'target_price' in decision
        assert 'stop_loss' in decision

    def test_decision_auto_logs_signal(self):
        """Decision endpoint auto-logs signals for track record"""
        # Make a decision request
        response = requests.get(f"{BASE_URL}/api/decision/ETH?asset_type=crypto")
        assert response.status_code == 200
        data = response.json()
        
        signal_id = data.get('signal_id')
        assert signal_id
        
        # Verify signal was logged in trust layer
        trust_response = requests.get(f"{BASE_URL}/api/trust/signal/{signal_id}")
        assert trust_response.status_code == 200
        trust_data = trust_response.json()
        
        assert trust_data['signal']['symbol'] == 'ETH'
        assert trust_data['signal']['signal_id'] == signal_id


class TestBatchDecisions:
    """Tests for batch decision scanning (top opportunities)"""

    def test_top_opportunities_returns_signals(self):
        """GET /api/decision/batch/top-opportunities returns top opportunities"""
        response = requests.get(f"{BASE_URL}/api/decision/batch/top-opportunities")
        assert response.status_code == 200
        data = response.json()
        
        assert 'opportunities' in data
        assert 'total_scanned' in data
        assert data['total_scanned'] >= 10  # Should scan at least 10 major assets
        
        # Verify opportunity structure
        for opp in data['opportunities']:
            assert 'symbol' in opp
            assert 'name' in opp
            assert 'type' in opp
            assert 'price' in opp
            assert opp['decision'] in ['BUY', 'SELL']  # No HOLD in opportunities
            assert 0 <= opp['probability'] <= 1
            assert 'confidence_tier' in opp
            assert 'target' in opp
            assert 'stop_loss' in opp
            assert 'risk_reward' in opp
            assert 'top_reason' in opp

    def test_top_opportunities_limit_param(self):
        """Top opportunities respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/decision/batch/top-opportunities?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data['opportunities']) <= 5


class TestTrustLayer:
    """Tests for the Trust Layer - Performance Dashboard, Track Record, Signal Transparency"""

    def test_performance_dashboard(self):
        """GET /api/trust/performance returns public performance dashboard"""
        response = requests.get(f"{BASE_URL}/api/trust/performance")
        assert response.status_code == 200
        data = response.json()
        
        # Verify overview metrics
        assert 'overview' in data
        overview = data['overview']
        assert 'total_trades' in overview
        assert 'win_rate' in overview
        assert 'total_pnl' in overview
        assert 'max_drawdown' in overview
        assert 'risk_reward_ratio' in overview
        assert 'avg_win' in overview
        assert 'avg_loss' in overview
        assert 'sharpe_estimate' in overview
        
        # Verify signals metrics
        assert 'signals' in data
        signals = data['signals']
        assert 'total_signals' in signals
        assert 'accuracy' in signals
        assert 'correct' in signals
        
        # Verify monthly performance
        assert 'monthly_performance' in data
        if data['monthly_performance']:
            month = data['monthly_performance'][0]
            assert 'month' in month
            assert 'pnl' in month
            assert 'trades' in month
            assert 'win_rate' in month
        
        # Verify platform stats
        assert 'platform_stats' in data
        stats = data['platform_stats']
        assert 'total_users' in stats
        assert 'total_strategies' in stats
        assert stats['assets_covered'] >= 500  # Should show 500+ assets

    def test_verified_track_record(self):
        """GET /api/trust/track-record returns verified track record"""
        response = requests.get(f"{BASE_URL}/api/trust/track-record")
        assert response.status_code == 200
        data = response.json()
        
        assert 'signals' in data
        assert 'total' in data
        assert 'current_streak' in data
        assert 'accuracy_by_class' in data
        
        # Verify signal structure if signals exist
        if data['signals']:
            signal = data['signals'][0]
            assert 'signal_id' in signal
            assert 'symbol' in signal
            assert 'direction' in signal
            assert 'probability' in signal
            assert 'outcome' in signal

    def test_track_record_limit_param(self):
        """Track record respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/trust/track-record?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data['signals']) <= 5

    def test_signal_transparency(self):
        """GET /api/trust/signal/{signal_id} returns signal transparency details"""
        # First, make a decision to get a signal_id
        decision_response = requests.get(f"{BASE_URL}/api/decision/SOL?asset_type=crypto")
        assert decision_response.status_code == 200
        signal_id = decision_response.json().get('signal_id')
        assert signal_id
        
        # Now get signal transparency
        response = requests.get(f"{BASE_URL}/api/trust/signal/{signal_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify signal data
        assert 'signal' in data
        signal = data['signal']
        assert signal['signal_id'] == signal_id
        assert signal['symbol'] == 'SOL'
        
        # Verify transparency info
        assert 'transparency' in data
        transparency = data['transparency']
        assert 'probability' in transparency
        assert 'confidence_tier' in transparency
        assert 'risk_level' in transparency
        assert 'reasoning' in transparency
        assert 'factors' in transparency
        
        # Verify historical info
        assert 'historical' in data
        historical = data['historical']
        assert 'similar_signals' in historical
        assert 'similar_accuracy' in historical
        assert 'recent_similar' in historical

    def test_signal_transparency_not_found(self):
        """Signal transparency returns 404 for invalid signal_id"""
        response = requests.get(f"{BASE_URL}/api/trust/signal/invalid-signal-id-12345")
        assert response.status_code == 404


class TestSignalLogging:
    """Tests for signal logging endpoint"""

    def test_signal_log_post(self):
        """POST /api/trust/signal/log logs a new signal"""
        payload = {
            "symbol": "NVDA",
            "direction": "bullish",
            "probability": 0.82,
            "confidence_tier": "high",
            "risk_level": "moderate",
            "entry_price": 500.0,
            "target_price": 550.0,
            "stop_loss": 475.0,
            "reasoning": ["Strong earnings momentum", "AI sector leadership"],
            "factors": {"technical": 25, "sentiment": 15, "volume": 10},
            "asset_type": "stock"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/trust/signal/log",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] is True
        assert 'signal' in data
        
        signal = data['signal']
        assert signal['symbol'] == 'NVDA'
        assert signal['direction'] == 'bullish'
        assert signal['probability'] == 0.82
        assert signal['confidence_tier'] == 'high'
        assert signal['outcome'] == 'pending'
        assert 'signal_id' in signal
        assert 'created_at' in signal

    def test_signal_log_validation(self):
        """Signal log validates required fields"""
        # Missing required fields
        payload = {"symbol": "TEST"}
        
        response = requests.post(
            f"{BASE_URL}/api/trust/signal/log",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        # Should fail validation (422)
        assert response.status_code == 422


class TestIntegration:
    """Integration tests for Decision Engine + Trust Layer workflow"""

    def test_full_decision_to_trust_flow(self):
        """Full workflow: decision → signal logged → retrievable in trust layer"""
        # 1. Get a decision
        decision_response = requests.get(f"{BASE_URL}/api/decision/MSFT?asset_type=stock")
        assert decision_response.status_code == 200
        decision_data = decision_response.json()
        signal_id = decision_data.get('signal_id')
        
        # 2. Verify signal appears in track record
        track_response = requests.get(f"{BASE_URL}/api/trust/track-record?limit=50")
        assert track_response.status_code == 200
        track_data = track_response.json()
        
        signal_ids = [s['signal_id'] for s in track_data['signals']]
        assert signal_id in signal_ids
        
        # 3. Verify signal transparency is available
        transparency_response = requests.get(f"{BASE_URL}/api/trust/signal/{signal_id}")
        assert transparency_response.status_code == 200
        transparency_data = transparency_response.json()
        
        assert transparency_data['signal']['symbol'] == 'MSFT'
        assert transparency_data['signal']['signal_id'] == signal_id
