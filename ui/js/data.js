/**
 * UpcharAI Seed Scenarios, Oracle Cases, Hospital Directory and i18n Data
 */

export const DEMO_SCENARIOS = [
  {
    id: "SCENARIO-1",
    title: "Scenario 1: Acute Severe Asthma / Hypoxia",
    titleHi: "परिदृश्य 1: गंभीर अस्थमा / हाइपोक्सिया (ऑक्सीजन कमी)",
    badge: "EMERGENCY",
    description: "42-year-old male with severe breathing difficulty and cyanosis. SpO₂ 86%, Pulse 120 bpm.",
    descriptionHi: "42 वर्षीय पुरुष, सांस लेने में अत्यधिक कठिनाई, SpO₂ 86%, नाड़ी 120 प्रति मिनट।",
    patient: {
      display_code: "P-8419",
      age: 42,
      sex: "M",
      pregnant: false,
      history_codes: ["COPD_ASTHMA"]
    },
    assessment: {
      symptom_codes: ["SEVERE_BREATHING_DIFFICULTY"],
      duration_days: 1,
      temp_c: 37.1,
      sbp: 125,
      dbp: 82,
      spo2: 86,
      pulse: 120,
      rr: 26,
      avpu: "A",
      on_oxygen: false,
      free_text: "Severe wheezing, unable to speak in full sentences"
    }
  },
  {
    id: "SCENARIO-2",
    title: "Scenario 2: Chest Pain with Abnormal Vitals (Red-Flag Combo)",
    titleHi: "परिदृश्य 2: असामान्य वाइटल्स के साथ सीने में दर्द (रेड-फ्लैग संयोजन)",
    badge: "EMERGENCY",
    description: "54-year-old female with radiating retrosternal chest pain, borderline SpO₂ 92%, tachycardic at 102 bpm.",
    descriptionHi: "54 वर्षीय महिला, सीने में तेज दर्द, SpO₂ 92%, नाड़ी 102 प्रति मिनट।",
    patient: {
      display_code: "P-9134",
      age: 54,
      sex: "F",
      pregnant: false,
      history_codes: ["HYPERTENSION", "DIABETES"]
    },
    assessment: {
      symptom_codes: ["CHEST_PAIN"],
      duration_days: 1,
      temp_c: 36.8,
      sbp: 138,
      dbp: 88,
      spo2: 92,
      pulse: 102,
      rr: 18,
      avpu: "A",
      on_oxygen: false,
      free_text: "Substernal crushing pain radiating to left shoulder"
    }
  },
  {
    id: "SCENARIO-3",
    title: "Scenario 3: Chronic Cough & Low Fever (Routine)",
    titleHi: "परिदृश्य 3: सामान्य खांसी व हल्का बुखार (रूटीन / सामान्य)",
    badge: "ROUTINE",
    description: "31-year-old male with 2 days of mild fever (37.9°C), productive cough, stable vital signs.",
    descriptionHi: "31 वर्षीय पुरुष, 2 दिन से हल्का बुखार (37.9°C), सामान्य खांसी, स्थिर वाइटल्स।",
    patient: {
      display_code: "P-4277",
      age: 31,
      sex: "M",
      pregnant: false,
      history_codes: []
    },
    assessment: {
      symptom_codes: ["FEVER", "COUGH"],
      duration_days: 2,
      temp_c: 37.9,
      sbp: 118,
      dbp: 76,
      spo2: 98,
      pulse: 78,
      rr: 16,
      avpu: "A",
      on_oxygen: false,
      free_text: ""
    }
  },
  {
    id: "SCENARIO-4",
    title: "Scenario 4: Pediatric Fever (Under-16 Floor Trigger)",
    titleHi: "परिदृश्य 4: बाल चिकित्सा बुखार (16 वर्ष से कम - फ्लोर नियम)",
    badge: "URGENT",
    description: "9-year-old child with acute fever. Normal vital ranges, but adult scoring triggers mandatory Urgent floor.",
    descriptionHi: "9 वर्षीय बच्चा, तीव्र बुखार। सामान्य वाइटल्स, लेकिन बाल चिकित्सा सुरक्षा नियम से त्वरित प्राथमिकता।",
    patient: {
      display_code: "P-6120",
      age: 9,
      sex: "F",
      pregnant: false,
      history_codes: []
    },
    assessment: {
      symptom_codes: ["FEVER"],
      duration_days: 1,
      temp_c: 38.3,
      sbp: 104,
      dbp: 66,
      spo2: 99,
      pulse: 92,
      rr: 20,
      avpu: "A",
      on_oxygen: false,
      free_text: "Pediatric assessment requested by parent"
    }
  }
];

