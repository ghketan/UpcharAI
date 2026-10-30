from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class Priority(str, Enum):
    EMERGENCY = "EMERGENCY"
    URGENT = "URGENT"
    ROUTINE = "ROUTINE"


class Flag(str, Enum):
    INCOMPLETE = "INCOMPLETE"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    UNDERSTATED = "UNDERSTATED"


class Finding(BaseModel):
    rule_id: str
    tier: Priority
    plain_message: str
    observed_value: str


class NEWS2Result(BaseModel):
    total: int
    params_scored: int
    params: Dict[str, Optional[int]] = Field(default_factory=dict)


class AssessmentInputs(BaseModel):
    age: int
    sex: str
    pregnant: bool = False
    temp_c: Optional[float] = None
    sbp: Optional[int] = None
    dbp: Optional[int] = None
    spo2: Optional[int] = None
    pulse: Optional[int] = None
    rr: Optional[int] = None
    avpu: Optional[str] = None
    on_oxygen: Optional[bool] = None
    symptom_codes: List[str] = Field(default_factory=list)
    duration_days: Optional[int] = None
    history_codes: List[str] = Field(default_factory=list)
    free_text: Optional[str] = None
    confirm_implausible: bool = False


class TriageResult(BaseModel):
    priority: Priority
    flags: List[str] = Field(default_factory=list)
    missing: List[str] = Field(default_factory=list)
    news2: NEWS2Result
    findings: List[Finding] = Field(default_factory=list)
    suggested_action: str
    rule_set_version: str
    clinical_review_status: str

