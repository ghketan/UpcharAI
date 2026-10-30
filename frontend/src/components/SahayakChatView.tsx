import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api, ApiError } from '../api';
import { ChatMessage } from '../types';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Send,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Shield,
  Bot,
  User,
  Radio,
  FileQuestion,
  Mic,
  MicOff,
} from 'lucide-react';

interface VoiceProtocol {
  id: string;
  title: string;
  subtitle: string;
  lang: string;
  text: string;
}

const VOICE_PROTOCOLS: VoiceProtocol[] = [
  {
    id: 'chest_pain',
    title: 'सीने में तेज दर्द और पसीना आने पर क्या करें?',
    subtitle: 'Acute Chest Pain & Angina First-Aid Protocol',
    lang: 'hi-IN',
    text: 'मरीज को तुरंत आराम की स्थिति में बैठाएं। तंग कपड़े ढीले करें। यदि मरीज पहले से डॉक्टर की सलाह पर एस्पिरिन लेता है, तो तुरंत डॉक्टर से संपर्क करें। बिना देरी किए नजदीकी अस्पताल ले जाएं।',
  },
  {
    id: 'pediatric_convulsion',
    title: "ਤੇਜ਼ ਬੁਖ਼ਾਰ ਅਤੇ ਝਟਕੇ ਲੱਗਣ 'ਤੇ ਮੁੱਢਲੀ ਸਹਾਇਤਾ",
    subtitle: 'Pediatric Febrile Convulsion Steps (0-5 Yrs)',
    lang: 'pa-IN',
    text: 'ਬੱਚੇ ਨੂੰ ਇੱਕ ਪਾਸੇ ਲਿਟਾਓ ਤਾਂ ਜੋ ਸਾਹ ਨਾਲੀ ਸਾਫ਼ ਰਹੇ। ਮੂੰਹ ਵਿੱਚ ਕੁੱਝ ਨਾ ਪਾਓ। ਤਾਜ਼ੇ ਪਾਣੀ ਦੀ ਪੱਟੀ ਮੱਥੇ ਤੇ ਰੱਖੋ। ਤੁਰੰਤ ਸਿਹਤ ਕੇਂਦਰ ਲੈ ਕੇ ਜਾਓ।',
  },
  {
    id: 'pph',
    title: 'गर्भावस्था में अत्यधिक रक्तस्राव की स्थिति',
    subtitle: 'Post-Partum Hemorrhage Immediate Steps',
    lang: 'hi-IN',
    text: 'गर्भवती महिला को बाईं करवट लिटाएं। पैर थोड़े ऊंचे रखें। तुरंत एंबुलेंस या वाहन की व्यवस्था करें और स्वास्थ्य कार्यकर्ता या डॉक्टर को सूचित करें।',
  },
  {
    id: 'snakebite',
    title: "ਸੱਪ ਦੇ ਡੰਗਣ 'ਤੇ ਜ਼ਰੂਰੀ ਕਦਮ",
    subtitle: 'Snakebite Triage & Immobilization',
    lang: 'pa-IN',
    text: 'ਡੰਗ ਵਾਲੇ ਅੰਗ ਨੂੰ ਬਿਲਕੁਲ ਹਿੱਲਣ ਨਾ ਦਿਓ। ਕੋਈ ਕੱਟ ਨਾ ਲਗਾਓ। ਮਰੀਜ਼ ਨੂੰ ਸ਼ਾਂਤ ਰੱਖੋ ਅਤੇ ਤੁਰੰਤ ਐਂਟੀ ਸਨੇਕ ਵੈਨਮ ਵਾਲੇ ਹਸਪਤਾਲ ਪਹੁੰਚਾਓ।',
  },
];

