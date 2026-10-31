from collections import defaultdict
import re
import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Request

from api.auth import get_user_from_token
from api.config import LLM_API_KEY
from api.db import get_db
from api.errors import APIException
from api.models import ChatRequest, ChatResponse
from api.roles import extract_token_from_headers

router = APIRouter(prefix="/api/chat", tags=["chat"])

# In-memory rate limiting: at most 10 requests per minute per client (03 §8)
_CHAT_REQUEST_HISTORY: Dict[str, List[float]] = defaultdict(list)
_MAX_REQUESTS_PER_MINUTE = 10

# Deterministic red-flag word patterns in English and Hindi (03 §8)
ENGLISH_RED_FLAGS: List[str] = [
    "chest pain",
    "cannot breathe",
    "cant breathe",
    "can't breathe",
    "shortness of breath",
    "difficulty breathing",
    "unconscious",
    "unresponsive",
    "heavy bleeding",
    "severe bleeding",
    "bleeding heavily",
    "seizure",
    "convulsion",
    "stroke",
    "facial droop",
    "arm weakness",
    "snakebite",
    "snake bite",
    "poison",
    "poisoning",
]

HINDI_RED_FLAGS: List[str] = [
    "सीने में दर्द",
    "छाती में दर्द",
    "सांस लेने में तकलीफ",
    "सांस फूल",
    "बेहोश",
    "बेहोशी",
    "खून बह",
    "दौरा",
    "झटके",
    "लकवा",
    "सांप",
    "ज़हर",
    "विष",
    # Transliterated Hindi
    "sine me dard",
    "chhati me dard",
    "saas lene me taklif",
    "sans fulna",
    "saans fulna",
    "behosh",
    "behoshi",
    "khoon",
    "daura",
    "jhatke",
    "lakwa",
    "saanp",
    "zahar",
    "zehar",
]

EMERGENCY_TEXT_EN = (
    "EMERGENCY ALERT: Your message describes potential emergency symptoms. "
    "Please seek immediate in-person medical evaluation at the nearest emergency healthcare center "
    "or alert your attending healthcare worker immediately. Do not wait."
)

EMERGENCY_TEXT_HI = (
    "आपातकालीन सूचना: आपके लक्षणों में गंभीर खतरे के संकेत हैं। "
    "कृपया तुरंत नजदीकी स्वास्थ्य केंद्र या आपातकालीन कक्ष में डॉक्टर से संपर्क करें "
    "या स्वास्थ्य कार्यकर्ता को सूचित करें। प्रतीक्षा न करें।"
)

STATIC_SAFETY_EN = (
    "I provide general health education only. I cannot diagnose conditions, "
    "provide treatment plans, or recommend medication doses. "
    "Please consult your local health worker or doctor for clinical advice."
)

STATIC_SAFETY_HI = (
    "मैं केवल सामान्य स्वास्थ्य संबंधी जानकारी प्रदान करता हूँ। "
    "मैं किसी बीमारी का निदान, उपचार या दवा की खुराक नहीं बता सकता। "
    "कृपया चिकित्सकीय सलाह के लिए स्थानीय स्वास्थ्य कार्यकर्ता या डॉक्टर से संपर्क करें।"
)

# Regex to detect medical dosage patterns (e.g., 500mg, 10 ml, 2 tablets)
DOSE_REGEX = re.compile(r"\b\d+\s*(mg|mcg|g|ml|tablets?|capsules?|drops?|teaspoons?|pills?)\b", re.IGNORECASE)


