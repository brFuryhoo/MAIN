"""
Test: Daily Voice Briefing Feature (Iteration 12)
Testing the NEW Daily Voice Briefing feature:
1. GET /api/voice/daily-briefing-audio - returns audio/mpeg blob (~1-1.5MB)
2. POST /api/voice/narrate-report - report narration (existing feature, regression)
3. All previous dashboard intelligence endpoints still work
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDailyVoiceBriefingFeature:
    """Tests for the new Daily Voice Briefing feature"""
    
    def test_daily_briefing_audio_endpoint_exists(self):
        """Test that the daily-briefing-audio endpoint exists and responds"""
        # Use a HEAD/OPTIONS-like approach first to verify endpoint exists quickly
        # Then do a full request with long timeout
        print(f"Testing GET {BASE_URL}/api/voice/daily-briefing-audio (long timeout ~90s)")
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/api/voice/daily-briefing-audio",
            timeout=120  # Extended timeout for GPT-5.2 + TTS generation
        )
        elapsed = time.time() - start
        print(f"Response received in {elapsed:.1f}s, status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500]}"
        
    def test_daily_briefing_audio_returns_audio_mpeg(self):
        """Test that the endpoint returns audio/mpeg content type"""
        print("Testing response content-type is audio/mpeg...")
        response = requests.get(
            f"{BASE_URL}/api/voice/daily-briefing-audio",
            timeout=120
        )
        
        assert response.status_code == 200
        content_type = response.headers.get('content-type', '')
        assert 'audio/mpeg' in content_type, f"Expected audio/mpeg, got {content_type}"
        print(f"Content-Type: {content_type} ✓")
        
    def test_daily_briefing_audio_returns_valid_size(self):
        """Test that audio blob is ~1-1.5MB (reasonable MP3 size for 60s briefing)"""
        print("Testing audio file size is reasonable...")
        response = requests.get(
            f"{BASE_URL}/api/voice/daily-briefing-audio",
            timeout=120
        )
        
        assert response.status_code == 200
        content_length = len(response.content)
        print(f"Audio size: {content_length / 1024:.1f} KB ({content_length / (1024*1024):.2f} MB)")
        
        # MP3 ~60s at 128kbps should be ~800KB-1.5MB
        assert content_length > 100_000, f"Audio too small ({content_length} bytes), likely not real audio"
        assert content_length < 5_000_000, f"Audio too large ({content_length} bytes), exceeds 5MB"
        
    def test_daily_briefing_audio_no_auth_required(self):
        """Test that endpoint does NOT require authentication"""
        print("Testing no authentication required...")
        # No auth header provided
        response = requests.get(
            f"{BASE_URL}/api/voice/daily-briefing-audio",
            timeout=120
        )
        
        assert response.status_code != 401, "Endpoint should NOT require authentication"
        assert response.status_code != 403, "Endpoint should NOT be forbidden"
        assert response.status_code == 200
        print("No auth required ✓")


class TestNarrateReportRegression:
    """Regression tests for existing narrate-report endpoint"""
    
    def test_narrate_report_still_works(self):
        """Test POST /api/voice/narrate-report still works (regression)"""
        print("Testing POST /api/voice/narrate-report (regression)...")
        response = requests.post(
            f"{BASE_URL}/api/voice/narrate-report",
            json={
                "text": "Market overview: S&P 500 up 0.8%. Tech sector leads gains. Recommendation: Hold positions.",
                "language": "en"
            },
            timeout=90
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        content_type = response.headers.get('content-type', '')
        assert 'audio/mpeg' in content_type, f"Expected audio/mpeg, got {content_type}"
        assert len(response.content) > 10_000, "Audio content too small"
        print(f"Narrate report works ✓ (audio size: {len(response.content) / 1024:.1f} KB)")


class TestDashboardIntelligenceRegression:
    """Regression tests for dashboard intelligence endpoints that should work independently"""
    
    def test_market_pulse_endpoint(self):
        """Test /api/intelligence/market-pulse still works"""
        response = requests.get(f"{BASE_URL}/api/intelligence/market-pulse", timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert 'indicators' in data
        print(f"Market pulse ✓ ({len(data.get('indicators', []))} indicators)")
        
    def test_geopolitical_risk_endpoint(self):
        """Test /api/intelligence/geopolitical-risk still works"""
        response = requests.get(f"{BASE_URL}/api/intelligence/geopolitical-risk", timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert 'regions' in data
        assert 'global_risk_score' in data
        print(f"Geopolitical risk ✓ ({len(data.get('regions', []))} regions, score: {data.get('global_risk_score')})")
        
    def test_performance_highlights_endpoint(self):
        """Test /api/intelligence/performance-highlights still works"""
        response = requests.get(f"{BASE_URL}/api/intelligence/performance-highlights", timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert 'highlights' in data
        print(f"Performance highlights ✓ ({len(data.get('highlights', []))} assets)")
        
    def test_events_feed_endpoint(self):
        """Test /api/intelligence/events-feed still works"""
        response = requests.get(f"{BASE_URL}/api/intelligence/events-feed", timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert 'events' in data
        print(f"Events feed ✓ ({len(data.get('events', []))} events)")
        
    def test_portfolio_endpoint_with_auth(self):
        """Test /api/portfolio works with authentication"""
        # Login first
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "fabricio@aureos.ai", "password": "aureos2024"},
            timeout=30
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get('access_token')
        
        # Get portfolio
        response = requests.get(
            f"{BASE_URL}/api/portfolio",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert 'positions' in data
        assert 'total_value' in data
        print(f"Portfolio ✓ (total_value: ${data.get('total_value', 0):.2f})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
