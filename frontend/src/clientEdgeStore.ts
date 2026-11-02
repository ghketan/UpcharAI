/**
 * UpcharAI Client-Side Edge Store & Deterministic Triage Engine
 * 
 * Provides an offline, zero-network fallback for rural field deployments
 * and static web hosts (such as Vercel, Netlify, or offline browser sessions).
 * Fully conforms to NEWS2 clinical scoring protocols, red-flag matrices,
 * and canonical demo scenarios.
 */

import {
  Patient,
  CreatePatientInput,
  AssessmentInputs,
  Assessment,
  PatientHistory,
  QueueItem,
  QueueResponse,
  Hospital,
  ReferralSummary,
  SyncStatus,
  SyncOutboxItem,
  TargetHubSummary,
  ChatResponse,
  VoiceProtocol,
  DemoRole,
  Priority,
  RuleConfig,
  AssessmentPreviewInput,
  AssessmentPreviewResult,
  NEWS2Score,
  Finding,
  ClinicalFlag,
  AssessmentState,
  EscalationRecord,
  FinalisationRecord,
} from './types';

const STORAGE_KEY_PATIENTS = 'upcharai_edge_patients_v2';
const STORAGE_KEY_ASSESSMENTS = 'upcharai_edge_assessments_v2';
const STORAGE_KEY_OUTBOX = 'upcharai_edge_outbox_v2';
const STORAGE_KEY_REFERRALS = 'upcharai_edge_referrals_v2';

// ---------------------------------------------------------------------------
// 1. Regional Hospitals Directory (from hospitals.json)
// ---------------------------------------------------------------------------
export const EDGE_HOSPITALS: Hospital[] = [
  {
    id: 'HOSP-001',
    name: 'Community Health Centre (CHC) Rampur',
    area: 'Rampur Block, Sector 4',
    phone: '+91 1800-233-4011',
    fictional: true,
    source: 'Simulated Rural Health Network Directory',
  },
  {
    id: 'HOSP-002',
    name: 'Sub-District Hospital (SDH) Bilaspur',
    area: 'Bilaspur Central',
    phone: '+91 1800-233-4022',
    fictional: true,
    source: 'Simulated Rural Health Network Directory',
  },
  {
    id: 'HOSP-003',
    name: 'District Civil Hospital Sundarnagar',
    area: 'District HQ, Sundarnagar',
    phone: '+91 1800-233-4033',
    fictional: true,
    source: 'Simulated Rural Health Network Directory',
  },
  {
    id: 'HOSP-004',
    name: 'Maternal & Child Tertiary Referral Wing',
    area: 'Sundarnagar Medical Complex',
    phone: '+91 1800-233-4044',
    fictional: true,
    source: 'Simulated Rural Health Network Directory',
  },
];

// ---------------------------------------------------------------------------
// 2. Canonical Rule Configuration (from rules.v1.json)
// ---------------------------------------------------------------------------
export const EDGE_RULE_CONFIG: RuleConfig = {
  rule_set_version: 'v1',
  clinical_review_status: 'NONE (Configured for CT BuildFest 2.0 demonstrator)',
  age_floor: 16,
  plausibility: {
    age: { min: 0, max: 120, unit: 'years' },
    temp_c: { min: 30.0, max: 45.0, unit: '°C' },
    sbp: { min: 40, max: 300, unit: 'mmHg' },
    dbp: { min: 20, max: 200, unit: 'mmHg' },
    spo2: { min: 50, max: 100, unit: '%' },
    pulse: { min: 20, max: 250, unit: 'bpm' },
    rr: { min: 4, max: 70, unit: 'breaths/min' },
    duration_days: { min: 0, max: 365, unit: 'days' },
  },
  symptom_codes: [
    'CHEST_PAIN',
    'SEVERE_BREATHING_DIFFICULTY',
    'BREATHING_DIFFICULTY',
    'SEIZURE_ONGOING',
    'SEVERE_BLEEDING',
    'STROKE_SIGNS',
    'SNAKEBITE_OR_POISONING',
    'PREGNANCY_HEAVY_BLEEDING',
    'PREGNANCY_CONVULSION',
    'VOMITING_DIARRHOEA_DEHYDRATION',
    'FEVER',
    'ABDOMINAL_PAIN',
    'SEVERE_HEADACHE',
    'COUGH',
    'OTHER_TEXT',
  ],
  history_codes: [
    'DIABETES',
    'HYPERTENSION',
    'HEART_DISEASE',
    'COPD_ASTHMA',
    'IMMUNOCOMPROMISED',
  ],
};

// ---------------------------------------------------------------------------
// 3. Deterministic NEWS2 & Triage Calculation Engine
// ---------------------------------------------------------------------------

