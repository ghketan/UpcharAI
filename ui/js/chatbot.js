/**
 * UpcharAI Rural Health Information Chatbot
 * Conforms to 03-architecture-data-api.md §8 (REQ-022, DEC-009)
 * 
 * Invariants:
 * 1. Isolated from triage database (never accesses or transmits patient records).
 * 2. Deterministic keyword pre-filter for red flags in English & Hindi -> Returns immediate fixed escalation WITHOUT external call.
 * 3. Dosage filter -> Blocks medicine names and dose advice.
 * 4. General health information only; strictly non-diagnostic.
 */

// Red-flag trigger definitions
const RED_FLAGS_EN = [
  "chest pain", "pressure in chest", "heart attack",
  "cannot breathe", "can't breathe", "difficulty breathing", "severe breathing", "gasping", "breathless",
  "unconscious", "unresponsive", "passed out", "fainted", "fainting",
  "heavy bleeding", "bleeding profusely", "severe bleeding", "blood loss",
  "seizure", "convulsion", "fits", "epilepsy fit",
  "snakebite", "snake bite", "poison", "poisoning", "insect bite swelling",
  "stroke", "face drooping", "arm weakness", "slurred speech"
];

const RED_FLAGS_HI = [
  "सीने में दर्द", "छाती में दर्द", "दिल का दौरा",
  "सांस नहीं आ रही", "सांस लेने में तकलीफ", "दम घुटना", "हांफना", "सांस फूलना",
  "बेहोश", "अचेत", "होश नहीं", "बेहोशी",
  "भारी रक्तस्राव", "बहुत खून बहना", "अत्यधिक खून",
  "दौरा", "मिरगी", "झटके",
  "सांप", "सर्पदंश", "जहर", "विष",
  "स्ट्रोक", "लकवा", "पक्षाघात",
  // Transliterations
  "seene me dard", "sene me dard", "chhati me dard",
  "saans", "sans lene me taklif", "dam ghutna",
  "behosh", "behoshi", "hosh nahi",
  "khoon behna", "khun behna", "bhaari bleeding",
  "daura", "mirgi", "jhatke",
  "saanp", "sanp kaata", "zeher", "zahar"
];

const DOSE_PATTERNS = [
  /\b\d+\s*(mg|ml|mcg|gm|gram|tablet|tablets|capsule|capsules|drops|goli|dose)\b/i,
  /\b(paracetamol|amoxicillin|azithromycin|ibuprofen|combiflam|metformin|atenolol|crocin|aspirin|disprin|dextrose)\b/i
];

