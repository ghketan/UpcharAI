/**
 * UpcharAI Triage Rule Engine (Pure Function per 02-triage-rule-spec.md)
 * Revision: REV-001
 * Rule set version: v1
 * 
 * Invariants:
 * - Deterministic: same input + rule set always returns identical output.
 * - Non-short-circuiting: evaluates EVERY rule to collect all triggered findings.
 * - Pure: No I/O, no network calls.
 */

const RULE_SET_VERSION = "v1";
const CLINICAL_REVIEW_STATUS = "NONE"; // "NONE" | "REVIEWED"

export const PLAUSIBILITY_BOUNDS = {
  age: { min: 0, max: 120, label: "Age", unit: "years" },
  temp_c: { min: 30.0, max: 45.0, label: "Temperature", unit: "°C" },
  sbp: { min: 40, max: 300, label: "Systolic BP", unit: "mmHg" },
  dbp: { min: 20, max: 200, label: "Diastolic BP", unit: "mmHg" },
  spo2: { min: 50, max: 100, label: "SpO₂ Saturation", unit: "%" },
  pulse: { min: 20, max: 250, label: "Pulse Rate", unit: "bpm" },
  rr: { min: 4, max: 70, label: "Respiratory Rate", unit: "breaths/min" },
  duration_days: { min: 0, max: 365, label: "Symptom Duration", unit: "days" }
};

export const SYMPTOM_DEFINITIONS = [
  { code: "CHEST_PAIN", labelEn: "Chest Pain / Pressure", labelHi: "सीने में दर्द या भारीपन", category: "cardio" },
  { code: "SEVERE_BREATHING_DIFFICULTY", labelEn: "Severe Breathing Difficulty (Gasping)", labelHi: "सांस लेने में भारी तकलीफ (हांफना)", category: "respiratory" },
  { code: "BREATHING_DIFFICULTY", labelEn: "Mild/Moderate Breathing Difficulty", labelHi: "सांस लेने में हल्की/मध्यम तकलीफ", category: "respiratory" },
  { code: "SEIZURE_ONGOING", labelEn: "Active Seizure / Convulsions", labelHi: "दौरा / मिरगी का दौरा जारी", category: "neuro" },
  { code: "SEVERE_BLEEDING", labelEn: "Severe / Uncontrolled Bleeding", labelHi: "अत्यधिक / अनियंत्रित रक्तस्राव", category: "trauma" },
  { code: "STROKE_SIGNS", labelEn: "Stroke Signs (Face Droop, Arm Weakness, Slurred Speech)", labelHi: "स्ट्रोक के लक्षण (चेहरा झुकना, कमजोरी, आवाज लड़खड़ाना)", category: "neuro" },
  { code: "SNAKEBITE_OR_POISONING", labelEn: "Snakebite or Acute Poisoning", labelHi: "सांप का काटना या विषबाधा", category: "toxic" },
  { code: "PREGNANCY_HEAVY_BLEEDING", labelEn: "Heavy Bleeding in Pregnancy", labelHi: "गर्भावस्था में अत्यधिक रक्तस्राव", category: "maternal" },
  { code: "PREGNANCY_CONVULSION", labelEn: "Convulsions in Pregnancy (Eclampsia)", labelHi: "गर्भावस्था में दौरे (एक्लेम्पसिया)", category: "maternal" },
  { code: "VOMITING_DIARRHOEA_DEHYDRATION", labelEn: "Persistent Vomiting / Diarrhea / Dehydration", labelHi: "लगातार उल्टी / दस्त / निर्जलीकरण", category: "gi" },
  { code: "FEVER", labelEn: "Fever / Chills", labelHi: "बुखार / कंपकंपी", category: "general" },
  { code: "ABDOMINAL_PAIN", labelEn: "Severe Abdominal Pain", labelHi: "पेट में तेज दर्द", category: "gi" },
  { code: "SEVERE_HEADACHE", labelEn: "Sudden Severe Headache", labelHi: "अचानक तेज सिरदर्द", category: "neuro" },
  { code: "COUGH", labelEn: "Persistent Cough", labelHi: "लगातार खांसी", category: "respiratory" },
  { code: "OTHER_TEXT", labelEn: "Other Symptoms (See Free Text)", labelHi: "अन्य लक्षण (नीचे विवरण लिखें)", category: "other" }
];