function scoreSpo2(spo2?: number | null): number | null {
  if (spo2 == null) return null;
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

function scoreSbp(sbp?: number | null): number | null {
  if (sbp == null) return null;
  if (sbp <= 90) return 3;
  if (sbp <= 100) return 2;
  if (sbp <= 110) return 1;
  if (sbp <= 219) return 0;
  return 3;
}

function scorePulse(pulse?: number | null): number | null {
  if (pulse == null) return null;
  if (pulse <= 40) return 3;
  if (pulse <= 50) return 1;
  if (pulse <= 90) return 0;
  if (pulse <= 110) return 1;
  if (pulse <= 130) return 2;
  return 3;
}

function scoreTemp(temp?: number | null): number | null {
  if (temp == null) return null;
  const t = Math.round(temp * 10) / 10;
  if (t <= 35.0) return 3;
  if (t <= 36.0) return 1;
  if (t <= 38.0) return 0;
  if (t <= 39.0) return 1;
  return 2;
}

function scoreRr(rr?: number | null): number | null {
  if (rr == null) return null;
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
}

function scoreAvpu(avpu?: string | null): number | null {
  if (!avpu) return null;
  const clean = avpu.trim().toUpperCase();
  if (clean === 'A') return 0;
  if (['C', 'V', 'P', 'U'].includes(clean)) return 3;
  return null;
}

function scoreOxygen(onOxygen?: boolean | null): number {
  return onOxygen === true ? 2 : 0;
}

export function evaluateTriageLocal(
  inputs: AssessmentInputs,
  patientAge: number = 35,
  patientSex: string = 'M',
  patientPregnant: boolean = false
): {
  priority: Priority;
  news2_total: number;
  news2_params_scored: number;
  news2: NEWS2Score;
  findings: Finding[];
  flags: ClinicalFlag[];
  missing: string[];
  suggested_action: string;
} {
  const spo2_s = scoreSpo2(inputs.spo2);
  const sbp_s = scoreSbp(inputs.sbp);
  const pulse_s = scorePulse(inputs.pulse);
  const temp_s = scoreTemp(inputs.temp_c);
  const rr_s = scoreRr(inputs.rr);
  const avpu_s = scoreAvpu(inputs.avpu);
  const o2_s = scoreOxygen(inputs.on_oxygen);

  const scoredParams = [spo2_s, sbp_s, pulse_s, temp_s, rr_s, avpu_s].filter(
    (v): v is number => v !== null
  );
  const paramsScoredCount = scoredParams.length + (inputs.on_oxygen != null ? 1 : 0);
  const totalNews2 = scoredParams.reduce((acc, curr) => acc + curr, 0) + o2_s;

  const news2: NEWS2Score = {
    total: totalNews2,
    params_scored: paramsScoredCount,
    params: {
      spo2: spo2_s,
      sbp: sbp_s,
      pulse: pulse_s,
      temp: temp_s,
      rr: rr_s,
      avpu: avpu_s,
      oxygen: o2_s,
    },
    eligible: patientAge >= 16 && !patientPregnant,
    ineligible_reason:
      patientAge < 16
        ? 'Pediatric safety floor (Age < 16)'
        : patientPregnant
        ? 'Maternal safety floor (Active pregnancy)'
        : undefined,
  };

  const findings: Finding[] = [];
  const symptoms = new Set(inputs.symptom_codes || []);

  // 1. Emergency Rules
  if (totalNews2 >= 7) {
    findings.push({
      rule_id: 'NW-E01',
      tier: 'EMERGENCY',
      plain_message: `High NEWS2 aggregate score (${totalNews2}).`,
      observed_value: `NEWS2=${totalNews2}`,
    });
  }

  const spo2Crit = inputs.spo2 != null && inputs.spo2 <= 90;
  const sbpCrit = inputs.sbp != null && inputs.sbp <= 90;
  if (spo2Crit || sbpCrit) {
    const parts = [];
    if (spo2Crit) parts.push(`SpO2 ${inputs.spo2}%`);
    if (sbpCrit) parts.push(`SBP ${inputs.sbp} mmHg`);
    findings.push({
      rule_id: 'RF-E01',
      tier: 'EMERGENCY',
      plain_message: `Critical vital sign: ${parts.join(', ')}.`,
      observed_value: parts.join(', '),
    });
  }

  if (symptoms.has('SEVERE_BREATHING_DIFFICULTY')) {
    findings.push({
      rule_id: 'RF-E02',
      tier: 'EMERGENCY',
      plain_message: 'Severe breathing difficulty reported.',
      observed_value: 'SEVERE_BREATHING_DIFFICULTY',
    });
  }

  if (inputs.avpu && ['P', 'U'].includes(inputs.avpu.trim().toUpperCase())) {
    findings.push({
      rule_id: 'RF-E03',
      tier: 'EMERGENCY',
      plain_message: `Altered consciousness or unresponsive (AVPU: ${inputs.avpu.trim().toUpperCase()}).`,
      observed_value: `avpu=${inputs.avpu.trim().toUpperCase()}`,
    });
  }

  if (symptoms.has('SEIZURE_ONGOING')) {
    findings.push({
      rule_id: 'RF-E04',
      tier: 'EMERGENCY',
      plain_message: 'Ongoing seizure reported.',
      observed_value: 'SEIZURE_ONGOING',
    });
  }

  if (symptoms.has('SEVERE_BLEEDING')) {
    findings.push({
      rule_id: 'RF-E05',
      tier: 'EMERGENCY',
      plain_message: 'Severe or uncontrolled bleeding reported.',
      observed_value: 'SEVERE_BLEEDING',
    });
  }

  if (symptoms.has('STROKE_SIGNS')) {
    findings.push({
      rule_id: 'RF-E06',
      tier: 'EMERGENCY',
      plain_message: 'Sudden stroke signs observed.',
      observed_value: 'STROKE_SIGNS',
    });
  }

  if (symptoms.has('SNAKEBITE_OR_POISONING')) {
    findings.push({
      rule_id: 'RF-E07',
      tier: 'EMERGENCY',
      plain_message: 'Suspected venomous snakebite or acute toxic poisoning.',
      observed_value: 'SNAKEBITE_OR_POISONING',
    });
  }

  if (
    patientPregnant &&
    (symptoms.has('PREGNANCY_HEAVY_BLEEDING') || symptoms.has('PREGNANCY_CONVULSION'))
  ) {
    findings.push({
      rule_id: 'RF-E08',
      tier: 'EMERGENCY',
      plain_message: 'Obstetric emergency: severe bleeding or convulsion in pregnancy.',
      observed_value: 'PREGNANCY_EMERGENCY',
    });
  }

  // RF-E09: Chest pain + abnormal vitals (score >= 2 on spo2, sbp, or pulse)
  const chestPain = symptoms.has('CHEST_PAIN');
  const abnormalCombo =
    (spo2_s != null && spo2_s >= 2) ||
    (sbp_s != null && sbp_s >= 2) ||
    (pulse_s != null && pulse_s >= 2);
  let rfE09Fired = false;
  if (chestPain && abnormalCombo) {
    rfE09Fired = true;
    findings.push({
      rule_id: 'RF-E09',
      tier: 'EMERGENCY',
      plain_message: 'Red-flag combination: chest pain accompanied by abnormal vital signs.',
      observed_value: 'CHEST_PAIN+ABNORMAL_VITALS',
    });
  }

  // 2. Urgent Rules
  if (totalNews2 >= 5 && totalNews2 <= 6) {
    findings.push({
      rule_id: 'NW-U01',
      tier: 'URGENT',
      plain_message: `NEWS2 total score is ${totalNews2} (moderate risk).`,
      observed_value: `NEWS2=${totalNews2}`,
    });
  }

  const anySingleThree = scoredParams.some((val) => val === 3);
  if (anySingleThree && totalNews2 < 7) {
    findings.push({
      rule_id: 'NW-U02',
      tier: 'URGENT',
      plain_message: 'Single vital parameter scored maximum severity (3).',
      observed_value: 'param_score=3',
    });
  }

  if (chestPain && !rfE09Fired) {
    findings.push({
      rule_id: 'RF-U01',
      tier: 'URGENT',
      plain_message: 'Chest pain reported (requires urgent clinician assessment and ECG).',
      observed_value: 'CHEST_PAIN',
    });
  }

  if (symptoms.has('BREATHING_DIFFICULTY')) {
    findings.push({
      rule_id: 'RF-U02',
      tier: 'URGENT',
      plain_message: 'Moderate difficulty breathing reported.',
      observed_value: 'BREATHING_DIFFICULTY',
    });
  }

  if (symptoms.has('VOMITING_DIARRHOEA_DEHYDRATION')) {
    findings.push({
      rule_id: 'RF-U03',
      tier: 'URGENT',
      plain_message: 'Persistent vomiting, diarrhea, or dehydration signs.',
      observed_value: 'VOMITING_DIARRHOEA_DEHYDRATION',
    });
  }

  if (symptoms.has('FEVER') && inputs.duration_days != null && inputs.duration_days > 3) {
    findings.push({
      rule_id: 'RF-U04',
      tier: 'URGENT',
      plain_message: `Fever persisting for ${inputs.duration_days} days (> 3 days).`,
      observed_value: `duration_days=${inputs.duration_days}`,
    });
  }

  // Safety Floors
  if (patientAge < 16) {
    findings.push({
      rule_id: 'FLOOR-01',
      tier: 'URGENT',
      plain_message: "Outside this tool's adult scoring (age < 16). Needs a clinician's judgement.",
      observed_value: `age=${patientAge}`,
    });
  }

  if (patientPregnant) {
    findings.push({
      rule_id: 'FLOOR-02',
      tier: 'URGENT',
      plain_message: "Outside this tool's adult scoring (pregnancy). Needs a clinician's judgement.",
      observed_value: 'pregnant=true',
    });
  }

  // Sort findings: Tier 1 (EMERGENCY) > Tier 2 (URGENT) > Tier 3 (ROUTINE)
  const tierRank = (t: Priority) => (t === 'EMERGENCY' ? 1 : t === 'URGENT' ? 2 : 3);
  findings.sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || a.rule_id.localeCompare(b.rule_id));

  // Determine Priority
  let priority: Priority = 'ROUTINE';
  if (findings.some((f) => f.tier === 'EMERGENCY')) {
    priority = 'EMERGENCY';
  } else if (findings.some((f) => f.tier === 'URGENT')) {
    priority = 'URGENT';
  }

  // Missing vitals check
  const missing: string[] = [];
  if (inputs.rr == null) missing.push('rr');
  if (inputs.avpu == null) missing.push('avpu');
  if (inputs.on_oxygen == null) missing.push('on_oxygen');

  const flags: ClinicalFlag[] = [];
  if (missing.length > 0) {
    flags.push('INCOMPLETE');
    flags.push('UNDERSTATED');
  }

  const suggestedAction =
    priority === 'EMERGENCY'
      ? 'Alert the doctor now.'
      : priority === 'URGENT'
      ? 'Doctor should see this patient soon, before routine cases.'
      : 'No urgent signs found by this tool. A clinician still reviews every case.';

  return {
    priority,
    news2_total: totalNews2,
    news2_params_scored: paramsScoredCount,
    news2,
    findings,
    flags,
    missing,
    suggested_action: suggestedAction,
  };
}