def detect_red_flags(text: str) -> bool:
    raw_lower = text.lower()
    cleaned = re.sub(r"[^\w\s]", " ", raw_lower)
    cleaned_compact = re.sub(r"[^\w\s]", "", raw_lower)

    # English check: test raw text, space-separated punctuation, and compact punctuation
    for phrase in ENGLISH_RED_FLAGS:
        p_lower = phrase.lower()
        p_clean = re.sub(r"[^\w\s]", " ", p_lower)
        p_compact = re.sub(r"[^\w\s]", "", p_lower)
        if (p_lower in raw_lower) or (p_clean in cleaned) or (p_compact in cleaned_compact):
            return True

    # Hindi check
    for phrase in HINDI_RED_FLAGS:
        p_lower = phrase.lower()
        p_clean = re.sub(r"[^\w\s]", " ", p_lower)
        p_compact = re.sub(r"[^\w\s]", "", p_lower)
        if (p_lower in raw_lower) or (p_clean in cleaned) or (p_compact in cleaned_compact):
            return True

    return False


def generate_offline_health_guidance(message: str, lang: str) -> str:
    msg_lower = message.lower()

    # Hydration / Water / ORS / Diarrhea
    if any(k in msg_lower for k in ["water", "drink", "pani", "paani", "ors", "diarrhea", "dast", "dehydration", "उल्टी", "दस्त"]):
        if lang == "hi":
            return (
                "दैनिक पानी व ओआरएस (ORS) संबंधी सामान्य स्वास्थ्य मार्गदर्शन:\n\n"
                "• स्वस्थ वयस्क को प्रतिदिन सामान्यतः 2.5 से 3 लीटर स्वच्छ, उबला या छना हुआ पानी पीना चाहिए।\n"
                "• दस्त या उल्टी की स्थिति में शरीर में पानी की कमी (डिहाइड्रेशन) रोकने के लिए ओआरएस (ORS) का घोल दें।\n"
                "• घर पर ओआरएस: 1 लीटर साफ पानी में 6 छोटी चम्मच चीनी और आधा चम्मच नमक घोलें।\n"
                "• बच्चों में दस्त होने पर स्तनपान या सामान्य भोजन जारी रखें और जिंक की गोली के लिए आशा कार्यकर्ता से संपर्क करें।\n\n"
                "सामान्य स्वास्थ्य सूचना (General Health Guidance): यह जानकारी केवल जन-जागरूकता के लिए है। किसी भी बीमारी के उपचार या दवा की खुराक के लिए स्थानीय प्राथमिक स्वास्थ्य केंद्र (PHC) या डॉक्टर से परामर्श लें।"
            )
        elif lang == "pa":
            return (
                "ਪਾਣੀ ਅਤੇ ਓਆਰਐਸ (ORS) ਬਾਰੇ ਆਮ ਸਿਹਤ ਸਲਾਹ:\n\n"
                "• ਹਰ ਰੋਜ਼ 2.5 ਤੋਂ 3 ਲੀਟਰ ਸਾਫ਼ ਅਤੇ ਉਬਲਿਆ ਹੋਇਆ ਪਾਣੀ ਪੀਣਾ ਚਾਹੀਦਾ ਹੈ।\n"
                "• ਦਸਤ ਜਾਂ ਡੀਹਾਈਡਰੇਸ਼ਨ ਦੀ ਸਥਿਤੀ ਵਿੱਚ ਓਆਰਐਸ (ORS) ਦਾ ਘੋਲ ਤੁਰੰਤ ਸ਼ੁਰੂ ਕਰੋ।\n"
                "• ਛੋਟੇ ਬੱਚਿਆਂ ਵਿੱਚ ਦਸਤ ਵੇਲੇ ਦੁੱਧ ਪਿਲਾਉਣਾ ਜਾਰੀ ਰੱਖੋ।\n\n"
                "ਆਮ ਸਿਹਤ ਸੂਚਨਾ (General Health Guidance): ਇਹ ਕੇਵਲ ਸਿੱਖਿਆ ਅਤੇ ਜਾਗਰੂਕਤਾ ਲਈ ਹੈ। ਕਿਸੇ ਦਵਾਈ ਜਾਂ ਜਾਂਚ ਲਈ ਸਿਹਤ ਕੇਂਦਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।"
            )
        else:
            return (
                "Daily Hydration & Fluid Guidance:\n\n"
                "• A healthy adult typically requires 2.5 to 3 litres of clean, safe drinking water daily, adjusting upward during heavy heat or physical labour.\n"
                "• In cases of loose stools or mild dehydration, use Oral Rehydration Salts (ORS) solution to restore essential electrolytes.\n"
                "• Homemade ORS method: 6 level teaspoons of sugar and 1/2 level teaspoon of clean salt dissolved thoroughly in 1 litre of boiled and cooled water.\n"
                "• Danger signs requiring immediate facility care: inability to drink, persistent vomiting, sunken eyes, or no urination for 6 hours.\n\n"
                "General Health Education: This information is for community education only. It does not constitute a prescription or diagnosis. Always consult a qualified clinician or health worker for medical advice."
            )

    # Fever / Bukhar / Temperature
    if any(k in msg_lower for k in ["fever", "bukhar", "temperature", "tapman", "thand"]):
        if lang == "hi":
            return (
                "हल्के बुखार की घरेलू देखभाल व प्राथमिक मार्गदर्शन:\n\n"
                "• मरीज को भरपूर आराम दें और ढीले, आरामदायक सूती कपड़े पहनाएं।\n"
                "• माथे और हथेलियों पर सामान्य (ताजे) पानी की पट्टी रखें। कभी भी बर्फ या अत्यधिक ठंडे पानी का उपयोग न करें।\n"
                "• शरीर में पानी की कमी न होने दें—उबला पानी, दाल का पानी, या ओआरएस देते रहें।\n"
                "• यदि बुखार 3 दिन से अधिक रहे, तेज कंपकंपी हो, या गर्दन में अकड़न हो तो तुरंत नजदीकी स्वास्थ्य केंद्र (PHC) जाएं।\n\n"
                "सामान्य स्वास्थ्य सूचना (General Health Guidance): मैं दवाओं की खुराक निर्धारित नहीं कर सकता। बुखार कम करने वाली दवाओं के लिए स्वास्थ्य कार्यकर्ता या डॉक्टर से परामर्श लें।"
            )
        elif lang == "pa":
            return (
                "ਬੁਖ਼ਾਰ ਦੌਰਾਨ ਮੁੱਢਲੀ ਦੇਖਭਾਲ:\n\n"
                "• ਮਰੀਜ਼ ਨੂੰ ਹਲਕੇ ਕੱਪੜੇ ਪਾਓ ਅਤੇ ਤਾਜ਼ੇ ਪਾਣੀ ਦੀਆਂ ਪੱਟੀਆਂ ਮੱਥੇ 'ਤੇ ਰੱਖੋ।\n"
                "• ਤਰਲ ਪਦਾਰਥ ਜਿਵੇਂ ਦਾਲ ਦਾ ਪਾਣੀ ਜਾਂ ਓਆਰਐਸ ਵੱਧ ਦਿਓ।\n"
                "• ਬੁਖ਼ਾਰ ਲੰਮਾ ਸਮਾਂ ਰਹੇ ਤਾਂ ਤੁਰੰਤ ਡਾਕਟਰ ਨੂੰ ਦਿਖਾਓ।\n\n"
                "ਆਮ ਸਿਹਤ ਸੂਚਨਾ (General Health Guidance): ਦਵਾਈਆਂ ਦੀ ਖ਼ੁਰਾਕ ਲਈ ਸਿਹਤ ਕਰਮਚਾਰੀ ਨਾਲ ਸਲਾਹ ਕਰੋ।"
            )
        else:
            return (
                "General Health Guidance for Fever Management:\n\n"
                "• Ensure adequate rest in a well-ventilated room with lightweight cotton bedding.\n"
                "• Apply normal room-temperature water compresses (sponging) to the forehead and arms to safely lower core temperature. Never use ice or very cold water.\n"
                "• Maintain high fluid intake: boiled water, thin soups, or ORS to prevent dehydration.\n"
                "• Alert red flags: fever lasting more than 3 days, stiff neck, new skin rash, confusion, or breathing distress require immediate doctor evaluation.\n\n"
                "General Health Education: This system does not diagnose or prescribe drug dosages. Please consult your local Primary Health Centre (PHC) or clinician for medical assessment."
            )

    # Dengue / Malaria / Mosquito / Machhar
    if any(k in msg_lower for k in ["dengue", "malaria", "mosquito", "machhar", "machar", "chikungunya"]):
        if lang == "hi":
            return (
                "मच्छर जनित रोगों (डेंगू, मलेरिया) से बचाव के उपाय:\n\n"
                "• घर और आस-पास पानी जमा न होने दें। कूलर, गमले और टायरों का पानी हर सप्ताह खाली करें और सुखाएं।\n"
                "• सोते समय हमेशा कीटनाशक उपचारित मच्छरदानी का प्रयोग करें।\n"
                "• पूरी आस्तीन के कपड़े पहनें ताकि मच्छर काटने से बचा जा सके।\n"
                "• तेज बुखार, जोड़ों में तेज दर्द, या आंखों के पीछे दर्द होने पर तुरंत नजदीकी स्वास्थ्य केंद्र जाकर रक्त जांच कराएं।\n\n"
                "सामान्य स्वास्थ्य सूचना (General Health Guidance): यह सामान्य स्वास्थ्य शिक्षा है। बुखार होने पर बिना डॉक्टर की सलाह के कोई दवा न लें।"
            )
        else:
            return (
                "Vector-Borne Disease Prevention (Dengue & Malaria):\n\n"
                "• Eliminate stagnant water sources around homes, overhead tanks, air coolers, and discarded containers at least once a week.\n"
                "• Sleep under insecticide-treated bed nets and install window mesh screens.\n"
                "• Wear full-sleeved, light-coloured clothing during daytime and dusk when vectors are active.\n"
                "• Seek urgent blood screening at your local health centre if high fever develops alongside retro-orbital eye pain or severe joint aches.\n\n"
                "General Health Guidance: Educational awareness only. Please consult your local health worker or doctor for clinical advice."
            )

    # Maternal / Pregnancy / Garbhavastha
    if any(k in msg_lower for k in ["pregnant", "pregnancy", "garbh", "maternal", "delivery", "prasav"]):
        if lang == "hi":
            return (
                "गर्भावस्था में स्वास्थ्य व पोषण संबंधी मार्गदर्शन:\n\n"
                "• संतुलित आहार लें: हरी पत्तेदार सब्जियां, दालें, दूध, फल और पर्याप्त पानी शामिल करें।\n"
                "• स्वास्थ्य उपकेंद्र या आशा कार्यकर्ता से नियमित प्रसव-पूर्व जांच (ANC) कराएं।\n"
                "• डॉक्टर या एएनएम (ANM) द्वारा दी गई आयरन और फोलिक एसिड की गोलियां नियमित रूप से लें।\n"
                "• खतरे के लक्षण: अत्यधिक रक्तस्राव, तेज सिरदर्द, धुंधला दिखना, या पैरों में अचानक सूजन आने पर तुरंत अस्पताल जाएं।\n\n"
                "सामान्य स्वास्थ्य सूचना (General Health Guidance): गर्भावस्था के दौरान किसी भी चिकित्सीय समस्या के लिए तुरंत डॉक्टर या एएनएम से संपर्क करें।"
            )
        else:
            return (
                "Antenatal & Maternal Health Guidance:\n\n"
                "• Maintain nutrient-rich meals with dark green leafy vegetables, lentils, dairy, and whole grains to support maternal and fetal wellbeing.\n"
                "• Attend all scheduled Antenatal Care (ANC) visits at your nearest Sub-Centre or PHC.\n"
                "• Comply with iron-folic acid and calcium supplementation as prescribed by your auxiliary nurse midwife (ANM).\n"
                "• Report any danger signs (vaginal bleeding, severe persistent headache, visual disturbance, or severe swelling) to a doctor immediately.\n\n"
                "General Health Guidance: Educational advice only. A qualified medical officer must oversee all maternal clinical care."
            )

    # General Fallback
    if lang == "hi":
        return (
            "नमस्ते। मैं सहायक हूँ — आपका स्वास्थ्य सूचना सहयोगी।\n\n"
            "• स्वास्थ्य संबंधी सामान्य प्रश्नों, स्वच्छता, पोषण, ओआरएस घोल, या मौसमी बीमारियों से बचाव के बारे में पूछ सकते हैं।\n"
            "• अपने लक्षणों को समझने या बुनियादी घरेलू प्राथमिक उपचार की जानकारी के लिए दिए गए ऑडियो प्रोटोकॉल भी सुन सकते हैं।\n\n"
            "सामान्य स्वास्थ्य सूचना (General Health Guidance): मैं केवल सामान्य स्वास्थ्य शिक्षा प्रदान करता हूँ। मैं किसी बीमारी का निदान, उपचार या दवा की खुराक नहीं बता सकता। कृपया चिकित्सीय सलाह के लिए स्थानीय प्राथमिक स्वास्थ्य केंद्र (PHC) या डॉक्टर से संपर्क करें।"
        )
    elif lang == "pa":
        return (
            "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ। ਮੈਂ ਸਹਾਇਕ ਹਾਂ — ਤੁਹਾਡਾ ਸਿਹਤ ਸੂਚਨਾ ਸਹਾਇਕ।\n\n"
            "• ਤੁਸੀਂ ਆਮ ਸਿਹਤ, ਪੋਸ਼ਣ, ਪੀਣ ਵਾਲੇ ਪਾਣੀ ਦੀ ਸਫ਼ਾਈ, ਜਾਂ ਬੁਖ਼ਾਰ ਦੀ ਦੇਖਭਾਲ ਬਾਰੇ ਜਾਣਕਾਰੀ ਲੈ ਸਕਦੇ ਹੋ।\n\n"
            "ਆਮ ਸਿਹਤ ਸੂਚਨਾ (General Health Guidance): ਇਹ ਕੇਵਲ ਸਿੱਖਿਆ ਲਈ ਹੈ। ਦਵਾਈ ਜਾਂ ਇਲਾਜ ਲਈ ਆਪਣੇ ਨਜ਼ਦੀਕੀ ਸਿਹਤ ਕੇਂਦਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।"
        )
    else:
        return (
            "Greetings. I am Sahayak, your community health education assistant.\n\n"
            "• You can ask me about safe drinking water, childhood nutrition, fever home-care principles, ORS rehydration, or disease prevention.\n"
            "• For common emergency directives, you can also select the spoken voice protocols on the panel.\n\n"
            "General Health Guidance: I provide general health education only. I cannot diagnose conditions, provide treatment plans, or recommend medication doses. Please consult your local health worker or doctor for clinical advice."
        )


