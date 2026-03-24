import os

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


def _login(api_client, email: str, password: str):
    response = api_client.post(
        f"{BASE_URL}/api/v3/auth/login",
        json={"email": email, "password": password},
        timeout=25,
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data.get("token"), str) and len(data["token"]) > 0
    return data


def test_seeded_branch_admin_has_branch_mapping(api_client):
    # Seed data integrity module: default branch admin must be branch-linked for booking workflow
    data = _login(api_client, "branchadmin@fitsiomax.com", "branch123")
    assert data["user"]["role"] == "branch_admin"
    assert data["user"].get("branch_id"), "Default branch admin has null branch_id"


def test_seeded_head_physio_and_physio_have_branch_mapping(api_client):
    # Seed data integrity module: operational users should be branch-linked
    head = _login(api_client, "headphysio@fitsiomax.com", "head123")
    physio = _login(api_client, "physio@fitsiomax.com", "physio123")

    assert head["user"]["role"] == "head_physio"
    assert physio["user"]["role"] == "physio"
    assert head["user"].get("branch_id")
    assert physio["user"].get("branch_id")
