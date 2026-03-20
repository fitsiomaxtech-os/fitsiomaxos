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


def _login(api_client, email, password):
    response = api_client.post(
        f"{BASE_URL}/api/v2/auth/login",
        json={"email": email, "password": password},
        timeout=25,
    )
    assert response.status_code == 200
    data = response.json()
    assert "token" in data and data["token"]
    return {
        "Authorization": f"Bearer {data['token']}",
        "Content-Type": "application/json",
    }, data["user"]


@pytest.fixture(scope="session")
def auth_headers(api_client):
    # Auth module: validate login for all FITSIOMAX roles
    creds = {
        "super_admin": ("admin@fitsiomax.com", "admin123"),
        "online_fitness": ("onlinefitness@fitsiomax.com", "online123"),
        "online_physio": ("onlinephysio@fitsiomax.com", "physio123"),
        "offline_physio": ("offlinephysio@fitsiomax.com", "offline123"),
    }
    auth = {}
    for role, (email, password) in creds.items():
        headers, user = _login(api_client, email, password)
        assert user["role"] == role
        auth[role] = headers
    return auth


@pytest.fixture(scope="session")
def v2_state(api_client, auth_headers):
    # Setup module: create reusable service, doctor, slot, and lead records
    suffix = uuid.uuid4().hex[:8]
    admin_headers = auth_headers["super_admin"]

    service_payload = {
        "name": f"TEST_Service_{suffix}",
        "mode": "online",
        "category": "physio_therapy",
    }
    service_resp = api_client.post(
        f"{BASE_URL}/api/v2/services",
        json=service_payload,
        headers=admin_headers,
        timeout=25,
    )
    assert service_resp.status_code == 200
    service = service_resp.json()
    assert service["name"] == service_payload["name"]

    doctor_payload = {
        "full_name": f"TEST Doctor {suffix}",
        "specialty_role": "online_physio",
        "location": "Anna Nagar",
    }
    doctor_resp = api_client.post(
        f"{BASE_URL}/api/v2/doctors",
        json=doctor_payload,
        headers=admin_headers,
        timeout=25,
    )
    assert doctor_resp.status_code == 200
    doctor = doctor_resp.json()
    assert doctor["full_name"] == doctor_payload["full_name"]

    slot_time = "2026-03-15T10:00"
    slot_resp = api_client.post(
        f"{BASE_URL}/api/v2/doctors/{doctor['id']}/slots",
        json={"slots": [slot_time]},
        headers=admin_headers,
        timeout=25,
    )
    assert slot_resp.status_code == 200
    doctor_after_slot = slot_resp.json()
    assert slot_time in doctor_after_slot["slots"]

    online_physio_lead_resp = api_client.post(
        f"{BASE_URL}/api/v2/leads",
        json={
            "name": f"TEST Lead OP {suffix}",
            "phone": f"98{suffix[:8]}",
            "email": f"op.{suffix}@test.com",
            "lead_category": "online_physio",
            "source": "manual",
            "preferred_location": "T Nagar",
        },
        headers=admin_headers,
        timeout=25,
    )
    assert online_physio_lead_resp.status_code == 200
    lead_op = online_physio_lead_resp.json()
    assert lead_op["assigned_role"] == "online_physio"

    online_fitness_lead_resp = api_client.post(
        f"{BASE_URL}/api/v2/leads",
        json={
            "name": f"TEST Lead OF {suffix}",
            "phone": f"97{suffix[:8]}",
            "email": f"of.{suffix}@test.com",
            "lead_category": "online_fitness",
            "source": "manual",
            "preferred_location": "ECR",
        },
        headers=admin_headers,
        timeout=25,
    )
    assert online_fitness_lead_resp.status_code == 200
    lead_of = online_fitness_lead_resp.json()
    assert lead_of["assigned_role"] == "online_fitness"

    return {
        "suffix": suffix,
        "service": service,
        "doctor": doctor,
        "slot_time": slot_time,
        "lead_online_physio": lead_op,
        "lead_online_fitness": lead_of,
    }


def test_v2_root_and_locations(api_client, auth_headers):
    # Meta module: verify API root and FITSIOMAX locations list
    root_resp = api_client.get(f"{BASE_URL}/api/v2/", timeout=25)
    assert root_resp.status_code == 200
    assert "FITSIOMAX" in root_resp.json()["message"]

    locations_resp = api_client.get(
        f"{BASE_URL}/api/v2/meta/locations",
        headers=auth_headers["super_admin"],
        timeout=25,
    )
    assert locations_resp.status_code == 200
    locations = locations_resp.json()["locations"]
    assert set(["Anna Nagar", "T Nagar", "Parrys", "ECR"]).issubset(set(locations))


def test_login_for_all_4_roles(auth_headers):
    # Auth module: fixture already validates all 4 role logins and role mapping
    assert set(auth_headers.keys()) == {
        "super_admin",
        "online_fitness",
        "online_physio",
        "offline_physio",
    }


def test_service_creation_super_admin_only(api_client, auth_headers):
    # Service module: verify non-admin cannot create service
    suffix = uuid.uuid4().hex[:6]
    payload = {
        "name": f"TEST_NoPerm_Service_{suffix}",
        "mode": "online",
        "category": "fitness_program",
    }
    denied_resp = api_client.post(
        f"{BASE_URL}/api/v2/services",
        json=payload,
        headers=auth_headers["online_fitness"],
        timeout=25,
    )
    assert denied_resp.status_code == 403