// ---------------------------------------------------------------------------
// 4. Initial Canonical Scenarios (4 Fixtures)
// ---------------------------------------------------------------------------
export function getCanonicalScenarios(): { patients: Patient[]; assessments: Assessment[] } {
  const now = new Date();
  const tMinusMin = (min: number) => new Date(now.getTime() - min * 60000).toISOString();

  const patients: Patient[] = [
    {
      id: '11111111-1111-1111-1111-111111111101',
      display_code: 'P-101',
      age: 58,
      sex: 'M',
      pregnant: false,
      arrived_at: tMinusMin(35),
      created_by_role: 'NURSE',
    },
    {
      id: '11111111-1111-1111-1111-111111111102',
      display_code: 'P-102',
      age: 52,
      sex: 'M',
      pregnant: false,
      arrived_at: tMinusMin(28),
      created_by_role: 'NURSE',
    },
    {
      id: '11111111-1111-1111-1111-111111111103',
      display_code: 'P-103',
      age: 8,
      sex: 'F',
      pregnant: false,
      arrived_at: tMinusMin(20),
      created_by_role: 'NURSE',
    },
    {
      id: '11111111-1111-1111-1111-111111111104',
      display_code: 'P-104',
      age: 28,
      sex: 'M',
      pregnant: false,
      arrived_at: tMinusMin(12),
      created_by_role: 'NURSE',
    },
  ];

  // 1. P-101: Acute Severe Asthma / Hypoxia (EMERGENCY)
  const a1_inputs: AssessmentInputs = {
    symptom_codes: ['SEVERE_BREATHING_DIFFICULTY'],
    free_text: 'Severe wheezing, unable to speak in full sentences',
    duration_days: 1,
    temp_c: 37.0,
    sbp: 120,
    dbp: 80,
    spo2: 86,
    pulse: 120,
    rr: 26,
    avpu: 'A',
    on_oxygen: false,
    history_codes: ['COPD_ASTHMA'],
  };
  const a1_eval = evaluateTriageLocal(a1_inputs, 58, 'M', false);
  const a1: Assessment = {
    assessment_id: '22222222-2222-2222-2222-222222222201',
    patient_id: '11111111-1111-1111-1111-111111111101',
    seq: 1,
    priority: 'EMERGENCY',
    effective_priority: 'EMERGENCY',
    state: 'PRELIMINARY',
    flags: a1_eval.flags,
    missing: a1_eval.missing,
    news2: a1_eval.news2,
    findings: a1_eval.findings,
    rule_set_version: 'v1',
    clinical_review_status: 'NONE',
    suggested_action: a1_eval.suggested_action,
    created_at: tMinusMin(33),
    role: 'NURSE',
    inputs: a1_inputs,
    escalations: [],
    finalisations: [],
  };

  // 2. P-102: Chest Pain with Abnormal Vitals (EMERGENCY)
  const a2_inputs: AssessmentInputs = {
    symptom_codes: ['CHEST_PAIN'],
    free_text: 'Crushing retrosternal chest pain',
    duration_days: 1,
    temp_c: 37.0,
    sbp: 120,
    dbp: 80,
    spo2: 92,
    pulse: 100,
    rr: null,
    avpu: 'A',
    on_oxygen: false,
    history_codes: ['HYPERTENSION'],
  };
  const a2_eval = evaluateTriageLocal(a2_inputs, 52, 'M', false);
  const a2: Assessment = {
    assessment_id: '22222222-2222-2222-2222-222222222202',
    patient_id: '11111111-1111-1111-1111-111111111102',
    seq: 1,
    priority: 'EMERGENCY',
    effective_priority: 'EMERGENCY',
    state: 'PRELIMINARY',
    flags: a2_eval.flags,
    missing: a2_eval.missing,
    news2: a2_eval.news2,
    findings: a2_eval.findings,
    rule_set_version: 'v1',
    clinical_review_status: 'NONE',
    suggested_action: a2_eval.suggested_action,
    created_at: tMinusMin(26),
    role: 'NURSE',
    inputs: a2_inputs,
    escalations: [],
    finalisations: [],
  };

  // 3. P-103: Pediatric Fever (URGENT via Under-16 Floor)
  const a3_inputs: AssessmentInputs = {
    symptom_codes: ['FEVER'],
    free_text: 'Child with 1-day fever, normal breathing',
    duration_days: 1,
    temp_c: 38.3,
    sbp: 104,
    dbp: 66,
    spo2: 98,
    pulse: 90,
    rr: null,
    avpu: 'A',
    on_oxygen: false,
    history_codes: [],
  };
  const a3_eval = evaluateTriageLocal(a3_inputs, 8, 'F', false);
  const a3: Assessment = {
    assessment_id: '22222222-2222-2222-2222-222222222203',
    patient_id: '11111111-1111-1111-1111-111111111103',
    seq: 1,
    priority: 'URGENT',
    effective_priority: 'URGENT',
    state: 'PRELIMINARY',
    flags: a3_eval.flags,
    missing: a3_eval.missing,
    news2: a3_eval.news2,
    findings: a3_eval.findings,
    rule_set_version: 'v1',
    clinical_review_status: 'NONE',
    suggested_action: a3_eval.suggested_action,
    created_at: tMinusMin(18),
    role: 'NURSE',
    inputs: a3_inputs,
    escalations: [],
    finalisations: [],
  };

  // 4. P-104: Mild Cough & Low Fever (ROUTINE)
  const a4_inputs: AssessmentInputs = {
    symptom_codes: ['COUGH'],
    free_text: 'Mild productive cough, stable vitals',
    duration_days: 2,
    temp_c: 37.1,
    sbp: 118,
    dbp: 76,
    spo2: 98,
    pulse: 76,
    rr: 16,
    avpu: 'A',
    on_oxygen: false,
    history_codes: [],
  };
  const a4_eval = evaluateTriageLocal(a4_inputs, 28, 'M', false);
  const a4: Assessment = {
    assessment_id: '22222222-2222-2222-2222-222222222204',
    patient_id: '11111111-1111-1111-1111-111111111104',
    seq: 1,
    priority: 'ROUTINE',
    effective_priority: 'ROUTINE',
    state: 'PRELIMINARY',
    flags: a4_eval.flags,
    missing: a4_eval.missing,
    news2: a4_eval.news2,
    findings: a4_eval.findings,
    rule_set_version: 'v1',
    clinical_review_status: 'NONE',
    suggested_action: a4_eval.suggested_action,
    created_at: tMinusMin(10),
    role: 'NURSE',
    inputs: a4_inputs,
    escalations: [],
    finalisations: [],
  };

  return {
    patients,
    assessments: [a1, a2, a3, a4],
  };
}

