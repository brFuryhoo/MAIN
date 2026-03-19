"""
Test Suite: New Features - Narrated Reports & World Map
Testing: POST /api/voice/narrate-report (TTS) and Intelligence Map with refined WorldMap
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-quantica.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USER = {"email": "fabricio@aureos.ai", "password": "aureos2024"}


class TestNarrateReportEndpoint:
    """Tests for POST /api/voice/narrate-report (JARVIS narration TTS endpoint)"""
    
    def test_narrate_report_english(self):
        """Test narration in English - should return audio/mpeg blob"""
        response = requests.post(
            f"{BASE_URL}/api/voice/narrate-report",
            json={
                "text": "This is a test executive report. Asset AAPL is showing bullish momentum with a confidence of 75%. Entry zone is $175-180. Stop loss at $170. Target at $195.",
                "language": "en"
            },
            timeout=60
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Content type assertion - should be audio/mpeg
        content_type = response.headers.get('Content-Type', '')
        assert 'audio/mpeg' in content_type, f"Expected audio/mpeg content type, got: {content_type}"
        
        # Data assertion - should have actual audio content
        assert len(response.content) > 1000, f"Audio content too small: {len(response.content)} bytes"
        
        # Check audio header (MP3 files typically start with ID3 or have 0xFF 0xFB pattern)
        content_start = response.content[:10]
        is_mp3 = content_start[:3] == b'ID3' or (len(content_start) > 1 and content_start[0] == 0xFF and (content_start[1] & 0xE0) == 0xE0)
        assert is_mp3, f"Content does not appear to be valid MP3. First bytes: {content_start.hex()}"
        
        print(f"SUCCESS: English narration returned {len(response.content)} bytes of audio/mpeg")
    
    def test_narrate_report_portuguese(self):
        """Test narration in Portuguese (pt) - should return audio in Portuguese"""
        response = requests.post(
            f"{BASE_URL}/api/voice/narrate-report",
            json={
                "text": "Relatório executivo de mercado. Ativo PETR4 mostrando tendência de alta com confiança de 80%. Zona de entrada R$35-37. Stop loss em R$32. Alvo em R$45.",
                "language": "pt"
            },
            timeout=60
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        content_type = response.headers.get('Content-Type', '')
        assert 'audio/mpeg' in content_type, f"Expected audio/mpeg, got: {content_type}"
        
        assert len(response.content) > 1000, f"Audio content too small: {len(response.content)} bytes"
        
        print(f"SUCCESS: Portuguese narration returned {len(response.content)} bytes of audio/mpeg")
    
    def test_narrate_report_spanish(self):
        """Test narration in Spanish (es)"""
        response = requests.post(
            f"{BASE_URL}/api/voice/narrate-report",
            json={
                "text": "Informe ejecutivo del mercado. Activo AMZN mostrando impulso alcista.",
                "language": "es"
            },
            timeout=60
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert 'audio/mpeg' in response.headers.get('Content-Type', '')
        assert len(response.content) > 1000
        
        print(f"SUCCESS: Spanish narration returned {len(response.content)} bytes")
    
    def test_narrate_report_no_auth_required(self):
        """Verify that narrate-report endpoint does NOT require authentication"""
        # This endpoint should work without any auth headers
        response = requests.post(
            f"{BASE_URL}/api/voice/narrate-report",
            json={
                "text": "Quick test for auth requirement. Market is bullish.",
                "language": "en"
            },
            headers={},  # No auth headers
            timeout=60
        )
        
        # Should not return 401 Unauthorized
        assert response.status_code != 401, "Endpoint should not require authentication"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        print("SUCCESS: Endpoint works without authentication as expected")
    
    def test_narrate_report_default_language(self):
        """Test that endpoint defaults to English when language not specified"""
        response = requests.post(
            f"{BASE_URL}/api/voice/narrate-report",
            json={
                "text": "Test without language parameter. BTC is at $95000."
            },
            timeout=60
        )
        
        assert response.status_code == 200
        assert 'audio/mpeg' in response.headers.get('Content-Type', '')
        
        print("SUCCESS: Default language (English) works correctly")


class TestIntelligenceMapRegions:
    """Tests for GET /api/intelligence/geopolitical-risk - 8 region hotspots"""
    
    def test_geopolitical_risk_has_8_regions(self):
        """Verify that the geopolitical risk endpoint returns 8 regions"""
        response = requests.get(f"{BASE_URL}/api/intelligence/geopolitical-risk", timeout=30)
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'regions' in data, "Response should have 'regions' key"
        regions = data['regions']
        
        # Should have exactly 8 regions
        assert len(regions) == 8, f"Expected 8 regions, got {len(regions)}"
        
        # Check expected region IDs
        expected_region_ids = ['middle_east', 'russia_europe', 'east_asia', 'south_america', 
                              'north_america', 'south_asia', 'africa', 'oceania']
        actual_region_ids = [r['id'] for r in regions]
        
        for expected_id in expected_region_ids:
            assert expected_id in actual_region_ids, f"Missing region: {expected_id}"
        
        print(f"SUCCESS: Got all 8 expected regions: {actual_region_ids}")
    
    def test_region_has_required_fields(self):
        """Verify each region has required fields for map display"""
        response = requests.get(f"{BASE_URL}/api/intelligence/geopolitical-risk", timeout=30)
        
        assert response.status_code == 200
        data = response.json()
        regions = data['regions']
        
        required_fields = ['id', 'name', 'risk_score', 'risk_level', 'events', 'impacted_assets']
        
        for region in regions:
            for field in required_fields:
                assert field in region, f"Region {region.get('id', 'unknown')} missing field: {field}"
            
            # Validate risk_score is between 0-100
            assert 0 <= region['risk_score'] <= 100, f"Invalid risk_score: {region['risk_score']}"
            
            # Validate risk_level is valid
            valid_levels = ['critical', 'high', 'elevated', 'moderate', 'low']
            assert region['risk_level'] in valid_levels, f"Invalid risk_level: {region['risk_level']}"
        
        print(f"SUCCESS: All regions have required fields with valid values")
    
    def test_global_risk_score_present(self):
        """Verify global_risk_score is calculated and returned"""
        response = requests.get(f"{BASE_URL}/api/intelligence/geopolitical-risk", timeout=30)
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'global_risk_score' in data, "Response should have 'global_risk_score'"
        assert 0 <= data['global_risk_score'] <= 100, f"Invalid global_risk_score: {data['global_risk_score']}"
        
        print(f"SUCCESS: Global risk score: {data['global_risk_score']}")


class TestEventsFeedCategories:
    """Tests for Intelligence Feed category filters"""
    
    def test_events_feed_has_categories(self):
        """Verify events have category field for filtering"""
        response = requests.get(f"{BASE_URL}/api/intelligence/events-feed", timeout=30)
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'events' in data
        events = data['events']
        
        expected_categories = ['geopolitics', 'macro', 'crypto', 'commodity', 'terrorism', 'climate', 'politics', 'crime']
        found_categories = set()
        
        for event in events:
            assert 'category' in event, f"Event missing category: {event.get('id', 'unknown')}"
            found_categories.add(event['category'])
        
        print(f"SUCCESS: Events have categories: {found_categories}")
        
        # At least some categories should be present
        assert len(found_categories) >= 3, f"Expected at least 3 categories, got {len(found_categories)}"


class TestScenarioAnalysis:
    """Tests for Scenario Analysis input functionality"""
    
    def test_scenario_analysis_accepts_question(self):
        """Verify scenario analysis accepts and processes questions"""
        response = requests.post(
            f"{BASE_URL}/api/intelligence/scenario-analysis",
            json={
                "question": "What if oil prices spike to $150 per barrel?",
                "portfolio_context": []
            },
            timeout=60
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert 'question' in data
        assert 'analysis' in data
        assert len(data['analysis']) > 50, "Analysis should have substantial content"
        
        print(f"SUCCESS: Scenario analysis returned {len(data['analysis'])} char analysis")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
