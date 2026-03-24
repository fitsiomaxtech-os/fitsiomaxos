import os
import uuid
import json
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv


load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")


def iso_future(minutes=90):
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).replace(microsecond=0).isoformat()


def login(session, email, password):
    resp = session.post(f"{BASE_URL}/api/v3/auth/login", json={"email": email, "password": password}, timeout=25)
    resp.raise_for_status()
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def main():
    if not BASE_URL:
        raise RuntimeError("REACT_APP_BACKEND_URL missing")

    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    suffix = uuid.uuid4().hex[:8]

    admin = login(session, "admin@fitsiomax.com", "admin123")
    pre_sales = login(session, "presales@fitsiomax.com", "presales123")

    branch_payload = {
        "branch_name": f"UI_BRANCH_{suffix}",
        "address": "Chennai",
        "admin_name": f"UI ADMIN {suffix}",
        "admin_email": f"ui.branch.{suffix}@fitsiomax.com",
        "admin_password": "branch321",
        "admin_phone": "9111122222",
        "vertical": "offline_physiotherapy",
    }
    branch = session.post(f"{BASE_URL}/api/v3/branches", json=branch_payload, headers=admin, timeout=25).json()

    doctor = session.post(
        f"{BASE_URL}/api/v3/doctors",
        json={
            "full_name": f"UI Doctor {suffix}",
            "profile_type": "physio",
            "branch_id": branch["id"],
            "specialization": "General",
        },
        headers=admin,
        timeout=25,
    ).json()

    slot_time = iso_future(180)
    free_slot_time = iso_future(240)
    session.post(
        f"{BASE_URL}/api/v3/doctors/{doctor['id']}/slots",
        json={"slots": [slot_time, free_slot_time]},
        headers=admin,
        timeout=25,
    ).raise_for_status()

    lead = session.post(
        f"{BASE_URL}/api/v3/leads/manual",
        json={
            "name": f"UI Lead {suffix}",
            "phone": f"96{suffix}",
            "email": f"ui.lead.{suffix}@mail.com",
            "vertical": "offline_physiotherapy",
            "source_type": "manual",
        },
        headers=pre_sales,
        timeout=25,
    ).json()

    session.post(f"{BASE_URL}/api/v3/leads/{lead['id']}/qualify", headers=pre_sales, timeout=25).raise_for_status()
    session.post(
        f"{BASE_URL}/api/v3/leads/{lead['id']}/assign-branch",
        json={"branch_id": branch["id"]},
        headers=pre_sales,
        timeout=25,
    ).raise_for_status()

    branch_admin = login(session, branch_payload["admin_email"], branch_payload["admin_password"])
    session.post(f"{BASE_URL}/api/v3/leads/{lead['id']}/confirm", headers=branch_admin, timeout=25).raise_for_status()
    appt = session.post(
        f"{BASE_URL}/api/v3/leads/{lead['id']}/book-appointment",
        json={"doctor_id": doctor["id"], "slot_time": slot_time},
        headers=branch_admin,
        timeout=25,
    ).json()

    result = {
        "branch_admin_email": branch_payload["admin_email"],
        "branch_admin_password": branch_payload["admin_password"],
        "appointment_id": appt["id"],
        "lead_id": lead["id"],
        "slot_time": slot_time,
        "free_slot_time": free_slot_time,
    }
    with open("/app/tests/ui_seed_output.json", "w", encoding="utf-8") as fp:
        json.dump(result, fp)
    print(result)


if __name__ == "__main__":
    main()