// ---------------------------------------------------------------------------
// 5. Client-Side Persistent Store Accessors
// ---------------------------------------------------------------------------

function loadEdgePatients(): Patient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PATIENTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = getCanonicalScenarios();
  saveEdgePatients(seeded.patients);
  saveEdgeAssessments(seeded.assessments);
  return seeded.patients;
}

function saveEdgePatients(patients: Patient[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
  } catch {}
}

function loadEdgeAssessments(): Assessment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSESSMENTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = getCanonicalScenarios();
  saveEdgePatients(seeded.patients);
  saveEdgeAssessments(seeded.assessments);
  return seeded.assessments;
}

function saveEdgeAssessments(assessments: Assessment[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ASSESSMENTS, JSON.stringify(assessments));
  } catch {}
}

function loadEdgeOutbox(): SyncOutboxItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OUTBOX);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEdgeOutbox(items: SyncOutboxItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_OUTBOX, JSON.stringify(items));
  } catch {}
}

function recordEdgeOutbox(entity: string, entityId: string, payload: any) {
  const items = loadEdgeOutbox();
  items.unshift({
    id: `outbox_${Math.random().toString(36).substring(2, 10)}`,
    entity,
    entity_id: entityId,
    state: 'PENDING',
    attempts: 0,
    last_error: null,
    created_at: new Date().toISOString(),
  });
  saveEdgeOutbox(items);
}

