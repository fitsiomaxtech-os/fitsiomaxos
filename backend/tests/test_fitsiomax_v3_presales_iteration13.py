import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests
from dotenv import load_dotenv


load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")


@pytest.fixture(scope="session")
def api_client():
    # Shared API client module for v3 pre-sales edit/filter regression checks
    if not BASE_URL:
        pytest.skip("REACT_APP_BACKEND_URL is not configured")
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def presales_headers(api_client):
    # Auth module for pre-sales role used across pre-sales board APIs
    response = api_client.post(
        f"{BASE_URL}/api/v3/auth/login",
        json={"email": "presales@fitsiomax.com", "password": "presales123"},
        timeout=25,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["role"] == "pre_sales"
    assert isinstance(payload.get("token"), str) and payload["token"]
    return {"Authorization": f"Bearer {payload['token']}", "Content-Type": "application/json"}


def _create_manual_lead(api_client, headers, suffix: str):
    response = api_client.post(
        f"{BASE_URL}/api/v3/leads/manual",
        json={
            "name": f"TEST_ITER13_{suffix}",
            "phone": f"98{suffix}",
            "email": f"iter13.{suffix}@mail.com",
            "vertical": "offline_physiotherapy",
            "source_tab": "Manual",
            "source_type": "manual",
            "notes": "iteration 13 test lead",
        },
        headers=headers,
        timeout=25,
    )
    assert response.status_code == 200
    lead = response.json()
    assert lead["stage"] == "New Lead"
    assert lead["id"]
    return lead


def test_v3_put_lead_edit_updates_core_and_extra_fields(api_client, presales_headers):
    # Lead edit module: ensure PUT /api/v3/leads/{id} persists core fields and custom fields
    suffix = uuid.uuid4().hex[:8]
    lead = _create_manual_lead(api_client, presales_headers, suffix)

    update_payload = {
        "name": f"TEST_EDITED_{suffix}",
        "notes": "edited from iteration13",
        "extra_fields": {
            "priority": "high",
            "budget": "1200",
            "next_followup": datetime.now(timezone.utc).date().isoformat(),
            "source_channel": "instagram",
        },
    }
    update_resp = api_client.put(
        f"{BASE_URL}/api/v3/leads/{lead['id']}",
        json=update_payload,
        headers=presales_headers,
        timeout=25,
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["name"] == update_payload["name"]
    assert updated["notes"] == update_payload["notes"]
    assert updated["extra_fields"]["priority"] == "high"
    assert updated["extra_fields"]["budget"] == "1200"
    assert updated["extra_fields"]["source_channel"] == "instagram"

    list_resp = api_client.get(f"{BASE_URL}/api/v3/leads", headers=presales_headers, timeout=25)
    assert list_resp.status_code == 200
    rows = list_resp.json()
    fetched = next((row for row in rows if row["id"] == lead["id"]), None)
    assert fetched is not None
    assert fetched["name"] == update_payload["name"]
    assert fetched["extra_fields"]["next_followup"] == update_payload["extra_fields"]["next_followup"]


def test_v3_date_filter_includes_recent_created_lead(api_client, presales_headers):
    # Date filter module: ensure start_date/end_date query returns created lead inside range
    suffix = uuid.uuid4().hex[:8]
    lead = _create_manual_lead(api_client, presales_headers, suffix)

    today = datetime.now(timezone.utc).date().isoformat()
    in_range = api_client.get(
        f"{BASE_URL}/api/v3/leads",
        params={"start_date": f"{today}T00:00:00", "end_date": f"{today}T23:59:59"},
        headers=presales_headers,
        timeout=25,
    )
    assert in_range.status_code == 200
    in_range_rows = in_range.json()
    assert any(row["id"] == lead["id"] for row in in_range_rows)


def test_v3_date_filter_excludes_lead_outside_future_window(api_client, presales_headers):
    # Date filter module: ensure future-only window excludes currently created leads
    suffix = uuid.uuid4().hex[:8]
    lead = _create_manual_lead(api_client, presales_headers, suffix)

    far_future_day = (datetime.now(timezone.utc) + timedelta(days=365)).date().isoformat()
    future_resp = api_client.get(
        f"{BASE_URL}/api/v3/leads",
        params={"start_date": f"{far_future_day}T00:00:00", "end_date": f"{far_future_day}T23:59:59"},
        headers=presales_headers,
        timeout=25,
    )
    assert future_resp.status_code == 200
    rows = future_resp.json()
    assert all(row["id"] != lead["id"] for row in rows)


def test_v3_presales_stage_filters_regression(api_client, presales_headers):
    # Stage flow module: verify qualify action updates stage and stage filter returns lead
    suffix = uuid.uuid4().hex[:8]
    lead = _create_manual_lead(api_client, presales_headers, suffix)

    qualify_resp = api_client.post(
        f"{BASE_URL}/api/v3/leads/{lead['id']}/qualify",
        headers=presales_headers,
        timeout=25,
    )
    assert qualify_resp.status_code == 200
    assert qualify_resp.json()["stage"] == "Pre-sales Qualified"

    stage_resp = api_client.get(
        f"{BASE_URL}/api/v3/leads",
        params={"stage": "Pre-sales Qualified"},
        headers=presales_headers,
        timeout=25,
    )
    assert stage_resp.status_code == 200
    rows = stage_resp.json()
    assert any(row["id"] == lead["id"] for row in rows)
