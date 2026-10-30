"""
UpcharAI Pure Triage Rule Engine (Python Implementation)
CTBF-AI-02 · Revision: REV-001
Conforms to 02-triage-rule-spec.md
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import json
import os

RULE_SET_VERSION = "v1"
CLINICAL_REVIEW_STATUS = "NONE"

PLAUSIBILITY_BOUNDS = {
    "age": {"min": 0, "max": 120, "unit": "years"},
    "temp_c": {"min": 30.0, "max": 45.0, "unit": "°C"},
    "sbp": {"min": 40, "max": 300, "unit": "mmHg"},
    "dbp": {"min": 20, "max": 200, "unit": "mmHg"},
    "spo2": {"min": 50, "max": 100, "unit": "%"},
    "pulse": {"min": 20, "max": 250, "unit": "bpm"},
    "rr": {"min": 4, "max": 70, "unit": "breaths/min"},
    "duration_days": {"min": 0, "max": 365, "unit": "days"}
}

def check_plausibility(data: Dict[str, Any]) -> Tuple[bool, List[Dict[str, Any]]]:
    """Check physiological bounds. Out of bounds requires explicit operator confirm."""
    implausible = []

    for key, bounds in PLAUSIBILITY_BOUNDS.items():
        val = data.get(key)
        if val is not None:
            try:
                num = float(val)
                if num < bounds["min"] or num > bounds["max"]:
                    implausible.append({
                        "field": key,
                        "value": num,
                        "min": bounds["min"],
                        "max": bounds["max"],
                        "unit": bounds["unit"],
                        "message": f"{key} value {num} is outside plausible range ({bounds['min']}–{bounds['max']})"
                    })
            except (ValueError, TypeError):
                pass

    sbp = data.get("sbp")
    dbp = data.get("dbp")
    if sbp is not None and dbp is not None:
        try:
            if float(dbp) >= float(sbp):
                implausible.append({
                    "field": "dbp",
                    "value": dbp,
                    "message": f"Diastolic BP ({dbp}) must be strictly less than Systolic BP ({sbp})"
                })
        except (ValueError, TypeError):
            pass

    return len(implausible) == 0, implausible

def calculate_news2(spo2=None, sbp=None, pulse=None, temp_c=None, rr=None, avpu=None, on_oxygen=None) -> Tuple[int, Dict[str, Optional[int]], int]:
    """NEWS2 Scale 1 Scoring."""
    total = 0
    scores = {}
    params_scored = 0

    # SpO2
    if spo2 is not None:
        try:
            val = float(spo2)
            if val <= 91: s = 3
            elif val <= 93: s = 2
            elif val <= 95: s = 1
            else: s = 0
            scores["spo2"] = s
            total += s
            params_scored += 1
        except (ValueError, TypeError):
            scores["spo2"] = None
    else:
        scores["spo2"] = None

    # SBP
    if sbp is not None:
        try:
            val = float(sbp)
            if val <= 90: s = 3
            elif val <= 100: s = 2
            elif val <= 110: s = 1
            elif val <= 219: s = 0
            else: s = 3
            scores["sbp"] = s
            total += s
            params_scored += 1
        except (ValueError, TypeError):
            scores["sbp"] = None
    else:
        scores["sbp"] = None

    # Pulse
    if pulse is not None:
        try:
            val = float(pulse)
            if val <= 40: s = 3
            elif val <= 50: s = 1
            elif val <= 90: s = 0
            elif val <= 110: s = 1
            elif val <= 130: s = 2
            else: s = 3
            scores["pulse"] = s
            total += s
            params_scored += 1
        except (ValueError, TypeError):
            scores["pulse"] = None
    else:
        scores["pulse"] = None

    # Temp
    if temp_c is not None:
        try:
            val = float(temp_c)
            if val <= 35.0: s = 3
            elif val <= 36.0: s = 1
            elif val <= 38.0: s = 0
            elif val <= 39.0: s = 1
            else: s = 2
            scores["temp_c"] = s
            total += s
            params_scored += 1
        except (ValueError, TypeError):
            scores["temp_c"] = None
    else:
        scores["temp_c"] = None

    # RR
    if rr is not None:
        try:
            val = float(rr)
            if val <= 8: s = 3
            elif val <= 11: s = 1
            elif val <= 20: s = 0
            elif val <= 24: s = 2
            else: s = 3
            scores["rr"] = s
            total += s
            params_scored += 1
        except (ValueError, TypeError):
            scores["rr"] = None
    else:
        scores["rr"] = None

    # AVPU
    if avpu is not None and str(avpu).strip():
        val = str(avpu).strip().upper()
        if val == "A":
            scores["avpu"] = 0
            params_scored += 1
        elif val in ("C", "V", "P", "U"):
            scores["avpu"] = 3
            total += 3
            params_scored += 1
        else:
            scores["avpu"] = None
    else:
        scores["avpu"] = None

    # Oxygen
    if on_oxygen is not None:
        is_o2 = bool(on_oxygen)
        s = 2 if is_o2 else 0
        scores["on_oxygen"] = s
        total += s
        params_scored += 1
    else:
        scores["on_oxygen"] = None

    return total, scores, params_scored

def evaluate_triage(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Pure triage evaluation function.
    Evaluates every rule without short-circuiting.
    """
    age = data.get("age")
    sex = data.get("sex", "OTHER")
    pregnant = bool(data.get("pregnant", False))
    temp_c = data.get("temp_c")
    sbp = data.get("sbp")
    dbp = data.get("dbp")
    spo2 = data.get("spo2")
    pulse = data.get("pulse")
    rr = data.get("rr")
    avpu = data.get("avpu")
    on_oxygen = data.get("on_oxygen")
    symptoms = data.get("symptom_codes") or []
    duration_days = data.get("duration_days") or 0
    history = data.get("history_codes") or []
    free_text = (data.get("free_text") or "").strip()

    findings = []
    flags = []
    missing_required = []
    understated_missing = []

    # Required vitals check
    if temp_c is None: missing_required.append("temp_c")
    if sbp is None: missing_required.append("sbp")
    if dbp is None: missing_required.append("dbp")
    if spo2 is None: missing_required.append("spo2")
    if pulse is None: missing_required.append("pulse")

    if missing_required:
        flags.append({
            "id": "INCOMPLETE",
            "label": f"INCOMPLETE — missing: {', '.join(missing_required)}"
        })

    if rr is None or avpu is None or on_oxygen is None:
        if rr is None: understated_missing.append("rr")
        if avpu is None: understated_missing.append("avpu")
        if on_oxygen is None: understated_missing.append("oxygen")
        flags.append({
            "id": "UNDERSTATED",
            "label": f"Score may be understated — not entered: {', '.join(understated_missing)}"
        })

    if free_text or ("OTHER_TEXT" in symptoms):
        flags.append({
            "id": "NEEDS_REVIEW",
            "label": "Needs clinician review — unrecognised symptom text"
        })

    news2_total, scores, params_scored = calculate_news2(spo2, sbp, pulse, temp_c, rr, avpu, on_oxygen)

    spo2_s = scores.get("spo2") or 0
    sbp_s = scores.get("sbp") or 0
    pulse_s = scores.get("pulse") or 0
    abnormal_vital = (spo2_s >= 2) or (sbp_s >= 2) or (pulse_s >= 2)

    # 3.1 EMERGENCY RULES
    if news2_total >= 7:
        findings.append({
            "rule_id": "NW-E01",
            "tier": "EMERGENCY",
            "plain_message": "NEWS2 total score is 7 or higher (critical clinical deterioration risk)",
            "observed_value": f"Score: {news2_total}"
        })

    is_spo2_crit = (spo2 is not None and float(spo2) <= 90)
    is_sbp_crit = (sbp is not None and float(sbp) <= 90)
    if is_spo2_crit or is_sbp_crit:
        findings.append({
            "rule_id": "RF-E01",
            "tier": "EMERGENCY",
            "plain_message": "Severe hypoxia (SpO2 <= 90%) or profound hypotension (SBP <= 90 mmHg)",
            "observed_value": f"SpO2: {spo2}%, SBP: {sbp} mmHg"
        })

    if "SEVERE_BREATHING_DIFFICULTY" in symptoms:
        findings.append({
            "rule_id": "RF-E02",
            "tier": "EMERGENCY",
            "plain_message": "Severe breathing difficulty (respiratory failure risk)",
            "observed_value": "Severe respiratory distress"
        })

    if avpu in ("P", "U"):
        findings.append({
            "rule_id": "RF-E03",
            "tier": "EMERGENCY",
            "plain_message": "Depressed consciousness: responsive only to pain or unresponsive",
            "observed_value": f"AVPU: {avpu}"
        })

    if "SEIZURE_ONGOING" in symptoms:
        findings.append({
            "rule_id": "RF-E04",
            "tier": "EMERGENCY",
            "plain_message": "Active ongoing seizure activity",
            "observed_value": "Active convulsions"
        })

    if "SEVERE_BLEEDING" in symptoms:
        findings.append({
            "rule_id": "RF-E05",
            "tier": "EMERGENCY",
            "plain_message": "Severe uncontrolled or arterial bleeding",
            "observed_value": "Severe hemorrhage"
        })

    if "STROKE_SIGNS" in symptoms:
        findings.append({
            "rule_id": "RF-E06",
            "tier": "EMERGENCY",
            "plain_message": "Acute neurological stroke signs (FAST)",
            "observed_value": "Acute deficit"
        })

    if "SNAKEBITE_OR_POISONING" in symptoms:
        findings.append({
            "rule_id": "RF-E07",
            "tier": "EMERGENCY",
            "plain_message": "Suspected venomous snakebite or acute toxic poisoning",
            "observed_value": "Envenomation / Poisoning"
        })

    if "PREGNANCY_HEAVY_BLEEDING" in symptoms or "PREGNANCY_CONVULSION" in symptoms:
        findings.append({
            "rule_id": "RF-E08",
            "tier": "EMERGENCY",
            "plain_message": "Obstetric emergency: severe hemorrhage or convulsion in pregnancy",
            "observed_value": "Maternal red flag"
        })

    has_rf_e09 = ("CHEST_PAIN" in symptoms) and abnormal_vital
    if has_rf_e09:
        findings.append({
            "rule_id": "RF-E09",
            "tier": "EMERGENCY",
            "plain_message": "Red-flag combination: chest pain accompanied by abnormal vital signs",
            "observed_value": f"Chest pain + abnormal vital score >= 2"
        })

    # 3.2 URGENT RULES
    if 5 <= news2_total <= 6:
        findings.append({
            "rule_id": "NW-U01",
            "tier": "URGENT",
            "plain_message": "NEWS2 total score is 5–6 (moderate clinical risk)",
            "observed_value": f"Score: {news2_total}"
        })

    single_3_params = [k for k, v in scores.items() if v == 3]
    if single_3_params:
        findings.append({
            "rule_id": "NW-U02",
            "tier": "URGENT",
            "plain_message": f"Single parameter scored maximum severity (3): {', '.join(single_3_params)}",
            "observed_value": ", ".join(single_3_params)
        })

    if ("CHEST_PAIN" in symptoms) and not has_rf_e09:
        findings.append({
            "rule_id": "RF-U01",
            "tier": "URGENT",
            "plain_message": "Chest pain reported (requires urgent clinician assessment and ECG)",
            "observed_value": "Chest pain"
        })

    if "BREATHING_DIFFICULTY" in symptoms:
        findings.append({
            "rule_id": "RF-U02",
            "tier": "URGENT",
            "plain_message": "Moderate difficulty breathing reported",
            "observed_value": "Dyspnea"
        })

    if "VOMITING_DIARRHOEA_DEHYDRATION" in symptoms:
        findings.append({
            "rule_id": "RF-U03",
            "tier": "URGENT",
            "plain_message": "Persistent vomiting, diarrhea, or dehydration signs",
            "observed_value": "Dehydration risk"
        })

    if ("FEVER" in symptoms) and float(duration_days) > 3:
        findings.append({
            "rule_id": "RF-U04",
            "tier": "URGENT",
            "plain_message": f"Prolonged fever persisting for {duration_days} days (> 3 days)",
            "observed_value": f"Duration: {duration_days} days"
        })

    is_high_risk = bool(history) or (age is not None and float(age) >= 65)
    has_high_risk_vitals = (temp_c is not None and float(temp_c) >= 38.1) or (spo2 is not None and float(spo2) <= 95)
    if is_high_risk and has_high_risk_vitals:
        findings.append({
            "rule_id": "RF-U05",
            "tier": "URGENT",
            "plain_message": "High-risk history or elderly patient with fever (>=38.1°C) or low-normal SpO2 (<=95%)",
            "observed_value": "High risk + vital anomaly"
        })

    if age is not None and float(age) < 16:
        findings.append({
            "rule_id": "FLOOR-01",
            "tier": "URGENT",
            "plain_message": "Outside this tool's adult scoring (age < 16). Needs a clinician's judgement.",
            "observed_value": f"Age: {age}"
        })

    if pregnant:
        findings.append({
            "rule_id": "FLOOR-02",
            "tier": "URGENT",
            "plain_message": "Outside this tool's adult scoring (pregnancy). Needs a clinician's judgement.",
            "observed_value": "Pregnant"
        })

    has_e = any(f["tier"] == "EMERGENCY" for f in findings)
    has_u = any(f["tier"] == "URGENT" for f in findings)

    if has_e:
        priority = "EMERGENCY"
        action = "Alert the doctor now."
    elif has_u:
        priority = "URGENT"
        action = "Doctor should see this patient soon, before routine cases."
    else:
        priority = "ROUTINE"
        action = "No urgent signs found by this tool. A clinician still reviews every case."

    tier_order = {"EMERGENCY": 1, "URGENT": 2, "ROUTINE": 3}
    findings.sort(key=lambda x: (tier_order.get(x["tier"], 99), x["rule_id"]))

    return {
        "priority": priority,
        "state": "PRELIMINARY",
        "flags": flags,
        "missing": missing_required,
        "news2": {
            "total": news2_total,
            "params": scores,
            "paramsScoredCount": params_scored
        },
        "findings": findings,
        "rule_set_version": RULE_SET_VERSION,
        "clinical_review_status": CLINICAL_REVIEW_STATUS,
        "suggested_action": action,
        "evaluated_at": datetime.now(timezone.utc).isoformat()
    }