export const ORACLE_TEST_CASES = [
  {
    id: 1,
    description: "SpO₂ 86, pulse 120, SEVERE_BREATHING_DIFFICULTY",
    input: {
      age: 40,
      sex: "M",
      pregnant: false,
      temp_c: 37.0,
      sbp: 120,
      dbp: 80,
      spo2: 86,
      pulse: 120,
      symptom_codes: ["SEVERE_BREATHING_DIFFICULTY"]
    },
    expectedNews2: 5,
    expectedPriority: "EMERGENCY",
    expectedRules: ["RF-E01", "RF-E02", "NW-U01", "NW-U02"],
    expectedFlags: ["UNDERSTATED"]
  },
  {
    id: 2,
    description: "CHEST_PAIN, SpO₂ 92, pulse 100 (age 50)",
    input: {
      age: 50,
      sex: "M",
      pregnant: false,
      temp_c: 37.0,
      sbp: 120,
      dbp: 80,
      spo2: 92,
      pulse: 100,
      symptom_codes: ["CHEST_PAIN"]
    },
    expectedNews2: 3,
    expectedPriority: "EMERGENCY",
    expectedRules: ["RF-E09"],
    expectedFlags: ["UNDERSTATED"]
  },
  {
    id: 3,
    description: "CHEST_PAIN, all vitals normal (age 50)",
    input: {
      age: 50,
      sex: "M",
      pregnant: false,
      temp_c: 37.0,
      sbp: 120,
      dbp: 80,
      spo2: 98,
      pulse: 80,
      symptom_codes: ["CHEST_PAIN"]
    },
    expectedNews2: 0,
    expectedPriority: "URGENT",
    expectedRules: ["RF-U01"],
    expectedFlags: ["UNDERSTATED"]
  },
  {
    id: 4,
    description: "FEVER 2 days, temp 38.2, age 30",
    input: {
      age: 30,
      sex: "M",
      pregnant: false,
      temp_c: 38.2,
      sbp: 120,
      dbp: 80,
      spo2: 98,
      pulse: 80,
      duration_days: 2,
      symptom_codes: ["FEVER"]
    },
    expectedNews2: 1,
    expectedPriority: "ROUTINE",
    expectedRules: [],
    expectedFlags: ["UNDERSTATED"]
  },
  {
    id: 5,
    description: "Same as 4 but SpO₂ not entered",
    input: {
      age: 30,
      sex: "M",
      pregnant: false,
      temp_c: 38.2,
      sbp: 120,
      dbp: 80,
      spo2: null,
      pulse: 80,
      duration_days: 2,
      symptom_codes: ["FEVER"]
    },
    expectedNews2: 1,
    expectedPriority: "ROUTINE",
    expectedRules: [],
    expectedFlags: ["INCOMPLETE", "UNDERSTATED"]
  },
  {
    id: 6,
    description: "Age 8, vitals normal",
    input: {
      age: 8,
      sex: "M",
      pregnant: false,
      temp_c: 37.0,
      sbp: 120,
      dbp: 80,
      spo2: 98,
      pulse: 80,
      symptom_codes: []
    },
    expectedNews2: 0,
    expectedPriority: "URGENT",
    expectedRules: ["FLOOR-01"],
    expectedFlags: ["UNDERSTATED"]
  },
  {
    id: 7,
    description: "SpO₂ 93, pulse 112, temp 39.2, SBP 105",
    input: {
      age: 40,
      sex: "M",
      pregnant: false,
      temp_c: 39.2,
      sbp: 105,
      dbp: 70,
      spo2: 93,
      pulse: 112,
      symptom_codes: []
    },
    expectedNews2: 7,
    expectedPriority: "EMERGENCY",
    expectedRules: ["NW-E01"],
    expectedFlags: ["UNDERSTATED"]
  },
  {
    id: 8,
    description: "SpO₂ 94, pulse 95, temp 38.5, SBP 108, rr 22",
    input: {
      age: 40,
      sex: "M",
      pregnant: false,
      temp_c: 38.5,
      sbp: 108,
      dbp: 72,
      spo2: 94,
      pulse: 95,
      rr: 22,
      symptom_codes: []
    },
    expectedNews2: 6,
    expectedPriority: "URGENT",
    expectedRules: ["NW-U01"],
    expectedFlags: ["UNDERSTATED"]
  },
  {
    id: 9,
    description: "Pulse 135, all else normal",
    input: {
      age: 40,
      sex: "M",
      pregnant: false,
      temp_c: 37.0,
      sbp: 120,
      dbp: 80,
      spo2: 98,
      pulse: 135,
      symptom_codes: []
    },
    expectedNews2: 3,
    expectedPriority: "URGENT",
    expectedRules: ["NW-U02"],
    expectedFlags: ["UNDERSTATED"]
  },
  {
    id: 10,
    description: "All vitals normal, free_text 'burning feet'",
    input: {
      age: 40,
      sex: "M",
      pregnant: false,
      temp_c: 37.0,
      sbp: 120,
      dbp: 80,
      spo2: 98,
      pulse: 80,
      symptom_codes: [],
      free_text: "burning feet"
    },
    expectedNews2: 0,
    expectedPriority: "ROUTINE",
    expectedRules: [],
    expectedFlags: ["NEEDS_REVIEW", "UNDERSTATED"]
  },
  {
    id: 11,
    description: "Female, pregnant, vitals normal",
    input: {
      age: 26,
      sex: "F",
      pregnant: true,
      temp_c: 37.0,
      sbp: 120,
      dbp: 80,
      spo2: 98,
      pulse: 80,
      symptom_codes: []
    },
    expectedNews2: 0,
    expectedPriority: "URGENT",
    expectedRules: ["FLOOR-02"],
    expectedFlags: ["UNDERSTATED"]
  },
  {
    id: 12,
    description: "avpu = U, all else normal",
    input: {
      age: 40,
      sex: "M",
      pregnant: false,
      temp_c: 37.0,
      sbp: 120,
      dbp: 80,
      spo2: 98,
      pulse: 80,
      avpu: "U",
      symptom_codes: []
    },
    expectedNews2: 3,
    expectedPriority: "EMERGENCY",
    expectedRules: ["RF-E03", "NW-U02"],
    expectedFlags: ["UNDERSTATED"]
  }
];

