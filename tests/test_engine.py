from pathlib import Path
import pytest
import yaml

from engine.config import load_config
from engine.models import AssessmentInputs, Flag, Priority
from engine.news2 import (
    score_avpu,
    score_oxygen,
    score_pulse,
    score_rr,
    score_sbp,
    score_spo2,
    score_temp,
)
from engine.plausibility import PlausibilityError
from engine.triage import evaluate_triage


def test_oracle_12_cases():
    """VM-01, VM-02, VM-03: Validate all 12 oracle cases from tests/oracle.yaml against 02 §7."""
    oracle_file = Path(__file__).resolve().parent / "oracle.yaml"
    with open(oracle_file, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    config = load_config()

    for item in data["oracle_cases"]:
        case_id = item["id"]
        desc = item["description"]
        inp = item["input"]
        exp = item["expected"]

        inputs = AssessmentInputs(**inp)
        result = evaluate_triage(inputs, config)

        assert result.news2.total == exp["news2_total"], (
            f"Case {case_id} ({desc}): expected news2_total={exp['news2_total']}, got {result.news2.total}"
        )

        fired_ids = [f.rule_id for f in result.findings]
        expected_ids = exp.get("fired_rule_ids", [])
        assert set(fired_ids) == set(expected_ids), (
            f"Case {case_id} ({desc}): expected fired rules {expected_ids}, got {fired_ids}"
        )

        assert result.priority.value == exp["priority"], (
            f"Case {case_id} ({desc}): expected priority {exp['priority']}, got {result.priority.value}"
        )

        expected_flags = exp.get("flags", [])
        for flag in expected_flags:
            assert flag in result.flags, (
                f"Case {case_id} ({desc}): expected flag {flag} in {result.flags}"
            )

        if "missing" in exp:
            assert set(result.missing) == set(exp["missing"]), (
                f"Case {case_id} ({desc}): expected missing {exp['missing']}, got {result.missing}"
            )


def test_100x_determinism():
    """T-001 / VM-01: Run the same input 100 times, ensure identical priority, findings and order."""
    inputs = AssessmentInputs(
        age=45,
        sex="M",
        temp_c=38.4,
        sbp=115,
        dbp=75,
        spo2=94,
        pulse=115,
        symptom_codes=["CHEST_PAIN"],
    )
    first_res = evaluate_triage(inputs)

    for _ in range(99):
        res = evaluate_triage(inputs)
        assert res.priority == first_res.priority
        assert res.flags == first_res.flags
        assert res.news2.total == first_res.news2.total
        assert len(res.findings) == len(first_res.findings)
        for f1, f2 in zip(first_res.findings, res.findings):
            assert f1.rule_id == f2.rule_id
            assert f1.tier == f2.tier
            assert f1.plain_message == f2.plain_message
            assert f1.observed_value == f2.observed_value


def test_news2_boundary_bands():
    """VM-02 / T-002: Boundary tests for each parameter band."""
    # SpO2 scale 1: <=91 -> 3; 92-93 -> 2; 94-95 -> 1; >=96 -> 0
    assert score_spo2(90) == 3
    assert score_spo2(91) == 3
    assert score_spo2(92) == 2
    assert score_spo2(93) == 2
    assert score_spo2(94) == 1
    assert score_spo2(95) == 1
    assert score_spo2(96) == 0
    assert score_spo2(99) == 0

    # SBP: <=90 -> 3; 91-100 -> 2; 101-110 -> 1; 111-219 -> 0; >=220 -> 3
    assert score_sbp(89) == 3
    assert score_sbp(90) == 3
    assert score_sbp(91) == 2
    assert score_sbp(100) == 2
    assert score_sbp(101) == 1
    assert score_sbp(110) == 1
    assert score_sbp(111) == 0
    assert score_sbp(219) == 0
    assert score_sbp(220) == 3
    assert score_sbp(230) == 3

    # Pulse: <=40 -> 3; 41-50 -> 1; 51-90 -> 0; 91-110 -> 1; 111-130 -> 2; >=131 -> 3
    assert score_pulse(39) == 3
    assert score_pulse(40) == 3
    assert score_pulse(41) == 1
    assert score_pulse(50) == 1
    assert score_pulse(51) == 0
    assert score_pulse(90) == 0
    assert score_pulse(91) == 1
    assert score_pulse(110) == 1
    assert score_pulse(111) == 2
    assert score_pulse(130) == 2
    assert score_pulse(131) == 3
    assert score_pulse(140) == 3

    # Temp: <=35.0 -> 3; 35.1-36.0 -> 1; 36.1-38.0 -> 0; 38.1-39.0 -> 1; >=39.1 -> 2
    assert score_temp(34.8) == 3
    assert score_temp(35.0) == 3
    assert score_temp(35.1) == 1
    assert score_temp(36.0) == 1
    assert score_temp(36.1) == 0
    assert score_temp(38.0) == 0
    assert score_temp(38.1) == 1
    assert score_temp(39.0) == 1
    assert score_temp(39.1) == 2
    assert score_temp(40.0) == 2

    # RR: <=8 -> 3; 9-11 -> 1; 12-20 -> 0; 21-24 -> 2; >=25 -> 3
    assert score_rr(7) == 3
    assert score_rr(8) == 3
    assert score_rr(9) == 1
    assert score_rr(11) == 1
    assert score_rr(12) == 0
    assert score_rr(20) == 0
    assert score_rr(21) == 2
    assert score_rr(24) == 2
    assert score_rr(25) == 3
    assert score_rr(30) == 3

    # Alertness
    assert score_avpu("A") == 0
    assert score_avpu("a") == 0
    assert score_avpu("C") == 3
    assert score_avpu("V") == 3
    assert score_avpu("P") == 3
    assert score_avpu("U") == 3

    # Oxygen
    assert score_oxygen(True) == 2
    assert score_oxygen(False) == 0
    assert score_oxygen(None) == 0


def test_plausibility_enforcement():
    """VM-04 / T-005: Out of range vitals rejected unless confirm_implausible=True."""
    bad_inputs = AssessmentInputs(
        age=40,
        sex="M",
        temp_c=46.5,  # Plausible is 30.0-45.0
        sbp=120,
        dbp=80,
        spo2=98,
        pulse=80,
    )
    with pytest.raises(PlausibilityError) as exc_info:
        evaluate_triage(bad_inputs)
    assert "Temperature 46.5°C is outside plausible range" in str(exc_info.value)

    # When confirmed, it is accepted
    bad_inputs.confirm_implausible = True
    result = evaluate_triage(bad_inputs)
    assert result is not None

    # Test DBP >= SBP
    bad_bp = AssessmentInputs(
        age=40,
        sex="M",
        temp_c=37.0,
        sbp=100,
        dbp=110,  # DBP >= SBP
        spo2=98,
        pulse=80,
    )
    with pytest.raises(PlausibilityError) as exc_info:
        evaluate_triage(bad_bp)
    assert "Diastolic BP" in str(exc_info.value) and "strictly less than Systolic BP" in str(exc_info.value)


def test_missing_data_flags():
    """VM-03 / T-004: Missing vitals yield INCOMPLETE and UNDERSTATED flags."""
    inputs = AssessmentInputs(
        age=35,
        sex="F",
        temp_c=37.0,
        sbp=None,  # Missing SBP and DBP
        dbp=None,
        spo2=98,
        pulse=75,
    )
    result = evaluate_triage(inputs)
    assert Flag.INCOMPLETE.value in result.flags
    assert Flag.UNDERSTATED.value in result.flags
    assert "sbp" in result.missing
    assert "dbp" in result.missing
    assert result.priority == Priority.ROUTINE


def test_avpu_and_sex_plausibility():
    """Validates that invalid AVPU values and Sex strings are rejected by plausibility check."""
    bad_avpu = AssessmentInputs(
        age=30,
        sex="M",
        temp_c=37.0,
        sbp=120,
        dbp=80,
        spo2=98,
        pulse=80,
        avpu="INVALID",
    )
    with pytest.raises(PlausibilityError) as exc:
        evaluate_triage(bad_avpu)
    assert "Alertness 'INVALID' is invalid" in str(exc.value)

    bad_sex = AssessmentInputs(
        age=30,
        sex="UNKNOWN",
        temp_c=37.0,
        sbp=120,
        dbp=80,
        spo2=98,
        pulse=80,
    )
    with pytest.raises(PlausibilityError) as exc2:
        evaluate_triage(bad_sex)
    assert "Sex 'UNKNOWN' is invalid" in str(exc2.value)