def call_gemini_api(api_key: str, message: str, lang: str) -> Optional[str]:
    import httpx

    target_lang = "Hindi" if lang == "hi" else ("Punjabi" if lang == "pa" else "English")
    system_instruction = (
        "You are Sahayak, an explainable rural health education copilot created for community health workers and rural citizens in India. "
        "Provide clear, practical, empathetic general health, hygiene, first-aid, or wellness guidance. "
        "STRICT SAFETY DIRECTIVES: "
        "1. Never diagnose illnesses or provide clinical verdicts. "
        "2. Never prescribe medications or specify drug dosages (e.g., mg, ml, tablets). "
        "3. Emphasize that community members should consult an ASHA, ANM, or Primary Health Centre doctor for personal medical care. "
        f"Answer concisely in {target_lang} (under 160 words) with clear bullet points where helpful."
    )

    models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]

    for model in models:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "systemInstruction": {
                    "parts": [{"text": system_instruction}]
                },
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": message}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 450
                }
            }
            res = httpx.post(url, json=payload, timeout=12.0)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"].strip()

            # Fallback format for older/alternative endpoint signatures
            fallback_payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"Instruction: {system_instruction}\nUser question: {message}"}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 450
                }
            }
            res2 = httpx.post(url, json=fallback_payload, timeout=12.0)
            if res2.status_code == 200:
                data = res2.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"].strip()
        except Exception:
            continue
    return None


