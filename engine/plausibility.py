from typing import List
from engine.models import AssessmentInputs
from engine.config import RuleConfig


class PlausibilityError(ValueError):
    def __init__(self, violations: List[str]):
        super().__init__(f"Implausible values detected: {'; '.join(violations)}")
        self.violations = violations


def check_plausibility(inputs: AssessmentInputs, config: RuleConfig) -> List[str]:
    violations: List[str] = []
    p = config.plausibility

    # Age
    age_bounds = p.get("age", {"min": 0, "max": 120})
    if inputs.age < age_bounds["min"] or inputs.age > age_bounds["max"]:
        violations.append(f"Age {inputs.age} is outside plausible range [{age_bounds['min']}, {age_bounds['max']}]")

    # Sex
    if inputs.sex not in ("M", "F", "OTHER"):
        violations.append(f"Sex '{inputs.sex}' is invalid; must be one of M, F, OTHER")

    # Temp
    if inputs.temp_c is not None:
        t_bounds = p.get("temp_c", {"min": 30.0, "max": 45.0})
        if inputs.temp_c < t_bounds["min"] or inputs.temp_c > t_bounds["max"]:
            violations.append(f"Temperature {inputs.temp_c}°C is outside plausible range [{t_bounds['min']}, {t_bounds['max']}]")

    # Systolic BP
    if inputs.sbp is not None:
        sbp_bounds = p.get("sbp", {"min": 40, "max": 300})
        if inputs.sbp < sbp_bounds["min"] or inputs.sbp > sbp_bounds["max"]:
            violations.append(f"Systolic BP {inputs.sbp} mmHg is outside plausible range [{sbp_bounds['min']}, {sbp_bounds['max']}]")

    # Diastolic BP
    if inputs.dbp is not None:
        dbp_bounds = p.get("dbp", {"min": 20, "max": 200})
        if inputs.dbp < dbp_bounds["min"] or inputs.dbp > dbp_bounds["max"]:
            violations.append(f"Diastolic BP {inputs.dbp} mmHg is outside plausible range [{dbp_bounds['min']}, {dbp_bounds['max']}]")

    # DBP must be strictly less than SBP if both are present
    if inputs.sbp is not None and inputs.dbp is not None:
        if inputs.dbp >= inputs.sbp:
            violations.append(f"Diastolic BP ({inputs.dbp}) must be strictly less than Systolic BP ({inputs.sbp})")

    # SpO2
    if inputs.spo2 is not None:
        spo2_bounds = p.get("spo2", {"min": 50, "max": 100})
        if inputs.spo2 < spo2_bounds["min"] or inputs.spo2 > spo2_bounds["max"]:
            violations.append(f"SpO2 {inputs.spo2}% is outside plausible range [{spo2_bounds['min']}, {spo2_bounds['max']}]")

    # Pulse
    if inputs.pulse is not None:
        pulse_bounds = p.get("pulse", {"min": 20, "max": 250})
        if inputs.pulse < pulse_bounds["min"] or inputs.pulse > pulse_bounds["max"]:
            violations.append(f"Pulse {inputs.pulse} bpm is outside plausible range [{pulse_bounds['min']}, {pulse_bounds['max']}]")

    # Respiratory rate
    if inputs.rr is not None:
        rr_bounds = p.get("rr", {"min": 4, "max": 70})
        if inputs.rr < rr_bounds["min"] or inputs.rr > rr_bounds["max"]:
            violations.append(f"Respiratory rate {inputs.rr} breaths/min is outside plausible range [{rr_bounds['min']}, {rr_bounds['max']}]")

    # AVPU alertness scale
    if inputs.avpu is not None:
        val = inputs.avpu.strip().upper()
        if val not in ("A", "C", "V", "P", "U"):
            violations.append(f"Alertness '{inputs.avpu}' is invalid; must be one of A, C, V, P, U")

    # Duration days
    if inputs.duration_days is not None:
        dur_bounds = p.get("duration_days", {"min": 0, "max": 365})
        if inputs.duration_days < dur_bounds["min"] or inputs.duration_days > dur_bounds["max"]:
            violations.append(f"Duration {inputs.duration_days} days is outside plausible range [{dur_bounds['min']}, {dur_bounds['max']}]")

    # Free text max length
    if inputs.free_text is not None:
        max_len = p.get("free_text_max_length", 300)
        if len(inputs.free_text) > max_len:
            violations.append(f"Free text exceeds maximum length of {max_len} characters")

    return violations