export const HISTORY_DEFINITIONS = [
  { code: "DIABETES", labelEn: "Diabetes", labelHi: "मधुमेह (शुगर)" },
  { code: "HYPERTENSION", labelEn: "Hypertension (High BP)", labelHi: "उच्च रक्तचाप (हाई बीपी)" },
  { code: "HEART_DISEASE", labelEn: "Heart Disease", labelHi: "हृदय रोग" },
  { code: "COPD_ASTHMA", labelEn: "Asthma / COPD", labelHi: "दमा / सांस का रोग" },
  { code: "IMMUNOCOMPROMISED", labelEn: "Immunocompromised", labelHi: "कमजोर रोग प्रतिरोधक क्षमता" }
];

/**
 * Validates plausibility bounds.
 * Returns { valid: boolean, implausibleFields: [...] }
 */
export function checkPlausibility(data) {
  const implausible = [];

  for (const [key, bounds] of Object.entries(PLAUSIBILITY_BOUNDS)) {
    const val = data[key];
    if (val !== undefined && val !== null && val !== "" && !isNaN(val)) {
      const num = Number(val);
      if (num < bounds.min || num > bounds.max) {
        implausible.push({
          field: key,
          label: bounds.label,
          value: num,
          min: bounds.min,
          max: bounds.max,
          unit: bounds.unit,
          message: `${bounds.label} value ${num} ${bounds.unit} is outside plausible range (${bounds.min}–${bounds.max} ${bounds.unit})`
        });
      }
    }
  }

  // DBP must be less than SBP if both entered
  if (data.sbp !== null && data.sbp !== undefined && data.dbp !== null && data.dbp !== undefined) {
    const sbp = Number(data.sbp);
    const dbp = Number(data.dbp);
    if (!isNaN(sbp) && !isNaN(dbp) && dbp >= sbp) {
      implausible.push({
        field: "dbp",
        label: "Diastolic BP",
        value: dbp,
        message: `Diastolic BP (${dbp} mmHg) cannot be equal to or higher than Systolic BP (${sbp} mmHg)`
      });
    }
  }

  return {
    valid: implausible.length === 0,
    implausible
  };
}

/**
 * Calculates NEWS2 scores for available parameters.
 * Scale 1 (standard adult).
 */
