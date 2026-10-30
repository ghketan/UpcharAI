/**
 * UpcharAI Frontend Application Controller
 * Connects store, pure engine, chatbot, oracle runner and DOM
 */

import { PLAUSIBILITY_BOUNDS, SYMPTOM_DEFINITIONS, HISTORY_DEFINITIONS, checkPlausibility } from "./engine.js";
import { DEMO_SCENARIOS, HOSPITALS, I18N } from "./data.js";
import { store } from "./store.js";
import { processChatMessage } from "./chatbot.js";
import { runOracleVerification } from "./oracle.js";

class UpcharApp {
  constructor() {
    this.currentTab = "triage";
    this.activePatientId = null;
    this.activeAssessmentId = null;
    this.selectedHospitalId = HOSPITALS[0].id;
    this.lastQueuePollTime = Date.now();
    this.staleThresholdMs = 6000; // > 6s = stale per REQ-007
    this.audioAlertsEnabled = false;

    this.pendingImplausibleSubmission = null;

    this.init();
  }

  init() {
    this.renderSymptomChips();
    this.renderHistoryChips();
    this.renderHospitalList();
    this.bindEvents();
    this.subscribeStore();

    // Start live queue polling (every 2s per 03 §4)
    setInterval(() => this.pollQueue(), 2000);

    // Initial render
    this.updateLanguageUI();
    this.renderLiveQueue();
    this.renderOutbox();

    // Auto-select first patient if available
    const queue = store.getLiveQueue();
    if (queue.length > 0) {
      this.selectPatient(queue[0].patient_id, queue[0].assessment_id);
    }
  }

  subscribeStore() {
    store.subscribe(() => {
      this.renderLiveQueue();
      this.renderOutbox();
      this.updateHeaderStats();
      if (this.activePatientId) {
        this.renderPatientDetail(this.activePatientId);
      }
    });
  }

