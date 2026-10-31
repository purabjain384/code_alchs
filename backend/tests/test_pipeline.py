import os
import pytest
from fastapi.testclient import TestClient

os.environ["USE_MOCK_AI"] = "true"

from app.main import app
from app.services.db import reset_memory_stores

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    reset_memory_stores()
    yield


def test_unseeded_initial_state_and_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["gemini_model"] == "gemini-3.8-flash"
    assert data["tts_model"] == "gemini-3.8-flash"
    assert data["mothers_count"] == 0

    mothers_res = client.get("/mothers")
    assert mothers_res.status_code == 200
    assert mothers_res.json() == []


def test_phone_otp_signup_and_login():
    otp_res = client.post("/auth/send-otp", json={"phone": "+919876543210"})
    assert otp_res.status_code == 200
    assert otp_res.json()["otp_sent"] is True

    verify_res = client.post(
        "/auth/verify-otp",
        json={
            "phone": "+919876543210",
            "otp": "123456",
            "name": "Sunita ASHA",
            "role": "asha",
            "village": "Rampura",
            "ward": "Ward 1",
        },
    )
    assert verify_res.status_code == 200
    user = verify_res.json()
    assert user["phone"] == "+919876543210"
    assert user["role"] == "asha"


def test_register_mother_and_evaluate_visit_with_anemia_and_bp_trend():
    # 1. Register mother
    create_res = client.post(
        "/mothers",
        json={
            "id": "MR-2001",
            "name": "Sunita Devi",
            "age": 27,
            "phone": "+919811122233",
            "village": "Rampura",
            "ward": "Ward 1",
            "gestationalWeek": 28,
            "bloodPressure": "118/76",
            "hemoglobin": 11.4,
            "weight": 59.0,
            "fetalHeartRate": 142,
        },
    )
    assert create_res.status_code == 200
    mother = create_res.json()
    assert mother["id"] == "MR-2001"
    assert mother["riskLevel"] == "LOW"

    # 2. Record baseline visit
    v1 = client.post(
        "/evaluate-visit",
        json={
            "mother_id": "MR-2001",
            "asha_id": "ASHA-704",
            "age": 27,
            "vitals": {
                "systolic": 120,
                "diastolic": 78,
                "blood_sugar_mmol": 95.0,  # mg/dL -> auto-normalized to 5.28 mmol/L
                "body_temp_f": 37.0,       # °C -> auto-normalized to 98.6 °F
                "heart_rate": 78,
                "hemoglobin": 11.2,
                "weight_kg": 60.0,
                "fetal_heart_rate": 144,
            },
            "symptoms": [],
        },
    )
    assert v1.status_code == 200
    assert v1.json()["frontend_risk_level"] == "LOW"

    # 3. Record 2nd visit with Severe BP + Severe Anemia (Hb 8.2) + Rising BP trend
    v2 = client.post(
        "/evaluate-visit",
        json={
            "mother_id": "MR-2001",
            "asha_id": "ASHA-704",
            "age": 27,
            "vitals": {
                "systolic": 148,
                "diastolic": 94,
                "blood_sugar_mmol": 5.6,
                "body_temp_f": 98.6,
                "heart_rate": 88,
                "hemoglobin": 8.2,
                "weight_kg": 61.2,
                "fetal_heart_rate": 148,
            },
            "symptoms": ["severe headache"],
        },
    )
    assert v2.status_code == 200
    v2_data = v2.json()
    assert v2_data["frontend_risk_level"] == "HIGH"
    assert "severe_hypertension_bp" in v2_data["risk_factors"]
    assert "severe_anemia_hb" in v2_data["risk_factors"]
    assert "rising_bp_trend" in v2_data["risk_factors"]
    assert len(v2_data["audio_base64"]) > 10

    # 4. Check 5-visit mother summary
    sum_res = client.get("/mother-summary/MR-2001")
    assert sum_res.status_code == 200
    assert sum_res.json()["visits_analyzed"] == 2


def test_bulk_dataset_import_and_sos_dispatch():
    bulk_res = client.post(
        "/mothers/bulk-import",
        json=[
            {"Age": 36, "SystolicBP": 150, "DiastolicBP": 95, "BS": 8.5, "BodyTemp": 98.6, "HeartRate": 92, "name": "Test High Risk"},
            {"Age": 23, "SystolicBP": 115, "DiastolicBP": 75, "BS": 5.1, "BodyTemp": 98.4, "HeartRate": 76, "name": "Test Low Risk"},
        ],
    )
    assert bulk_res.status_code == 200
    imported = bulk_res.json()
    assert len(imported) == 2
    assert imported[0]["riskLevel"] == "HIGH"
    assert imported[1]["riskLevel"] == "LOW"

    sos_res = client.post(
        "/sos-dispatch",
        json={
            "mother_id": imported[0]["id"],
            "mother_name": imported[0]["name"],
            "village": "Rampura",
            "ward": "Ward 1",
            "blood_pressure": "150/95",
            "emergency_reason": "Severe Pre-eclampsia (BP > 140/90)",
            "target_facility": "Raigad District Civil Hospital (FRU)",
        },
    )
    assert sos_res.status_code == 200
    assert sos_res.json()["eta_minutes"] == 14
