"""
Pre-sales Board Backend Tests - Iteration 15
Tests for:
- Pre-sales login and authentication
- Lead CRUD operations
- Remarks API (POST/GET)
- Follow-ups API (POST/GET/Complete)
- Activity API (GET)
- Move Stage API (POST)
- Stage counts and metrics
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Pre-sales credentials
PRESALES_EMAIL = "presales@fitsiomax.com"
PRESALES_PASSWORD = "presales123"


class TestPreSalesAuthentication:
    """Test Pre-sales user authentication"""
    
    def test_presales_login_success(self):
        """Test pre-sales user can login successfully"""
        response = requests.post(f"{BASE_URL}/api/v3/auth/login", json={
            "email": PRESALES_EMAIL,
            "password": PRESALES_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "pre_sales"
        assert data["user"]["email"] == PRESALES_EMAIL
        print(f"✓ Pre-sales login successful, role: {data['user']['role']}")
    
    def test_presales_login_invalid_credentials(self):
        """Test login fails with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/v3/auth/login", json={
            "email": PRESALES_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")


@pytest.fixture(scope="module")
def presales_token():
    """Get pre-sales authentication token"""
    response = requests.post(f"{BASE_URL}/api/v3/auth/login", json={
        "email": PRESALES_EMAIL,
        "password": PRESALES_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Pre-sales authentication failed")


@pytest.fixture(scope="module")
def presales_headers(presales_token):
    """Get headers with pre-sales auth token"""
    return {
        "Authorization": f"Bearer {presales_token}",
        "Content-Type": "application/json"
    }


class TestLeadOperations:
    """Test lead CRUD operations for pre-sales"""
    
    def test_get_leads(self, presales_headers):
        """Test fetching leads list"""
        response = requests.get(f"{BASE_URL}/api/v3/leads", headers=presales_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} leads")
    
    def test_create_manual_lead(self, presales_headers):
        """Test creating a manual lead"""
        unique_phone = f"TEST_{uuid.uuid4().hex[:8]}"
        lead_data = {
            "name": f"TEST_Lead_{unique_phone}",
            "phone": unique_phone,
            "email": f"test_{unique_phone}@example.com",
            "vertical": "offline_physiotherapy",
            "source_tab": "Manual",
            "source_type": "manual",
            "notes": "Test lead created by iteration 15 tests"
        }
        response = requests.post(f"{BASE_URL}/api/v3/leads/manual", json=lead_data, headers=presales_headers)
        assert response.status_code == 200, f"Create lead failed: {response.text}"
        data = response.json()
        assert data["name"] == lead_data["name"]
        assert data["phone"] == unique_phone
        assert data["stage"] == "New Lead"
        print(f"✓ Created lead: {data['name']} with stage: {data['stage']}")
        return data["id"]


@pytest.fixture(scope="module")
def test_lead_id(presales_headers):
    """Create a test lead and return its ID"""
    unique_phone = f"TEST_{uuid.uuid4().hex[:8]}"
    lead_data = {
        "name": f"TEST_Lead_Fixture_{unique_phone}",
        "phone": unique_phone,
        "email": f"fixture_{unique_phone}@example.com",
        "vertical": "offline_physiotherapy",
        "source_tab": "Manual",
        "source_type": "manual",
        "notes": "Fixture lead for testing"
    }
    response = requests.post(f"{BASE_URL}/api/v3/leads/manual", json=lead_data, headers=presales_headers)
    if response.status_code == 200:
        return response.json()["id"]
    pytest.skip("Could not create test lead")


class TestRemarksAPI:
    """Test remarks API endpoints"""
    
    def test_add_remark_to_lead(self, presales_headers, test_lead_id):
        """Test adding a remark to a lead"""
        remark_data = {"text": "TEST_Remark: Initial contact made via phone"}
        response = requests.post(
            f"{BASE_URL}/api/v3/leads/{test_lead_id}/remarks",
            json=remark_data,
            headers=presales_headers
        )
        assert response.status_code == 200, f"Add remark failed: {response.text}"
        data = response.json()
        assert data["text"] == remark_data["text"]
        assert data["lead_id"] == test_lead_id
        assert "created_by" in data
        assert "created_at" in data
        print(f"✓ Added remark: {data['text'][:50]}...")
    
    def test_get_remarks_for_lead(self, presales_headers, test_lead_id):
        """Test fetching remarks for a lead"""
        response = requests.get(
            f"{BASE_URL}/api/v3/leads/{test_lead_id}/remarks",
            headers=presales_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} remarks for lead")
    
    def test_add_remark_to_nonexistent_lead(self, presales_headers):
        """Test adding remark to non-existent lead returns 404"""
        remark_data = {"text": "This should fail"}
        response = requests.post(
            f"{BASE_URL}/api/v3/leads/nonexistent-lead-id/remarks",
            json=remark_data,
            headers=presales_headers
        )
        assert response.status_code == 404
        print("✓ Correctly returned 404 for non-existent lead")


class TestFollowUpsAPI:
    """Test follow-ups API endpoints"""
    
    def test_add_followup_to_lead(self, presales_headers, test_lead_id):
        """Test scheduling a follow-up for a lead"""
        followup_data = {
            "note": "TEST_FollowUp: Call back to discuss package options",
            "scheduled_date": "2026-02-01"
        }
        response = requests.post(
            f"{BASE_URL}/api/v3/leads/{test_lead_id}/follow-ups",
            json=followup_data,
            headers=presales_headers
        )
        assert response.status_code == 200, f"Add follow-up failed: {response.text}"
        data = response.json()
        assert data["note"] == followup_data["note"]
        assert data["scheduled_date"] == followup_data["scheduled_date"]
        assert data["status"] == "pending"
        assert data["lead_id"] == test_lead_id
        print(f"✓ Scheduled follow-up: {data['note'][:50]}...")
        return data["id"]
    
    def test_get_followups_for_lead(self, presales_headers, test_lead_id):
        """Test fetching follow-ups for a lead"""
        response = requests.get(
            f"{BASE_URL}/api/v3/leads/{test_lead_id}/follow-ups",
            headers=presales_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} follow-ups for lead")
    
    def test_complete_followup(self, presales_headers, test_lead_id):
        """Test completing a follow-up"""
        # First create a follow-up
        followup_data = {
            "note": "TEST_FollowUp_ToComplete: Quick check-in call",
            "scheduled_date": "2026-01-25"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/v3/leads/{test_lead_id}/follow-ups",
            json=followup_data,
            headers=presales_headers
        )
        assert create_response.status_code == 200
        followup_id = create_response.json()["id"]
        
        # Complete the follow-up
        complete_response = requests.post(
            f"{BASE_URL}/api/v3/leads/{test_lead_id}/follow-ups/{followup_id}/complete",
            headers=presales_headers
        )
        assert complete_response.status_code == 200, f"Complete follow-up failed: {complete_response.text}"
        print(f"✓ Completed follow-up: {followup_id}")
        
        # Verify status changed
        get_response = requests.get(
            f"{BASE_URL}/api/v3/leads/{test_lead_id}/follow-ups",
            headers=presales_headers
        )
        followups = get_response.json()
        completed_followup = next((f for f in followups if f["id"] == followup_id), None)
        assert completed_followup is not None
        assert completed_followup["status"] == "completed"
        print("✓ Verified follow-up status is 'completed'")


class TestMoveStageAPI:
    """Test move stage API endpoint"""
    
    def test_move_lead_to_presales_qualified(self, presales_headers, test_lead_id):
        """Test moving a lead to Pre-sales Qualified stage"""
        move_data = {"stage": "Pre-sales Qualified"}
        response = requests.post(
            f"{BASE_URL}/api/v3/leads/{test_lead_id}/move-stage",
            json=move_data,
            headers=presales_headers
        )
        assert response.status_code == 200, f"Move stage failed: {response.text}"
        data = response.json()
        assert data["stage"] == "Pre-sales Qualified"
        print(f"✓ Moved lead to stage: {data['stage']}")
    
    def test_move_lead_to_assigned_to_branch(self, presales_headers, test_lead_id):
        """Test moving a lead to Assigned to Branch stage"""
        move_data = {"stage": "Assigned to Branch"}
        response = requests.post(
            f"{BASE_URL}/api/v3/leads/{test_lead_id}/move-stage",
            json=move_data,
            headers=presales_headers
        )
        assert response.status_code == 200, f"Move stage failed: {response.text}"
        data = response.json()
        assert data["stage"] == "Assigned to Branch"
        print(f"✓ Moved lead to stage: {data['stage']}")
    
    def test_move_lead_invalid_stage(self, presales_headers, test_lead_id):
        """Test moving lead to invalid stage returns 400"""
        move_data = {"stage": "Invalid Stage Name"}
        response = requests.post(
            f"{BASE_URL}/api/v3/leads/{test_lead_id}/move-stage",
            json=move_data,
            headers=presales_headers
        )
        assert response.status_code == 400
        print("✓ Correctly rejected invalid stage name")


class TestActivityAPI:
    """Test activity log API endpoint"""
    
    def test_get_activity_for_lead(self, presales_headers, test_lead_id):
        """Test fetching activity log for a lead"""
        response = requests.get(
            f"{BASE_URL}/api/v3/leads/{test_lead_id}/activity",
            headers=presales_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have activity entries from stage moves
        if len(data) > 0:
            activity = data[0]
            assert "action" in activity
            assert "details" in activity
            assert "created_by" in activity
            print(f"✓ Fetched {len(data)} activity entries, latest: {activity['details'][:50]}...")
        else:
            print("✓ Activity log is empty (no stage changes yet)")
    
    def test_activity_created_after_stage_move(self, presales_headers):
        """Test that activity is created when stage is moved"""
        # Create a new lead
        unique_phone = f"TEST_ACT_{uuid.uuid4().hex[:8]}"
        lead_data = {
            "name": f"TEST_Activity_Lead_{unique_phone}",
            "phone": unique_phone,
            "email": f"activity_{unique_phone}@example.com",
            "vertical": "offline_physiotherapy",
            "source_tab": "Manual",
            "source_type": "manual"
        }
        create_response = requests.post(f"{BASE_URL}/api/v3/leads/manual", json=lead_data, headers=presales_headers)
        assert create_response.status_code == 200
        lead_id = create_response.json()["id"]
        
        # Move stage
        move_data = {"stage": "Pre-sales Qualified"}
        move_response = requests.post(
            f"{BASE_URL}/api/v3/leads/{lead_id}/move-stage",
            json=move_data,
            headers=presales_headers
        )
        assert move_response.status_code == 200
        
        # Check activity was created
        activity_response = requests.get(
            f"{BASE_URL}/api/v3/leads/{lead_id}/activity",
            headers=presales_headers
        )
        assert activity_response.status_code == 200
        activities = activity_response.json()
        assert len(activities) > 0, "Activity should be created after stage move"
        latest_activity = activities[0]
        assert latest_activity["action"] == "stage_change"
        assert "Pre-sales Qualified" in latest_activity["details"]
        print(f"✓ Activity created after stage move: {latest_activity['details']}")


class TestMasterBoardMetrics:
    """Test master board metrics endpoint"""
    
    def test_get_master_board(self, presales_headers):
        """Test fetching master board with stage counts"""
        response = requests.get(f"{BASE_URL}/api/v3/boards/master", headers=presales_headers)
        assert response.status_code == 200
        data = response.json()
        assert "stage_counts" in data
        print(f"✓ Master board stage counts: {data['stage_counts']}")


class TestLeadFiltering:
    """Test lead filtering by search, stage, date"""
    
    def test_filter_leads_by_stage(self, presales_headers):
        """Test filtering leads by stage"""
        response = requests.get(
            f"{BASE_URL}/api/v3/leads?stage=New Lead",
            headers=presales_headers
        )
        assert response.status_code == 200
        data = response.json()
        # All returned leads should be in "New Lead" stage
        for lead in data:
            assert lead["stage"] == "New Lead"
        print(f"✓ Filtered {len(data)} leads with stage 'New Lead'")
    
    def test_filter_leads_by_search(self, presales_headers):
        """Test filtering leads by search query"""
        response = requests.get(
            f"{BASE_URL}/api/v3/leads?search=TEST_",
            headers=presales_headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Search returned {len(data)} leads matching 'TEST_'")


class TestBranchOperations:
    """Test branch-related operations"""
    
    def test_get_branches(self, presales_headers):
        """Test fetching branches list"""
        response = requests.get(f"{BASE_URL}/api/v3/branches", headers=presales_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} branches")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