export const HOSPITALS = [
  {
    id: "HOSP-001",
    name: "Community Health Centre (CHC) Rampur",
    nameHi: "सामुदायिक स्वास्थ्य केंद्र (सीएचसी) रामपुर",
    area: "Rampur Block, Sector 4",
    level: "CHC",
    distance_km: 12,
    phone: "+91 1800-233-4011",
    emergency_open: true,
    icu_available: false,
    oxygen_ready: true,
    ambulance_contact: "+91 108",
    fictional: true,
    source: "Simulated Rural Health Network Directory"
  },
  {
    id: "HOSP-002",
    name: "Sub-District Hospital (SDH) Bilaspur",
    nameHi: "उप-जिला अस्पताल (एसडीएच) बिलासपुर",
    area: "Bilaspur Central",
    level: "SDH",
    distance_km: 28,
    phone: "+91 1800-233-4022",
    emergency_open: true,
    icu_available: true,
    oxygen_ready: true,
    ambulance_contact: "+91 108",
    fictional: true,
    source: "Simulated Rural Health Network Directory"
  },
  {
    id: "HOSP-003",
    name: "District Civil Hospital Sundarnagar",
    nameHi: "जिला नागरिक अस्पताल सुंदरनगर",
    area: "District HQ, Sundarnagar",
    level: "District Hospital",
    distance_km: 45,
    phone: "+91 1800-233-4033",
    emergency_open: true,
    icu_available: true,
    oxygen_ready: true,
    ambulance_contact: "+91 108",
    fictional: true,
    source: "Simulated Rural Health Network Directory"
  },
  {
    id: "HOSP-004",
    name: "Maternal & Child Tertiary Referral Wing",
    nameHi: "मातृ एवं शिशु तृतीयक रेफरल विंग",
    area: "Sundarnagar Medical Complex",
    level: "Tertiary Care",
    distance_km: 48,
    phone: "+91 1800-233-4044",
    emergency_open: true,
    icu_available: true,
    oxygen_ready: true,
    ambulance_contact: "+91 102",
    fictional: true,
    source: "Simulated Rural Health Network Directory"
  }
];