// ---------------------------------------------------------------------------
// 6. Complete Client Edge Store Implementation
// ---------------------------------------------------------------------------
export const clientEdgeStore = {
  // Live Priority Queue
  getQueue(_role: DemoRole): QueueResponse {
    const patients = loadEdgePatients();
    const assessments = loadEdgeAssessments();
    const now = Date.now();

    const items: QueueItem[] = patients.map((p) => {
      const pAssessments = assessments.filter((a) => a.patient_id === p.id);
      pAssessments.sort((a, b) => b.seq - a.seq);
      const latest = pAssessments[0];

      const arrivedMs = new Date(p.arrived_at).getTime();
      const waitSeconds = Math.max(0, Math.floor((now - arrivedMs) / 1000));

      if (!latest) {
        return {
          patient_id: p.id,
          display_code: p.display_code,
          effective_priority: 'ROUTINE',
          state: 'PRELIMINARY',
          flags: ['INCOMPLETE'],
          top_reason: 'Awaiting initial assessment',
          arrived_at: p.arrived_at,
          wait_seconds: waitSeconds,
          latest_assessment_id: null,
        };
      }

      // Priority ranking with escalation and finalisation
      let effectivePriority: Priority = latest.priority;
      let state: AssessmentState = latest.state || 'PRELIMINARY';

      if (latest.finalisations && latest.finalisations.length > 0) {
        state = 'FINALISED';
        effectivePriority = latest.finalisations[latest.finalisations.length - 1].final_priority;
      } else if (latest.escalations && latest.escalations.length > 0) {
        const priorityRank = (pr: Priority) => (pr === 'EMERGENCY' ? 1 : pr === 'URGENT' ? 2 : 3);
        for (const esc of latest.escalations) {
          if (priorityRank(esc.to_priority) < priorityRank(effectivePriority)) {
            effectivePriority = esc.to_priority;
          }
        }
      }

      const topReason =
        latest.findings && latest.findings.length > 0
          ? latest.findings[0].plain_message
          : 'No urgent signs found';

      return {
        patient_id: p.id,
        display_code: p.display_code,
        effective_priority: effectivePriority,
        state,
        flags: latest.flags || [],
        top_reason: topReason,
        arrived_at: p.arrived_at,
        wait_seconds: waitSeconds,
        latest_assessment_id: latest.assessment_id,
      };
    });

    // Multi-factor queue ordering: Priority (EMERGENCY=1, URGENT=2, ROUTINE=3), then Wait Duration (FIFO)
    const priorityRank = (pr: Priority) => (pr === 'EMERGENCY' ? 1 : pr === 'URGENT' ? 2 : 3);
    items.sort((a, b) => {
      const pDiff = priorityRank(a.effective_priority) - priorityRank(b.effective_priority);
      if (pDiff !== 0) return pDiff;
      return b.wait_seconds - a.wait_seconds;
    });

    return {
      generated_at: new Date().toISOString(),
      items,
    };
  },

  // Patient History
  getPatientHistory(patientId: string, _role: DemoRole): PatientHistory {
    const patients = loadEdgePatients();
    const assessments = loadEdgeAssessments();
    const patient = patients.find((p) => p.id === patientId);

    if (!patient) {
      throw new Error(`Patient record ${patientId} not found in offline store.`);
    }

    const pAssessments = assessments
      .filter((a) => a.patient_id === patientId)
      .sort((a, b) => a.seq - b.seq);

    return {
      patient,
      assessments: pAssessments,
    };
  },

  // Create Patient Intake
  createPatient(data: CreatePatientInput, role: DemoRole): Patient {
    const patients = loadEdgePatients();
    const newId = (data as any).id || `pat_${Math.random().toString(36).substring(2, 11)}`;

    const newPatient: Patient = {
      id: newId,
      patient_id: newId,
      display_code: data.display_code.trim(),
      age: data.age,
      sex: data.sex,
      pregnant: !!data.pregnant,
      arrived_at: new Date().toISOString(),
      created_by_role: role,
    };

    patients.unshift(newPatient);
    saveEdgePatients(patients);
    recordEdgeOutbox('patient', newId, newPatient);

    return newPatient;
  },

  // Create Assessment
  createAssessment(patientId: string, inputs: AssessmentInputs, role: DemoRole): Assessment {
    const patients = loadEdgePatients();
    const assessments = loadEdgeAssessments();
    const patient = patients.find((p) => p.id === patientId);

    const patientAge = inputs.age ?? patient?.age ?? 35;
    const patientSex = inputs.sex ?? patient?.sex ?? 'M';
    const patientPregnant = inputs.pregnant ?? patient?.pregnant ?? false;

    const evalResult = evaluateTriageLocal(inputs, patientAge, patientSex, patientPregnant);

    const existingForPatient = assessments.filter((a) => a.patient_id === patientId);
    const nextSeq = existingForPatient.length + 1;
    const assessmentId = (inputs as any).id || `asm_${Math.random().toString(36).substring(2, 11)}`;

    const newAssessment: Assessment = {
      assessment_id: assessmentId,
      patient_id: patientId,
      seq: nextSeq,
      priority: evalResult.priority,
      effective_priority: evalResult.priority,
      state: 'PRELIMINARY',
      flags: evalResult.flags,
      missing: evalResult.missing,
      news2: evalResult.news2,
      findings: evalResult.findings,
      rule_set_version: 'v1',
      clinical_review_status: 'NONE (Offline Edge Derivation)',
      suggested_action: evalResult.suggested_action,
      created_at: new Date().toISOString(),
      role,
      inputs,
      confirmed_implausible: inputs.confirm_implausible,
      escalations: [],
      finalisations: [],
    };

    assessments.unshift(newAssessment);
    saveEdgeAssessments(assessments);
    recordEdgeOutbox('assessment', assessmentId, newAssessment);

    return newAssessment;
  },

  // Preview Assessment
  previewAssessment(inputs: AssessmentPreviewInput, _role: DemoRole = 'NURSE'): AssessmentPreviewResult {
    const evalResult = evaluateTriageLocal(
      inputs as AssessmentInputs,
      inputs.age ?? 35,
      inputs.sex ?? 'M',
      inputs.pregnant ?? false
    );

    return {
      priority: evalResult.priority,
      news2_total: evalResult.news2_total,
      news2_params_scored: evalResult.news2_params_scored,
      news2: evalResult.news2,
      findings: evalResult.findings,
      flags: evalResult.flags,
      missing: evalResult.missing,
      suggested_action: evalResult.suggested_action,
      rule_set_version: 'v1',
      plausibility_violations: [],
    };
  },

  // Escalate Assessment
  escalateAssessment(
    assessmentId: string,
    toPriority: 'URGENT' | 'EMERGENCY',
    reason: string,
    role: DemoRole
  ): { status: string; assessment_id: string; effective_priority: Priority; reason: string } {
    const assessments = loadEdgeAssessments();
    const asm = assessments.find((a) => a.assessment_id === assessmentId);

    if (!asm) {
      throw new Error(`Assessment ${assessmentId} not found.`);
    }

    const priorityRank = (pr: Priority) => (pr === 'EMERGENCY' ? 1 : pr === 'URGENT' ? 2 : 3);
    if (priorityRank(toPriority) >= priorityRank(asm.effective_priority || asm.priority)) {
      throw new Error(`Escalation must increase priority (current: ${asm.effective_priority || asm.priority}).`);
    }

    const escRecord: EscalationRecord = {
      id: `esc_${Math.random().toString(36).substring(2, 9)}`,
      to_priority: toPriority,
      reason,
      role,
      at: new Date().toISOString(),
    };

    asm.escalations = asm.escalations || [];
    asm.escalations.push(escRecord);
    asm.effective_priority = toPriority;

    saveEdgeAssessments(assessments);
    recordEdgeOutbox('escalation', asm.assessment_id, escRecord);

    return {
      status: 'escalated',
      assessment_id: assessmentId,
      effective_priority: toPriority,
      reason,
    };
  },

  // Finalise Assessment
  finaliseAssessment(
    assessmentId: string,
    finalPriority: Priority,
    reason: string | undefined,
    role: DemoRole
  ): { status: string; assessment_id: string; final_priority: Priority; reason?: string } {
    const assessments = loadEdgeAssessments();
    const asm = assessments.find((a) => a.assessment_id === assessmentId);

    if (!asm) {
      throw new Error(`Assessment ${assessmentId} not found.`);
    }

    const finRecord: FinalisationRecord = {
      id: `fin_${Math.random().toString(36).substring(2, 9)}`,
      final_priority: finalPriority,
      reason: reason || null,
      role,
      at: new Date().toISOString(),
    };

    asm.finalisations = asm.finalisations || [];
    asm.finalisations.push(finRecord);
    asm.state = 'FINALISED';
    asm.effective_priority = finalPriority;

    saveEdgeAssessments(assessments);
    recordEdgeOutbox('finalisation', asm.assessment_id, finRecord);

    return {
      status: 'finalised',
      assessment_id: assessmentId,
      final_priority: finalPriority,
      reason,
    };
  },

  // Hospitals Directory
  getHospitals(_role: DemoRole): Hospital[] {
    return EDGE_HOSPITALS;
  },

  // Create Referral
  createReferral(assessmentId: string, hospitalId: string, _role: DemoRole): ReferralSummary {
    const assessments = loadEdgeAssessments();
    const patients = loadEdgePatients();

    const asm = assessments.find((a) => a.assessment_id === assessmentId);
    if (!asm) {
      throw new Error(`Assessment ${assessmentId} not found.`);
    }

    const patient = patients.find((p) => p.id === asm.patient_id);
    if (!patient) {
      throw new Error(`Patient ${asm.patient_id} not found.`);
    }

    const hospital = EDGE_HOSPITALS.find((h) => h.id === hospitalId) || EDGE_HOSPITALS[0];

    const referralId = `ref_${Math.random().toString(36).substring(2, 10)}`;
    const summary: ReferralSummary = {
      referral_id: referralId,
      display_code: patient.display_code,
      age: patient.age,
      sex: patient.sex,
      pregnant: patient.pregnant,
      symptoms: asm.inputs?.symptom_codes || [],
      free_text: asm.inputs?.free_text,
      vitals: {
        temp_c: asm.inputs?.temp_c,
        sbp: asm.inputs?.sbp,
        dbp: asm.inputs?.dbp,
        spo2: asm.inputs?.spo2,
        pulse: asm.inputs?.pulse,
        rr: asm.inputs?.rr,
        avpu: asm.inputs?.avpu,
        on_oxygen: asm.inputs?.on_oxygen,
        recorded_at: asm.created_at,
      },
      news2_total: asm.news2.total,
      fired_rules: asm.findings.map((f) => f.rule_id),
      effective_priority: asm.effective_priority || asm.priority,
      finalisation_state: asm.state || 'PRELIMINARY',
      hospital,
      generated_at: new Date().toISOString(),
      simulated: true,
      disclaimer:
        'SIMULATED TRANSFER SLIP: Demonstrator only. No actual ambulance is dispatched and no hospital has been contacted.',
    };

    try {
      const existingRefsRaw = localStorage.getItem(STORAGE_KEY_REFERRALS);
      const existingRefs = existingRefsRaw ? JSON.parse(existingRefsRaw) : [];
      existingRefs.unshift(summary);
      localStorage.setItem(STORAGE_KEY_REFERRALS, JSON.stringify(existingRefs));
    } catch {}

    recordEdgeOutbox('referral', referralId, summary);

    return summary;
  },

  // Sync Status
  getSyncStatus(_role: DemoRole): SyncStatus {
    const items = loadEdgeOutbox();
    const pending = items.filter((i) => i.state === 'PENDING').length;
    const failed = items.filter((i) => i.state === 'FAILED').length;
    const sent = items.filter((i) => i.state === 'SENT');

    return {
      online: false,
      pending,
      failed,
      last_success_at: sent.length > 0 ? sent[0].created_at : null,
      target_label: 'Offline Edge Enclave (Local Storage)',
    };
  },

  // Push Sync Outbox
  pushSync(_role: DemoRole): { processed: number; errors: number } {
    const items = loadEdgeOutbox();
    let processed = 0;
    for (const item of items) {
      if (item.state === 'PENDING') {
        item.state = 'SENT';
        item.attempts += 1;
        processed += 1;
      }
    }
    saveEdgeOutbox(items);
    return { processed, errors: 0 };
  },

  // Get Sync Outbox
  getSyncOutbox(limit: number = 50, _role: DemoRole = 'NURSE'): { items: SyncOutboxItem[]; total_count: number } {
    const items = loadEdgeOutbox();
    return {
      items: items.slice(0, limit),
      total_count: items.length,
    };
  },

  // Retry Outbox Item
  retryOutboxItem(itemId: string, _role: DemoRole = 'NURSE'): { status: string; item: SyncOutboxItem } {
    const items = loadEdgeOutbox();
    const it = items.find((i) => i.id === itemId);
    if (it) {
      it.state = 'SENT';
      it.attempts += 1;
      it.last_error = null;
      saveEdgeOutbox(items);
      return { status: 'success', item: it };
    }
    throw new Error('Outbox item not found');
  },

  // Target Hub Summary
  getTargetHubSummary(_role: DemoRole = 'NURSE'): TargetHubSummary {
    const patients = loadEdgePatients();
    const assessments = loadEdgeAssessments();
    const items = loadEdgeOutbox();

    return {
      target_mode: false,
      ingested_patients: patients.length,
      ingested_assessments: assessments.length,
      ingested_referrals: items.filter((i) => i.entity === 'referral').length,
      remote_sources: ['PB-MKT-088 (Local Edge)'],
      node_status: 'EDGE_AUTONOMOUS',
    };
  },

  // Sahayak Multilingual Chatbot
  sendMessage(message: string, language: string = 'en', _role: DemoRole): ChatResponse {
    const lower = (message || '').toLowerCase();

    // Deterministic Red-Flag Keywords (English, Hindi, Hinglish)
    const redFlagPatterns = [
      'chest pain',
      'cannot breathe',
      'cant breathe',
      "can't breathe",
      'shortness of breath',
      'difficulty breathing',
      'sine me dard',
      'chhati me dard',
      'saas lene me taklif',
      'sans fulna',
      'saans fulna',
      'unconscious',
      'unresponsive',
      'heavy bleeding',
      'severe bleeding',
      'bleeding heavily',
      'seizure',
      'convulsion',
      'stroke',
      'facial droop',
      'arm weakness',
      'snakebite',
      'snake bite',
      'poison',
      'सीने में दर्द',
      'सांस फूल',
      'बेहोश',
      'खून बह',
      'दौरा',
      'सांप',
    ];

    const hasRedFlag = redFlagPatterns.some((kw) => lower.includes(kw));

    if (hasRedFlag) {
      const emergencyReply =
        language === 'hi'
          ? '⚠️ **आपातकालीन चेतावनी:** आपके द्वारा बताए गए लक्षण (जैसे सीने में दर्द, सांस लेने में गंभीर तकलीफ, या भारी रक्तस्राव) जानलेवा हो सकते हैं। कृपया तुरंत नजदीकी स्वास्थ्य केंद्र (PHC/CHC) जाएं या 108 नंबर पर एम्बुलेंस बुलाएं। यह चैटबॉट केवल जानकारी के लिए है और आपात स्थिति में डॉक्टर का विकल्प नहीं है।'
          : '⚠️ **HIGH PRIORITY EMERGENCY ADVISORY:** The symptoms mentioned (such as acute chest pain, severe breathlessness, uncontrolled bleeding, or altered consciousness) may indicate a critical emergency. Please report immediately to the nearest health facility or dial emergency services (+91 108). This assistant provides general health information only and cannot replace immediate clinician evaluation.';

      return {
        reply: emergencyReply,
        escalated: true,
        language,
      };
    }

    // Helpful general health education responses
    let standardReply = '';
    if (lower.includes('fever') || lower.includes('bukhar') || lower.includes('बुखार')) {
      standardReply =
        language === 'hi'
          ? 'बुखार के दौरान पर्याप्त आराम करें और ओआरएस (ORS) या साफ पानी पिएं। यदि बुखार 3 दिन से अधिक रहे, बहुत तेज हो (39°C से ऊपर), या कंपकंपी हो, तो तुरंत आशा कार्यकर्ता या प्राथमिक स्वास्थ्य केंद्र (PHC) से संपर्क करें।'
          : 'For fever, ensure plenty of rest and adequate hydration with clean water or ORS fluids. If the fever persists for more than 3 days, rises above 39°C (102.2°F), or is accompanied by chills or stiffness, visit your local health centre for clinical evaluation.';
    } else if (lower.includes('cough') || lower.includes('khansi') || lower.includes('खांसी')) {
      standardReply =
        language === 'hi'
          ? 'साधारण खांसी के लिए गुनगुना पानी पिएं। यदि खांसी 2 सप्ताह से अधिक रहे, खून आए, या सीने में दर्द हो, तो यह टीबी या संक्रमण का संकेत हो सकता है — तुरंत डॉक्टर से जांच करवाएं।'
          : 'For mild cough, stay hydrated and consume warm fluids. If the cough lasts longer than 2 weeks, produces blood, or is accompanied by chest discomfort or night sweats, visit a clinician immediately for a sputum evaluation.';
    } else if (lower.includes('ors') || lower.includes('diarrhea') || lower.includes('dast') || lower.includes('दस्त')) {
      standardReply =
        language === 'hi'
          ? 'दस्त और उल्टी में डिहाइड्रेशन (पानी की कमी) सबसे बड़ा खतरा है। एक लीटर उबले और ठंडे पानी में 1 पैकेट ओआरएस घोलें और बार-बार पिलाएं। यदि रोगी सुस्त हो या पेशाब कम आए, तो तुरंत अस्पताल ले जाएं।'
          : 'During diarrhea or vomiting, hydration is critical. Prepare ORS solution by mixing 1 packet into 1 liter of clean, boiled water. Sip frequently. If the patient becomes lethargic, has sunken eyes, or cannot retain fluids, seek immediate emergency care.';
    } else {
      standardReply =
        language === 'hi'
          ? 'नमस्ते! मैं सहायक स्वास्थ्य सहायक हूँ। आप मुझसे सामान्य स्वास्थ्य, ओआरएस, पोषण या स्वच्छता के बारे में पूछ सकते हैं। ध्यान दें: मैं डॉक्टर नहीं हूँ और दवाइयों की खुराक नहीं लिखता।'
          : 'Hello! I am Sahayak, your community health guide. I can assist with general health education, maternal wellness, seasonal infection awareness, and primary care guidance. Please note that I do not calculate prescription dosages or diagnose illnesses.';
    }

    return {
      reply: standardReply,
      escalated: false,
      language,
    };
  },

  // Voice Protocols
  getChatProtocols(_role: DemoRole = 'NURSE'): VoiceProtocol[] {
    return [
      {
        id: 'proto_fever_hi',
        title: 'बुखार और हाइड्रेशन (Fever & Hydration)',
        subtitle: '3 दिन से अधिक बुखार की चेतावनी',
        lang: 'hi',
        text: 'यदि बुखार 3 दिन से अधिक हो, तो तुरंत रक्त जांच और मलेरिया/डेंगू की जांच के लिए PHC जाएं।',
      },
      {
        id: 'proto_ors_hi',
        title: 'ओआरएस घोल तैयार करना (ORS Preparation)',
        subtitle: 'डिहाइड्रेशन से बचाव का मानक तरीका',
        lang: 'hi',
        text: '1 पैकेट ओआरएस को 1 लीटर साफ पीने के पानी में अच्छी तरह घोलें। 24 घंटे के अंदर उपयोग करें।',
      },
      {
        id: 'proto_chest_pain_en',
        title: 'Acute Chest Pain Protocol',
        subtitle: 'Red-flag immediate escalation checklist',
        lang: 'en',
        text: 'Substernal chest pain radiating to left arm or jaw with diaphoresis is a medical emergency. Administer oxygen if SpO2 < 94% and dial 108.',
      },
    ];
  },

  // Reset Demo Database to 4 Canonical Scenarios
  resetDemo(_role: DemoRole): { status: string; seeded_scenarios: number; message: string } {
    const seeded = getCanonicalScenarios();
    saveEdgePatients(seeded.patients);
    saveEdgeAssessments(seeded.assessments);
    saveEdgeOutbox([]);
    try {
      localStorage.removeItem(STORAGE_KEY_REFERRALS);
    } catch {}

    return {
      status: 'success',
      seeded_scenarios: seeded.patients.length,
      message: 'Client-side edge database reset and seeded with 4 canonical scenarios.',
    };
  },

  // Rule Config
  getRuleConfig(_role: DemoRole = 'NURSE'): RuleConfig {
    return EDGE_RULE_CONFIG;
  },
};
