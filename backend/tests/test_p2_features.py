"""
Test P2 Features: Intelligence Map & PDF Export
================================================
Tests the new features added in iteration 8:
1. Intelligence Map - GET /api/intelligence/map (capital flows, correlations, heat map)
2. PDF Export - POST /api/export/pdf (executive report generation)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

TEST_USER = {
    "email": "test@aureos.com",
    "password": "Test1234!"
}


@pytest.fixture(scope="module")
def auth_token():
    """Authenticate and get token for protected endpoints."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip(f"Auth failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token."""
    return {"Authorization": f"Bearer {auth_token}"}


class TestIntelligenceMap:
    """Test Intelligence Map endpoints - GET /api/intelligence/map"""
    
    def test_intelligence_map_endpoint_exists(self, headers):
        """Test that the intelligence map endpoint responds (with long timeout for 11 assets)"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/map",
            headers=headers,
            timeout=120  # Long timeout - scans 11 assets
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "complete", "Expected status='complete'"
        print(f"Intelligence map completed with status: {data.get('status')}")
    
    def test_intelligence_map_assets_structure(self, headers):
        """Test assets array has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/map",
            headers=headers,
            timeout=120
        )
        assert response.status_code == 200
        data = response.json()
        
        assets = data.get("assets", [])
        assert len(assets) > 0, "Expected at least some assets"
        print(f"Intel map returned {len(assets)} assets")
        
        # Check first asset has required fields
        asset = assets[0]
        required_fields = ["symbol", "name", "asset_type", "sector", "price", "momentum", "rsi", "regime"]
        for field in required_fields:
            assert field in asset, f"Asset missing field: {field}"
        print(f"First asset: {asset['name']} ({asset['symbol']}) - momentum: {asset['momentum']}")
    
    def test_intelligence_map_capital_flows(self, headers):
        """Test capital flows section is returned"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/map",
            headers=headers,
            timeout=120
        )
        assert response.status_code == 200
        data = response.json()
        
        flows = data.get("capital_flows", [])
        assert len(flows) > 0, "Expected capital_flows array with data"
        
        # Check structure
        flow = flows[0]
        required_fields = ["sector", "avg_momentum", "direction", "asset_count"]
        for field in required_fields:
            assert field in flow, f"Capital flow missing field: {field}"
        
        # Check direction values
        for flow in flows:
            assert flow["direction"] in ["inflow", "outflow", "neutral"], f"Invalid direction: {flow['direction']}"
        
        print(f"Capital flows: {[(f['sector'], f['direction']) for f in flows]}")
    
    def test_intelligence_map_correlations(self, headers):
        """Test correlations section is returned"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/map",
            headers=headers,
            timeout=120
        )
        assert response.status_code == 200
        data = response.json()
        
        correlations = data.get("correlations", [])
        # May be empty if no significant correlations found
        if len(correlations) > 0:
            corr = correlations[0]
            required_fields = ["asset_a", "asset_b", "correlation", "strength"]
            for field in required_fields:
                assert field in corr, f"Correlation missing field: {field}"
            
            # Check correlation value is in range
            for corr in correlations:
                assert -1 <= corr["correlation"] <= 1, f"Invalid correlation: {corr['correlation']}"
                assert corr["strength"] in ["weak", "moderate", "strong"], f"Invalid strength: {corr['strength']}"
            
            print(f"Found {len(correlations)} correlations. Top: {correlations[0]}")
        else:
            print("No significant correlations found (this is valid)")
    
    def test_intelligence_map_market_summary(self, headers):
        """Test market_summary section"""
        response = requests.get(
            f"{BASE_URL}/api/intelligence/map",
            headers=headers,
            timeout=120
        )
        assert response.status_code == 200
        data = response.json()
        
        summary = data.get("market_summary", {})
        required_fields = ["total_assets", "bullish", "bearish", "neutral", "avg_volatility"]
        for field in required_fields:
            assert field in summary, f"Market summary missing field: {field}"
        
        # Sanity check: bullish + bearish + neutral <= total_assets
        total = summary.get("bullish", 0) + summary.get("bearish", 0) + summary.get("neutral", 0)
        assert total == summary.get("total_assets", 0), "bullish + bearish + neutral should equal total_assets"
        
        print(f"Market Summary: {summary}")


class TestPDFExport:
    """Test PDF Export endpoint - POST /api/export/pdf"""
    
    def test_pdf_export_endpoint_exists(self):
        """Test that PDF export endpoint responds"""
        # Minimal payload
        payload = {
            "analysis_data": {
                "symbol": "BTC",
                "name": "Bitcoin",
                "asset_type": "crypto",
                "timeframe": "4H",
                "price": 65000.00,
                "report": {
                    "signal_summary": {
                        "direction": "BUY",
                        "confidence": 72,
                        "strength": "moderate",
                        "bullish_probability": 65,
                        "bearish_probability": 20,
                        "sideways_probability": 15
                    }
                },
                "steps": {
                    "market_data": {"candle_count": 200, "source": "test"},
                    "technical_analysis": {"rsi": 55, "trend": "bullish"},
                    "market_structure": {"bias": "bullish"},
                    "monte_carlo": {"win_probability": 60, "expected_return_pct": 5},
                    "risk_model": {"risk_score": 45, "risk_level": "moderate"},
                    "regime_detection": {"trend_regime": "bullish", "volatility_regime": "normal"}
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/export/pdf",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf", f"Expected application/pdf, got {response.headers.get('content-type')}"
        print(f"PDF export returned {len(response.content)} bytes")
    
    def test_pdf_export_generates_valid_pdf(self):
        """Test that returned content is a valid PDF"""
        payload = {
            "analysis_data": {
                "symbol": "ETH",
                "name": "Ethereum",
                "asset_type": "crypto",
                "timeframe": "1H",
                "price": 3500.00,
                "report": {
                    "signal_summary": {
                        "direction": "HOLD",
                        "confidence": 55,
                        "strength": "weak",
                        "bullish_probability": 40,
                        "bearish_probability": 35,
                        "sideways_probability": 25
                    }
                },
                "steps": {
                    "market_data": {"candle_count": 100, "source": "test", "change_percent": -1.5, "volume": 1000000},
                    "technical_analysis": {"rsi": 48, "rsi_signal": "neutral", "trend": "sideways", "atr": 0.05, "atr_percent": 2.5, "volume_trend": "stable", "macd": {"crossover": "neutral"}, "moving_averages": {"sma_20": 3450, "sma_50": 3400}, "bollinger_bands": {"position": "middle"}},
                    "market_structure": {"bias": "neutral", "breakout": {"detected": False}},
                    "monte_carlo": {"win_probability": 50, "expected_return_pct": 0, "max_upside_pct": 8, "max_drawdown_pct": -6, "simulations": 5000},
                    "risk_model": {"risk_score": 50, "risk_level": "moderate", "var_95": 5.5, "max_drawdown": 12, "recommended_position_size": 2, "stop_loss": {"tight": 3400, "normal": 3350}},
                    "regime_detection": {"trend_regime": "neutral", "volatility_regime": "normal", "market_phase": {"phase": "consolidation", "description": "Market is consolidating"}},
                    "manipulation_detection": {"manipulation_score": 15, "risk_level": "low", "total_events_detected": 0, "warnings": []}
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/export/pdf",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200
        
        # Check PDF magic bytes
        content = response.content
        assert content[:4] == b'%PDF', f"Content does not start with PDF magic bytes: {content[:10]}"
        
        # Check Content-Disposition header for filename
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, "Expected attachment disposition"
        assert "filename=" in content_disp, "Expected filename in disposition"
        
        print(f"Valid PDF generated: {content_disp}")
    
    def test_pdf_export_with_full_analysis_data(self):
        """Test PDF export with comprehensive analysis data"""
        # Full structure mimicking real analysis output
        payload = {
            "analysis_data": {
                "symbol": "AAPL",
                "name": "Apple Inc.",
                "asset_type": "stock",
                "timeframe": "4H",
                "price": 178.52,
                "report": {
                    "signal_summary": {
                        "direction": "BUY",
                        "confidence": 78,
                        "strength": "strong",
                        "bullish_probability": 70,
                        "bearish_probability": 15,
                        "sideways_probability": 15
                    }
                },
                "steps": {
                    "market_data": {
                        "candle_count": 200,
                        "source": "twelve_data",
                        "change_percent": 1.33,
                        "volume": 52340000
                    },
                    "technical_analysis": {
                        "rsi": 62,
                        "rsi_signal": "neutral",
                        "trend": "uptrend_strong",
                        "atr": 2.5,
                        "atr_percent": 1.4,
                        "volume_trend": "increasing",
                        "macd": {"crossover": "bullish", "histogram": 0.5},
                        "moving_averages": {
                            "sma_20": 175.50,
                            "sma_50": 172.00,
                            "price_vs_sma20": "above",
                            "golden_cross": True
                        },
                        "bollinger_bands": {"position": "upper_band"}
                    },
                    "market_structure": {
                        "bias": "bullish",
                        "pattern": "higher_highs_higher_lows",
                        "breakout": {"detected": True, "type": "resistance_break"}
                    },
                    "monte_carlo": {
                        "win_probability": 68,
                        "expected_return_pct": 4.2,
                        "max_upside_pct": 12,
                        "max_drawdown_pct": -5,
                        "simulations": 5000
                    },
                    "risk_model": {
                        "risk_score": 35,
                        "risk_level": "low",
                        "var_95": 3.2,
                        "max_drawdown": 8,
                        "recommended_position_size": 3,
                        "stop_loss": {"tight": 174.00, "normal": 172.50}
                    },
                    "regime_detection": {
                        "trend_regime": "bull_trend",
                        "volatility_regime": "low",
                        "market_phase": {
                            "phase": "markup",
                            "description": "Market in strong uptrend markup phase"
                        }
                    },
                    "manipulation_detection": {
                        "manipulation_score": 10,
                        "risk_level": "low",
                        "total_events_detected": 0,
                        "warnings": []
                    }
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/export/pdf",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        
        # PDF should be reasonable size (> 1KB, < 1MB)
        size = len(response.content)
        assert size > 1000, f"PDF too small: {size} bytes"
        assert size < 1000000, f"PDF too large: {size} bytes"
        
        print(f"Full analysis PDF: {size} bytes")


class TestIntegrationFlow:
    """Integration tests for the complete flow"""
    
    def test_intelligence_map_full_flow(self, headers):
        """Test complete intelligence map flow"""
        print("Starting intelligence map full flow test...")
        
        # Call endpoint
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/api/intelligence/map",
            headers=headers,
            timeout=120
        )
        elapsed = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate complete response
        assert data.get("status") == "complete"
        assert "assets" in data
        assert "capital_flows" in data
        assert "correlations" in data
        assert "market_summary" in data
        assert "timestamp" in data
        
        assets = data.get("assets", [])
        summary = data.get("market_summary", {})
        
        print(f"Flow completed in {elapsed:.1f}s")
        print(f"Assets analyzed: {len(assets)}")
        print(f"Market summary: Bullish={summary.get('bullish')}, Bearish={summary.get('bearish')}, Neutral={summary.get('neutral')}")
        print(f"Capital flows: {len(data.get('capital_flows', []))} sectors")
        print(f"Correlations found: {len(data.get('correlations', []))}")
        
        return True
    
    def test_pdf_export_without_auth(self):
        """Test PDF export works without auth (public endpoint)"""
        payload = {
            "analysis_data": {
                "symbol": "TEST",
                "name": "Test Asset",
                "asset_type": "test",
                "price": 100,
                "report": {"signal_summary": {"direction": "HOLD", "confidence": 50, "strength": "weak"}},
                "steps": {}
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/export/pdf",
            json=payload,
            timeout=30
        )
        assert response.status_code == 200, f"PDF export should work without auth: {response.status_code}"
        print("PDF export works without authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
