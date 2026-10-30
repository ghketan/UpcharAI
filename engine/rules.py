from typing import List, Tuple
from engine.models import (
    AssessmentInputs,
    Finding,
    Flag,
    NEWS2Result,
    Priority,
)
from engine.config import RuleConfig


def evaluate_rules(
    inputs: AssessmentInputs,
    news2: NEWS2Result,
    config: RuleConfig,
) -> Tuple[List[Finding], List[str], List[str]]:
    """
    Evaluates every rule without short-circuiting.
    Returns:
      (findings, flags, missing_critical_vitals)
    """
    findings: List[Finding] = []
    symptom_set = set(inputs.symptom_codes)

    # ----------------------------------------------------
    # 3.1 Emergency Rules
    # ----------------------------------------------------

    # NW-E01: news2_total >= 7
    if news2.total >= 7:
        findings.append(Finding(
            rule_id="NW-E01",
            tier=Priority.EMERGENCY,
            plain_message=f"High NEWS2 aggregate score ({news2.total}).",
            observed_value=f"NEWS2={news2.total}",
        ))

    # RF-E01: SpO2 <= 90 or SBP <= 90
    spo2_crit = inputs.spo2 is not None and inputs.spo2 <= 90
    sbp_crit = inputs.sbp is not None and inputs.sbp <= 90
    if spo2_crit or sbp_crit:
        parts = []
        if spo2_crit:
            parts.append(f"SpO2 {inputs.spo2}%")
        if sbp_crit:
            parts.append(f"SBP {inputs.sbp} mmHg")
        findings.append(Finding(
            rule_id="RF-E01",
            tier=Priority.EMERGENCY,
            plain_message=f"Critical vital sign: {', '.join(parts)}.",
            observed_value=", ".join(parts),
        ))

    # RF-E02: SEVERE_BREATHING_DIFFICULTY
    if "SEVERE_BREATHING_DIFFICULTY" in symptom_set:
        findings.append(Finding(
            rule_id="RF-E02",
            tier=Priority.EMERGENCY,
            plain_message="Severe breathing difficulty reported.",
            observed_value="SEVERE_BREATHING_DIFFICULTY",
        ))

    # RF-E03: avpu is P or U
    if inputs.avpu and inputs.avpu.strip().upper() in ("P", "U"):
        findings.append(Finding(
            rule_id="RF-E03",
            tier=Priority.EMERGENCY,
            plain_message=f"Altered consciousness or unresponsive (AVPU: {inputs.avpu.strip().upper()}).",
            observed_value=f"avpu={inputs.avpu.strip().upper()}",
        ))

    # RF-E04: SEIZURE_ONGOING
    if "SEIZURE_ONGOING" in symptom_set:
        findings.append(Finding(
            rule_id="RF-E04",
            tier=Priority.EMERGENCY,
            plain_message="Ongoing seizure reported.",
            observed_value="SEIZURE_ONGOING",
        ))

    # RF-E05: SEVERE_BLEEDING
    if "SEVERE_BLEEDING" in symptom_set:
        findings.append(Finding(
            rule_id="RF-E05",
            tier=Priority.EMERGENCY,
            plain_message="Severe or uncontrolled bleeding reported.",
            observed_value="SEVERE_BLEEDING",
        ))

    # RF-E06: STROKE_SIGNS
    if "STROKE_SIGNS" in symptom_set:
        findings.append(Finding(
            rule_id="RF-E06",
            tier=Priority.EMERGENCY,
            plain_message="Sudden stroke signs observed.",
            observed_value="STROKE_SIGNS",
        ))

    # RF-E07: SNAKEBITE_OR_POISONING
    if "SNAKEBITE_OR_POISONING" in symptom_set:
        findings.append(Finding(
            rule_id="RF-E07",
            tier=Priority.EMERGENCY,
            plain_message="Suspected snakebite or poisoning.",
            observed_value="SNAKEBITE_OR_POISONING",
        ))

    # RF-E08: PREGNANCY_HEAVY_BLEEDING or PREGNANCY_CONVULSION
    preg_emerg = [c for c in ("PREGNANCY_HEAVY_BLEEDING", "PREGNANCY_CONVULSION") if c in symptom_set]
    if preg_emerg:
        findings.append(Finding(
            rule_id="RF-E08",
            tier=Priority.EMERGENCY,
            plain_message="Obstetric emergency reported.",
            observed_value=", ".join(preg_emerg),
        ))

    # RF-E09: CHEST_PAIN and at least one abnormal vital (score >= 2 on SpO2, SBP, or pulse)
    spo2_score = news2.params.get("spo2") or 0
    sbp_score = news2.params.get("sbp") or 0
    pulse_score = news2.params.get("pulse") or 0
    has_abnormal_vital = (spo2_score >= 2) or (sbp_score >= 2) or (pulse_score >= 2)

    rf_e09_fired = False
    if "CHEST_PAIN" in symptom_set and has_abnormal_vital:
        rf_e09_fired = True
        abnormal_details = []
        if spo2_score >= 2 and inputs.spo2 is not None:
            abnormal_details.append(f"SpO2 {inputs.spo2}% (score {spo2_score})")
        if sbp_score >= 2 and inputs.sbp is not None:
            abnormal_details.append(f"SBP {inputs.sbp} mmHg (score {sbp_score})")
        if pulse_score >= 2 and inputs.pulse is not None:
            abnormal_details.append(f"Pulse {inputs.pulse} bpm (score {pulse_score})")

        findings.append(Finding(
            rule_id="RF-E09",
            tier=Priority.EMERGENCY,
            plain_message="Chest pain accompanied by abnormal vital signs.",
            observed_value=f"CHEST_PAIN with {', '.join(abnormal_details)}",
        ))

    # ----------------------------------------------------
    # 3.2 Urgent Rules
    # ----------------------------------------------------

    # NW-U01: news2_total 5-6
    if news2.total in (5, 6):
        findings.append(Finding(
            rule_id="NW-U01",
            tier=Priority.URGENT,
            plain_message=f"Medium NEWS2 aggregate score ({news2.total}).",
            observed_value=f"NEWS2={news2.total}",
        ))

    # NW-U02: Any single scored parameter equals 3
    single_param_3 = [k for k, v in news2.params.items() if v == 3]
    if single_param_3:
        findings.append(Finding(
            rule_id="NW-U02",
            tier=Priority.URGENT,
            plain_message=f"Single vital parameter in high-risk band: {', '.join(single_param_3)}.",
            observed_value=f"{', '.join(single_param_3)}=3",
        ))

    # RF-U01: CHEST_PAIN when RF-E09 did not fire
    if "CHEST_PAIN" in symptom_set and not rf_e09_fired:
        findings.append(Finding(
            rule_id="RF-U01",
            tier=Priority.URGENT,
            plain_message="Chest pain reported without critical vital abnormalities.",
            observed_value="CHEST_PAIN",
        ))

    # RF-U02: BREATHING_DIFFICULTY (not severe)
    if "BREATHING_DIFFICULTY" in symptom_set:
        findings.append(Finding(
            rule_id="RF-U02",
            tier=Priority.URGENT,
            plain_message="Breathing difficulty reported.",
            observed_value="BREATHING_DIFFICULTY",
        ))

    # RF-U03: VOMITING_DIARRHOEA_DEHYDRATION
    if "VOMITING_DIARRHOEA_DEHYDRATION" in symptom_set:
        findings.append(Finding(
            rule_id="RF-U03",
            tier=Priority.URGENT,
            plain_message="Persistent vomiting or diarrhoea with dehydration signs.",
            observed_value="VOMITING_DIARRHOEA_DEHYDRATION",
        ))

    # RF-U04: FEVER with duration_days > 3
    if "FEVER" in symptom_set and inputs.duration_days is not None and inputs.duration_days > 3:
        findings.append(Finding(
            rule_id="RF-U04",
            tier=Priority.URGENT,
            plain_message=f"Prolonged fever lasting {inputs.duration_days} days.",
            observed_value=f"FEVER, duration={inputs.duration_days}d",
        ))

    # RF-U05: High-risk (any history code or age >= 65) AND (temp >= 38.1 or spo2 <= 95)
    is_high_risk = len(inputs.history_codes) > 0 or inputs.age >= 65
    temp_high = inputs.temp_c is not None and round(inputs.temp_c, 1) >= 38.1
    spo2_low = inputs.spo2 is not None and inputs.spo2 <= 95
    if is_high_risk and (temp_high or spo2_low):
        reasons = []
        if len(inputs.history_codes) > 0:
            reasons.append(f"history: {', '.join(inputs.history_codes)}")
        if inputs.age >= 65:
            reasons.append(f"age {inputs.age}")
        triggers = []
        if temp_high:
            triggers.append(f"temp {inputs.temp_c}°C")
        if spo2_low:
            triggers.append(f"SpO2 {inputs.spo2}%")
        findings.append(Finding(
            rule_id="RF-U05",
            tier=Priority.URGENT,
            plain_message=f"High-risk patient ({', '.join(reasons)}) with {', '.join(triggers)}.",
            observed_value=f"{'; '.join(reasons)} & {'; '.join(triggers)}",
        ))

    # FLOOR-01: age < 16
    if inputs.age < config.age_floor:
        findings.append(Finding(
            rule_id="FLOOR-01",
            tier=Priority.URGENT,
            plain_message="Outside this tool's adult scoring. Needs a clinician's judgement.",
            observed_value=f"Age {inputs.age} < {config.age_floor}",
        ))

    # FLOOR-02: pregnant = true
    if inputs.pregnant:
        findings.append(Finding(
            rule_id="FLOOR-02",
            tier=Priority.URGENT,
            plain_message="Outside this tool's adult scoring. Needs a clinician's judgement.",
            observed_value="pregnant=True",
        ))

    # ----------------------------------------------------
    # 3.3 Flags
    # ----------------------------------------------------
    flags: List[str] = []

    # INCOMPLETE: missing any of temp_c, sbp, dbp, spo2, pulse
    missing_critical: List[str] = []
    if inputs.temp_c is None:
        missing_critical.append("temp_c")
    if inputs.sbp is None:
        missing_critical.append("sbp")
    if inputs.dbp is None:
        missing_critical.append("dbp")
    if inputs.spo2 is None:
        missing_critical.append("spo2")
    if inputs.pulse is None:
        missing_critical.append("pulse")

    if missing_critical:
        flags.append(Flag.INCOMPLETE.value)

    # NEEDS_REVIEW: free_text non-empty or OTHER_TEXT in symptom_codes
    has_free_text = bool(inputs.free_text and inputs.free_text.strip())
    has_other_text = "OTHER_TEXT" in symptom_set
    if has_free_text or has_other_text:
        flags.append(Flag.NEEDS_REVIEW.value)

    # UNDERSTATED: rr, avpu missing, or oxygen status not stated
    understated_fields = []
    if inputs.rr is None:
        understated_fields.append("rr")
    if inputs.avpu is None:
        understated_fields.append("avpu")
    if inputs.on_oxygen is None:
        understated_fields.append("oxygen")

    if understated_fields:
        flags.append(Flag.UNDERSTATED.value)

    return findings, flags, missing_critical

