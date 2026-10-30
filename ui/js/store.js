/**
 * UpcharAI Local-First Persistent Store
 * Conforms to SQLite schema invariants in 03-architecture-data-api.md
 */

import { evaluateTriage, sortQueueItems } from "./engine.js";
import { DEMO_SCENARIOS, HOSPITALS } from "./data.js";

const STORAGE_KEYS = {
  PATIENTS: "upchar_patients_v1",
  ASSESSMENTS: "upchar_assessments_v1",
  FINDINGS: "upchar_findings_v1",
  ESCALATIONS: "upchar_escalations_v1",
  FINALISATIONS: "upchar_finalisations_v1",
  REFERRALS: "upchar_referrals_v1",
  OUTBOX: "upchar_outbox_v1",
  CURRENT_ROLE: "upchar_role_v1",
  ONLINE_STATUS: "upchar_online_status_v1",
  LANGUAGE: "upchar_lang_v1"
};

function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getItem(key, fallback = []) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    console.warn("Storage read error:", e);
    return fallback;
  }
}

function setItem(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error("Storage write error:", e);
  }
}

export class UpcharStore {
  constructor() {
    this.listeners = new Set();
    this.initIfEmpty();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this);
    }
  }

  initIfEmpty() {
    const patients = getItem(STORAGE_KEYS.PATIENTS, []);
    if (!patients || patients.length === 0) {
      this.resetAndSeed();
    }
  }

  getRole() {
    return getItem(STORAGE_KEYS.CURRENT_ROLE, "NURSE");
  }

  setRole(role) {
    if (["NURSE", "DOCTOR"].includes(role)) {
      setItem(STORAGE_KEYS.CURRENT_ROLE, role);
      this.notify();
    }
  }

  getLanguage() {
    return getItem(STORAGE_KEYS.LANGUAGE, "en");
  }

  setLanguage(lang) {
    if (["en", "hi"].includes(lang)) {
      setItem(STORAGE_KEYS.LANGUAGE, lang);
      this.notify();
    }
  }

  isOnline() {
    return getItem(STORAGE_KEYS.ONLINE_STATUS, true);
  }

  setOnline(status) {
    setItem(STORAGE_KEYS.ONLINE_STATUS, Boolean(status));
    this.notify();
  }

  getPatients() {
    return getItem(STORAGE_KEYS.PATIENTS, []);
  }

  getAssessments() {
    return getItem(STORAGE_KEYS.ASSESSMENTS, []);
  }

  getEscalations() {
    return getItem(STORAGE_KEYS.ESCALATIONS, []);
  }

  getFinalisations() {
    return getItem(STORAGE_KEYS.FINALISATIONS, []);
  }

  getReferrals() {
    return getItem(STORAGE_KEYS.REFERRALS, []);
  }

  getOutbox() {
    return getItem(STORAGE_KEYS.OUTBOX, []);
  }

  /**
   * Register a new patient and run initial assessment
   */
  createPatientWithAssessment(patientData, assessmentInput, operatorRole = null) {
    const role = operatorRole || this.getRole();
    const patientId = generateUUID();
    const arrivedAt = new Date().toISOString();

    const patient = {
      id: patientId,
      display_code: patientData.display_code || `P-${Math.floor(1000 + Math.random() * 9000)}`,
      age: patientData.age,
      sex: patientData.sex || "OTHER",
      pregnant: Boolean(patientData.pregnant),
      history_codes: patientData.history_codes || [],
      arrived_at: arrivedAt,
      created_by_role: role
    };

    // Evaluate deterministic triage
    const triageResult = evaluateTriage({
      age: patient.age,
      sex: patient.sex,
      pregnant: patient.pregnant,
      history_codes: patient.history_codes,
      ...assessmentInput
    });

    const assessmentId = generateUUID();
    const assessment = {
      id: assessmentId,
      patient_id: patientId,
      seq: 1,
      inputs: {
        ...assessmentInput,
        age: patient.age,
        sex: patient.sex,
        pregnant: patient.pregnant,
        history_codes: patient.history_codes
      },
      confirmed_implausible: Boolean(assessmentInput.confirm_implausible),
      news2_total: triageResult.news2.total,
      news2_params: triageResult.news2.params,
      priority: triageResult.priority,
      effective_priority: triageResult.priority,
      state: "PRELIMINARY",
      flags: triageResult.flags,
      missing: triageResult.missing,
      findings: triageResult.findings,
      rule_set_version: triageResult.rule_set_version,
      clinical_review_status: triageResult.clinical_review_status,
      suggested_action: triageResult.suggested_action,
      suggested_action_hi: triageResult.suggested_action_hi,
      created_at: arrivedAt,
      role
    };

    // Append-only writes
    const patients = this.getPatients();
    patients.push(patient);
    setItem(STORAGE_KEYS.PATIENTS, patients);

    const assessments = this.getAssessments();
    assessments.push(assessment);
    setItem(STORAGE_KEYS.ASSESSMENTS, assessments);

    // Write to sync outbox
    this.addOutboxRecord("patient", patientId, patient);
    this.addOutboxRecord("assessment", assessmentId, assessment);

    this.notify();
    return { patient, assessment };
  }

  /**
   * Reassess an existing patient with new vitals/symptoms
   */
  reassessPatient(patientId, assessmentInput, operatorRole = null) {
    const role = operatorRole || this.getRole();
    const patient = this.getPatient(patientId);
    if (!patient) throw new Error("Patient not found");

    const patientAssessments = this.getAssessmentsForPatient(patientId);
    const nextSeq = patientAssessments.length + 1;
    const createdAt = new Date().toISOString();

    const triageResult = evaluateTriage({
      age: patient.age,
      sex: patient.sex,
      pregnant: patient.pregnant,
      history_codes: patient.history_codes,
      ...assessmentInput
    });

    const assessmentId = generateUUID();
    const assessment = {
      id: assessmentId,
      patient_id: patientId,
      seq: nextSeq,
      inputs: {
        ...assessmentInput,
        age: patient.age,
        sex: patient.sex,
        pregnant: patient.pregnant,
        history_codes: patient.history_codes
      },
      confirmed_implausible: Boolean(assessmentInput.confirm_implausible),
      news2_total: triageResult.news2.total,
      news2_params: triageResult.news2.params,
      priority: triageResult.priority,
      effective_priority: triageResult.priority,
      state: "PRELIMINARY", // Reassessment always resets to PRELIMINARY
      flags: triageResult.flags,
      missing: triageResult.missing,
      findings: triageResult.findings,
      rule_set_version: triageResult.rule_set_version,
      clinical_review_status: triageResult.clinical_review_status,
      suggested_action: triageResult.suggested_action,
      suggested_action_hi: triageResult.suggested_action_hi,
      created_at: createdAt,
      role
    };

    const assessments = this.getAssessments();
    assessments.push(assessment);
    setItem(STORAGE_KEYS.ASSESSMENTS, assessments);

    this.addOutboxRecord("assessment", assessmentId, assessment);
    this.notify();
    return assessment;
  }

  /**
   * Escalate Priority Upward (NURSE or DOCTOR)
   * Mandatory reason required (min 5 chars).
   * Cannot lower priority.
   */
  escalateAssessment(assessmentId, toPriority, reason, operatorRole = null) {
    const role = operatorRole || this.getRole();
    const assessment = this.getAssessment(assessmentId);
    if (!assessment) throw new Error("Assessment not found");

    const priorityRank = { "ROUTINE": 1, "URGENT": 2, "EMERGENCY": 3 };
    const currentRank = priorityRank[assessment.effective_priority] || 1;
    const targetRank = priorityRank[toPriority] || 1;

    if (targetRank <= currentRank) {
      throw new Error("Escalation must be to a higher priority level.");
    }
    if (!reason || reason.trim().length < 5) {
      throw new Error("A clinical reason of at least 5 characters is required for escalation.");
    }

    const escalation = {
      id: generateUUID(),
      assessment_id: assessmentId,
      to_priority: toPriority,
      reason: reason.trim(),
      role,
      at: new Date().toISOString()
    };

    const escalations = this.getEscalations();
    escalations.push(escalation);
    setItem(STORAGE_KEYS.ESCALATIONS, escalations);

    // Update effective priority on the latest assessment
    const assessments = this.getAssessments();
    const idx = assessments.findIndex(a => a.id === assessmentId);
    if (idx !== -1) {
      assessments[idx].effective_priority = toPriority;
      // Stays PRELIMINARY per 03 §5
      setItem(STORAGE_KEYS.ASSESSMENTS, assessments);
    }

    this.addOutboxRecord("escalation", escalation.id, escalation);
    this.notify();
    return escalation;
  }

  /**
   * Finalise Priority (DOCTOR only)
   * Can confirm, upgrade or downgrade.
   * Rationale required if changing effective priority.
   */
  finaliseAssessment(assessmentId, finalPriority, reason = "", operatorRole = null) {
    const role = operatorRole || this.getRole();
    if (role !== "DOCTOR") {
      throw new Error("Only a DOCTOR can finalise an assessment.");
    }

    const assessment = this.getAssessment(assessmentId);
    if (!assessment) throw new Error("Assessment not found");

    if (finalPriority !== assessment.effective_priority && (!reason || reason.trim().length < 5)) {
      throw new Error("A clinical justification is required when overriding the triage priority.");
    }

    const finalisation = {
      id: generateUUID(),
      assessment_id: assessmentId,
      final_priority: finalPriority,
      reason: reason.trim(),
      role,
      at: new Date().toISOString()
    };

    const finalisations = this.getFinalisations();
    finalisations.push(finalisation);
    setItem(STORAGE_KEYS.FINALISATIONS, finalisations);

    // Update latest assessment status to FINALISED
    const assessments = this.getAssessments();
    const idx = assessments.findIndex(a => a.id === assessmentId);
    if (idx !== -1) {
      assessments[idx].effective_priority = finalPriority;
      assessments[idx].state = "FINALISED";
      setItem(STORAGE_KEYS.ASSESSMENTS, assessments);
    }

    this.addOutboxRecord("finalisation", finalisation.id, finalisation);
    this.notify();
    return finalisation;
  }

  /**
   * Create referral packet
   */
  createReferral(assessmentId, hospitalId, customNotes = "") {
    const assessment = this.getAssessment(assessmentId);
    if (!assessment) throw new Error("Assessment not found");
    const patient = this.getPatient(assessment.patient_id);
    const hospital = HOSPITALS.find(h => h.id === hospitalId) || HOSPITALS[0];

    const referral = {
      id: generateUUID(),
      assessment_id: assessmentId,
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      patient_code: patient.display_code,
      summary_json: {
        display_code: patient.display_code,
        age: patient.age,
        sex: patient.sex,
        pregnant: patient.pregnant,
        vitals: assessment.inputs,
        news2_total: assessment.news2_total,
        fired_rules: assessment.findings.map(f => `${f.rule_id}: ${f.plain_message} (${f.observed_value})`),
        effective_priority: assessment.effective_priority,
        state: assessment.state,
        destination_hospital: hospital.name,
        hospital_phone: hospital.phone,
        custom_notes: customNotes,
        generated_at: new Date().toISOString(),
        disclaimer: "SIMULATED — not transmitted to anyone. No ambulance dispatched."
      },
      simulated: true,
      created_at: new Date().toISOString()
    };

    const referrals = this.getReferrals();
    referrals.push(referral);
    setItem(STORAGE_KEYS.REFERRALS, referrals);

    this.addOutboxRecord("referral", referral.id, referral);
    this.notify();
    return referral;
  }

  addOutboxRecord(entity, entityId, payload) {
    const outbox = this.getOutbox();
    outbox.push({
      id: generateUUID(),
      entity,
      entity_id: entityId,
      payload,
      state: "PENDING",
      attempts: 0,
      last_error: null,
      created_at: new Date().toISOString()
    });
    setItem(STORAGE_KEYS.OUTBOX, outbox);
  }

  /**
   * Trigger outbox sync push
   */
  async pushSync() {
    const outbox = this.getOutbox();
    const isOnline = this.isOnline();

    if (!isOnline) {
      return { success: false, message: "System is in offline mode. Sync paused." };
    }

    let syncedCount = 0;
    const updated = outbox.map(record => {
      if (record.state === "PENDING" || record.state === "FAILED") {
        syncedCount++;
        return {
          ...record,
          state: "SENT",
          attempts: (record.attempts || 0) + 1,
          sent_at: new Date().toISOString()
        };
      }
      return record;
    });

    setItem(STORAGE_KEYS.OUTBOX, updated);
    this.notify();
    return {
      success: true,
      syncedCount,
      lastSuccessAt: new Date().toISOString()
    };
  }

  getPatient(id) {
    return this.getPatients().find(p => p.id === id);
  }

  getAssessment(id) {
    return this.getAssessments().find(a => a.id === id);
  }

  getAssessmentsForPatient(patientId) {
    return this.getAssessments()
      .filter(a => a.patient_id === patientId)
      .sort((a, b) => a.seq - b.seq);
  }

  getLatestAssessmentForPatient(patientId) {
    const list = this.getAssessmentsForPatient(patientId);
    return list.length > 0 ? list[list.length - 1] : null;
  }

  /**
   * Get sorted Live Queue per 02 §5
   */
  getLiveQueue() {
    const patients = this.getPatients();
    const queueItems = [];

    for (const patient of patients) {
      const latest = this.getLatestAssessmentForPatient(patient.id);
      if (!latest) continue;

      const topFinding = latest.findings && latest.findings.length > 0 ? latest.findings[0] : null;
      const topReason = topFinding ? topFinding.plain_message : "Clinical triage assessment completed";
      const topReasonHi = topFinding ? (topFinding.plain_message_hi || topFinding.plain_message) : "नैदानिक ट्राइएज मूल्यांकन पूर्ण";

      const waitSeconds = Math.max(0, Math.floor((Date.now() - new Date(patient.arrived_at).getTime()) / 1000));

      queueItems.push({
        patient_id: patient.id,
        assessment_id: latest.id,
        display_code: patient.display_code,
        age: patient.age,
        sex: patient.sex,
        pregnant: patient.pregnant,
        effective_priority: latest.effective_priority,
        raw_priority: latest.priority,
        state: latest.state,
        flags: latest.flags,
        top_reason: topReason,
        top_reason_hi: topReasonHi,
        news2_total: latest.news2_total,
        arrived_at: patient.arrived_at,
        wait_seconds: waitSeconds
      });
    }

    return sortQueueItems(queueItems);
  }

  /**
   * Reset all tables and seed Scenarios 1–4 identically (REQ-011, REQ-020, T-015)
   */
  resetAndSeed() {
    localStorage.removeItem(STORAGE_KEYS.PATIENTS);
    localStorage.removeItem(STORAGE_KEYS.ASSESSMENTS);
    localStorage.removeItem(STORAGE_KEYS.FINDINGS);
    localStorage.removeItem(STORAGE_KEYS.ESCALATIONS);
    localStorage.removeItem(STORAGE_KEYS.FINALISATIONS);
    localStorage.removeItem(STORAGE_KEYS.REFERRALS);
    localStorage.removeItem(STORAGE_KEYS.OUTBOX);

    const now = Date.now();
    DEMO_SCENARIOS.forEach((scenario, index) => {
      // Stagger arrival times slightly
      const arrivalOffset = (DEMO_SCENARIOS.length - index) * 15 * 60 * 1000;
      const arrivedAt = new Date(now - arrivalOffset).toISOString();

      const patientId = generateUUID();
      const patient = {
        id: patientId,
        display_code: scenario.patient.display_code,
        age: scenario.patient.age,
        sex: scenario.patient.sex,
        pregnant: scenario.patient.pregnant,
        history_codes: scenario.patient.history_codes,
        arrived_at: arrivedAt,
        created_by_role: "NURSE"
      };

      const triageResult = evaluateTriage({
        age: patient.age,
        sex: patient.sex,
        pregnant: patient.pregnant,
        history_codes: patient.history_codes,
        ...scenario.assessment
      });

      const assessmentId = generateUUID();
      const assessment = {
        id: assessmentId,
        patient_id: patientId,
        seq: 1,
        inputs: {
          ...scenario.assessment,
          age: patient.age,
          sex: patient.sex,
          pregnant: patient.pregnant,
          history_codes: patient.history_codes
        },
        confirmed_implausible: false,
        news2_total: triageResult.news2.total,
        news2_params: triageResult.news2.params,
        priority: triageResult.priority,
        effective_priority: triageResult.priority,
        state: "PRELIMINARY",
        flags: triageResult.flags,
        missing: triageResult.missing,
        findings: triageResult.findings,
        rule_set_version: triageResult.rule_set_version,
        clinical_review_status: triageResult.clinical_review_status,
        suggested_action: triageResult.suggested_action,
        suggested_action_hi: triageResult.suggested_action_hi,
        created_at: arrivedAt,
        role: "NURSE"
      };

      const patients = getItem(STORAGE_KEYS.PATIENTS, []);
      patients.push(patient);
      setItem(STORAGE_KEYS.PATIENTS, patients);

      const assessments = getItem(STORAGE_KEYS.ASSESSMENTS, []);
      assessments.push(assessment);
      setItem(STORAGE_KEYS.ASSESSMENTS, assessments);
    });

    this.notify();
  }
}

export const store = new UpcharStore();
