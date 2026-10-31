import os
import pytest
from fastapi.testclient import TestClient

os.environ["USE_MOCK_AI"] = "true"

from app.main import app  # noqa: E402
from app.services.db import reset_memory_stores  # noqa: E402

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    reset_memory_stores()
    yield


def test_unseeded_initial_state_and_model_meta():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["gemini_model"] == "gemini-3.8-flash"
    assert data["mothers_count"] == 0
    assert data["visits_count"] == 0

    meta_res = client.get("/model-meta")
    assert meta_res.status_code == 200
    meta = meta_res.json()
    assert meta["features"] == ["Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate"]
    assert "model_version" in meta


def test_simplified_phone_otp_signup_and_login():
    otp_res = client.post("/auth/send-otp", json={"phone": "9876543210"})
    assert otp_res.status_code == 200
    otp_code = otp_res.json()["demo_otp_hint"]

    verify_res = client.post(
        "/auth/verify-otp",
        json={
            "phone": "9876543210",
            "otp": otp_code,
            "name": "Priya Verma",
            "age": 24,
            "gestational_week": 22,
        },
    )
    assert verify_res.status_code == 200
    user = verify_res.json()
    assert user["phone"] == "9876543210"
    assert user["name"] == "Priya Verma"
    assert user["age"] == 24
    assert user["gestational_week"] == 22
    assert user["mother_id"].startswith("MR-")

    # Subsequent login with phone + OTP only remembers her Name, Age, Week, and mother_id
    login_res = client.post(
        "/auth/verify-otp",
        json={"phone": "9876543210", "otp": otp_code},
    )
    assert login_res.status_code == 200
    logged_in = login_res.json()
    assert logged_in["name"] == "Priya Verma"
    assert logged_in["age"] == 24
    assert logged_in["mother_id"] == user["mother_id"]


def test_mother_registration_has_zero_hardcoded_vitals_and_3_visit_trend():
    # 1. Register mother -> must have NO hardcoded vitals
    create_res = client.post(
        "/mothers",
        json={"id": "MR-3001", "name": "Sunita Devi", "age": 28, "phone": "9811122233", "gestationalWeek": 26},
    )
    assert create_res.status_code == 200
    mother = create_res.json()
    assert mother["riskLevel"] == "UNASSESSED"
    assert mother["bloodPressure"] is None
    assert mother["visitCount"] == 0

    # 2. Visit 1: Normal / Low Risk (Age 22, BP 100/65, BS 6.8)
    v1 = client.post(
        "/evaluate-visit",
        json={
            "mother_id": "MR-3001",
            "age": 22,
            "vitals": {
                "systolic": 100,
                "diastolic": 65,
                "blood_sugar_mmol": 6.8,
                "body_temp_f": 98.0,
                "heart_rate": 70,
            },
            "symptoms": [],
        },
    )
    assert v1.status_code == 200
    v1_data = v1.json()
    assert v1_data["frontend_risk_level"] == "LOW"
    assert len(v1_data["top_factors"]) == 2
    assert set(v1_data["probabilities"].keys()) == {"low", "mid", "high"}

    # 3. Visit 2: Rising BP (118/76)
    v2 = client.post(
        "/evaluate-visit",
        json={
            "mother_id": "MR-3001",
            "age": 22,
            "vitals": {
                "systolic": 118,
                "diastolic": 76,
                "blood_sugar_mmol": 7.0,
                "body_temp_f": 98.2,
                "heart_rate": 74,
            },
            "symptoms": [],
        },
    )
    assert v2.status_code == 200

    # 4. Visit 3: 3rd Consecutive Rising BP (136/88) -> triggers bp_rising_3_visits via SciPy linregress
    v3 = client.post(
        "/evaluate-visit",
        json={
            "mother_id": "MR-3001",
            "age": 22,
            "vitals": {
                "systolic": 136,
                "diastolic": 88,
                "blood_sugar_mmol": 7.5,
                "body_temp_f": 98.4,
                "heart_rate": 78,
            },
            "symptoms": [],
        },
    )
    assert v3.status_code == 200
    v3_data = v3.json()
    assert v3_data["trend_flag"] == "bp_rising_3_visits"
    assert v3_data["systolic_slope"] > 0
    assert v3_data["diastolic_slope"] > 0
    assert v3_data["frontend_risk_level"] in ("MODERATE", "HIGH")

    # 5. Global Visit History endpoint returns all 3 visits
    visits_res = client.get("/visits")
    assert visits_res.status_code == 200
    assert len(visits_res.json()) == 3
