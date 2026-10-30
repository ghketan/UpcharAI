from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CreatePatientRequest(BaseModel):
    id: Optional[str] = None
    display_code: str = Field(..., min_length=1, max_length=50)
    age: int = Field(..., ge=0, le=120)
    sex: str = Field(..., pattern="^(M|F|OTHER)$")
    pregnant: bool = False


class PatientResponse(BaseModel):
    patient_id: str
    display_code: str
    age: int
    sex: str
    pregnant: bool
    arrived_at: str
    created_by_role: str


class CreateAssessmentRequest(BaseModel):
    id: Optional[str] = None
    symptom_codes: List[str] = Field(default_factory=list)
    free_text: Optional[str] = Field(default=None, max_length=300)
    duration_days: Optional[int] = None
    temp_c: Optional[float] = None
    sbp: Optional[int] = None
    dbp: Optional[int] = None
    spo2: Optional[int] = None
    pulse: Optional[int] = None
    rr: Optional[int] = None
    avpu: Optional[str] = None
    on_oxygen: Optional[bool] = None
    history_codes: List[str] = Field(default_factory=list)
    confirm_implausible: bool = False


class AssessmentFindingResponse(BaseModel):
    rule_id: str
    tier: str
    plain_message: str
    observed_value: str


class AssessmentResponse(BaseModel):
    assessment_id: str
    patient_id: str
    seq: int
    priority: str
    flags: List[str]
    missing: List[str]
    news2: Dict[str, Any]
    findings: List[AssessmentFindingResponse]
    state: str
    rule_set_version: str
    clinical_review_status: str
    suggested_action: str
    created_at: str
    role: str


class EscalateRequest(BaseModel):
    to_priority: str = Field(..., pattern="^(URGENT|EMERGENCY)$")
    reason: str = Field(..., min_length=5)


class FinaliseRequest(BaseModel):
    final_priority: str = Field(..., pattern="^(EMERGENCY|URGENT|ROUTINE)$")
    reason: Optional[str] = None


class ReferralRequest(BaseModel):
    assessment_id: str
    hospital_id: str


class QueueItemResponse(BaseModel):
    patient_id: str
    display_code: str
    effective_priority: str
    state: str
    flags: List[str]
    top_reason: str
    arrived_at: str
    wait_seconds: int
    latest_assessment_id: Optional[str] = None


class QueueResponse(BaseModel):
    generated_at: str
    items: List[QueueItemResponse]


class SyncStatusResponse(BaseModel):
    online: bool
    pending: int
    failed: int
    last_success_at: Optional[str] = None
    target_label: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    language: Optional[str] = "en"


class ChatResponse(BaseModel):
    reply: str
    escalated: bool
    language: str