export function processChatMessage(userText, currentLanguage = "en", isOnline = true) {
  const normalized = userText.toLowerCase().trim();

  // 1. Deterministic Red-Flag Pre-Filter
  const isRedFlagEn = RED_FLAGS_EN.some(kw => normalized.includes(kw));
  const isRedFlagHi = RED_FLAGS_HI.some(kw => normalized.includes(kw));

  if (isRedFlagEn || isRedFlagHi) {
    if (currentLanguage === "hi" || isRedFlagHi) {
      return {
        type: "EMERGENCY_ESCALATION",
        isRedFlag: true,
        text: "⚠️ **आपातकालीन चेतावनी (Red Flag Detected):** आपने संभावित गंभीर या आपातकालीन स्थिति के लक्षण बताए हैं। तुरंत नजदीकी स्वास्थ्य केंद्र (PHC/CHC) जाएं या डॉक्टर को सूचित करें। आपातकालीन एम्बुलेंस हेतु **108** या **102** पर कॉल करें। कृपया ऑनलाइन सलाह के भरोसे न रहें।"
      };
    }
    return {
      type: "EMERGENCY_ESCALATION",
      isRedFlag: true,
      text: "⚠️ **EMERGENCY WARNING (Red Flag Detected):** The symptoms you described indicate a potential medical emergency. Please alert a healthcare professional immediately, visit the nearest Community Health Centre (CHC) or Primary Health Centre (PHC), or call local emergency dispatch (**108**). Do not wait."
    };
  }

  // 2. Medicine / Dosage Advice Blocker
  const isDoseQuery = DOSE_PATTERNS.some(p => p.test(normalized)) ||
    normalized.includes("dose") || normalized.includes("khuraak") || normalized.includes("kitni goli");

  if (isDoseQuery) {
    if (currentLanguage === "hi") {
      return {
        type: "SAFETY_REFUSAL",
        text: "🚫 **चिकित्सकीय नियम:** यह सहायक दवाओं के नाम या खुराक (Dosing) की सिफारिश नहीं करता है। किसी भी दवा के सेवन से पहले योग्य चिकित्सक या फार्मासिस्ट से परामर्श अवश्य लें।"
      };
    }
    return {
      type: "SAFETY_REFUSAL",
      text: "🚫 **Safety Rule:** I cannot advise on specific medication dosages or prescription treatments. Please consult a qualified doctor, nurse, or pharmacist for prescription guidance."
    };
  }

  // 3. Offline Safety Notice if network off
  if (!isOnline) {
    if (currentLanguage === "hi") {
      return {
        type: "OFFLINE_GUIDE",
        text: "ℹ️ **ऑफ़लाइन सूचना:** चैटबॉट वर्तमान में सुरक्षित ऑफ़लाइन मोड में है। प्राथमिक स्वास्थ्य सलाह: खूब पानी व ओआरएस पिएं, स्वच्छता रखें, और किसी भी असामान्य लक्षण पर स्वास्थ्य केंद्र पर संपर्क करें।"
      };
    }
    return {
      type: "OFFLINE_GUIDE",
      text: "ℹ️ **Offline Mode:** The AI chatbot is running in offline safety mode. Standard advice: Stay hydrated with clean boiled water or ORS, rest, and visit the health centre for physical examination."
    };
  }

  // 4. Curated Rural Health Knowledge Base
  if (normalized.includes("fever") || normalized.includes("bukhar") || normalized.includes("बुखार")) {
    if (currentLanguage === "hi") {
      return {
        type: "INFO",
        text: "🌡️ **बुखार के संबंध में प्राथमिक जानकारी:**\n• पर्याप्त आराम करें और साफ पानी व तरल पदार्थ पिएं।\n• सामान्य तापमान के पानी से स्पंजिंग (माथे पर गीली पट्टी) कर सकते हैं।\n• यदि बुखार 3 दिन से अधिक रहे, या ठंड लगकर कंपकंपी हो, तो मलेरिया/डेंगू की जांच हेतु स्वास्थ्य केंद्र जाएं।"
      };
    }
    return {
      type: "INFO",
      text: "🌡️ **General Guidance on Fever:**\n• Rest well and stay hydrated with clean boiled water or soups.\n• Tepid spongeing can help ease discomfort.\n• If fever exceeds 3 days, or is accompanied by chills or rash, please visit the PHC for clinical blood tests and examination."
    };
  }

  if (normalized.includes("dehydration") || normalized.includes("ors") || normalized.includes("diarrhea") || normalized.includes("dast") || normalized.includes("उल्टी") || normalized.includes("दस्त")) {
    if (currentLanguage === "hi") {
      return {
        type: "INFO",
        text: "💧 **निर्जलीकरण (डिहाइड्रेशन) व ओआरएस (ORS):**\n• ओआरएस का 1 पैकेट 1 लीटर साफ पीने के पानी में घोलें। 24 घंटे के अंदर उपयोग करें।\n• नारियल पानी, छाछ, या चावल का पानी भी सहायक है।\n• यदि मरीज़ पेशाब न कर पा रहा हो या बहुत सुस्त हो, तो तुरंत स्वास्थ्य केंद्र ले जाएं।"
      };
    }
    return {
      type: "INFO",
      text: "💧 **Dehydration & Oral Rehydration Salts (ORS):**\n• Mix 1 packet of WHO-ORS in 1 litre of clean drinking water. Use within 24 hours.\n• Continue breastfeeding for infants and provide fluids frequently.\n• If the patient shows dry mouth, sunken eyes, or lethargy, escalate to the health centre."
    };
  }

  if (normalized.includes("bp") || normalized.includes("blood pressure") || normalized.includes("hypertension") || normalized.includes("रक्तचाप")) {
    if (currentLanguage === "hi") {
      return {
        type: "INFO",
        text: "💓 **रक्तचाप (Blood Pressure) संबंधी जानकारी:**\n• सामान्य रक्तचाप लगभग 120/80 mmHg माना जाता है।\n• नमक का सेवन नियंत्रित करें, हरी सब्जियां खाएं और नियमित जांच कराएं।\n• यदि सिस्टोलिक बीपी 140 से अधिक या 90 से कम रहता है, तो स्वास्थ्य कार्यकर्ता से संपर्क करें।"
      };
    }
    return {
      type: "INFO",
      text: "💓 **Blood Pressure Information:**\n• Normal adult BP is typically around 120/80 mmHg.\n• Reduce dietary sodium, avoid smoking, and maintain regular physical activity.\n• High readings (SBP > 140) or severe low readings (SBP < 90) require clinician review."
    };
  }

  if (normalized.includes("pregnancy") || normalized.includes("maternal") || normalized.includes("garbhavastha") || normalized.includes("गर्भवती")) {
    if (currentLanguage === "hi") {
      return {
        type: "INFO",
        text: "🤰 **मातृ एवं गर्भावस्था स्वास्थ्य:**\n• नियमित प्रसव पूर्व जांच (ANC Checkups) समय पर कराएं।\n• आयरन व फोलिक एसिड की गोलियां आशा कार्यकर्ता के निर्देशानुसार लें।\n• तेज सिरदर्द, आंखों के आगे धुंधलापन, चेहरे पर सूजन या रक्तस्राव होने पर तत्काल अस्पताल जाएं।"
      };
    }
    return {
      type: "INFO",
      text: "🤰 **Maternal Care & Pregnancy Guidance:**\n• Complete all scheduled Antenatal Care (ANC) visits at your nearest Sub-centre or PHC.\n• Take Iron and Folic Acid supplements as advised by your ASHA/ANM worker.\n• Any bleeding, severe headache, blurred vision, or abdominal cramps require immediate clinical evaluation."
    };
  }

  // Fallback helpful response
  if (currentLanguage === "hi") {
    return {
      type: "INFO",
      text: "💡 **सामान्य स्वास्थ्य जानकारी:** मैं एक स्वास्थ्य सूचना सहायक हूँ। यह टूल कोई निदान नहीं करता है (does not diagnose)। आप बुखार, डिहाइड्रेशन, ओआरएस, पोषण, या स्वास्थ्य केंद्र की सेवाओं के बारे में प्रश्न पूछ सकते हैं। किसी भी बीमारी के उपचार हेतु कृपया अपने प्राथमिक स्वास्थ्य केंद्र के डॉक्टर से मिलें।"
    };
  }
  return {
    type: "INFO",
    text: "💡 **General Health Information:** This assistant does not diagnose and does not prescribe. I provide non-emergency educational guidance on hydration, seasonal fever, maternal care, and rural clinic workflows. For clinical evaluation and treatment, please consult the clinic medical officer."
  };
}