@router.post("", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest, request: Request) -> ChatResponse:
    # Role gate: Chatbot is exclusively for Client/Patient use; blocked for Clinicians/Staff ('auth')
    auth_header = request.headers.get("Authorization") or request.headers.get("X-Auth-Token")
    if auth_header:
        token = extract_token_from_headers(auth_header)
        if token:
            with get_db() as conn:
                user = get_user_from_token(conn, token)
            if user and user.get("role") == "auth":
                raise APIException(
                    status_code=403,
                    code="role_forbidden",
                    message="Access restricted: Sahayak Chatbot is designated for Client/Patient use only. Clinicians use the Triage and Referral workspace.",
                )

    client_ip = request.client.host if request.client else "unknown"
    now_time = time.time()
    cutoff = now_time - 60.0

    # Evict stale client IPs from memory to prevent memory leaks
    stale_ips = [ip for ip, ts_list in _CHAT_REQUEST_HISTORY.items() if not ts_list or ts_list[-1] <= cutoff]
    for ip in stale_ips:
        _CHAT_REQUEST_HISTORY.pop(ip, None)

    history = [ts for ts in _CHAT_REQUEST_HISTORY[client_ip] if ts > cutoff]
    if len(history) >= _MAX_REQUESTS_PER_MINUTE:
        _CHAT_REQUEST_HISTORY[client_ip] = history
        raise APIException(
            status_code=429,
            code="rate_limit_exceeded",
            message="Rate limit exceeded: at most 10 requests per minute allowed.",
            retryable=True,
        )
    history.append(now_time)
    _CHAT_REQUEST_HISTORY[client_ip] = history

    is_hindi = req.language == "hi" or any("\u0900" <= ch <= "\u097f" for ch in req.message)
    is_punjabi = req.language == "pa" or any("\u0a00" <= ch <= "\u0a7f" for ch in req.message)
    lang = "pa" if is_punjabi else ("hi" if is_hindi else "en")

    # 1. Deterministic red flag pre-filter BEFORE any LLM call (REQ-022, DEC-009, 03 §8)
    if detect_red_flags(req.message):
        escalation_reply = EMERGENCY_TEXT_HI if is_hindi else EMERGENCY_TEXT_EN
        return ChatResponse(
            reply=escalation_reply,
            escalated=True,
            language=lang,
            provider="deterministic_emergency_filter",
        )

    # 2. Extract API Key (from header, request body, or environment)
    effective_api_key = (
        req.api_key
        or request.headers.get("x-gemini-key")
        or request.headers.get("x-llm-key")
        or LLM_API_KEY
    )

    # 3. If an API key is available, call the live Google Gemini API
    if effective_api_key:
        llm_reply = call_gemini_api(effective_api_key, req.message, lang)
        if llm_reply:
            # Output safety filter: if response contains specific dosage patterns, block it
            if DOSE_REGEX.search(llm_reply):
                llm_reply = (
                    "मैं दवाओं की खुराक की सलाह नहीं दे सकता। कृपया स्वास्थ्य कार्यकर्ता से परामर्श लें।"
                    if is_hindi
                    else "I cannot advise on medicine dosages. Please consult a qualified health worker."
                )

            # Ensure general health educational disclaimer is present
            if "general health" not in llm_reply.lower() and "स्वास्थ्य" not in llm_reply:
                llm_reply += (
                    "\n\n[General Health Education: This information is for general awareness. Consult your PHC doctor or ASHA for clinical diagnosis and care.]"
                )

            return ChatResponse(
                reply=llm_reply,
                escalated=False,
                language=lang,
                provider="gemini_generative_api",
            )

    # 4. Fallback / Offline Mode: Use intelligent vernacular clinical knowledge synthesizer
    offline_reply = generate_offline_health_guidance(req.message, lang)
    return ChatResponse(
        reply=offline_reply,
        escalated=False,
        language=lang,
        provider="offline_health_knowledge_engine",
    )


