export type DemoRole = 'NURSE' | 'DOCTOR';

export type Priority = 'EMERGENCY' | 'URGENT' | 'ROUTINE';

export type AssessmentState = 'PRELIMINARY' | 'FINALISED';

export type ClinicalFlag = 'INCOMPLETE' | 'NEEDS_REVIEW' | 'SCORE_MAY_BE_UNDERSTATED' | 'UNDERSTATED' | string;

export interface Patient {
  id: string;
  patient_id?: string;
  display_code: string;
  age: number;
  sex: 'M' | 'F' | 'OTHER';
  pregnant: boolean;
  arrived_at: string;
  created_by_role: string;
}

export interface CreatePatientInput {
  display_code: string;
  age: number;
  sex: 'M' | 'F' | 'OTHER';
  pregnant?: boolean;
}

export interface AssessmentInputs {
  age?: number;
  sex?: string;
  pregnant?: boolean;
  symptom_codes: string[];
  free_text?: string | null;
  duration_days?: number | null;
  temp_c?: number | null;
  sbp?: number | null;
  dbp?: number | null;
  spo2?: number | null;
  pulse?: number | null;
  rr?: number | null;
  avpu?: string | null;
  on_oxygen?: boolean | null;
  history_codes: string[];
  confirm_implausible?: boolean;
}

export interface Finding {
  rule_id: string;
  tier: Priority;
  plain_message: string;
  observed_value: string;
}

export interface EscalationRecord {
  id: string;
  to_priority: Priority;
  reason: string;
  role: string;
  at: string;
}

export interface FinalisationRecord {
  id: string;
  final_priority: Priority;
  reason?: string | null;
  role: string;
  at: string;
}

export interface NEWS2Score {
  total: number;
  params_scored: number;
  params: Record<string, number | null>;
  eligible: boolean;
  ineligible_reason?: string | null;
}

export interface Assessment {
  assessment_id: string;
  patient_id: string;
  seq: number;
  priority: Priority;
  effective_priority?: Priority;
  state?: AssessmentState;
  flags: ClinicalFlag[];
  missing: string[];
  news2: NEWS2Score;
  findings: Finding[];
  rule_set_version: string;
  clinical_review_status: string;
  suggested_action: string;
  created_at: string;
  role: string;
  inputs?: AssessmentInputs;
  confirmed_implausible?: boolean;
  escalations?: EscalationRecord[];
  finalisations?: FinalisationRecord[];
}

export interface PatientHistory {
  patient: Patient;
  assessments: Assessment[];
}

export interface QueueItem {
  patient_id: string;
  display_code: string;
  effective_priority: Priority;
  state: AssessmentState;
  flags: ClinicalFlag[];
  top_reason: string;
  arrived_at: string;
  wait_seconds: number;
  latest_assessment_id: string | null;
}

export interface QueueResponse {
  generated_at: string;
  items: QueueItem[];
}

export interface Hospital {
  id: string;
  name: string;
  phone: string;
  area: string;
  fictional: boolean;
  source: string;
}

export interface ReferralSummary {
  referral_id: string;
  display_code: string;
  age: number;
  sex: string;
  pregnant: boolean;
  symptoms: string[];
  free_text?: string | null;
  vitals: {
    temp_c?: number | null;
    sbp?: number | null;
    dbp?: number | null;
    spo2?: number | null;
    pulse?: number | null;
    rr?: number | null;
    avpu?: string | null;
    on_oxygen?: boolean | null;
    recorded_at: string;
  };
  news2_total: number;
  fired_rules: string[];
  effective_priority: Priority;
  finalisation_state: AssessmentState;
  hospital: Hospital;
  generated_at: string;
  simulated: boolean;
  disclaimer: string;
}

export interface SyncStatus {
  online: boolean;
  pending: number;
  failed: number;
  last_success_at: string | null;
  target_label: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  escalated?: boolean;
  language?: string;
}

export interface ChatResponse {
  reply: string;
  escalated: boolean;
  language: string;
}

export interface SyncOutboxItem {
  id: string;
  entity: string;
  entity_id: string;
  state: 'PENDING' | 'SENT' | 'FAILED';
  attempts: number;
  last_error: string | null;
  created_at: string;
}

export interface TargetHubSummary {
  target_mode: boolean;
  ingested_patients: number;
  ingested_assessments: number;
  ingested_referrals: number;
  remote_sources: string[];
  node_status: string;
}

export interface PlausibilityBound {
  min: number;
  max: number;
  unit?: string;
}

export interface RuleConfig {
  rule_set_version: string;
  clinical_review_status: string;
  age_floor: number;
  plausibility: Record<string, PlausibilityBound>;
  symptom_codes: string[];
  history_codes: string[];
}

export interface AssessmentPreviewInput {
  age?: number;
  sex?: string;
  pregnant?: boolean;
  symptom_codes?: string[];
  history_codes?: string[];
  free_text?: string | null;
  duration_days?: number | null;
  temp_c?: number | null;
  sbp?: number | null;
  dbp?: number | null;
  spo2?: number | null;
  pulse?: number | null;
  rr?: number | null;
  avpu?: string | null;
  on_oxygen?: boolean | null;
  confirm_implausible?: boolean;
}

export interface AssessmentPreviewResult {
  priority: Priority;
  news2_total: number;
  news2_params_scored: number;
  news2: NEWS2Score;
  findings: Finding[];
  flags: string[];
  missing: string[];
  suggested_action: string;
  rule_set_version: string;
  plausibility_violations: string[];
}

export interface VoiceProtocol {
  id: string;
  title: string;
  subtitle: string;
  lang: string;
  text: string;
}

// -------------------------------------------------------------------------
// Authentication & Access Control Types
// -------------------------------------------------------------------------

export type UserRole = 'auth' | 'user';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  full_name: string;
  allowed_views: string[];
  permissions: string[];
  created_at: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  password: string;
  role: UserRole;
  full_name?: string;
  email?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  expires_at: string;
  user: AuthUser;
}

export interface RoleInfo {
  role: string;
  name: string;
  description: string;
  allowed_views: string[];
  permissions: string[];
  can_access_triage: boolean;
  can_access_referrals: boolean;
  can_access_chatbot: boolean;
}