export const I18N = {
  en: {
    appTitle: "UpcharAI",
    appSubtitle: "AI Triage Assistant for Rural Health Centres",
    buildFestTag: "CT BuildFest 2.0 · CTBF-AI-02",
    syntheticBanner: "Synthetic Data Only — Do Not Enter Real Patient Details (Demo Mode)",
    assistDisclaimer: "Assists the clinician. A clinician makes every final medical decision.",
    routineSafeWarning: "Routine does not mean safe — a clinician reviews every case.",
    notClinicallyReviewed: "Rule Set v1 · Not clinically reviewed · Prototype only",
    
    // Roles
    roleNurse: "NURSE / ASHA",
    roleDoctor: "DOCTOR",
    roleNotice: "Demo role selector — not authentication",

    // Navigation
    tabTriage: "Triage Registration",
    tabQueue: "Live Priority Queue",
    tabPatientDetail: "Case Details & Review",
    tabEmergencySOS: "Emergency SOS / Referral",
    tabChatbot: "Rural Health Bot",
    tabSyncOutbox: "Offline Sync Outbox",
    tabOracleVerification: "Oracle Verification (12 Tests)",

    // Form
    patientId: "Display Code",
    age: "Age (years)",
    sex: "Sex",
    male: "Male",
    female: "Female",
    other: "Other",
    pregnant: "Pregnant",
    yes: "Yes",
    no: "No",
    vitalsSection: "Vital Signs Assessment",
    tempLabel: "Temperature (°C)",
    bpLabel: "Blood Pressure (SBP / DBP mmHg)",
    spo2Label: "SpO₂ Saturation (%)",
    pulseLabel: "Pulse Rate (bpm)",
    rrLabel: "Respiratory Rate (breaths/min, opt.)",
    avpuLabel: "Consciousness / AVPU (opt.)",
    oxygenLabel: "Supplemental Oxygen",
    symptomsSection: "Reported Symptoms",
    historySection: "Medical History",
    freeTextLabel: "Free-text Symptoms / Additional Notes",
    freeTextPlaceholder: "e.g., patient complains of burning sensation or sudden weakness...",
    durationDaysLabel: "Duration (Days)",
    calculateTriageBtn: "Run Explainable Triage",
    quickFillDemoBtn: "Load Demo Case",
    clearFormBtn: "Reset Form",
    voiceFillBtn: "Voice Dictation (Online Only)",

    // Triage Results
    priorityEmergency: "EMERGENCY",
    priorityUrgent: "URGENT",
    priorityRoutine: "ROUTINE",
    preliminaryTag: "PRELIMINARY — Awaiting Clinician",
    finalisedTag: "FINALISED BY DOCTOR",
    news2Breakdown: "NEWS2 Score Breakdown",
    firedRules: "Explainable Clinical Triggers",
    suggestedAction: "Suggested Immediate Action",
    flagsTitle: "Operational Flags & Warnings",

    // Clinician Actions
    escalatePriority: "Escalate Priority Upward",
    finalisePriority: "Doctor Finalise Case",
    escalateReasonRequired: "Mandatory clinical reason for escalation...",
    finaliseReason: "Clinical rationale (required if overriding priority)...",
    reassessPatient: "Reassess Patient with New Vitals",

    // Queue
    queueTitle: "Live Priority Queue",
    queueSubtitle: "Ordered by Clinical Urgency (EMERGENCY > URGENT > ROUTINE)",
    staleQueueAlert: "WARNING: Queue data is stale (> 6s since last refresh). Check local server.",
    totalInQueue: "Patients in Queue",
    emergencyCount: "Emergency",
    urgentCount: "Urgent",
    routineCount: "Routine",
    actions: "Actions",
    openCase: "Review Case",

    // SOS
    sosSimulatedBanner: "SIMULATED WORKFLOW — No ambulance dispatched, no hospital notified",
    sosTitle: "Emergency SOS & Referral Coordination",
    selectHospital: "Select Destination Hospital",
    referralSummary: "Referral Summary Packet",
    copySummaryBtn: "Copy Referral Summary",
    printSummaryBtn: "Print Referral Packet"
  },
  hi: {
    appTitle: "उपचार एआई (UpcharAI)",
    appSubtitle: "ग्रामीण स्वास्थ्य केंद्रों हेतु एआई ट्राइएज सहायक",
    buildFestTag: "CT बिल्डफेस्ट 2.0 · CTBF-AI-02",
    syntheticBanner: "केवल कृत्रिम (डेमो) डेटा — कृपया वास्तविक मरीज़ की जानकारी दर्ज न करें",
    assistDisclaimer: "यह प्रणाली स्वास्थ्य कार्यकर्ता की सहायता हेतु है। अंतिम निर्णय चिकित्सक का होता है।",
    routineSafeWarning: "सामान्य का अर्थ पूरी तरह सुरक्षित नहीं है — चिकित्सक हर मामले की समीक्षा करते हैं।",
    notClinicallyReviewed: "नियम संस्करण v1 · चिकित्सकीय रूप से समीक्षित नहीं · केवल प्रोटोटाइप",

    // Roles
    roleNurse: "नर्स / आशा कार्यकर्ता",
    roleDoctor: "चिकित्सक (डॉक्टर)",
    roleNotice: "डेमो भूमिका चयनकर्ता — वास्तविक प्रमाणीकरण नहीं",

    // Navigation
    tabTriage: "मरीज़ पंजीकरण व ट्राइएज",
    tabQueue: "लाइव प्राथमिकता कतार",
    tabPatientDetail: "केस विवरण व समीक्षा",
    tabEmergencySOS: "आपातकालीन SOS / रेफरल",
    tabChatbot: "स्वास्थ्य सहायता बॉट",
    tabSyncOutbox: "ऑफ़लाइन सिंक आउटबॉक्स",
    tabOracleVerification: "ऑरेकल सत्यापन (12 टेस्ट)",

    // Form
    patientId: "मरीज़ कोड",
    age: "उम्र (वर्ष)",
    sex: "लिंग",
    male: "पुरुष",
    female: "महिला",
    other: "अन्य",
    pregnant: "गर्भवती",
    yes: "हाँ",
    no: "नहीं",
    vitalsSection: "महत्वपूर्ण शारीरिक संकेत (वाइटल्स)",
    tempLabel: "शरीर का तापमान (°C)",
    bpLabel: "रक्तचाप (SBP / DBP mmHg)",
    spo2Label: "ऑक्सीजन स्तर SpO₂ (%)",
    pulseLabel: "नाड़ी की गति (Pulse bpm)",
    rrLabel: "श्वसन दर (RR breaths/min, ऐच्छिक)",
    avpuLabel: "चेतना स्तर / AVPU (ऐच्छिक)",
    oxygenLabel: "अतिरिक्त ऑक्सीजन पर",
    symptomsSection: "मरीज़ के मुख्य लक्षण",
    historySection: "पिछला चिकित्सीय इतिहास",
    freeTextLabel: "अन्य लक्षण व अतिरिक्त विवरण",
    freeTextPlaceholder: "उदा., मरीज़ को हाथ-पैर में जलन या अचानक कमजोरी महसूस हो रही है...",
    durationDaysLabel: "लक्षण की अवधि (दिन)",
    calculateTriageBtn: "स्पष्ट ट्राइएज मूल्यांकन करें",
    quickFillDemoBtn: "डेमो केस लोड करें",
    clearFormBtn: "फ़ॉर्म खाली करें",
    voiceFillBtn: "आवाज से विवरण भरें (केवल ऑनलाइन)",

    // Triage Results
    priorityEmergency: "आपातकालीन (EMERGENCY)",
    priorityUrgent: "त्वरित (URGENT)",
    priorityRoutine: "सामान्य (ROUTINE)",
    preliminaryTag: "प्रारंभिक — चिकित्सक समीक्षा प्रतीक्षित",
    finalisedTag: "चिकित्सक द्वारा अंतिम पुष्टि",
    news2Breakdown: "NEWS2 स्कोर विश्लेषण",
    firedRules: "सक्रिय नैदानिक ट्रिगर (कारण)",
    suggestedAction: "अनुशंसित तात्कालिक कार्रवाई",
    flagsTitle: "प्रणाली चेतावनी व फ़्लैग",

    // Clinician Actions
    escalatePriority: "प्राथमिकता स्तर बढ़ाएं",
    finalisePriority: "डॉक्टर द्वारा केस अंतिम करें",
    escalateReasonRequired: "प्राथमिकता बढ़ाने का अनिवार्य कारण...",
    finaliseReason: "चिकित्सकीय कारण (यदि प्राथमिकता बदली गई हो)...",
    reassessPatient: "नए वाइटल्स के साथ पुनः मूल्यांकन",

    // Queue
    queueTitle: "लाइव प्राथमिकता कतार",
    queueSubtitle: "गंभीरता के अनुसार क्रमबद्ध (आपातकालीन > त्वरित > सामान्य)",
    staleQueueAlert: "चेतावनी: कतार डेटा 6 सेकंड से अपडेट नहीं हुआ है।",
    totalInQueue: "कतार में कुल मरीज़",
    emergencyCount: "आपातकालीन",
    urgentCount: "त्वरित",
    routineCount: "सामान्य",
    actions: "कार्रवाई",
    openCase: "केस देखें",

    // SOS
    sosSimulatedBanner: "अनुकरणीय (सिम्युलेटेड) प्रक्रिया — कोई वास्तविक एम्बुलेंस या अस्पताल सूचित नहीं हुआ है",
    sosTitle: "आपातकालीन SOS व रेफरल समन्वय",
    selectHospital: "रेफरल अस्पताल चुनें",
    referralSummary: "रेफरल सारांश पत्र",
    copySummaryBtn: "रेफरल सारांश कॉपी करें",
    printSummaryBtn: "रेफरल पत्र प्रिंट करें"
  }
};