@router.get("/protocols")
def get_chat_protocols() -> List[Dict[str, Any]]:
    """
    Returns server-managed vernacular emergency and first-aid protocols for frontline health workers.
    """
    return [
        {
            "id": "chest_pain",
            "title": "सीने में तेज दर्द और पसीना आने पर क्या करें?",
            "subtitle": "Acute Chest Pain & Angina First-Aid Protocol",
            "lang": "hi-IN",
            "text": "मरीज को तुरंत आराम की स्थिति में बैठाएं। तंग कपड़े ढीले करें। यदि मरीज पहले से डॉक्टर की सलाह पर एस्पिरिन लेता है, तो तुरंत डॉक्टर से संपर्क करें। बिना देरी किए नजदीकी अस्पताल ले जाएं।",
        },
        {
            "id": "pediatric_convulsion",
            "title": "ਤੇਜ਼ ਬੁਖ਼ਾਰ ਅਤੇ ਝਟਕੇ ਲੱਗਣ 'ਤੇ ਮੁੱਢਲੀ ਸਹਾਇਤਾ",
            "subtitle": "Pediatric Febrile Convulsion Steps (0-5 Yrs)",
            "lang": "pa-IN",
            "text": "ਬੱਚੇ ਨੂੰ ਇੱਕ ਪਾਸੇ ਲਿਟਾਓ ਤਾਂ ਜੋ ਸਾਹ ਨਾਲੀ ਸਾਫ਼ ਰਹੇ। ਮੂੰਹ ਵਿੱਚ ਕੁੱਝ ਨਾ ਪਾਓ। ਤਾਜ਼ੇ ਪਾਣੀ ਦੀ ਪੱਟੀ ਮੱਥੇ ਤੇ ਰੱਖੋ। ਤੁਰੰਤ ਸਿਹਤ ਕੇਂਦਰ ਲੈ ਕੇ ਜਾਓ।",
        },
        {
            "id": "pph",
            "title": "गर्भावस्था में अत्यधिक रक्तस्राव की स्थिति",
            "subtitle": "Post-Partum Hemorrhage Immediate Steps",
            "lang": "hi-IN",
            "text": "गर्भवती महिला को बाईं करवट लिटाएं। पैर थोड़े ऊंचे रखें। तुरंत एंबुलेंस या वाहन की व्यवस्था करें और स्वास्थ्य कार्यकर्ता या डॉक्टर को सूचित करें।",
        },
        {
            "id": "snakebite",
            "title": "ਸੱਪ ਦੇ ਡੰਗਣ 'ਤੇ ਜ਼ਰੂਰੀ ਕਦਮ",
            "subtitle": "Snakebite Triage & Immobilization",
            "lang": "pa-IN",
            "text": "ਡੰਗ ਵਾਲੇ ਅੰਗ ਨੂੰ ਬਿਲਕੁਲ ਹਿੱਲਣ ਨਾ ਦਿਓ। ਕੋਈ ਕੱਟ ਨਾ ਲਗਾਓ। ਮਰੀਜ਼ ਨੂੰ ਸ਼ਾਂਤ ਰੱਖੋ ਅਤੇ ਤੁਰੰਤ ਐਂਟੀ ਸਨੇਕ ਵੈਨਮ ਵਾਲੇ ਹਸਪਤਾਲ ਪਹੁੰਚਾਓ।",
        },
    ]
