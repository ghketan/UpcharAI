from typing import Dict, Optional
from engine.models import AssessmentInputs, NEWS2Result
from engine.config import RuleConfig


def score_spo2(spo2: Optional[int]) -> Optional[int]:
    if spo2 is None:
        return None
    if spo2 <= 91:
        return 3
    if 92 <= spo2 <= 93:
        return 2
    if 94 <= spo2 <= 95:
        return 1
    return 0


def score_sbp(sbp: Optional[int]) -> Optional[int]:
    if sbp is None:
        return None
    if sbp <= 90:
        return 3
    if 91 <= sbp <= 100:
        return 2
    if 101 <= sbp <= 110:
        return 1
    if 111 <= sbp <= 219:
        return 0
    return 3  # >= 220


def score_pulse(pulse: Optional[int]) -> Optional[int]:
    if pulse is None:
        return None
    if pulse <= 40:
        return 3
    if 41 <= pulse <= 50:
        return 1
    if 51 <= pulse <= 90:
        return 0
    if 91 <= pulse <= 110:
        return 1
    if 111 <= pulse <= 130:
        return 2
    return 3  # >= 131


def score_temp(temp_c: Optional[float]) -> Optional[int]:
    if temp_c is None:
        return None
    t = round(temp_c, 1)
    if t <= 35.0:
        return 3
    if t <= 36.0:
        return 1
    if t <= 38.0:
        return 0
    if t <= 39.0:
        return 1
    return 2  # >= 39.1


def score_rr(rr: Optional[int]) -> Optional[int]:
    if rr is None:
        return None
    if rr <= 8:
        return 3
    if 9 <= rr <= 11:
        return 1
    if 12 <= rr <= 20:
        return 0
    if 21 <= rr <= 24:
        return 2
    return 3  # >= 25


def score_avpu(avpu: Optional[str]) -> Optional[int]:
    if avpu is None:
        return None
    val = avpu.strip().upper()
    if val == "A":
        return 0
    if val in ("C", "V", "P", "U"):
        return 3
    return None


def score_oxygen(on_oxygen: Optional[bool]) -> int:
    if on_oxygen is True:
        return 2
    # False or None treated as room air (0)
    return 0


def calculate_news2(inputs: AssessmentInputs, config: Optional[RuleConfig] = None) -> NEWS2Result:
    spo2_s = score_spo2(inputs.spo2)
    sbp_s = score_sbp(inputs.sbp)
    pulse_s = score_pulse(inputs.pulse)
    temp_s = score_temp(inputs.temp_c)
    rr_s = score_rr(inputs.rr)
    avpu_s = score_avpu(inputs.avpu)
    oxygen_s = score_oxygen(inputs.on_oxygen) if inputs.on_oxygen is not None else 0

    params: Dict[str, Optional[int]] = {
        "spo2": spo2_s,
        "sbp": sbp_s,
        "pulse": pulse_s,
        "temp": temp_s,
        "rr": rr_s,
        "avpu": avpu_s,
        "oxygen": score_oxygen(inputs.on_oxygen) if inputs.on_oxygen is not None else None,
    }

    # Sum only scored parameters
    total = 0
    params_scored = 0

    for k in ["spo2", "sbp", "pulse", "temp", "rr", "avpu"]:
        if params[k] is not None:
            total += params[k]
            params_scored += 1

    if inputs.on_oxygen is not None:
        total += oxygen_s
        params_scored += 1

    return NEWS2Result(
        total=total,
        params_scored=params_scored,
        params=params,
    )
