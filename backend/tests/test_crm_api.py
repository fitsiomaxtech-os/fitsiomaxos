import os
import uuid

import pytest
import requests
from dotenv import load_dotenv


load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")


@pytest.fixture(scope="session")
def api_client():
    if not BASE_URL:
        pytest.skip("REACT_APP_BACKEND_URL is not configured")
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def admin_auth(api_client):
    # Auth: login with default super admin
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@physiofit.com", "password": "admin123"},
        timeout=20,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "super_admin"
    token = data["token"]
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def crm_state(api_client, admin_auth):
    suffix = uuid.uuid4().hex[:8]

    # Team/Branch setup: create branch
    branch_payload = {"name": f"TEST_Branch_{suffix}", "city": "Mumbai"}
    branch_response = api_client.post(
        f"{BASE_URL}/api/branches",
        json=branch_payload,
        headers=admin_auth,
        timeout=20,
    )
    assert branch_response.status_code == 200
    branch = branch_response.json()
    assert branch["name"] == branch_payload["name"]

    # Team setup: create pre-sales user
    pre_sales_payload = {
        "full_name": f"TEST PreSales {suffix}",
        "email": f"test.presales.{suffix}@physiofit.com",
        "password": "test123",
        "role": "pre_sales",
        "branch_id": branch["id"],
    }
    pre_sales_resp = api_client.post(
        f"{BASE_URL}/api/users",
        json=pre_sales_payload,
        headers=admin_auth,
        timeout=20,
    )
    assert pre_sales_resp.status_code == 200
    pre_sales_user = pre_sales_resp.json()
    assert pre_sales_user["email"] == pre_sales_payload["email"]

    # Team setup: create sales user
    sales_payload = {
        "full_name": f"TEST Sales {suffix}",
        "email": f"test.sales.{suffix}@physiofit.com",
        "password": "test123",
        "role": "sales",
        "branch_id": branch["id"],
    }
    sales_resp = api_client.post(
        f"{BASE_URL}/api/users",
        json=sales_payload,
        headers=admin_auth,
        timeout=20,
    )
    assert sales_resp.status_code == 200
    sales_user = sales_resp.json()
    assert sales_user["email"] == sales_payload["email"]

    return {
        "suffix": suffix,
        "branch": branch,
        "pre_sales_user": pre_sales_user,
        "sales_user": sales_user,
    }


def test_login_and_me(api_client, admin_auth):
    # Auth module: validate token works for /auth/me
    me_response = api_client.get(f"{BASE_URL}/api/auth/me", headers=admin_auth, timeout=20)
    assert me_response.status_code == 200
    me = me_response.json()
    assert me["email"] == "admin@physiofit.com"


def test_create_custom_stages_both_pipelines(api_client, admin_auth, crm_state):
    # Stage module: create custom stage for pre-sales and sales
    suffix = crm_state["suffix"]
    pre_stage_name = f"TEST_Pre_Stage_{suffix}"
    sales_stage_name = f"TEST_Sales_Stage_{suffix}"

    pre_resp = api_client.post(
        f"{BASE_URL}/api/stages",
        json={"pipeline": "pre_sales", "name": pre_stage_name},
        headers=admin_auth,
        timeout=20,
    )
    assert pre_resp.status_code == 200
    pre_stage = pre_resp.json()
    assert pre_stage["pipeline"] == "pre_sales"
    assert pre_stage["name"] == pre_stage_name

    sales_resp = api_client.post(
        f"{BASE_URL}/api/stages",
        json={"pipeline": "sales", "name": sales_stage_name},
        headers=admin_auth,
        timeout=20,
    )
    assert sales_resp.status_code == 200
    sales_stage = sales_resp.json()
    assert sales_stage["pipeline"] == "sales"
    assert sales_stage["name"] == sales_stage_name


def test_create_lead_and_verify_listing(api_client, admin_auth, crm_state):
    # Lead module: create and verify via GET list
    suffix = crm_state["suffix"]
    branch_id = crm_state["branch"]["id"]
    lead_payload = {
        "name": f"TEST Lead {suffix}",
        "phone": f"9000{suffix[:4]}",
        "email": f"lead.{suffix}@test.com",
        "source": "Manual",
        "branch_id": branch_id,
        "notes": "TEST flow",
    }
    create_resp = api_client.post(
        f"{BASE_URL}/api/leads",
        json=lead_payload,
        headers=admin_auth,
        timeout=20,
    )
    assert create_resp.status_code == 200
    created = create_resp.json()
    assert created["name"] == lead_payload["name"]
    assert created["current_owner"] == "pre_sales"

    list_resp = api_client.get(
        f"{BASE_URL}/api/leads",
        params={"pipeline": "pre_sales", "search": lead_payload["phone"]},
        headers=admin_auth,
        timeout=20,
    )
    assert list_resp.status_code == 200
    rows = list_resp.json()
    assert any(row["id"] == created["id"] for row in rows)