export function calculateNews2(data) {
  const scores = {};
  let total = 0;
  let paramsScoredCount = 0;

  // 1. SpO2 %
  if (data.spo2 !== null && data.spo2 !== undefined && data.spo2 !== "" && !isNaN(data.spo2)) {
    const val = Number(data.spo2);
    let s = 0;
    if (val <= 91) s = 3;
    else if (val <= 93) s = 2;
    else if (val <= 95) s = 1;
    else s = 0;
    scores.spo2 = s;
    total += s;
    paramsScoredCount++;
  } else {
    scores.spo2 = null;
  }

  // 2. Systolic BP (mmHg)
  if (data.sbp !== null && data.sbp !== undefined && data.sbp !== "" && !isNaN(data.sbp)) {
    const val = Number(data.sbp);
    let s = 0;
    if (val <= 90) s = 3;
    else if (val <= 100) s = 2;
    else if (val <= 110) s = 1;
    else if (val <= 219) s = 0;
    else s = 3; // >= 220
    scores.sbp = s;
    total += s;
    paramsScoredCount++;
  } else {
    scores.sbp = null;
  }

  // 3. Pulse (bpm)
  if (data.pulse !== null && data.pulse !== undefined && data.pulse !== "" && !isNaN(data.pulse)) {
    const val = Number(data.pulse);
    let s = 0;
    if (val <= 40) s = 3;
    else if (val <= 50) s = 1;
    else if (val <= 90) s = 0;
    else if (val <= 110) s = 1;
    else if (val <= 130) s = 2;
    else s = 3; // >= 131
    scores.pulse = s;
    total += s;
    paramsScoredCount++;
  } else {
    scores.pulse = null;
  }

  // 4. Temperature (°C)
  if (data.temp_c !== null && data.temp_c !== undefined && data.temp_c !== "" && !isNaN(data.temp_c)) {
    const val = Number(data.temp_c);
    let s = 0;
    if (val <= 35.0) s = 3;
    else if (val <= 36.0) s = 1;
    else if (val <= 38.0) s = 0;
    else if (val <= 39.0) s = 1;
    else s = 2; // >= 39.1
    scores.temp_c = s;
    total += s;
    paramsScoredCount++;
  } else {
    scores.temp_c = null;
  }

  // 5. Respiratory Rate (breaths/min) - optional
  if (data.rr !== null && data.rr !== undefined && data.rr !== "" && !isNaN(data.rr)) {
    const val = Number(data.rr);
    let s = 0;
    if (val <= 8) s = 3;
    else if (val <= 11) s = 1;
    else if (val <= 20) s = 0;
    else if (val <= 24) s = 2;
    else s = 3; // >= 25
    scores.rr = s;
    total += s;
    paramsScoredCount++;
  } else {
    scores.rr = null;
  }

  // 6. Alertness (AVPU) - optional
  if (data.avpu) {
    const avpu = String(data.avpu).toUpperCase();
    if (avpu === "A") {
      scores.avpu = 0;
    } else if (["C", "V", "P", "U"].includes(avpu)) {
      scores.avpu = 3;
    } else {
      scores.avpu = null;
    }
    if (scores.avpu !== null) {
      total += scores.avpu;
      paramsScoredCount++;
    }
  } else {
    scores.avpu = null;
  }

  // 7. On Supplemental Oxygen - optional
  if (data.on_oxygen !== null && data.on_oxygen !== undefined) {
    const onO2 = Boolean(data.on_oxygen);
    const s = onO2 ? 2 : 0;
    scores.on_oxygen = s;
    total += s;
    paramsScoredCount++;
  } else {
    scores.on_oxygen = null;
  }

  return {
    total,
    scores,
    paramsScoredCount
  };
}

/**
 * Main Pure Triage Evaluation Function
 * 
 * @param {Object} input Patient data, vitals, symptoms, history
 * @returns {Object} Deterministic triage result with findings, flags, priority
 */
