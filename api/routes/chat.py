from collections import defaultdict
import re
import time
from typing import Any, Dict, List
from fastapi import APIRouter, Request

from api.config import LLM_API_KEY
from api.errors import APIException
from api.models import ChatRequest, ChatResponse

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


@router.post("", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest, request: Request) -> ChatResponse:
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
    lang = "hi" if is_hindi else "en"

    # 1. Deterministic red flag pre-filter BEFORE any LLM call (REQ-022, DEC-009, 03 §8)
    if detect_red_flags(req.message):
        escalation_reply = EMERGENCY_TEXT_HI if is_hindi else EMERGENCY_TEXT_EN
        return ChatResponse(
            reply=escalation_reply,
            escalated=True,
            language=lang,
        )

    # 2. If no API key is available or offline, return static safety information (RISK-007, 03 §8)
    if not LLM_API_KEY:
        safety_reply = STATIC_SAFETY_HI if is_hindi else STATIC_SAFETY_EN
        return ChatResponse(
            reply=safety_reply,
            escalated=False,
            language=lang,
        )

    # 3. Call LLM provider with isolated guardrails (SEC-003, 03 §8)
    try:
        import httpx

        system_instruction = (
            "You are UpcharAI Health Assistant, an informational bot for rural community members. "
            "You provide general health and hygiene information only. "
            "You MUST NEVER diagnose diseases, recommend prescriptions, or provide medication doses. "
            "If the user asks for doses, tell them to ask a healthcare worker. "
            f"Answer concisely in {'Hindi' if is_hindi else 'English'}."
        )

        response = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={LLM_API_KEY}",
            json={
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"Instruction: {system_instruction}\nUser question: {req.message}"}],
                    }
                ],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 200},
            },
            timeout=5.0,
        )

        if response.status_code == 200:
            res_json = response.json()
            candidates = res_json.get("candidates", [])
            reply_text = candidates[0]["content"]["parts"][0]["text"] if candidates else ""

            # 4. Output filter: if response contains dosage pattern, block it (03 §8)
            if DOSE_REGEX.search(reply_text):
                reply_text = (
                    "मैं दवाओं की खुराक की सलाह नहीं दे सकता। कृपया स्वास्थ्य कार्यकर्ता से परामर्श लें।"
                    if is_hindi
                    else "I can't advise on medicines. Please ask a health worker."
                )

            return ChatResponse(
                reply=reply_text,
                escalated=False,
                language=lang,
            )
        else:
            safety_reply = STATIC_SAFETY_HI if is_hindi else STATIC_SAFETY_EN
            return ChatResponse(reply=safety_reply, escalated=False, language=lang)
    except Exception:
        # Fallback to static safety reply when network/LLM is unreachable
        safety_reply = STATIC_SAFETY_HI if is_hindi else STATIC_SAFETY_EN
        return ChatResponse(reply=safety_reply, escalated=False, language=lang)


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

