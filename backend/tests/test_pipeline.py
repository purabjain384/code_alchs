import io
from fastapi.testclient import TestClient

from app.services.db import _MEMORY_MOTHERS, _MEMORY_VISITS
from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "active"}


def test_unit_auto_conversion_and_mother_profile_lookup() -> None:
    """
    Verify Improvement #1 (mg/dL -> mmol/L and °C -> °F auto-conversion)
    and Improvement #2 (auto-lookup of mother's age, asha_uid, phc_id, lmp_date from mothers/{motherId}).
    """
    _MEMORY_VISITS.clear()
    _MEMORY_MOTHERS.clear()

    # Pre-seed a registered mother in mothers/{motherId}
    _MEMORY_MOTHERS["mother_auto_01"] = {
        "name": "Sunita Devi",
        "age": 29,
        "asha_uid": "asha_sita_99",
        "phc_id": "phc_block_north",
        "lmp_date": "2026-04-01T00:00:00Z",
    }

    # Send blood sugar in mg/dL (144 mg/dL -> 8.0 mmol/L) and temp in Celsius (37.0 °C -> 98.6 °F)
    # and OMIT age, asha_uid, phc_id, gestational_weeks
    response = client.post(
        "/evaluate-visit",
        json={
            "mother_id": "mother_auto_01",
            "current_vitals": {
                "systolic": 124,
                "diastolic": 80,
                "blood_sugar_mmol": 144.0,  # mg/dL -> auto-normalized to 8.0 mmol/L
                "body_temp_f": 37.0,         # °C -> auto-normalized to 98.6 °F
                "heart_rate": 82,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    # 144 mg/dL == 8.0 mmol/L -> triggers bs_above_7_8 ("mid" risk)
    assert "bs_above_7_8" in data["result"]["rule_flags"]
    assert data["risk_level"] == "mid"
    assert _MEMORY_MOTHERS["mother_auto_01"]["asha_uid"] == "asha_sita_99"
    assert _MEMORY_MOTHERS["mother_auto_01"]["phc_id"] == "phc_block_north"


def test_evaluate_visit_high_risk_and_rising_bp_trend() -> None:
    payload = {
        "mother_id": "mother_test_001",
        "asha_uid": "asha_01",
        "phc_id": "phc_rampur",
        "age": 24,
        "gestational_weeks": 32,
        "current_vitals": {
            "systolic": 142,
            "diastolic": 92,
            "blood_sugar_mmol": 7.8,
            "body_temp_f": 99.1,
            "heart_rate": 88,
        },
        "past_visits": [
            {
                "visit_at": "2026-09-01T10:00:00Z",
                "gestational_weeks": 24,
                "vitals": {
                    "systolic": 122,
                    "diastolic": 78,
                    "blood_sugar_mmol": 5.4,
                    "body_temp_f": 98.4,
                    "heart_rate": 76,
                },
            },
            {
                "visit_at": "2026-10-01T10:00:00Z",
                "gestational_weeks": 28,
                "vitals": {
                    "systolic": 132,
                    "diastolic": 84,
                    "blood_sugar_mmol": 6.1,
                    "body_temp_f": 98.6,
                    "heart_rate": 80,
                },
            },
        ],
    }

    response = client.post("/evaluate-visit", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["mother_id"] == "mother_test_001"
    assert data["risk_level"] == "high"
    assert data["risk_rank"] == 3
    assert data["urgency_score"] >= 0.74
    assert isinstance(data["reasons"], list) and len(data["reasons"]) > 0
    assert isinstance(data["hindi_text"], str) and len(data["hindi_text"]) > 10
    assert isinstance(data["audio_base64"], str) and len(data["audio_base64"]) > 10

    res = data["result"]
    assert res["risk_level"] == "high"
    assert res["risk_rank"] == 3
    assert "bp_above_140_90" in res["rule_flags"]
    assert "bs_above_7_8" in res["rule_flags"]
    assert res["trend_flag"] == "bp_rising_3_visits"
    assert res["model_version"] == "rf-v1"


def test_evaluate_visit_overall_multi_visit_trajectory_and_summary() -> None:
    """
    Verify overall multi-visit trajectory (5 visits with a dip on visit 3)
    AND Improvement #5 (`GET /mother-summary/{mother_id}`).
    """
    _MEMORY_VISITS.clear()
    _MEMORY_MOTHERS.clear()

    systolic_readings = [110, 118, 116, 124, 132]
    last_response = None
    for sys_val in systolic_readings:
        last_response = client.post(
            "/evaluate-visit",
            json={
                "mother_id": "mother_5_visits",
                "age": 26,
                "current_vitals": {
                    "systolic": sys_val,
                    "diastolic": 78,
                    "blood_sugar_mmol": 5.3,
                    "body_temp_f": 98.4,
                    "heart_rate": 76,
                },
            },
        )
    assert last_response is not None
    assert last_response.status_code == 200
    data = last_response.json()
    assert data["result"]["trend_flag"] == "bp_rising_3_visits"
    assert data["risk_level"] == "mid"

    # Test GET /mother-summary/{mother_id}
    summary_res = client.get("/mother-summary/mother_5_visits")
    assert summary_res.status_code == 200
    summary_body = summary_res.json()
    assert summary_body["total_visits_analyzed"] == 5
    assert summary_body["bp_trend"] == "rising"
    assert len(summary_body["recent_bp_series"]) == 5


def test_tts_and_scan_vitals_endpoints() -> None:
    # Test POST /tts (Improvement #3)
    tts_res = client.post("/tts", json={"hindi_text": "माँ को तुरंत पीएचसी ले जाएं।"})
    assert tts_res.status_code == 200
    assert len(tts_res.json()["audio_base64"]) > 10

    # Test POST /scan-vitals (Improvement #4)
    fake_image = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9")
    response = client.post(
        "/scan-vitals",
        files={"file": ("bp_monitor.jpg", fake_image, "image/jpeg")},
    )
    assert response.status_code == 200
    body = response.json()
    assert {"sys", "dia", "hr"}.issubset(set(body.keys()))
    assert isinstance(body["sys"], int)
    assert isinstance(body["dia"], int)
    assert isinstance(body["hr"], int)