export function evaluateTriage(input) {
  const findings = [];
  const flags = [];
  const missingRequired = [];
  const understatedMissing = [];

  // Parse values safely
  const age = input.age !== undefined && input.age !== null && input.age !== "" ? Number(input.age) : null;
  const sex = input.sex || "OTHER";
  const pregnant = Boolean(input.pregnant);
  const temp_c = input.temp_c !== undefined && input.temp_c !== null && input.temp_c !== "" ? Number(input.temp_c) : null;
  const sbp = input.sbp !== undefined && input.sbp !== null && input.sbp !== "" ? Number(input.sbp) : null;
  const dbp = input.dbp !== undefined && input.dbp !== null && input.dbp !== "" ? Number(input.dbp) : null;
  const spo2 = input.spo2 !== undefined && input.spo2 !== null && input.spo2 !== "" ? Number(input.spo2) : null;
  const pulse = input.pulse !== undefined && input.pulse !== null && input.pulse !== "" ? Number(input.pulse) : null;
  const rr = input.rr !== undefined && input.rr !== null && input.rr !== "" ? Number(input.rr) : null;
  const avpu = input.avpu ? String(input.avpu).toUpperCase() : null;
  const on_oxygen = input.on_oxygen !== undefined && input.on_oxygen !== null ? Boolean(input.on_oxygen) : null;
  const symptoms = Array.isArray(input.symptom_codes) ? input.symptom_codes : [];
  const history = Array.isArray(input.history_codes) ? input.history_codes : [];
  const duration_days = input.duration_days !== undefined && input.duration_days !== null && input.duration_days !== "" ? Number(input.duration_days) : 0;
  const free_text = (input.free_text || "").trim();

  // Check required vitals for completeness
  if (temp_c === null) missingRequired.push("Temperature");
  if (sbp === null) missingRequired.push("Systolic BP");
  if (dbp === null) missingRequired.push("Diastolic BP");
  if (spo2 === null) missingRequired.push("SpO₂");
  if (pulse === null) missingRequired.push("Pulse");

  if (missingRequired.length > 0) {
    flags.push({
      id: "INCOMPLETE",
      label: `INCOMPLETE — missing: ${missingRequired.join(", ")}`,
      missing: missingRequired
    });
  }

  // Check unstated optional params for UNDERSTATED flag
  if (rr === null) understatedMissing.push("Respiratory Rate");
  if (avpu === null) understatedMissing.push("Alertness (AVPU)");
  if (on_oxygen === null) understatedMissing.push("Oxygen Status");

  if (understatedMissing.length > 0) {
    flags.push({
      id: "UNDERSTATED",
      label: `Score may be understated — not entered: ${understatedMissing.join(", ")}`,
      missing: understatedMissing
    });
  }

  // Check free text or OTHER_TEXT for NEEDS_REVIEW flag
  if (free_text.length > 0 || symptoms.includes("OTHER_TEXT")) {
    flags.push({
      id: "NEEDS_REVIEW",
      label: "Needs clinician review — unrecognised symptom text",
      text: free_text
    });
  }

  // Calculate NEWS2
  const news2 = calculateNews2({ spo2, sbp, pulse, temp_c, rr, avpu, on_oxygen });
  const news2_total = news2.total;

  // Define "abnormal vital": NEWS2 parameter score >= 2 on SpO2, SBP, or Pulse
  const spo2_score = news2.scores.spo2 || 0;
  const sbp_score = news2.scores.sbp || 0;
  const pulse_score = news2.scores.pulse || 0;
  const hasAbnormalVital = (spo2_score >= 2) || (sbp_score >= 2) || (pulse_score >= 2);

  /* ==========================================================================
     3.1 EMERGENCY RULES (Evaluated without short-circuiting)
     ========================================================================== */

  // NW-E01: NEWS2 total >= 7
  if (news2_total >= 7) {
    findings.push({
      rule_id: "NW-E01",
      tier: "EMERGENCY",
      plain_message: "NEWS2 total score is 7 or higher (critical clinical deterioration risk)",
      plain_message_hi: "NEWS2 कुल स्कोर 7 या अधिक है (गंभीर आपातकालीन जोखिम)",
      observed_value: `Score: ${news2_total}`
    });
  }

  // RF-E01: SpO2 <= 90 or SBP <= 90
  const isSpo2Critical = (spo2 !== null && spo2 <= 90);
  const isSbpCritical = (sbp !== null && sbp <= 90);
  if (isSpo2Critical || isSbpCritical) {
    findings.push({
      rule_id: "RF-E01",
      tier: "EMERGENCY",
      plain_message: "Severe hypoxia (SpO₂ ≤ 90%) or profound hypotension (SBP ≤ 90 mmHg)",
      plain_message_hi: "गंभीर ऑक्सीजन कमी (SpO₂ ≤ 90%) या अत्यधिक निम्न रक्तचाप (SBP ≤ 90 mmHg)",
      observed_value: `SpO₂: ${spo2 ?? "—"}%, SBP: ${sbp ?? "—"} mmHg`
    });
  }

  // RF-E02: Severe breathing difficulty
  if (symptoms.includes("SEVERE_BREATHING_DIFFICULTY")) {
    findings.push({
      rule_id: "RF-E02",
      tier: "EMERGENCY",
      plain_message: "Severe breathing difficulty (respiratory failure risk)",
      plain_message_hi: "सांस लेने में गंभीर कठिनाई (श्वसन विफलता का जोखिम)",
      observed_value: "Severe respiratory distress"
    });
  }

  // RF-E03: AVPU is P or U
  if (avpu === "P" || avpu === "U") {
    findings.push({
      rule_id: "RF-E03",
      tier: "EMERGENCY",
      plain_message: "Depressed consciousness: responsive only to pain or completely unresponsive",
      plain_message_hi: "गंभीर बेहोशी: केवल दर्द पर प्रतिक्रिया या पूर्णतः अचेत",
      observed_value: `AVPU: ${avpu}`
    });
  }

  // RF-E04: Ongoing seizure
  if (symptoms.includes("SEIZURE_ONGOING")) {
    findings.push({
      rule_id: "RF-E04",
      tier: "EMERGENCY",
      plain_message: "Active, ongoing seizure activity (status epilepticus risk)",
      plain_message_hi: "सक्रिय दौरा जारी (लगातार दौरे का जोखिम)",
      observed_value: "Active convulsions"
    });
  }

  // RF-E05: Severe bleeding
  if (symptoms.includes("SEVERE_BLEEDING")) {
    findings.push({
      rule_id: "RF-E05",
      tier: "EMERGENCY",
      plain_message: "Severe uncontrolled or arterial bleeding",
      plain_message_hi: "अत्यधिक अनियंत्रित रक्तस्राव",
      observed_value: "Severe active bleeding"
    });
  }

  // RF-E06: Stroke signs
  if (symptoms.includes("STROKE_SIGNS")) {
    findings.push({
      rule_id: "RF-E06",
      tier: "EMERGENCY",
      plain_message: "Acute neurological stroke signs (FAST: facial droop, arm weakness, slurred speech)",
      plain_message_hi: "अचानक स्ट्रोक के लक्षण (चेहरा लटकना, हाथ में कमजोरी, बोलने में कठिनाई)",
      observed_value: "Acute stroke deficit"
    });
  }

  // RF-E07: Snakebite or poisoning
  if (symptoms.includes("SNAKEBITE_OR_POISONING")) {
    findings.push({
      rule_id: "RF-E07",
      tier: "EMERGENCY",
      plain_message: "Suspected venomous snakebite or acute toxic poisoning",
      plain_message_hi: "संदिग्ध विषैला सर्पदंश या तीव्र विषाक्तता",
      observed_value: "Envenomation / Toxic ingestion"
    });
  }

  // RF-E08: Pregnancy heavy bleeding or convulsion
  if (symptoms.includes("PREGNANCY_HEAVY_BLEEDING") || symptoms.includes("PREGNANCY_CONVULSION")) {
    findings.push({
      rule_id: "RF-E08",
      tier: "EMERGENCY",
      plain_message: "Obstetric emergency: severe antepartum/postpartum hemorrhage or eclamptic seizure",
      plain_message_hi: "प्रसूति आपातकाल: गर्भावस्था में भारी रक्तस्राव या एक्लेम्पटिक दौरा",
      observed_value: "Maternal red flag"
    });
  }

  // RF-E09: Chest pain AND abnormal vital (SpO2/SBP/Pulse score >= 2)
  const hasFiredRFE09 = symptoms.includes("CHEST_PAIN") && hasAbnormalVital;
  if (hasFiredRFE09) {
    findings.push({
      rule_id: "RF-E09",
      tier: "EMERGENCY",
      plain_message: "Red-flag combination: chest pain accompanied by abnormal vital signs",
      plain_message_hi: "रेड-फ्लैग संयोजन: असामान्य वाइटल्स के साथ सीने में दर्द",
      observed_value: `Chest pain + abnormal vital score ≥ 2 (SpO₂:${spo2_score}, SBP:${sbp_score}, Pulse:${pulse_score})`
    });
  }

  /* ==========================================================================
     3.2 URGENT RULES
     ========================================================================== */

  // NW-U01: NEWS2 total 5-6
  if (news2_total >= 5 && news2_total <= 6) {
    findings.push({
      rule_id: "NW-U01",
      tier: "URGENT",
      plain_message: "NEWS2 total score is 5–6 (moderate clinical risk)",
      plain_message_hi: "NEWS2 कुल स्कोर 5–6 है (मध्यम नैदानिक जोखिम)",
      observed_value: `Score: ${news2_total}`
    });
  }

  // NW-U02: Any single scored parameter equals 3
  const paramScores = news2.scores;
  const singleThreeParams = [];
  if (paramScores.spo2 === 3) singleThreeParams.push(`SpO₂ (${spo2}%)`);
  if (paramScores.sbp === 3) singleThreeParams.push(`SBP (${sbp} mmHg)`);
  if (paramScores.pulse === 3) singleThreeParams.push(`Pulse (${pulse} bpm)`);
  if (paramScores.temp_c === 3) singleThreeParams.push(`Temp (${temp_c}°C)`);
  if (paramScores.rr === 3) singleThreeParams.push(`RR (${rr}/min)`);
  if (paramScores.avpu === 3) singleThreeParams.push(`AVPU (${avpu})`);

  if (singleThreeParams.length > 0) {
    findings.push({
      rule_id: "NW-U02",
      tier: "URGENT",
      plain_message: `Single parameter scored maximum severity (3): ${singleThreeParams.join(", ")}`,
      plain_message_hi: `एकल पैरामीटर का स्कोर अधिकतम स्तर (3) पर है: ${singleThreeParams.join(", ")}`,
      observed_value: singleThreeParams.join("; ")
    });
  }

  // RF-U01: CHEST_PAIN when RF-E09 did not fire
  if (symptoms.includes("CHEST_PAIN") && !hasFiredRFE09) {
    findings.push({
      rule_id: "RF-U01",
      tier: "URGENT",
      plain_message: "Chest pain reported (requires urgent clinician assessment and ECG)",
      plain_message_hi: "सीने में दर्द की शिकायत (त्वरित चिकित्सकीय मूल्यांकन व ईसीजी आवश्यक)",
      observed_value: "Chest pain reported"
    });
  }

  // RF-U02: BREATHING_DIFFICULTY (mild/moderate)
  if (symptoms.includes("BREATHING_DIFFICULTY")) {
    findings.push({
      rule_id: "RF-U02",
      tier: "URGENT",
      plain_message: "Moderate difficulty breathing reported",
      plain_message_hi: "सांस लेने में मध्यम कठिनाई",
      observed_value: "Dyspnea"
    });
  }

  // RF-U03: VOMITING_DIARRHOEA_DEHYDRATION
  if (symptoms.includes("VOMITING_DIARRHOEA_DEHYDRATION")) {
    findings.push({
      rule_id: "RF-U03",
      tier: "URGENT",
      plain_message: "Persistent vomiting, diarrhea, or clinical dehydration signs",
      plain_message_hi: "लगातार उल्टी, दस्त या निर्जलीकरण (डिहाइड्रेशन) के लक्षण",
      observed_value: "Fluid loss risk"
    });
  }

  // RF-U04: FEVER with duration > 3 days
  if (symptoms.includes("FEVER") && duration_days > 3) {
    findings.push({
      rule_id: "RF-U04",
      tier: "URGENT",
      plain_message: `Prolonged fever persisting for ${duration_days} days (> 3 days)`,
      plain_message_hi: `लगातार ${duration_days} दिनों से बुखार (3 दिन से अधिक)`,
      observed_value: `Duration: ${duration_days} days`
    });
  }

  // RF-U05: High-risk (history or age >= 65) AND (temp >= 38.1 or SpO2 <= 95)
  const isHighRiskPerson = history.length > 0 || (age !== null && age >= 65);
  const hasHighRiskVitals = (temp_c !== null && temp_c >= 38.1) || (spo2 !== null && spo2 <= 95);
  if (isHighRiskPerson && hasHighRiskVitals) {
    findings.push({
      rule_id: "RF-U05",
      tier: "URGENT",
      plain_message: "High-risk history or elderly patient with fever (≥38.1°C) or borderline SpO₂ (≤95%)",
      plain_message_hi: "उच्च जोखिम इतिहास या बुजुर्ग मरीज़ के साथ बुखार (≥38.1°C) या कम SpO₂ (≤95%)",
      observed_value: `History/Age risk + (Temp: ${temp_c ?? "—"}°C, SpO₂: ${spo2 ?? "—"}%)`
    });
  }

  // FLOOR-01: Age < 16
  if (age !== null && age < 16) {
    findings.push({
      rule_id: "FLOOR-01",
      tier: "URGENT",
      plain_message: "Outside this tool's adult scoring (age < 16). Needs a clinician's judgement.",
      plain_message_hi: "यह टूल केवल वयस्कों हेतु है (उम्र < 16)। चिकित्सक का प्रत्यक्ष निर्णय आवश्यक है।",
      observed_value: `Age: ${age}`
    });
  }

  // FLOOR-02: Pregnant = true
  if (pregnant === true) {
    findings.push({
      rule_id: "FLOOR-02",
      tier: "URGENT",
      plain_message: "Outside this tool's adult scoring (pregnancy). Needs a clinician's judgement.",
      plain_message_hi: "यह टूल सामान्य वयस्कों हेतु है (गर्भावस्था)। चिकित्सक का प्रत्यक्ष निर्णय आवश्यक है।",
      observed_value: "Pregnant"
    });
  }

  /* ==========================================================================
     4. PRIORITY DERIVATION
     ========================================================================== */

  let priority = "ROUTINE";
  const hasEmergency = findings.some(f => f.tier === "EMERGENCY");
  const hasUrgent = findings.some(f => f.tier === "URGENT");

  if (hasEmergency) {
    priority = "EMERGENCY";
  } else if (hasUrgent) {
    priority = "URGENT";
  } else {
    priority = "ROUTINE";
  }

  // Plain-language suggested action per priority
  let suggested_action = "";
  let suggested_action_hi = "";
  if (priority === "EMERGENCY") {
    suggested_action = "Alert the doctor now.";
    suggested_action_hi = "डॉक्टर को तुरंत सूचित करें।";
  } else if (priority === "URGENT") {
    suggested_action = "Doctor should see this patient soon, before routine cases.";
    suggested_action_hi = "डॉक्टर को यह मरीज़ सामान्य मामलों से पहले जल्द देखना चाहिए।";
  } else {
    suggested_action = "No urgent signs found by this tool. A clinician still reviews every case.";
    suggested_action_hi = "इस टूल द्वारा कोई आपात संकेत नहीं मिला। चिकित्सक हर मामले की समीक्षा करते हैं।";
  }

  // Sort findings deterministically: EMERGENCY first, then URGENT, then by rule_id ascending
  findings.sort((a, b) => {
    const tierWeight = { "EMERGENCY": 1, "URGENT": 2, "ROUTINE": 3 };
    const diff = (tierWeight[a.tier] || 99) - (tierWeight[b.tier] || 99);
    if (diff !== 0) return diff;
    return a.rule_id.localeCompare(b.rule_id);
  });

  return {
    priority,
    state: "PRELIMINARY",
    flags,
    missing: missingRequired,
    news2: {
      total: news2_total,
      params: news2.scores,
      paramsScoredCount: news2.paramsScoredCount
    },
    findings,
    rule_set_version: RULE_SET_VERSION,
    clinical_review_status: CLINICAL_REVIEW_STATUS,
    suggested_action,
    suggested_action_hi,
    evaluated_at: new Date().toISOString()
  };
}

