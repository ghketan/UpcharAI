import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Database,
  Cpu,
  Activity,
  Stethoscope,
  MessageSquare,
  Play,
  Pause,
  Volume2,
  Lock,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';
import { InteractiveOrb } from './InteractiveOrb';
import { ScrollReveal } from './ScrollReveal';

export const OverviewView: React.FC = () => {
  const { setActiveTab } = useApp();
  const [playingAudio, setPlayingAudio] = useState<'hindi' | 'punjabi' | null>(null);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const audioTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioTimerRef.current) {
        clearTimeout(audioTimerRef.current);
      }
    };
  }, []);

  const playVoiceDirective = (lang: 'hindi' | 'punjabi', text: string) => {
    if (audioTimerRef.current) {
      clearTimeout(audioTimerRef.current);
      audioTimerRef.current = null;
    }

    if (playingAudio === lang) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingAudio(null);
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.lang = lang === 'hindi' ? 'hi-IN' : 'pa-IN';
      utterance.rate = 0.9;
      utterance.onend = () => setPlayingAudio(null);
      utterance.onerror = () => setPlayingAudio(null);
      window.speechSynthesis.speak(utterance);
    }
    setPlayingAudio(lang);

    audioTimerRef.current = setTimeout(() => {
      setPlayingAudio((curr) => (curr === lang ? null : curr));
    }, 9000);
  };

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden pt-12 pb-16 md:pt-16 md:pb-24 bg-gradient-to-b from-[#faf9f6] via-[#f4f3f1] to-[#faf9f6]">
        {/* Ambient Glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[480px] bg-[#aff1c6]/30 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-[#aceec4]/40 rounded-full blur-[70px] pointer-events-none -z-10" />

        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          
          {/* Top Meta Capsule Badge */}
          <ScrollReveal animation="fade-up" delay={0}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ffffff]/80 backdrop-blur-md border border-[#e3e2e0] shadow-sm mb-6 transition-transform hover:scale-[1.02]">
              <span className="w-2 h-2 rounded-full bg-[#2a6a48] shadow-[0_0_8px_rgba(77,224,130,0.8)] animate-pulse" />
              <span className="font-mono text-xs text-[#444748] font-medium tracking-wide">
                Enterprise Rural Health AI Infrastructure
              </span>
            </div>
          </ScrollReveal>

          {/* Main Display Typography */}
          <ScrollReveal animation="fade-up" delay={100}>
            <h1 className="max-w-[960px] text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-[#1a1c1a] mb-6 leading-tight">
              Intelligence Infrastructure for<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#2a6a48] via-[#00984d] to-[#2a6a48] font-bold">
                The Frontline Clinical Era
              </span>
            </h1>
          </ScrollReveal>

          {/* Supporting Editorial Subtitle */}
          <ScrollReveal animation="fade-up" delay={200}>
            <p className="max-w-[680px] text-base sm:text-lg text-[#444748] mb-10 leading-relaxed">
              Deterministic clinical triage, zero-latency red-flag physiological validation, and structured referral escalation architected for community health workers with zero cloud internet reliance.
            </p>
          </ScrollReveal>

          {/* Action Button Group */}
          <ScrollReveal animation="fade-up" delay={300}>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8 z-10">
              <button
                onClick={() => setActiveTab('triage')}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#000000] text-[#ffffff] font-mono text-xs uppercase tracking-wider shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Launch Outpost CDSS</span>
                <ArrowUpRight className="w-4 h-4 text-[#aff1c6]" />
              </button>
              <button
                onClick={() => setActiveTab('emergency')}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#ffffff]/80 backdrop-blur-md text-[#1a1c1a] font-mono text-xs uppercase tracking-wider border border-[#e3e2e0] shadow-sm hover:bg-[#efeeeb] transition-all cursor-pointer"
              >
                <span>Emergency Referral Desk</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </ScrollReveal>

          {/* Interactive Light Mode Bio-Synthetic Orb Animation */}
          <ScrollReveal animation="zoom-in" delay={400} className="w-full max-w-[853px] mx-auto mt-2 relative z-0">
            <InteractiveOrb />
          </ScrollReveal>
        </div>
      </section>

      {/* Validation Metric Strip */}
      <section className="w-full bg-[#f4f3f1] py-12 border-y border-[#e3e2e0]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <ScrollReveal animation="fade-up" delay={0}>
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <span className="font-mono text-3xl sm:text-4xl text-[#1a1c1a] font-bold tracking-tight">100%</span>
                <span className="font-mono text-xs text-[#2a6a48] uppercase tracking-wider mt-1 font-semibold">Deterministic</span>
                <p className="text-xs text-[#444748] mt-1">Rule execution with zero probabilistic drift</p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={100}>
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <span className="font-mono text-3xl sm:text-4xl text-[#1a1c1a] font-bold tracking-tight">&lt; 10ms</span>
                <span className="font-mono text-xs text-[#2a6a48] uppercase tracking-wider mt-1 font-semibold">Local Inference</span>
                <p className="text-xs text-[#444748] mt-1">Zero network latency. Evaluates on device</p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={200}>
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <span className="font-mono text-3xl sm:text-4xl text-[#1a1c1a] font-bold tracking-tight">3 Tiers</span>
                <span className="font-mono text-xs text-[#2a6a48] uppercase tracking-wider mt-1 font-semibold">Strict Triaging</span>
                <p className="text-xs text-[#444748] mt-1">Emergency (Tier 1), Urgent (Tier 2), Routine (Tier 3)</p>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-up" delay={300}>
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <span className="font-mono text-3xl sm:text-4xl text-[#1a1c1a] font-bold tracking-tight">100%</span>
                <span className="font-mono text-xs text-[#2a6a48] uppercase tracking-wider mt-1 font-semibold">Offline Resilient</span>
                <p className="text-xs text-[#444748] mt-1">Encrypted SQLite state auto-syncs when uplink restores</p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Anti-Hallucination Architecture Section */}
      <section className="w-full py-20 bg-[#faf9f6]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
          <ScrollReveal animation="fade-up">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#efeeeb] text-[#2a6a48] font-mono text-xs mb-3 border border-[#e3e2e0]">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Anti-Hallucination Architecture</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-medium text-[#1a1c1a] tracking-tight">
                  Why Rural Triage Rejects Generative Black-Boxes
                </h2>
              </div>
              <p className="text-sm text-[#444748] max-w-md leading-relaxed">
                Probabilistic models fabricate medical dosages and miss pediatric danger signs. UpcharAI pairs deterministic decision graphs with IPHS emergency protocol locks.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Deterministic Clinical Gate */}
            <ScrollReveal animation="fade-left" delay={150}>
              <div className="h-full p-8 rounded-2xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#aceec4]/40 flex items-center justify-center text-[#2a6a48]">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <h3 className="font-medium text-lg text-[#1a1c1a]">Deterministic Clinical Gate</h3>
                    </div>
                    <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-[#aceec4] text-[#2a6a48] font-bold tracking-wider">
                      STABLE RULE #CR-04
                    </span>
                  </div>
                  <p className="text-xs text-[#444748] mb-6">
                    Live point-of-care validation of patient biometric threshold matrices without model drift.
                  </p>

                  <div className="flex flex-col gap-3">
                    {/* Rule 1 */}
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#ffdad6]/40 border border-[#ffdad6] text-[#ba1a1a]">
                      <div className="w-7 h-7 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        !
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-xs block text-[#1a1c1a]">
                          Rule #CR-04: Acute Hypoxemia with Stridor
                        </span>
                        <span className="text-[11px] text-[#444748]">
                          Condition: SpO2 &lt; 90% AND Respiratory Rate &gt; 32 bpm
                        </span>
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white font-bold tracking-wider shrink-0">
                        FLAGGED RED
                      </span>
                    </div>

                    {/* Rule 2 */}
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#ffffff] border border-[#e3e2e0] text-[#444748]">
                      <div className="w-7 h-7 rounded-full bg-[#aceec4] text-[#2a6a48] flex items-center justify-center font-bold text-xs shrink-0">
                        ✓
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-xs block text-[#1a1c1a]">
                          Rule #ACS-01: Ischemic Chest Pattern
                        </span>
                        <span className="text-[11px] text-[#444748]">
                          Condition: SBP &gt; 180 mmHg OR Diaphoresis &gt; 25 mins
                        </span>
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#efeeeb] text-[#747878] font-medium tracking-wider shrink-0">
                        STANDBY
                      </span>
                    </div>

                    {/* Rule 3 */}
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#ffffff] border border-[#e3e2e0] text-[#444748]">
                      <div className="w-7 h-7 rounded-full bg-[#aceec4] text-[#2a6a48] flex items-center justify-center font-bold text-xs shrink-0">
                        ✓
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-xs block text-[#1a1c1a]">
                          Rule #PNT-09: Neonatal Sepsis Screen
                        </span>
                        <span className="text-[11px] text-[#444748]">
                          Age &lt; 28d, Temp &gt; 38.0°C or &lt; 35.5°C, Refusal to suckle
                        </span>
                      </div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#efeeeb] text-[#747878] font-medium tracking-wider shrink-0">
                        STANDBY
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 mt-6 border-t border-[#e3e2e0] text-[11px] font-mono text-[#747878]">
                  <span>Decision Engine Version 4.2.1 • Zero Hallucination Vector</span>
                  <span className="font-bold text-[#2a6a48]">Protocol Verified 🔒</span>
                </div>
              </div>
            </ScrollReveal>

            {/* Real-Time Audit Log Terminal */}
            <ScrollReveal animation="fade-right" delay={150}>
              <div className="h-full p-8 rounded-2xl bg-[#14161a] text-[#ffffff] border border-[#2a2f33] flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <span className="font-mono text-[10px] tracking-wider text-[#4ade80] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_8px_#4ade80] animate-pulse" />
                      REAL-TIME AUDIT LOG
                    </span>
                    <Terminal className="w-4 h-4 text-[#747878]" />
                  </div>
                  <h3 className="text-2xl font-normal tracking-tight text-[#f4f4f5] mb-2">
                    Zero Probabilistic Drift
                  </h3>
                  <p className="text-xs text-[#9aa39e] mb-5 leading-relaxed">
                    Every clinical decision generates a cryptographically signed payload showing the exact rule execution chain, patient vitals delta, and reason codes for immediate referral triage.
                  </p>

                  <div className="p-4 rounded-xl bg-[#0f1110] border border-[#22272a] font-mono text-xs leading-loose text-[#9aa39e] overflow-x-auto select-all">
                    <div><span className="text-[#4ade80]">&gt; INTAKE:</span> Patient ID #PB-KK-409</div>
                    <div>&gt; PARSING: SpO2=88%, RR=34, Temp=102.4F, SBP=138</div>
                    <div><span className="text-[#4ade80]">&gt; EXECUTING:</span> Rule_CR04(SpO2&lt;90, RR&gt;32) -&gt; MATCH_TRUE</div>
                    <div>&gt; OVERRIDE: Prohibiting Routine Home Discharge</div>
                    <div><span className="text-[#ff7276]">&gt; ESCALATION:</span> 108 Emergency Referral Triggered</div>
                    <div>&gt; CHECKSUM: 0x8F5C40E2A197D4B9 <span className="text-[#4ade80]">VERIFIED OFFLINE</span></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 mt-6 border-t border-[#2a2f33] text-[11px] font-mono text-[#747878]">
                  <span>Deterministic Audit Standard 2026</span>
                  <span className="text-[#4ade80] font-bold">Tamper Evident 🔒</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 5-Step Rural Outpost Pipeline Section */}
      <section className="w-full py-20 bg-[#f4f3f1] border-y border-[#e3e2e0]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10 text-center">
          <ScrollReveal animation="fade-up">
            <div className="max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffffff] text-[#2a6a48] font-mono text-xs mb-3 border border-[#e3e2e0]">
                <Activity className="w-3.5 h-3.5" />
                <span>End-to-End Workflow</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-medium text-[#1a1c1a] tracking-tight mb-3">
                5-Step Rural Outpost Pipeline
              </h2>
              <p className="text-sm text-[#444748] leading-relaxed">
                Engineered for Auxiliary Nurse Midwives (ANMs) and Community Health Officers (CHOs) working under extreme field constraints.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-left">
            {[
              {
                num: '01',
                title: 'Vitals Intake',
                desc: 'Rapid single-screen entry of core biomarkers via smart Bluetooth monitors or manual digits.',
                badge: 'Edge Normalized',
                badgeColor: 'text-[#2a6a48]',
              },
              {
                num: '02',
                title: 'Deterministic CDSS',
                desc: 'Instant rule matching against 140+ IPHS red-flag emergency protocols with zero cloud latency.',
                badge: '< 10ms Resolution',
                badgeColor: 'text-[#2a6a48]',
              },
              {
                num: '03',
                title: 'Dynamic Queue',
                desc: 'Prioritizes waiting patients automatically by physiological severity rather than time-of-arrival.',
                badge: 'Zero Queue Bias',
                badgeColor: 'text-[#2a6a48]',
              },
              {
                num: '04',
                title: '108 SOS Escalation',
                desc: 'One-tap tele-triage dispatch with pre-filled clinical handover packet routed to District Hospital.',
                badge: 'Instant Handover',
                badgeColor: 'text-[#ba1a1a]',
              },
              {
                num: '05',
                title: 'Sahayak Voice',
                desc: 'Audio-guided bedside guidance in Hindi, Punjabi, and local dialects for immediate pre-referral steps.',
                badge: '100% Vernacular',
                badgeColor: 'text-[#2a6a48]',
              },
            ].map((step, idx) => (
              <ScrollReveal key={step.num} animation="fade-up" delay={idx * 90}>
                <div className="h-full p-6 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
                  <div>
                    <span className="font-mono text-3xl font-light text-[#c4c7c7] block mb-4">
                      {step.num}
                    </span>
                    <h3 className="font-medium text-base text-[#1a1c1a] mb-2">
                      {step.title}
                    </h3>
                    <p className="text-xs text-[#444748] leading-relaxed mb-6">
                      {step.desc}
                    </p>
                  </div>
                  <span className={`font-mono text-[10px] font-bold tracking-wider uppercase ${step.badgeColor}`}>
                    {step.badge}
                  </span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Live Outpost Buffer Table Section */}
      <section className="w-full py-20 bg-[#faf9f6]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal animation="zoom-in">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e3e2e0]">
                <div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-[#2a6a48] font-bold tracking-wider mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#2a6a48] animate-pulse" />
                    <span>LIVE OUTPOST BUFFER</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-medium text-[#1a1c1a]">
                    Health &amp; Wellness Sub-Centre • Khunnan Kalan
                  </h3>
                  <p className="text-xs text-[#747878] font-mono mt-0.5">
                    Muktsar District, Punjab • Local Gateway ID: PB-MKT-088 • Offline SQLite Encrypted
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('triage')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#000000] text-white font-mono text-xs cursor-pointer hover:bg-[#1a1c1a] transition-colors"
                  >
                    <span>+ Quick Intake Patient</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('telemetry')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#f4f3f1] text-[#1a1c1a] font-mono text-xs border border-[#e3e2e0] cursor-pointer hover:bg-[#e9e8e5] transition-colors"
                  >
                    <span>⌁ Offline Sync</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Buffer Table */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left min-w-[800px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#e3e2e0] font-mono text-[10px] text-[#747878] uppercase tracking-wider">
                      <th className="py-3 px-3">Severity Tier</th>
                      <th className="py-3 px-3">Patient / Demographics</th>
                      <th className="py-3 px-3">Chief Complaint</th>
                      <th className="py-3 px-3">Vitals Telemetry</th>
                      <th className="py-3 px-3">Deterministic Red-Flag</th>
                      <th className="py-3 px-3 text-right">Triage Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e3e2e0]/60 text-xs">
                    {/* Row 1 */}
                    <tr className="hover:bg-[#f4f3f1]/50 transition-colors">
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffdad6] text-[#ba1a1a] font-mono text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]" />
                          Tier 1 Emergency
                        </span>
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="font-bold text-[#1a1c1a] block">Harpreet Kaur, 28 F</span>
                        <span className="font-mono text-[10px] text-[#747878]">ABHA #91-3081-4401</span>
                      </td>
                      <td className="py-4 px-3 text-[#ba1a1a] font-medium max-w-[180px]">
                        Severe Dyspnea &amp; Post-Partum Rigors
                      </td>
                      <td className="py-4 px-3 font-mono text-[11px] text-[#444748] whitespace-nowrap">
                        <span className="text-[#ba1a1a] font-bold">SpO2: 87%</span> | BP: 85/50 | HR: 132 | Temp: 103.2°F
                      </td>
                      <td className="py-4 px-3">
                        <span className="inline-block px-2 py-1 rounded bg-[#ffdad6]/60 text-[#ba1a1a] font-mono text-[10px] font-medium border border-[#ffdad6]">
                          Rule #SEP-01: Septic Shock Matrix
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setActiveTab('emergency')}
                          className="px-3.5 py-1.5 rounded-full bg-[#ba1a1a] text-white font-mono text-[11px] font-bold cursor-pointer hover:bg-[#93000a] transition-all hover:scale-[1.02]"
                        >
                          Trigger 108 SOS
                        </button>
                      </td>
                    </tr>

                    {/* Row 2 */}
                    <tr className="hover:bg-[#f4f3f1]/50 transition-colors">
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fff4e5] text-[#d97706] font-mono text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
                          Tier 2 Urgent
                        </span>
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="font-bold text-[#1a1c1a] block">Gurdeep Singh, 54 M</span>
                        <span className="font-mono text-[10px] text-[#747878]">ABHA #91-8821-0021</span>
                      </td>
                      <td className="py-4 px-3 text-[#1a1c1a] font-medium max-w-[180px]">
                        Retrosternal Tightness &amp; Left Jaw Pain
                      </td>
                      <td className="py-4 px-3 font-mono text-[11px] text-[#444748] whitespace-nowrap">
                        SpO2: 95% | <span className="text-[#d97706] font-bold">BP: 190/110</span> | HR: 98 | Temp: 98.4°F
                      </td>
                      <td className="py-4 px-3">
                        <span className="inline-block px-2 py-1 rounded bg-[#efeeeb] text-[#444748] font-mono text-[10px] font-medium border border-[#e3e2e0]">
                          Rule #HYP-03: Hypertensive Pattern
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setActiveTab('triage')}
                          className="px-3.5 py-1.5 rounded-full bg-[#f4f3f1] text-[#1a1c1a] font-mono text-[11px] font-bold border border-[#e3e2e0] cursor-pointer hover:bg-[#e9e8e5] transition-all"
                        >
                          Escalate Doctor Review
                        </button>
                      </td>
                    </tr>

                    {/* Row 3 */}
                    <tr className="hover:bg-[#f4f3f1]/50 transition-colors">
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#aceec4] text-[#2a6a48] font-mono text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2a6a48]" />
                          Tier 3 Routine
                        </span>
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="font-bold text-[#1a1c1a] block">Manjit Lal, 41 M</span>
                        <span className="font-mono text-[10px] text-[#747878]">ABHA #91-1029-7711</span>
                      </td>
                      <td className="py-4 px-3 text-[#444748] max-w-[180px]">
                        Chronic Lumbar Pain &amp; Mild Pruritus
                      </td>
                      <td className="py-4 px-3 font-mono text-[11px] text-[#444748] whitespace-nowrap">
                        SpO2: 98% | BP: 122/78 | HR: 74 | Temp: 98.6°F
                      </td>
                      <td className="py-4 px-3">
                        <span className="inline-block px-2 py-1 rounded bg-[#efeeeb] text-[#747878] font-mono text-[10px]">
                          No Acute Red Flags Detected
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setActiveTab('triage')}
                          className="px-3.5 py-1.5 rounded-full bg-[#f4f3f1] text-[#747878] font-mono text-[11px] border border-[#e3e2e0] cursor-pointer hover:bg-[#e9e8e5] transition-all"
                        >
                          Standard OPD Queue
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t border-[#e3e2e0] font-mono text-[10px] text-[#747878]">
                <span>Priority Buffer: 3 active patients in edge SQLite outbox</span>
                <span className="text-[#2a6a48] font-semibold">● Gateway Compute: Local CDSS Active</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Sahayak Multilingual Voice Copilot Section */}
      <section className="w-full py-20 bg-[#f4f3f1] border-b border-[#e3e2e0]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: Copilot Details */}
            <ScrollReveal animation="fade-left">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffffff] text-[#2a6a48] font-mono text-xs mb-3 border border-[#e3e2e0]">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Multilingual Protocol Co-Pilot</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-medium text-[#1a1c1a] tracking-tight mb-4">
                  Sahayak Voice Assistant for Bedside Triage
                </h2>
                <p className="text-sm text-[#444748] leading-relaxed mb-6">
                  Frontline health workers operate under high cognitive load during critical decompensations. Sahayak delivers verbal instructions in Hindi, Punjabi, and local dialects while logging symptoms.
                </p>

                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#ffffff] border border-[#e3e2e0]">
                    <div className="w-8 h-8 rounded-lg bg-[#aceec4]/40 flex items-center justify-center text-[#2a6a48] shrink-0 mt-0.5">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#1a1c1a]">Phonetic Clinical Accuracy</h4>
                      <p className="text-xs text-[#444748] mt-0.5 leading-relaxed">
                        Optimized for rural Indian dialect variations and colloquial descriptions of emergency distress.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-[#ffffff] border border-[#e3e2e0]">
                    <div className="w-8 h-8 rounded-lg bg-[#aceec4]/40 flex items-center justify-center text-[#2a6a48] shrink-0 mt-0.5">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#1a1c1a]">Quantized Offline Voice</h4>
                      <p className="text-xs text-[#444748] mt-0.5 leading-relaxed">
                        Runs locally on tablet hardware with zero audio transmitted outside Sub-Centre premises.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Right Column: Interactive Voice Directives */}
            <ScrollReveal animation="fade-right">
              <div className="flex flex-col gap-4">
                {/* Hindi Directive Card */}
                <div className="p-6 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="font-mono text-xs font-bold text-[#2a6a48] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2a6a48]" />
                      Hindi Stabilization Directive (हिन्दी)
                    </span>
                    <span className="font-mono text-[11px] text-[#747878]">0:14 / 0:30</span>
                  </div>

                  <blockquote className="p-4 rounded-xl bg-[#f4f3f1] text-xs text-[#1a1c1a] italic leading-relaxed border-l-2 border-[#2a6a48] mb-4">
                    “मरीज़ को तुरंत 45 डिग्री बैठाएं। अगर ऑक्सीजन 90% से नीचे है, तो ऑक्सीजन सिलेंडर ऑन करें और 108 एम्बुलेंस की पुष्टि के लिए लाल बटन दबाएं।”
                  </blockquote>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-[#747878] font-mono">
                      Action: Oxygen Support &amp; Semi-Fowler Positioning
                    </span>
                    <button
                      onClick={() =>
                        playVoiceDirective(
                          'hindi',
                          'मरीज़ को तुरंत 45 डिग्री बैठाएं। अगर ऑक्सीजन 90% से नीचे है, तो ऑक्सीजन सिलेंडर ऑन करें और 108 एम्बुलेंस की पुष्टि के लिए लाल बटन दबाएं।'
                        )
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f4f3f1] text-[#1a1c1a] hover:bg-[#000000] hover:text-white border border-[#e3e2e0] font-mono text-xs cursor-pointer transition-all shrink-0"
                    >
                      {playingAudio === 'hindi' ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause Directive</span>
                          <div className="flex items-center gap-0.5 h-3 ml-1">
                            <span className="w-1 bg-[#2a6a48] rounded-full wave-bar-1" />
                            <span className="w-1 bg-[#2a6a48] rounded-full wave-bar-2" />
                            <span className="w-1 bg-[#2a6a48] rounded-full wave-bar-3" />
                            <span className="w-1 bg-[#2a6a48] rounded-full wave-bar-4" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>▷ Play Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Punjabi Directive Card */}
                <div className="p-6 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="font-mono text-xs font-bold text-[#2a6a48] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2a6a48]" />
                      Punjabi Pediatric Directive (ਪੰਜਾਬੀ)
                    </span>
                    <span className="font-mono text-[11px] text-[#747878]">0:08 / 0:24</span>
                  </div>

                  <blockquote className="p-4 rounded-xl bg-[#f4f3f1] text-xs text-[#1a1c1a] italic leading-relaxed border-l-2 border-[#2a6a48] mb-4">
                    “ਜੇਕਰ ਬੱਚੇ ਨੂੰ ਸਾਹ ਲੈਣ ਵਿੱਚ ਔਖ ਹੋ ਰਹੀ ਹੈ ਅਤੇ ਪਸਲੀਆਂ ਅੰਦਰ ਧਸ ਰਹੀਆਂ ਹਨ, ਤਾਂ ਉਸਨੂੰ ਤੁਰੰਤ ਸਿੱਧਾ ਬਿਠਾਓ ਅਤੇ ਹਵਾਦਾਰ ਥਾਂ ਲੈ ਜਾਓ।”
                  </blockquote>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-[#747878] font-mono">
                      Action: Severe Chest Indrawing Pre-referral Guidance
                    </span>
                    <button
                      onClick={() =>
                        playVoiceDirective(
                          'punjabi',
                          'ਜੇਕਰ ਬੱਚੇ ਨੂੰ ਸਾਹ ਲੈਣ ਵਿੱਚ ਔਖ ਹੋ ਰਹੀ ਹੈ ਅਤੇ ਪਸਲੀਆਂ ਅੰਦਰ ਧਸ ਰਹੀਆਂ ਹਨ, ਤਾਂ ਉਸਨੂੰ ਤੁਰੰਤ ਸਿੱਧਾ ਬਿਠਾਓ ਅਤੇ ਹਵਾਦਾਰ ਥਾਂ ਲੈ ਜਾਓ।'
                        )
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f4f3f1] text-[#1a1c1a] hover:bg-[#000000] hover:text-white border border-[#e3e2e0] font-mono text-xs cursor-pointer transition-all shrink-0"
                    >
                      {playingAudio === 'punjabi' ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause Directive</span>
                          <div className="flex items-center gap-0.5 h-3 ml-1">
                            <span className="w-1 bg-[#2a6a48] rounded-full wave-bar-1" />
                            <span className="w-1 bg-[#2a6a48] rounded-full wave-bar-2" />
                            <span className="w-1 bg-[#2a6a48] rounded-full wave-bar-3" />
                            <span className="w-1 bg-[#2a6a48] rounded-full wave-bar-4" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>▷ Play Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Feature Cards Showcase (Point-of-Care Modules) */}
      <section className="w-full py-20 bg-[#faf9f6]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
          <ScrollReveal animation="fade-up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#efeeeb] text-[#2a6a48] font-mono text-xs mb-2">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Point-of-Care Suite</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-medium text-[#1a1c1a] tracking-tight">
                  Integrated Sub-Centre Clinical Suite
                </h2>
              </div>
              <p className="text-sm text-[#444748] max-w-md">
                Each module operates autonomously on local hardware, maintaining tamper-evident cryptographic logs.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Triage */}
            <ScrollReveal animation="fade-up" delay={0}>
              <div
                onClick={() => setActiveTab('triage')}
                className="h-full p-6 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group hover:-translate-y-1"
              >
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#ffdad6]/50 text-[#ba1a1a] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h3 className="font-medium text-lg text-[#1a1c1a]">Frontline Triage Engine</h3>
                  <p className="text-xs text-[#444748] leading-relaxed">
                    Fast intake entry for ANMs with NEWS2 scoring, symptom chips, plausibility confirmation, and real-time rule derivation.
                  </p>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs text-[#2a6a48] font-medium mt-6 group-hover:underline">
                  <span>Open Queue &amp; Intake</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </ScrollReveal>

            {/* Card 2: SOS Referral */}
            <ScrollReveal animation="fade-up" delay={100}>
              <div
                onClick={() => setActiveTab('emergency')}
                className="h-full p-6 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group hover:-translate-y-1"
              >
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#aceec4]/40 text-[#2a6a48] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <h3 className="font-medium text-lg text-[#1a1c1a]">Emergency SOS Referral</h3>
                  <p className="text-xs text-[#444748] leading-relaxed">
                    Structured clinical handover packets with vitals telemetry, hospital selection, printable referral slips, and SMS backup.
                  </p>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs text-[#2a6a48] font-medium mt-6 group-hover:underline">
                  <span>Generate Referral Slip</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </ScrollReveal>

            {/* Card 3: Sahayak Copilot */}
            <ScrollReveal animation="fade-up" delay={200}>
              <div
                onClick={() => setActiveTab('sahayak')}
                className="h-full p-6 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group hover:-translate-y-1"
              >
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#efeeeb] text-[#1a1c1a] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="font-medium text-lg text-[#1a1c1a]">Sahayak Copilot</h3>
                  <p className="text-xs text-[#444748] leading-relaxed">
                    Vernacular audio &amp; conversational guidance (English, Hindi, Punjabi) with deterministic red-flag emergency pre-filtering.
                  </p>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs text-[#2a6a48] font-medium mt-6 group-hover:underline">
                  <span>Start Dialogue &amp; Voice</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </ScrollReveal>

            {/* Card 4: Telemetry Sync */}
            <ScrollReveal animation="fade-up" delay={300}>
              <div
                onClick={() => setActiveTab('telemetry')}
                className="h-full p-6 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group hover:-translate-y-1"
              >
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#f4f3f1] text-[#444748] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Database className="w-6 h-6" />
                  </div>
                  <h3 className="font-medium text-lg text-[#1a1c1a]">Telemetry &amp; Sync Outbox</h3>
                  <p className="text-xs text-[#444748] leading-relaxed">
                    Offline-first SQLite outbox registry with automatic store-and-forward sync, delta flushing, and audit state verification.
                  </p>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs text-[#2a6a48] font-medium mt-6 group-hover:underline">
                  <span>Inspect Outbox Buffer</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Call to Action (CTA) Section */}
      <section className="w-full py-20 bg-gradient-to-b from-[#faf9f6] via-[#f4f3f1] to-[#faf9f6] border-t border-[#e3e2e0]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <ScrollReveal animation="fade-up">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffffff] text-[#2a6a48] font-mono text-xs mb-4 border border-[#e3e2e0]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Frontline Healthcare Infrastructure</span>
            </span>

            <h2 className="text-3xl sm:text-5xl font-medium tracking-tight text-[#1a1c1a] max-w-2xl mb-4 leading-tight">
              Deploy Autonomous Clinical Safety to Every Sub-Centre
            </h2>

            <p className="max-w-xl text-sm sm:text-base text-[#444748] mb-8 leading-relaxed">
              Replace triage guesswork with verified, deterministic decision pathways. Zero connectivity required. Built strictly for the first mile of rural medicine.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
              <button
                onClick={() => setActiveTab('triage')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#000000] text-white font-mono text-xs uppercase tracking-wider shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>DEPLOY OUTPOST CDSS ↗</span>
              </button>
              <button
                onClick={() => setActiveTab('emergency')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#ffffff] text-[#1a1c1a] font-mono text-xs uppercase tracking-wider border border-[#e3e2e0] shadow-sm hover:bg-[#efeeeb] transition-all cursor-pointer"
              >
                <span>EMERGENCY REFERRAL DESK →</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-xs text-[#747878]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2a6a48]" />
                ABDM Milestone Compliant
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2a6a48]" />
                AES-256 Offline Storage
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2a6a48]" />
                IPHS 2022 Norms Adherent
              </span>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
};