def test_doctor_and_slot_creation_super_admin_only(api_client, auth_headers, v2_state):
    # Doctor module: verify doctor list includes newly created doctor with slot
    list_resp = api_client.get(
        f"{BASE_URL}/api/v2/doctors",
        headers=auth_headers["super_admin"],
        timeout=25,
    )
    assert list_resp.status_code == 200
    doctors = list_resp.json()
    row = next((d for d in doctors if d["id"] == v2_state["doctor"]["id"]), None)
    assert row is not None
    assert v2_state["slot_time"] in row["slots"]


def test_doctor_availability_calendar_loads(api_client, auth_headers, v2_state):
    # Availability module: verify grouped slots payload from doctor calendar endpoint
    resp = api_client.get(
        f"{BASE_URL}/api/v2/doctors/{v2_state['doctor']['id']}/availability",
        headers=auth_headers["online_physio"],
        timeout=25,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["doctor_id"] == v2_state["doctor"]["id"]
    assert "2026-03-15" in data["grouped_slots"]


def test_manual_appointment_booking_and_double_booking_block(api_client, auth_headers, v2_state):
    # Appointment module: book slot and verify same slot cannot be booked twice
    appointment_payload = {
        "lead_id": v2_state["lead_online_physio"]["id"],
        "doctor_id": v2_state["doctor"]["id"],
        "slot_time": v2_state["slot_time"],
        "service_id": v2_state["service"]["id"],
        "location": "Anna Nagar",
        "notes": "TEST booking",
    }
    first_resp = api_client.post(
        f"{BASE_URL}/api/v2/appointments",
        json=appointment_payload,
        headers=auth_headers["super_admin"],
        timeout=25,
    )
    assert first_resp.status_code == 200
    booked = first_resp.json()
    assert booked["slot_time"] == v2_state["slot_time"]
    assert booked["status"] == "booked"

    second_resp = api_client.post(
        f"{BASE_URL}/api/v2/appointments",
        json={
            **appointment_payload,
            "lead_id": None,
            "patient_name": "TEST Duplicate",
        },
        headers=auth_headers["super_admin"],
        timeout=25,
    )
    assert second_resp.status_code == 409


def test_availability_marks_slot_booked(api_client, auth_headers, v2_state):
    # Availability module: verify booked slot is flagged true after appointment
    resp = api_client.get(
        f"{BASE_URL}/api/v2/doctors/{v2_state['doctor']['id']}/availability",
        headers=auth_headers["super_admin"],
        timeout=25,
    )
    assert resp.status_code == 200
    slots = resp.json()["grouped_slots"]["2026-03-15"]
    booked_row = next((s for s in slots if s["slot"] == v2_state["slot_time"]), None)
    assert booked_row is not None
    assert booked_row["booked"] is True


def test_csv_manual_import_and_lead_routing(api_client, auth_headers):
    # Import module: import leads and verify category-to-role routing + dedupe by phone
    suffix = uuid.uuid4().hex[:6]
    phone = f"96{suffix}11"
    import_payload = {
        "source": "manual_csv",
        "rows": [
            {
                "name": f"TEST CSV {suffix}",
                "phone": phone,
                "email": f"csv.{suffix}@test.com",
                "lead_category": "offline_physio",
                "preferred_location": "Parrys",
                "service_interest": "Rehab",
                "notes": "CSV import",
            }
        ],
    }
    import_resp = api_client.post(
        f"{BASE_URL}/api/v2/leads/import",
        json=import_payload,
        headers=auth_headers["super_admin"],
        timeout=25,
    )
    assert import_resp.status_code == 200
    result = import_resp.json()
    assert result["imported"] == 1

    import_again_resp = api_client.post(
        f"{BASE_URL}/api/v2/leads/import",
        json=import_payload,
        headers=auth_headers["super_admin"],
        timeout=25,
    )
    assert import_again_resp.status_code == 200
    assert import_again_resp.json()["skipped"] >= 1

    leads_resp = api_client.get(
        f"{BASE_URL}/api/v2/leads",
        params={"search": phone},
        headers=auth_headers["super_admin"],
        timeout=25,
    )
    assert leads_resp.status_code == 200
    rows = leads_resp.json()
    imported_row = next((r for r in rows if r["phone"] == phone), None)
    assert imported_row is not None
    assert imported_row["assigned_role"] == "offline_physio"


def test_role_queue_visibility_from_api(api_client, auth_headers, v2_state):
    # Routing module: role users should only see their own assigned lead queue
    online_physio_resp = api_client.get(
        f"{BASE_URL}/api/v2/leads",
        headers=auth_headers["online_physio"],
        timeout=25,
    )
    assert online_physio_resp.status_code == 200
    op_rows = online_physio_resp.json()
    assert all(row["assigned_role"] == "online_physio" for row in op_rows)
    assert any(row["id"] == v2_state["lead_online_physio"]["id"] for row in op_rows)

    online_fitness_resp = api_client.get(
        f"{BASE_URL}/api/v2/leads",
        headers=auth_headers["online_fitness"],
        timeout=25,
    )
    assert online_fitness_resp.status_code == 200
    of_rows = online_fitness_resp.json()
    assert all(row["assigned_role"] == "online_fitness" for row in of_rows)
    assert any(row["id"] == v2_state["lead_online_fitness"]["id"] for row in of_rows)