/**
 * Queue Ordering Function (per 02 §5 & DEC-011)
 * 
 * 1. effective_priority rank: EMERGENCY, URGENT, ROUTINE
 * 2. Within ROUTINE: cases with flag INCOMPLETE or NEEDS_REVIEW before unflagged cases
 * 3. arrived_at ascending (patient's registration time, so reassessment doesn't send them to back)
 * 4. patient_id ascending as deterministic tie-break
 */
export function sortQueueItems(items) {
  const priorityRank = {
    "EMERGENCY": 1,
    "URGENT": 2,
    "ROUTINE": 3
  };

  return [...items].sort((a, b) => {
    // 1. Effective priority rank
    const rankA = priorityRank[a.effective_priority] || 99;
    const rankB = priorityRank[b.effective_priority] || 99;
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // 2. Within ROUTINE only: INCOMPLETE or NEEDS_REVIEW before unflagged
    if (a.effective_priority === "ROUTINE" && b.effective_priority === "ROUTINE") {
      const aHasFlag = (a.flags || []).some(f => f.id === "INCOMPLETE" || f.id === "NEEDS_REVIEW" || f === "INCOMPLETE" || f === "NEEDS_REVIEW");
      const bHasFlag = (b.flags || []).some(f => f.id === "INCOMPLETE" || f.id === "NEEDS_REVIEW" || f === "INCOMPLETE" || f === "NEEDS_REVIEW");
      if (aHasFlag && !bHasFlag) return -1;
      if (!aHasFlag && bHasFlag) return 1;
    }

    // 3. arrived_at ascending (earlier arrival first)
    const timeA = new Date(a.arrived_at).getTime() || 0;
    const timeB = new Date(b.arrived_at).getTime() || 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    // 4. patient_id ascending
    return String(a.patient_id).localeCompare(String(b.patient_id));
  });
}