  bindEvents() {
    // Navigation Tabs
    document.querySelectorAll(".nav-tab").forEach(tab => {
      tab.addEventListener("click", e => {
        const targetTab = tab.dataset.tab;
        this.switchTab(targetTab);
      });
    });

    // Role Switcher
    document.getElementById("roleNurseBtn").addEventListener("click", () => {
      store.setRole("NURSE");
      this.showToast("Switched role to NURSE / ASHA worker", "info");
      this.updateRoleUI();
    });

    document.getElementById("roleDoctorBtn").addEventListener("click", () => {
      store.setRole("DOCTOR");
      this.showToast("Switched role to DOCTOR (Clinician Mode)", "info");
      this.updateRoleUI();
    });

    // Language Toggle
    document.getElementById("langEnBtn").addEventListener("click", () => {
      store.setLanguage("en");
      this.updateLanguageUI();
    });

    document.getElementById("langHiBtn").addEventListener("click", () => {
      store.setLanguage("hi");
      this.updateLanguageUI();
    });

    // Network Status Indicator Toggle
    document.getElementById("networkToggle").addEventListener("click", () => {
      const isOnline = store.isOnline();
      store.setOnline(!isOnline);
      this.updateNetworkUI();
      const statusText = !isOnline ? "Online (Cloud & Sync Ready)" : "Offline (Local-First Operation)";
      this.showToast(`Network Status: ${statusText}`, !isOnline ? "success" : "warning");
    });

    // One-Click Demo Reset & Seed Button
    document.getElementById("resetSeedBtn").addEventListener("click", () => {
      if (confirm("Reset local database and seed Scenarios 1–4 identically?")) {
        store.resetAndSeed();
        this.showToast("Database reset & seeded with 4 canonical scenarios!", "success");
        const queue = store.getLiveQueue();
        if (queue.length > 0) {
          this.selectPatient(queue[0].patient_id, queue[0].assessment_id);
        }
      }
    });

    // Triage Form Submit
    document.getElementById("triageForm").addEventListener("submit", e => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // Quick Scenario Fillers
    document.querySelectorAll(".scenario-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const sId = chip.dataset.scenario;
        this.loadScenarioIntoForm(sId);
      });
    });

    // Clear Form Button
    document.getElementById("clearFormBtn").addEventListener("click", () => {
      this.clearForm();
      this.showToast("Form cleared", "info");
    });

    // Voice Dictation Simulation Button
    document.getElementById("voiceDictateBtn").addEventListener("click", () => {
      this.handleVoiceDictation();
    });

    // Modal Confirmation for Implausible Values
    document.getElementById("confirmImplausibleBtn").addEventListener("click", () => {
      if (this.pendingImplausibleSubmission) {
        this.closeModal("implausibleModal");
        this.executeTriageSubmission(this.pendingImplausibleSubmission, true);
        this.pendingImplausibleSubmission = null;
      }
    });

    document.getElementById("cancelImplausibleBtn").addEventListener("click", () => {
      this.pendingImplausibleSubmission = null;
      this.closeModal("implausibleModal");
    });

    // Escalate Priority Button
    document.getElementById("escalateSubmitBtn").addEventListener("click", () => {
      this.handleEscalation();
    });

    // Finalise Priority Button
    document.getElementById("finaliseSubmitBtn").addEventListener("click", () => {
      this.handleFinalisation();
    });

    // Reassess Patient Button
    document.getElementById("reassessBtn").addEventListener("click", () => {
      this.handleReassessTrigger();
    });

    // Outbox Sync Push Button
    document.getElementById("pushSyncBtn").addEventListener("click", async () => {
      const res = await store.pushSync();
      if (res.success) {
        this.showToast(`Sync complete! ${res.syncedCount} records sent.`, "success");
      } else {
        this.showToast(res.message, "warning");
      }
    });

    // Chatbot Input
    document.getElementById("chatSendBtn").addEventListener("click", () => {
      this.handleChatSend();
    });

    document.getElementById("chatInput").addEventListener("keydown", e => {
      if (e.key === "Enter") {
        this.handleChatSend();
      }
    });

    // Oracle Test Runner Button
    document.getElementById("runOracleBtn").addEventListener("click", () => {
      this.runOracleSuite();
    });

    // Copy Referral Summary
    document.getElementById("copyReferralBtn").addEventListener("click", () => {
      const text = document.getElementById("referralPreview").innerText;
      navigator.clipboard.writeText(text).then(() => {
        this.showToast("Referral summary copied to clipboard!", "success");
      });
    });

    // Audio Alert Toggle
    const audioBtn = document.getElementById("audioToggleBtn");
    if (audioBtn) {
      audioBtn.addEventListener("click", () => {
        this.audioAlertsEnabled = !this.audioAlertsEnabled;
        audioBtn.classList.toggle("active", this.audioAlertsEnabled);
        this.showToast(`Audio alerts ${this.audioAlertsEnabled ? "Enabled" : "Disabled"}`, "info");
      });
    }
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll(".nav-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.tab === tabId);
    });

    document.querySelectorAll(".tab-content-panel").forEach(panel => {
      panel.style.display = panel.id === `tab-${tabId}` ? "block" : "none";
    });

    if (tabId === "oracle") {
      this.runOracleSuite();
    }
  }

  updateRoleUI() {
    const role = store.getRole();
    document.getElementById("roleNurseBtn").classList.toggle("active", role === "NURSE");
    document.getElementById("roleDoctorBtn").classList.toggle("active", role === "DOCTOR");

    // Toggle clinician actions visibility in case detail
    const doctorControls = document.getElementById("doctorFinaliseControls");
    if (doctorControls) {
      doctorControls.style.display = role === "DOCTOR" ? "block" : "none";
    }

    const roleTag = document.getElementById("currentRoleIndicator");
    if (roleTag) {
      roleTag.innerText = role;
    }
  }

  updateNetworkUI() {
    const isOnline = store.isOnline();
    const indicator = document.getElementById("networkToggle");
    indicator.className = `network-indicator ${isOnline ? "online" : "offline"}`;
    document.getElementById("networkLabel").innerText = isOnline ? "Online (Sync Active)" : "Offline Mode";
  }

  updateLanguageUI() {
    const lang = store.getLanguage();
    const strings = I18N[lang] || I18N.en;

    document.getElementById("langEnBtn").classList.toggle("active", lang === "en");
    document.getElementById("langHiBtn").classList.toggle("active", lang === "hi");

    // Update static labels
    document.querySelectorAll("[data-i18n]").forEach(elem => {
      const key = elem.dataset.i18n;
      if (strings[key]) {
        elem.innerText = strings[key];
      }
    });

    this.renderSymptomChips();
    this.renderLiveQueue();
    this.renderHospitalList();
    if (this.activePatientId) {
      this.renderPatientDetail(this.activePatientId);
    }
  }

  renderSymptomChips() {
    const container = document.getElementById("symptomChipsContainer");
    if (!container) return;

    const lang = store.getLanguage();
    const currentSelected = this.getSelectedSymptoms();

    container.innerHTML = "";
    SYMPTOM_DEFINITIONS.forEach(def => {
      const chip = document.createElement("button");
      chip.type = "button";
      const isEmergencyCategory = ["cardio", "neuro", "trauma", "toxic", "maternal"].includes(def.category);
      chip.className = `chip-btn ${currentSelected.includes(def.code) ? "active" : ""} ${isEmergencyCategory ? "emergency-chip" : ""}`;
      chip.dataset.code = def.code;

      const label = lang === "hi" ? def.labelHi : def.labelEn;
      chip.innerHTML = `
        <span class="chip-icon">${currentSelected.includes(def.code) ? "✓" : "+"}</span>
        <span>${label}</span>
      `;

      chip.addEventListener("click", () => {
        chip.classList.toggle("active");
        const icon = chip.querySelector(".chip-icon");
        icon.innerText = chip.classList.contains("active") ? "✓" : "+";
      });

      container.appendChild(chip);
    });
  }

  renderHistoryChips() {
    const container = document.getElementById("historyChipsContainer");
    if (!container) return;

    const lang = store.getLanguage();
    container.innerHTML = "";

    HISTORY_DEFINITIONS.forEach(def => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip-btn";
      chip.dataset.code = def.code;

      const label = lang === "hi" ? def.labelHi : def.labelEn;
      chip.innerHTML = `
        <span class="chip-icon">+</span>
        <span>${label}</span>
      `;

      chip.addEventListener("click", () => {
        chip.classList.toggle("active");
        const icon = chip.querySelector(".chip-icon");
        icon.innerText = chip.classList.contains("active") ? "✓" : "+";
      });

      container.appendChild(chip);
    });
  }

  getSelectedSymptoms() {
    const active = [];
    document.querySelectorAll("#symptomChipsContainer .chip-btn.active").forEach(chip => {
      active.push(chip.dataset.code);
    });
    return active;
  }

  getSelectedHistory() {
    const active = [];
    document.querySelectorAll("#historyChipsContainer .chip-btn.active").forEach(chip => {
      active.push(chip.dataset.code);
    });
    return active;
  }

  loadScenarioIntoForm(scenarioId) {
    const scenario = DEMO_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;

    document.getElementById("patientAge").value = scenario.patient.age;
    document.getElementById("patientSex").value = scenario.patient.sex;
    document.getElementById("patientPregnant").value = scenario.patient.pregnant ? "true" : "false";

    const a = scenario.assessment;
    document.getElementById("vitalTemp").value = a.temp_c ?? "";
    document.getElementById("vitalSbp").value = a.sbp ?? "";
    document.getElementById("vitalDbp").value = a.dbp ?? "";
    document.getElementById("vitalSpo2").value = a.spo2 ?? "";
    document.getElementById("vitalPulse").value = a.pulse ?? "";
    document.getElementById("vitalRr").value = a.rr ?? "";
    document.getElementById("vitalAvpu").value = a.avpu ?? "";
    document.getElementById("vitalOxygen").value = a.on_oxygen ? "true" : "false";
    document.getElementById("vitalDuration").value = a.duration_days ?? "";
    document.getElementById("symptomFreeText").value = a.free_text ?? "";

    // Set active symptom chips
    document.querySelectorAll("#symptomChipsContainer .chip-btn").forEach(chip => {
      const code = chip.dataset.code;
      const isSelected = (a.symptom_codes || []).includes(code);
      chip.classList.toggle("active", isSelected);
      chip.querySelector(".chip-icon").innerText = isSelected ? "✓" : "+";
    });

    // Set active history chips
    document.querySelectorAll("#historyChipsContainer .chip-btn").forEach(chip => {
      const code = chip.dataset.code;
      const isSelected = (scenario.patient.history_codes || []).includes(code);
      chip.classList.toggle("active", isSelected);
      chip.querySelector(".chip-icon").innerText = isSelected ? "✓" : "+";
    });

    this.showToast(`Loaded ${scenario.title}`, "info");
  }

  clearForm() {
    document.getElementById("triageForm").reset();
    document.querySelectorAll(".chip-btn.active").forEach(chip => {
      chip.classList.remove("active");
      chip.querySelector(".chip-icon").innerText = "+";
    });
  }

  handleVoiceDictation() {
    const isOnline = store.isOnline();
    if (!isOnline) {
      this.showToast("Voice dictation is disabled in offline mode (online service required per REQ-021)", "warning");
      return;
    }

    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      this.showToast("Web Speech API not supported in this browser. Please type symptoms.", "warning");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = store.getLanguage() === "hi" ? "hi-IN" : "en-US";
    recognition.interimResults = false;

    this.showToast("Listening... Speak symptoms clearly into microphone.", "info");

    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      const freeTextInput = document.getElementById("symptomFreeText");
      freeTextInput.value = (freeTextInput.value ? freeTextInput.value + " " : "") + transcript;
      this.showToast(`Dictated: "${transcript}" (Requires confirmation before triage)`, "success");
    };

    recognition.onerror = err => {
      this.showToast(`Speech error: ${err.error}. Falling back to keyboard input.`, "warning");
    };

    try {
      recognition.start();
    } catch (e) {
      this.showToast("Speech service unavailable.", "warning");
    }
  }

  handleFormSubmit() {
    const age = document.getElementById("patientAge").value ? Number(document.getElementById("patientAge").value) : null;
    const sex = document.getElementById("patientSex").value;
    const pregnant = document.getElementById("patientPregnant").value === "true";

    const temp_c = document.getElementById("vitalTemp").value !== "" ? Number(document.getElementById("vitalTemp").value) : null;
    const sbp = document.getElementById("vitalSbp").value !== "" ? Number(document.getElementById("vitalSbp").value) : null;
    const dbp = document.getElementById("vitalDbp").value !== "" ? Number(document.getElementById("vitalDbp").value) : null;
    const spo2 = document.getElementById("vitalSpo2").value !== "" ? Number(document.getElementById("vitalSpo2").value) : null;
    const pulse = document.getElementById("vitalPulse").value !== "" ? Number(document.getElementById("vitalPulse").value) : null;
    const rr = document.getElementById("vitalRr").value !== "" ? Number(document.getElementById("vitalRr").value) : null;
    const avpu = document.getElementById("vitalAvpu").value || null;
    const onOxygenVal = document.getElementById("vitalOxygen").value;
    const on_oxygen = onOxygenVal === "" ? null : (onOxygenVal === "true");

    const duration_days = document.getElementById("vitalDuration").value !== "" ? Number(document.getElementById("vitalDuration").value) : 0;
    const free_text = document.getElementById("symptomFreeText").value;

    const symptom_codes = this.getSelectedSymptoms();
    const history_codes = this.getSelectedHistory();

    const payload = {
      patient: { age, sex, pregnant, history_codes },
      assessment: {
        temp_c, sbp, dbp, spo2, pulse, rr, avpu, on_oxygen,
        symptom_codes, duration_days, free_text
      }
    };

    // Plausibility Check (REQ-002, VM-04)
    const plausibility = checkPlausibility({
      age, temp_c, sbp, dbp, spo2, pulse, rr, duration_days
    });

    if (!plausibility.valid) {
      this.pendingImplausibleSubmission = payload;
      this.showPlausibilityModal(plausibility.implausible);
      return;
    }

    this.executeTriageSubmission(payload, false);
  }

  showPlausibilityModal(implausibleList) {
    const listContainer = document.getElementById("implausibleList");
    listContainer.innerHTML = implausibleList.map(item => `
      <div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 8px 12px; margin-bottom: 8px; border-radius: 4px;">
        <strong style="color: #fcd34d;">${item.label}:</strong> ${item.message}
      </div>
    `).join("");

    this.openModal("implausibleModal");
  }

  executeTriageSubmission(payload, confirmedImplausible = false) {
    payload.assessment.confirm_implausible = confirmedImplausible;

    const { patient, assessment } = store.createPatientWithAssessment(
      payload.patient,
      payload.assessment
    );

    this.activePatientId = patient.id;
    this.activeAssessmentId = assessment.id;

    this.renderResultCard(assessment, patient);
    this.renderPatientDetail(patient.id);

    // Audio cue for Emergency
    if (assessment.priority === "EMERGENCY") {
      this.triggerEmergencyCue();
    }

    this.showToast(`Assessment computed: [${assessment.priority}]`, assessment.priority === "EMERGENCY" ? "danger" : "success");
  }

  triggerEmergencyCue() {
    if (this.audioAlertsEnabled && typeof AudioContext !== "undefined") {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {
        // Audio context may be restricted
      }
    }
  }

  renderResultCard(assessment, patient) {
    const card = document.getElementById("activeResultCard");
    if (!card) return;

    const lang = store.getLanguage();
    const priority = assessment.effective_priority || assessment.priority;
    const isHindi = lang === "hi";

    const bannerClass = priority.toLowerCase();
    const priorityLabel = isHindi ?
      (priority === "EMERGENCY" ? "आपातकालीन (EMERGENCY)" : priority === "URGENT" ? "त्वरित (URGENT)" : "सामान्य (ROUTINE)") :
      priority;

    const suggestedAction = isHindi ?
      (assessment.suggested_action_hi || assessment.suggested_action) :
      assessment.suggested_action;

    // NEWS2 grid values
    const p = assessment.news2_params || {};
    const getScoreClass = score => {
      if (score === null || score === undefined) return "score-na";
      return `score-${score}`;
    };

    // Flags HTML
    const flagsHtml = (assessment.flags || []).map(f => {
      const cls = f.id.toLowerCase();
      return `<div class="flag-badge ${cls}">⚠️ ${f.label}</div>`;
    }).join("");

    // Fired Rules HTML
    const findingsHtml = (assessment.findings || []).map(f => {
      const msg = isHindi ? (f.plain_message_hi || f.plain_message) : f.plain_message;
      return `
        <div class="finding-item ${f.tier.toLowerCase()}">
          <span class="finding-rule-id">${f.rule_id}</span>
          <div class="finding-content">
            <div class="finding-message">${msg}</div>
            <div class="finding-observed">Trigger Value: ${f.observed_value}</div>
          </div>
        </div>
      `;
    }).join("");

    card.innerHTML = `
      <div class="priority-banner ${bannerClass}">
        <div class="priority-title-group">
          <h3>
            <span>${priority === "EMERGENCY" ? "🚨" : priority === "URGENT" ? "⚠️" : "✅"}</span>
            <span>[${priorityLabel}]</span>
          </h3>
          <p style="font-size: 0.82rem; margin-top: 4px; opacity: 0.9;">Patient: ${patient.display_code} (${patient.age}y / ${patient.sex})</p>
        </div>
        <div class="priority-state-tag">${assessment.state}</div>
      </div>

      <div class="suggested-action-box">
        <div class="action-label">${isHindi ? "अनुशंसित कार्रवाई (Suggested Action)" : "Suggested Action"}</div>
        <div class="action-text">${suggestedAction}</div>
      </div>

      <div class="news2-summary-card">
        <div class="news2-header">
          <h4>${isHindi ? "NEWS2 स्कोर विश्लेषण" : "NEWS2 Clinical Aggregate"}</h4>
          <span class="news2-total-badge">Total: ${assessment.news2_total}</span>
        </div>
        <div class="news2-params-grid">
          <div class="news2-param-pill">
            <span class="news2-param-name">SpO₂</span>
            <span class="news2-param-val">${assessment.inputs.spo2 ?? "—"}%</span>
            <span class="news2-param-score ${getScoreClass(p.spo2)}">${p.spo2 !== null && p.spo2 !== undefined ? `+${p.spo2}` : "N/A"}</span>
          </div>
          <div class="news2-param-pill">
            <span class="news2-param-name">SBP</span>
            <span class="news2-param-val">${assessment.inputs.sbp ?? "—"}</span>
            <span class="news2-param-score ${getScoreClass(p.sbp)}">${p.sbp !== null && p.sbp !== undefined ? `+${p.sbp}` : "N/A"}</span>
          </div>
          <div class="news2-param-pill">
            <span class="news2-param-name">Pulse</span>
            <span class="news2-param-val">${assessment.inputs.pulse ?? "—"}</span>
            <span class="news2-param-score ${getScoreClass(p.pulse)}">${p.pulse !== null && p.pulse !== undefined ? `+${p.pulse}` : "N/A"}</span>
          </div>
          <div class="news2-param-pill">
            <span class="news2-param-name">Temp</span>
            <span class="news2-param-val">${assessment.inputs.temp_c ?? "—"}°C</span>
            <span class="news2-param-score ${getScoreClass(p.temp_c)}">${p.temp_c !== null && p.temp_c !== undefined ? `+${p.temp_c}` : "N/A"}</span>
          </div>
        </div>
      </div>

      ${flagsHtml ? `<div class="flags-container">${flagsHtml}</div>` : ""}

      <div style="margin-bottom: 14px;">
        <h4 style="font-size: 0.85rem; font-weight: 700; color: #a5b4fc; margin-bottom: 8px;">
          ${isHindi ? "सक्रिय नैदानिक ट्रिगर (Explainable Findings)" : "Explainable Clinical Triggers"}
        </h4>
        <div class="findings-list">
          ${findingsHtml || '<p style="font-size: 0.85rem; color: var(--text-dim);">No specific emergency/urgent rule fired.</p>'}
        </div>
      </div>

      <div style="font-size: 0.74rem; color: var(--text-dim); border-top: 1px solid var(--border-subtle); padding-top: 10px; display: flex; justify-content: space-between;">
        <span>Rule Set: ${assessment.rule_set_version} · Status: ${assessment.clinical_review_status}</span>
        <span>Evaluated: ${new Date(assessment.created_at).toLocaleTimeString()}</span>
      </div>

      <div class="result-actions">
        <button type="button" class="btn-secondary" id="openDetailBtn">
          📄 View Full Case Detail
        </button>
        ${priority === "EMERGENCY" ? `
          <button type="button" class="btn-danger" id="openSosBtn">
            🚨 Open Emergency SOS & Referral
          </button>
        ` : ""}
      </div>
    `;

    document.getElementById("openDetailBtn")?.addEventListener("click", () => {
      this.switchTab("detail");
    });

    document.getElementById("openSosBtn")?.addEventListener("click", () => {
      this.switchTab("sos");
      this.prepareReferralSummary(assessment.id);
    });
  }

  pollQueue() {
    this.lastQueuePollTime = Date.now();
    this.renderLiveQueue();
  }

  renderLiveQueue() {
    const queue = store.getLiveQueue();
    const tbody = document.getElementById("queueTableBody");
    if (!tbody) return;

    // Check Stale State (REQ-007, UI-003: > 6s = stale)
    const timeSincePoll = Date.now() - this.lastQueuePollTime;
    const staleAlert = document.getElementById("staleQueueAlert");
    if (staleAlert) {
      staleAlert.style.display = timeSincePoll > this.staleThresholdMs ? "flex" : "none";
    }

    const lang = store.getLanguage();
    const isHindi = lang === "hi";

    tbody.innerHTML = "";
    if (queue.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Queue is currently empty. Register a patient above.</td></tr>`;
      return;
    }

    queue.forEach((item, index) => {
      const tr = document.createElement("tr");
      const priorityClass = item.effective_priority.toLowerCase();
      if (item.effective_priority === "EMERGENCY") {
        tr.className = "emergency-row";
      }

      const flagsHtml = (item.flags || []).map(f => {
        const id = typeof f === "string" ? f : f.id;
        return `<span style="font-size: 0.7rem; font-weight: 700; color: #f59e0b; margin-right: 4px;">[${id}]</span>`;
      }).join("");

      const reasonText = isHindi ? item.top_reason_hi : item.top_reason;

      const priorityLabel = isHindi ?
        (item.effective_priority === "EMERGENCY" ? "आपातकालीन" : item.effective_priority === "URGENT" ? "त्वरित" : "सामान्य") :
        item.effective_priority;

      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--text-dim);">${index + 1}</td>
        <td>
          <div class="patient-cell">
            <span class="patient-code">${item.display_code}</span>
            <span class="patient-demog">${item.age}y / ${item.sex} ${item.pregnant ? "· 🤰 Pregnant" : ""}</span>
          </div>
        </td>
        <td>
          <span class="priority-pill ${priorityClass}">
            <span>${item.effective_priority === "EMERGENCY" ? "🚨" : item.effective_priority === "URGENT" ? "⚠️" : "✅"}</span>
            <span>[${priorityLabel}]</span>
          </span>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 700; color: #c7d2fe;">${item.news2_total}</span>
        </td>
        <td>
          <div style="font-size: 0.85rem; max-width: 320px; line-height: 1.3;">
            ${flagsHtml}
            <span>${reasonText}</span>
          </div>
        </td>
        <td>
          <span class="priority-state-tag">${item.state}</span>
        </td>
        <td class="wait-cell">${item.wait_seconds}s</td>
        <td>
          <button type="button" class="btn-secondary" style="padding: 6px 12px; font-size: 0.78rem;" data-patient-id="${item.patient_id}" data-assessment-id="${item.assessment_id}">
            Review
          </button>
        </td>
      `;

      tr.querySelector("button").addEventListener("click", () => {
        this.selectPatient(item.patient_id, item.assessment_id);
        this.switchTab("detail");
      });

      tbody.appendChild(tr);
    });

    this.updateHeaderStats();
  }

  updateHeaderStats() {
    const queue = store.getLiveQueue();
    const emergency = queue.filter(q => q.effective_priority === "EMERGENCY").length;
    const urgent = queue.filter(q => q.effective_priority === "URGENT").length;
    const routine = queue.filter(q => q.effective_priority === "ROUTINE").length;

    document.getElementById("statTotalQueue").innerText = queue.length;
    document.getElementById("statEmergency").innerText = emergency;
    document.getElementById("statUrgent").innerText = urgent;
    document.getElementById("statRoutine").innerText = routine;

    const tabBadge = document.getElementById("queueTabBadge");
    if (tabBadge) {
      tabBadge.innerText = queue.length;
      tabBadge.classList.toggle("emergency", emergency > 0);
    }
  }

  selectPatient(patientId, assessmentId = null) {
    this.activePatientId = patientId;
    const patient = store.getPatient(patientId);
    if (!patient) return;

    const latest = assessmentId ? store.getAssessment(assessmentId) : store.getLatestAssessmentForPatient(patientId);
    if (latest) {
      this.activeAssessmentId = latest.id;
      this.renderResultCard(latest, patient);
    }
    this.renderPatientDetail(patientId);
  }

  renderPatientDetail(patientId) {
    const container = document.getElementById("patientDetailView");
    if (!container) return;

    const patient = store.getPatient(patientId);
    if (!patient) {
      container.innerHTML = `<p style="color: var(--text-muted);">Please select a patient from the queue.</p>`;
      return;
    }

    const assessments = store.getAssessmentsForPatient(patientId);
    const escalations = store.getEscalations();
    const finalisations = store.getFinalisations();
    const latest = assessments[assessments.length - 1];
    const role = store.getRole();

    let historyHtml = assessments.map(a => {
      const aEscalations = escalations.filter(e => e.assessment_id === a.id);
      const aFinalisations = finalisations.filter(f => f.assessment_id === a.id);

      return `
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-family: var(--font-mono); font-weight: 700; color: #a5b4fc;">Assessment #${a.seq} (${a.role})</span>
            <span class="priority-pill ${a.effective_priority.toLowerCase()}">[${a.effective_priority}] - ${a.state}</span>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 6px;">
            Vitals: SpO₂ ${a.inputs.spo2 ?? "—"}%, SBP/DBP ${a.inputs.sbp ?? "—"}/${a.inputs.dbp ?? "—"} mmHg, Pulse ${a.inputs.pulse ?? "—"} bpm, Temp ${a.inputs.temp_c ?? "—"}°C | NEWS2: ${a.news2_total}
          </div>
          ${a.findings.map(f => `<div style="font-size: 0.8rem; color: #cbd5e1;">• <strong>${f.rule_id}:</strong> ${f.plain_message}</div>`).join("")}
          ${aEscalations.map(e => `
            <div style="margin-top: 6px; padding: 6px 10px; background: rgba(244, 63, 94, 0.1); border-left: 3px solid var(--emergency); font-size: 0.78rem;">
              <strong>Escalated to ${e.to_priority} by ${e.role}:</strong> ${e.reason} (${new Date(e.at).toLocaleTimeString()})
            </div>
          `).join("")}
          ${aFinalisations.map(f => `
            <div style="margin-top: 6px; padding: 6px 10px; background: rgba(16, 185, 129, 0.1); border-left: 3px solid var(--routine); font-size: 0.78rem;">
              <strong>Finalised as ${f.final_priority} by DOCTOR:</strong> ${f.reason || "Confirmed priority"} (${new Date(f.at).toLocaleTimeString()})
            </div>
          `).join("")}
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div>
          <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--text-main);">
            Patient ${patient.display_code}
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            ${patient.age} years · ${patient.sex} ${patient.pregnant ? "· 🤰 Pregnant" : ""} · Arrived: ${new Date(patient.arrived_at).toLocaleTimeString()}
          </p>
        </div>
        <div>
          <span class="priority-pill ${latest.effective_priority.toLowerCase()}">[${latest.effective_priority}]</span>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="font-size: 0.9rem; font-weight: 700; color: #818cf8; margin-bottom: 10px;">Audit History & Reassessments</h4>
        ${historyHtml}
      </div>

      <!-- Clinician Action Panels -->
      <div style="background: rgba(18, 26, 43, 0.9); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 18px; margin-top: 20px;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>🩺</span> Clinician Actions (Current Role: <span style="color: #67e8f9;">${role}</span>)
        </h4>

        <!-- Escalate Upward (Nurse or Doctor) -->
        <div style="margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid var(--border-subtle);">
          <label style="font-size: 0.8rem; font-weight: 600; color: #fda4af; display: block; margin-bottom: 6px;">
            Escalate Priority Upward (NURSE / DOCTOR)
          </label>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <select id="escalateTargetPriority" class="form-select" style="max-width: 160px;">
              <option value="URGENT">URGENT</option>
              <option value="EMERGENCY">EMERGENCY</option>
            </select>
            <input type="text" id="escalateReasonInput" class="form-input" style="flex: 1; min-width: 200px;" placeholder="Clinical reason for escalation (min 5 characters)..." />
            <button type="button" class="btn-danger" id="escalateBtnAction">Escalate Upward</button>
          </div>
        </div>

        <!-- Doctor Finalise (Doctor Only) -->
        <div style="display: ${role === "DOCTOR" ? "block" : "none"}; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid var(--border-subtle);">
          <label style="font-size: 0.8rem; font-weight: 600; color: #6ee7b7; display: block; margin-bottom: 6px;">
            Doctor Finalise Case (DOCTOR Only per 01 §2)
          </label>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <select id="finaliseTargetPriority" class="form-select" style="max-width: 160px;">
              <option value="EMERGENCY" ${latest.effective_priority === "EMERGENCY" ? "selected" : ""}>EMERGENCY</option>
              <option value="URGENT" ${latest.effective_priority === "URGENT" ? "selected" : ""}>URGENT</option>
              <option value="ROUTINE" ${latest.effective_priority === "ROUTINE" ? "selected" : ""}>ROUTINE</option>
            </select>
            <input type="text" id="finaliseReasonInput" class="form-input" style="flex: 1; min-width: 200px;" placeholder="Clinical rationale (required if overriding priority)..." />
            <button type="button" class="btn-primary" id="finaliseBtnAction">Finalise Case</button>
          </div>
        </div>

        <!-- Reassessment Trigger -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.82rem; color: var(--text-muted);">Patient vitals changed? Add a new assessment sequence.</span>
          <button type="button" class="btn-secondary" id="triggerReassessBtn">
            🔄 New Assessment for this Patient
          </button>
        </div>
      </div>
    `;

    document.getElementById("escalateBtnAction")?.addEventListener("click", () => {
      const priority = document.getElementById("escalateTargetPriority").value;
      const reason = document.getElementById("escalateReasonInput").value;
      try {
        store.escalateAssessment(latest.id, priority, reason);
        this.showToast(`Case escalated to ${priority}`, "danger");
      } catch (e) {
        this.showToast(e.message, "warning");
      }
    });

    document.getElementById("finaliseBtnAction")?.addEventListener("click", () => {
      const priority = document.getElementById("finaliseTargetPriority").value;
      const reason = document.getElementById("finaliseReasonInput").value;
      try {
        store.finaliseAssessment(latest.id, priority, reason);
        this.showToast(`Case finalised as ${priority} by DOCTOR`, "success");
      } catch (e) {
        this.showToast(e.message, "warning");
      }
    });

    document.getElementById("triggerReassessBtn")?.addEventListener("click", () => {
      this.switchTab("triage");
      // Pre-fill patient demographics
      document.getElementById("patientAge").value = patient.age;
      document.getElementById("patientSex").value = patient.sex;
      document.getElementById("patientPregnant").value = patient.pregnant ? "true" : "false";
      this.showToast(`Enter updated vitals for patient ${patient.display_code}`, "info");
    });
  }

  renderHospitalList() {
    const container = document.getElementById("hospitalsListContainer");
    if (!container) return;

    const lang = store.getLanguage();
    container.innerHTML = "";

    HOSPITALS.forEach(h => {
      const card = document.createElement("div");
      card.className = `hospital-card ${this.selectedHospitalId === h.id ? "selected" : ""}`;
      const name = lang === "hi" ? h.nameHi : h.name;

      card.innerHTML = `
        <div class="hospital-header">
          <div class="hospital-name">${name}</div>
          <span class="hospital-distance">${h.distance_km} km</span>
        </div>
        <div class="hospital-details">
          <span>Level: ${h.level} · Area: ${h.area}</span>
          <span>Oxygen: ${h.oxygen_ready ? "Available ✅" : "No ❌"} · ICU: ${h.icu_available ? "Available ✅" : "No ❌"}</span>
          <a href="tel:${h.phone}" class="hospital-phone-link">📞 ${h.phone}</a>
        </div>
      `;

      card.addEventListener("click", () => {
        this.selectedHospitalId = h.id;
        document.querySelectorAll(".hospital-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        if (this.activeAssessmentId) {
          this.prepareReferralSummary(this.activeAssessmentId);
        }
      });

      container.appendChild(card);
    });
  }

  prepareReferralSummary(assessmentId) {
    const assessment = store.getAssessment(assessmentId);
    if (!assessment) return;
    const patient = store.getPatient(assessment.patient_id);
    const hospital = HOSPITALS.find(h => h.id === this.selectedHospitalId) || HOSPITALS[0];

    const ref = store.createReferral(assessmentId, hospital.id);
    const s = ref.summary_json;

    const preview = document.getElementById("referralPreview");
    if (preview) {
      preview.innerText = `
================================================================================
           UPCHARAI EMERGENCY REFERRAL PACKET (CTBF-AI-02)
   NOTICE: ${s.disclaimer}
================================================================================

PATIENT IDENTIFIER : ${s.display_code}
DEMOGRAPHICS       : Age: ${s.age} years | Sex: ${s.sex} | Pregnant: ${s.pregnant ? "YES" : "NO"}
CLINICAL STATUS    : Effective Priority: [${s.effective_priority}] (${s.state})
NEWS2 TOTAL SCORE  : ${s.news2_total}

RECORDED VITAL SIGNS:
• Temperature      : ${s.vitals.temp_c ?? "—"} °C
• Blood Pressure   : ${s.vitals.sbp ?? "—"} / ${s.vitals.dbp ?? "—"} mmHg
• Oxygen Saturation: ${s.vitals.spo2 ?? "—"} %
• Pulse Rate       : ${s.vitals.pulse ?? "—"} bpm
• Respiratory Rate : ${s.vitals.rr ?? "Not Recorded"} breaths/min
• Alertness (AVPU) : ${s.vitals.avpu ?? "Not Recorded"}

EXPLAINABLE CLINICAL TRIGGERS:
${s.fired_rules.map(r => `  - ${r}`).join("\n") || "  - Clinical assessment recorded"}

REFERRAL DESTINATION:
• Hospital         : ${s.destination_hospital}
• Contact          : ${s.hospital_phone}
• Packet Timestamp : ${s.generated_at}

SIGNATURE / CLINICIAN:
Assessing Health Worker: Rural PHC Duty Officer
Attending Doctor: _________________________________________
================================================================================
      `;
    }
  }

  renderOutbox() {
    const outbox = store.getOutbox();
    const tbody = document.getElementById("outboxTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (outbox.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 18px;">Outbox empty. All records stored locally.</td></tr>`;
      return;
    }

    outbox.slice(-15).reverse().forEach(item => {
      const tr = document.createElement("tr");
      const stateColor = item.state === "SENT" ? "#34d399" : item.state === "FAILED" ? "#f87171" : "#fbbf24";

      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-size: 0.78rem;">${item.entity}</td>
        <td style="font-family: var(--font-mono); font-size: 0.74rem; color: #94a3b8;">${item.entity_id.slice(0, 12)}...</td>
        <td><span style="font-weight: 700; color: ${stateColor}; font-size: 0.75rem;">[${item.state}]</span></td>
        <td style="font-size: 0.78rem; color: var(--text-muted);">${item.attempts || 0}</td>
        <td style="font-size: 0.74rem; color: var(--text-dim);">${new Date(item.created_at).toLocaleTimeString()}</td>
      `;
      tbody.appendChild(tr);
    });

    const pendingCount = outbox.filter(o => o.state === "PENDING").length;
    document.getElementById("pendingSyncCount").innerText = pendingCount;
  }

  handleChatSend() {
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    const messagesBox = document.getElementById("chatMessages");

    // Add user message bubble
    const userBubble = document.createElement("div");
    userBubble.className = "chat-bubble user";
    userBubble.innerText = text;
    messagesBox.appendChild(userBubble);

    // Process with chatbot engine
    const lang = store.getLanguage();
    const isOnline = store.isOnline();
    const response = processChatMessage(text, lang, isOnline);

    const botBubble = document.createElement("div");
    botBubble.className = `chat-bubble bot ${response.isRedFlag ? "red-flag" : ""}`;
    botBubble.innerHTML = response.text.replace(/\n/g, "<br>");
    messagesBox.appendChild(botBubble);

    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  runOracleSuite() {
    const suite = runOracleVerification();
    const container = document.getElementById("oracleResultsContainer");
    if (!container) return;

    document.getElementById("oraclePassedCount").innerText = `${suite.passed} / ${suite.total} PASSED`;
    document.getElementById("oracleDuration").innerText = `${suite.durationMs} ms`;

    container.innerHTML = "";
    suite.results.forEach(res => {
      const card = document.createElement("div");
      card.className = `oracle-case-card ${res.pass ? "pass" : "fail"}`;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: var(--text-main);">Case #${res.id}: ${res.pass ? "✅ PASS" : "❌ FAIL"}</strong>
          <span class="priority-pill ${res.actual.priority.toLowerCase()}">[${res.actual.priority}]</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${res.description}</div>
        <div style="font-family: var(--font-mono); font-size: 0.74rem; background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px;">
          <div>NEWS2 Expected: ${res.expected.news2} | Actual: ${res.actual.news2}</div>
          <div>Rules Expected: [${res.expected.rules.join(", ")}]</div>
          <div>Rules Fired: [${res.actual.rules.join(", ")}]</div>
          <div>Flags: [${res.actual.flags.join(", ")}]</div>
        </div>
      `;

      container.appendChild(card);
    });

    if (suite.allPassed) {
      this.showToast(`All 12 Oracle Tests Verified (100% Pass) in ${suite.durationMs}ms`, "success");
    } else {
      this.showToast(`Oracle suite: ${suite.failed} test(s) failed`, "danger");
    }
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("active");
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "✅" : type === "danger" ? "🚨" : type === "warning" ? "⚠️" : "ℹ️";
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Instantiate on DOM load
window.addEventListener("DOMContentLoaded", () => {
  window.upcharApp = new UpcharApp();
});