def test_appointment_booking_moves_to_sales(api_client, admin_auth, crm_state):
    # Pipeline module: book appointment and verify owner/status/fee/date
    suffix = crm_state["suffix"]
    branch_id = crm_state["branch"]["id"]
    sales_id = crm_state["sales_user"]["id"]

    create_resp = api_client.post(
        f"{BASE_URL}/api/leads",
        json={
            "name": f"TEST Booking Lead {suffix}",
            "phone": f"9111{suffix[:4]}",
            "email": f"booking.{suffix}@test.com",
            "branch_id": branch_id,
        },
        headers=admin_auth,
        timeout=20,
    )
    assert create_resp.status_code == 200
    lead = create_resp.json()

    booking_payload = {
        "appointment_datetime": "2026-03-01T11:30",
        "consultation_fee": 799,
        "branch_id": branch_id,
        "assigned_to_sales": sales_id,
    }
    book_resp = api_client.post(
        f"{BASE_URL}/api/leads/{lead['id']}/book-appointment",
        json=booking_payload,
        headers=admin_auth,
        timeout=20,
    )
    assert book_resp.status_code == 200
    booked = book_resp.json()
    assert booked["current_owner"] == "sales"
    assert booked["status"] == "appointment_booked"
    assert float(booked["consultation_fee"]) == 799
    assert booked["appointment_datetime"] == booking_payload["appointment_datetime"]


def test_sales_move_to_package_sold(api_client, admin_auth, crm_state):
    # Pipeline module: move sales stage to package purchased
    suffix = crm_state["suffix"]
    branch_id = crm_state["branch"]["id"]

    create_resp = api_client.post(
        f"{BASE_URL}/api/leads",
        json={
            "name": f"TEST Sales Move {suffix}",
            "phone": f"9222{suffix[:4]}",
            "email": f"salesmove.{suffix}@test.com",
            "branch_id": branch_id,
        },
        headers=admin_auth,
        timeout=20,
    )
    assert create_resp.status_code == 200
    lead_id = create_resp.json()["id"]

    book_resp = api_client.post(
        f"{BASE_URL}/api/leads/{lead_id}/book-appointment",
        json={
            "appointment_datetime": "2026-03-02T10:00",
            "consultation_fee": 500,
            "branch_id": branch_id,
            "assigned_to_sales": crm_state["sales_user"]["id"],
        },
        headers=admin_auth,
        timeout=20,
    )
    assert book_resp.status_code == 200

    move_resp = api_client.post(
        f"{BASE_URL}/api/leads/{lead_id}/move-stage",
        json={"pipeline": "sales", "stage": "Package Purchased"},
        headers=admin_auth,
        timeout=20,
    )
    assert move_resp.status_code == 200
    moved = move_resp.json()
    assert moved["sales_stage"] == "Package Purchased"
    assert moved["status"] == "package_sold"


def test_dashboard_metrics_after_flow(api_client, admin_auth):
    # Dashboard module: summary endpoint structure and metric consistency
    summary_resp = api_client.get(f"{BASE_URL}/api/dashboard/summary", headers=admin_auth, timeout=20)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert "metrics" in summary
    assert isinstance(summary["metrics"]["total_leads"], int)
    assert summary["metrics"]["appointments_booked"] >= summary["metrics"]["package_sold"]


def test_sheets_status_and_config_save(api_client, admin_auth, crm_state):
    # Sheets module: status/config endpoints + save mapping verification
    status_resp = api_client.get(f"{BASE_URL}/api/sheets/status", headers=admin_auth, timeout=20)
    assert status_resp.status_code == 200
    status = status_resp.json()
    assert isinstance(status["connected"], bool)
    assert "message" in status

    suffix = crm_state["suffix"]
    save_payload = {
        "spreadsheet_id": f"test-sheet-{suffix}",
        "sheet_name": "Leads",
        "column_mapping": {"name": "Name", "phone": "Phone", "email": "Email", "source": "Source"},
    }
    save_resp = api_client.post(
        f"{BASE_URL}/api/sheets/config",
        json=save_payload,
        headers=admin_auth,
        timeout=20,
    )
    assert save_resp.status_code == 200
    saved = save_resp.json()
    assert saved["spreadsheet_id"] == save_payload["spreadsheet_id"]

    get_resp = api_client.get(f"{BASE_URL}/api/sheets/config", headers=admin_auth, timeout=20)
    assert get_resp.status_code == 200
    fetched = get_resp.json()
    assert fetched["spreadsheet_id"] == save_payload["spreadsheet_id"]
    assert fetched["column_mapping"]["phone"] == "Phone"