export const SahayakChatView: React.FC = () => {
  const { role, showToast } = useApp();

  const [language, setLanguage] = useState<'en' | 'hi' | 'pa'>('en');
  const [practitionerMode, setPractitionerMode] = useState<boolean>(true);
  const [protocols, setProtocols] = useState<VoiceProtocol[]>(VOICE_PROTOCOLS);
  const [isListening, setIsListening] = useState<boolean>(false);

  useEffect(() => {
    api.getChatProtocols(role).then((data) => {
      if (data && data.length > 0) setProtocols(data);
    }).catch(() => {});
  }, [role]);

  const recognitionRef = useRef<any>(null);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser. Please use Chrome.', 'warning');
      return;
    }
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      setIsListening(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = language === 'hi' ? 'hi-IN' : language === 'pa' ? 'pa-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
        showToast('Speech converted to text', 'info');
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Namaste. I am Sahayak, an explainable health information assistant for frontline workers. Ask general triage guidance or tap any voice protocol on the left. (Notice: General information only, not clinical advice).',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  // Audio Playback State
  const [activeVoiceTrack, setActiveVoiceTrack] = useState<VoiceProtocol | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Web Speech API Voice synthesis
  const playVoiceTrack = (protocol: VoiceProtocol) => {
    if (!('speechSynthesis' in window)) {
      showToast('Speech synthesis is not supported on this browser', 'warning');
      return;
    }

    window.speechSynthesis.cancel();

    if (activeVoiceTrack?.id === protocol.id && isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      return;
    }

    setActiveVoiceTrack(protocol);
    setIsPlaying(true);

    const utterance = new SpeechSynthesisUtterance(protocol.text);
    activeUtteranceRef.current = utterance;
    utterance.lang = protocol.lang;
    utterance.rate = speechRate;

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopVoice = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || sending) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setSending(true);

    try {
      const response = await api.sendMessage(text.trim(), language, role);
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        escalated: response.escalated,
        language: response.language,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 429) {
        showToast('Rate limit reached: Maximum 10 questions per minute', 'warning');
      } else {
        showToast(err.message || 'Chat service offline', 'error');
      }
    } finally {
      setSending(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: 'Dialogue cleared. Ready for your questions.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      
      {/* Top Editorial Header */}
      <section className="flex flex-col items-center text-center max-w-3xl mx-auto gap-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#aceec4]/40 text-[#2f6e4c] font-mono text-xs shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#2a6a48] animate-pulse" />
          <span>Vernacular Clinical Copilot (Zero-Hallucination Core)</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1c1a]">
          Sahayak Frontline Co-Pilot{' '}
          <span className="block font-normal text-xl sm:text-2xl text-[#2a6a48] mt-1 font-serif">
            (सहायक // ਸਹਾਇਕ)
          </span>
        </h1>

        <p className="text-sm text-[#444748] max-w-2xl leading-relaxed">
          Vernacular health education and rapid spoken emergency directives for ASHA, ANM, and Community Health Officers.
        </p>

        {/* Language & Role Mode Selector Strip */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {/* Language Selector */}
          <div className="flex items-center p-1 rounded-full bg-[#efeeeb] border border-[#e3e2e0] text-xs font-mono">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                language === 'en' ? 'bg-[#000000] text-white' : 'text-[#444748] hover:text-[#1a1c1a]'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                language === 'hi' ? 'bg-[#000000] text-white' : 'text-[#444748] hover:text-[#1a1c1a]'
              }`}
            >
              हिन्दी (Hindi)
            </button>
            <button
              onClick={() => setLanguage('pa')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                language === 'pa' ? 'bg-[#000000] text-white' : 'text-[#444748] hover:text-[#1a1c1a]'
              }`}
            >
              ਪੰਜਾਬੀ (Punjabi)
            </button>
          </div>

          {/* Practitioner vs Patient Mode */}
          <div className="flex items-center p-1 rounded-full bg-[#efeeeb] border border-[#e3e2e0] text-xs font-mono">
            <button
              onClick={() => setPractitionerMode(true)}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                practitionerMode ? 'bg-[#ffffff] text-[#1a1c1a] shadow-sm font-bold' : 'text-[#444748]'
              }`}
            >
              CHO / ANM Officer
            </button>
            <button
              onClick={() => setPractitionerMode(false)}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                !practitionerMode ? 'bg-[#ffffff] text-[#1a1c1a] shadow-sm font-bold' : 'text-[#444748]'
              }`}
            >
              Patient Mode (सरल)
            </button>
          </div>
        </div>
      </section>

      {/* Central Dual-Pane Audio & Chat Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT PANE: Rapid Spoken Voice Protocols (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm flex flex-col gap-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-[#e3e2e0]">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#2a6a48]" />
                <h2 className="text-base font-bold text-[#1a1c1a]">Instant Voice Protocols</h2>
              </div>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#f4f3f1] text-[#444748] border border-[#e3e2e0]">
                1-Tap Audio
              </span>
            </div>

            <p className="text-xs text-[#747878] leading-relaxed">
              Spoken emergency sequences designed to broadcast aloud to orient caregivers or family members during encounters.
            </p>

            {/* Protocol Buttons List */}
            <div className="flex flex-col gap-2.5">
              {protocols.map((protocol) => {
                const isSelected = activeVoiceTrack?.id === protocol.id;
                return (
                  <div
                    key={protocol.id}
                    onClick={() => playVoiceTrack(protocol)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#aceec4]/25 border-[#2a6a48]'
                        : 'bg-[#f4f3f1] border-[#e3e2e0] hover:bg-[#efeeeb]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-[#1a1c1a]">
                        {protocol.title}
                      </span>
                      <span className="text-xs text-[#747878] font-mono mt-0.5">
                        {protocol.subtitle}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                        isSelected && isPlaying
                          ? 'bg-[#ba1a1a] text-white scale-105'
                          : 'bg-[#000000] text-white hover:scale-105'
                      }`}
                    >
                      {isSelected && isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Active Voice Player Bar */}
            {activeVoiceTrack && (
              <div className="p-4 rounded-2xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#1a1c1a] truncate max-w-[200px]">
                    Playing: {activeVoiceTrack.subtitle}
                  </span>
                  <button
                    onClick={stopVoice}
                    className="text-xs text-[#ba1a1a] font-mono hover:underline cursor-pointer"
                  >
                    Stop Audio
                  </button>
                </div>

                {/* Animated Waveform Visualizer */}
                <div className="w-full h-8 flex items-center gap-1 px-1">
                  {[4, 8, 6, 9, 5, 8, 4, 7, 3, 6, 8, 5, 3, 6, 4].map((height, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-150 ${
                        isPlaying ? 'bg-[#2a6a48] animate-pulse' : 'bg-[#c4c7c7]'
                      }`}
                      style={{ height: isPlaying ? `${height * 3}px` : '6px' }}
                    />
                  ))}
                </div>

                {/* Speed Controls */}
                <div className="flex items-center justify-between pt-1 text-xs font-mono text-[#747878]">
                  <span>Playback Speed:</span>
                  <div className="flex items-center gap-1">
                    {[0.8, 1.0, 1.2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setSpeechRate(rate)}
                        className={`px-2 py-0.5 rounded-md cursor-pointer ${
                          speechRate === rate
                            ? 'bg-[#000000] text-white'
                            : 'bg-white text-[#444748] border border-[#e3e2e0]'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Disclaimer pill */}
            <div className="p-3 rounded-xl bg-[#ffffff] border border-[#e3e2e0] flex items-start gap-2 text-xs text-[#747878]">
              <Shield className="w-4 h-4 text-[#2a6a48] shrink-0 mt-0.5" />
              <span>
                Deterministic red-flag detector active. Messages describing critical emergency symptoms automatically trigger direct hospital escalation alerts.
              </span>
            </div>

          </div>
        </section>

        {/* RIGHT PANE: Conversational Chatbot Stream (7 cols) */}
        <section className="lg:col-span-7 flex flex-col rounded-3xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm min-h-[580px] justify-between overflow-hidden">
          
          {/* Chat Header */}
          <div className="p-4 sm:p-5 border-b border-[#e3e2e0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full bg-[#000000] text-white flex items-center justify-center">
                <Bot className="w-5 h-5 text-[#aff1c6]" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#2a6a48] ring-2 ring-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1a1c1a]">Sahayak Clinical Copilot</h3>
                <span className="text-xs text-[#747878] font-mono">
                  General Health Information · Does Not Diagnose
                </span>
              </div>
            </div>

            <button
              onClick={clearChat}
              title="Reset conversation"
              className="w-8 h-8 rounded-full bg-[#f4f3f1] hover:bg-[#e9e8e5] text-[#444748] flex items-center justify-center transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[460px] flex flex-col gap-4">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 flex flex-col gap-1.5 shadow-sm ${
                      isUser
                        ? 'bg-[#000000] text-white rounded-tr-none'
                        : msg.escalated
                        ? 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a] rounded-tl-none'
                        : 'bg-[#f4f3f1] text-[#1a1c1a] border border-[#e3e2e0] rounded-tl-none'
                    }`}
                  >
                    {msg.escalated && (
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-[#ba1a1a] pb-1 border-b border-[#ba1a1a]/30">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Emergency Red-Flag Alert Triggered</span>
                      </div>
                    )}

                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                    <span
                      className={`text-[10px] font-mono self-end ${
                        isUser ? 'text-[#a8abaa]' : 'text-[#747878]'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestions & Message Input Form */}
          <div className="p-4 bg-[#f4f3f1] border-t border-[#e3e2e0] flex flex-col gap-3">
            
            {/* Quick Prompt Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-mono">
              <button
                type="button"
                onClick={() =>
                  handleSendMessage('What are the critical danger signs in second trimester pregnancy?')
                }
                className="px-2.5 py-1 rounded-full bg-white text-[#444748] hover:text-[#1a1c1a] border border-[#e3e2e0] whitespace-nowrap cursor-pointer"
              >
                Pregnancy Danger Signs
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('How to recognise hypovolemic shock in a field clinic?')}
                className="px-2.5 py-1 rounded-full bg-white text-[#444748] hover:text-[#1a1c1a] border border-[#e3e2e0] whitespace-nowrap cursor-pointer"
              >
                Hypovolemic Shock
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSendMessage('Patient has severe chest pain and breathlessness')
                }
                className="px-2.5 py-1 rounded-full bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/30 whitespace-nowrap cursor-pointer"
              >
                Test Red-Flag Filter
              </button>
            </div>

            {/* Input & Send Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={
                  language === 'hi'
                    ? 'यहाँ अपना प्रश्न लिखें या माइक दबाएं...'
                    : language === 'pa'
                    ? 'ਇੱਥੇ ਆਪਣਾ ਸਵਾਲ ਲਿਖੋ...'
                    : 'Ask clinical triage question or click mic...'
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={sending}
                className="flex-1 px-4 py-2.5 rounded-full bg-white text-sm text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none focus:ring-1 focus:ring-black"
              />
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 border ${
                  isListening
                    ? 'bg-[#ba1a1a] text-white border-[#ba1a1a] animate-pulse'
                    : 'bg-white text-[#444748] hover:text-[#1a1c1a] border-[#e3e2e0]'
                }`}
                title="Voice query (Hindi/Punjabi/English)"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                type="submit"
                disabled={sending || !inputMessage.trim()}
                className="w-10 h-10 rounded-full bg-[#000000] text-white flex items-center justify-center hover:bg-[#1c1b1b] disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4 text-[#aff1c6]" />
              </button>
            </form>

            <span className="text-[11px] text-[#747878] text-center font-mono">
              General information, not medical advice. Max 10 messages/minute.
            </span>
          </div>

        </section>

      </div>
    </div>
  );
};
