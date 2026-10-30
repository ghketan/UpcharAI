import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowUpRight, ShieldCheck, Zap, Database, Cpu, Activity, Stethoscope, MessageSquare, RefreshCw } from 'lucide-react';

export const OverviewView: React.FC = () => {
  const { setActiveTab } = useApp();

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28 bg-gradient-to-b from-[#faf9f6] via-[#f4f3f1] to-[#faf9f6]">
        {/* Ambient Glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[480px] bg-[#aff1c6]/30 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-[#aceec4]/40 rounded-full blur-[70px] pointer-events-none -z-10" />

        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          
          {/* Top Meta Capsule Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ffffff]/80 backdrop-blur-md border border-[#e3e2e0] shadow-sm mb-6 transition-transform hover:scale-[1.02]">
            <span className="w-2 h-2 rounded-full bg-[#2a6a48] shadow-[0_0_8px_rgba(77,224,130,0.8)] animate-pulse" />
            <span className="font-mono text-xs text-[#444748] font-medium tracking-wide">
              Enterprise Rural Health AI Infrastructure
            </span>
          </div>

          {/* Main Display Typography */}
          <h1 className="max-w-[960px] text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-[#1a1c1a] mb-6 leading-tight">
            Intelligence Infrastructure for<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#2a6a48] via-[#00984d] to-[#2a6a48] font-bold">
              The Frontline Clinical Era
            </span>
          </h1>

          {/* Supporting Editorial Subtitle */}
          <p className="max-w-[680px] text-base sm:text-lg text-[#444748] mb-10 leading-relaxed">
            Deterministic clinical triage, zero-latency red-flag physiological validation, and structured referral escalation architected for community health workers with zero cloud internet reliance.
          </p>

          {/* Action Button Group */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-10 z-10">
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

          {/* Concentric Kinetic Rings with Refractive Glass Core SVG */}
          <div className="relative w-full max-w-[800px] h-[320px] sm:h-[400px] flex items-center justify-center mt-2 select-none pointer-events-none">
            <svg className="w-full h-full" fill="none" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="chromeGradOuter" x1="100" x2="700" y1="180" y2="340" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="25%" stopColor="#c4c7c7" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="75%" stopColor="#a8abaa" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="chromeGradMid" x1="150" x2="650" y1="200" y2="310" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="35%" stopColor="#b0b4b2" stopOpacity="0.65" />
                  <stop offset="70%" stopColor="#ffffff" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#8a8e8c" stopOpacity="0.7" />
                </linearGradient>
                <radialGradient id="sphereFluidGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#aff1c6" stopOpacity="1" />
                  <stop offset="45%" stopColor="#2a6a48" stopOpacity="0.85" />
                  <stop offset="80%" stopColor="#00210c" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0.95" />
                </radialGradient>
                <radialGradient id="sphereGlassShell" cx="35%" cy="30%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="30%" stopColor="#ffffff" stopOpacity="0.4" />
                  <stop offset="70%" stopColor="#f4f3f1" stopOpacity="0.15" />
                  <stop offset="95%" stopColor="#93d5ac" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.6" />
                </radialGradient>
                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="24" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Shadow Bed under Orb */}
              <ellipse cx="400" cy="390" rx="260" ry="24" fill="#1a1c1a" fillOpacity="0.06" filter="blur(16px)" />
              <ellipse cx="400" cy="380" rx="140" ry="14" fill="#2a6a48" fillOpacity="0.12" filter="blur(12px)" />

              {/* Orbital Segments */}
              <path d="M 120 280 C 120 210, 680 210, 680 280" stroke="url(#chromeGradOuter)" strokeWidth="6" strokeLinecap="round" opacity="0.75" />
              <ellipse cx="400" cy="265" rx="245" ry="58" stroke="url(#chromeGradMid)" strokeWidth="4" strokeDasharray="720 180" transform="rotate(-7 400 265)" opacity="0.6" />
              
              {/* Biological Core Emerald Nucleus */}
              <circle cx="400" cy="250" r="42" fill="#6dfe9c" opacity="0.5" filter="blur(20px)" />
              <circle cx="400" cy="250" r="32" fill="url(#sphereFluidGlow)" />
              <circle cx="395" cy="242" r="14" fill="#aff1c6" opacity="0.85" filter="blur(3px)" />

              {/* Outer Glass Sphere */}
              <circle cx="400" cy="250" r="88" fill="url(#sphereGlassShell)" filter="url(#softGlow)" />
              <ellipse cx="370" cy="205" rx="34" ry="18" fill="#ffffff" fillOpacity="0.85" transform="rotate(-28 370 205)" filter="blur(1px)" />

              {/* Front Foreground Segments */}
              <path d="M 680 280 C 680 355, 120 355, 120 280" stroke="url(#chromeGradOuter)" strokeWidth="7" strokeLinecap="round" />
              <path d="M 640 280 C 625 330, 185 305, 160 255" stroke="url(#chromeGradMid)" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
            </svg>
          </div>
        </div>
      </section>

      {/* Validation Metric Strip */}
      <section className="w-full bg-[#f4f3f1] py-12 border-y border-[#e3e2e0]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="font-mono text-3xl sm:text-4xl text-[#1a1c1a] font-bold tracking-tight">100%</span>
              <span className="font-mono text-xs text-[#2a6a48] uppercase tracking-wider mt-1 font-semibold">Deterministic</span>
              <p className="text-xs text-[#444748] mt-1">Rule execution with zero probabilistic hallucination</p>
            </div>
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="font-mono text-3xl sm:text-4xl text-[#1a1c1a] font-bold tracking-tight">&lt; 10ms</span>
              <span className="font-mono text-xs text-[#2a6a48] uppercase tracking-wider mt-1 font-semibold">Local Inference</span>
              <p className="text-xs text-[#444748] mt-1">Zero network latency. Evaluates on device</p>
            </div>
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="font-mono text-3xl sm:text-4xl text-[#1a1c1a] font-bold tracking-tight">3 Tiers</span>
              <span className="font-mono text-xs text-[#2a6a48] uppercase tracking-wider mt-1 font-semibold">Strict Triaging</span>
              <p className="text-xs text-[#444748] mt-1">Emergency (Tier 1), Urgent (Tier 2), Routine (Tier 3)</p>
            </div>
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="font-mono text-3xl sm:text-4xl text-[#1a1c1a] font-bold tracking-tight">100%</span>
              <span className="font-mono text-xs text-[#2a6a48] uppercase tracking-wider mt-1 font-semibold">Offline Resilient</span>
              <p className="text-xs text-[#444748] mt-1">Encrypted SQLite state auto-syncs when uplink restores</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Showcase */}
      <section className="w-full py-16 bg-[#faf9f6]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-12">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#efeeeb] text-[#2a6a48] font-mono text-xs mb-2">
                <Cpu className="w-3.5 h-3.5" />
                <span>Modular Frontline Architecture</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-medium text-[#1a1c1a] tracking-tight">
                Point-of-Care Modules for Sub-Centres
              </h2>
            </div>
            <p className="text-sm text-[#444748] max-w-md">
              Each module operates autonomously on local hardware, maintaining full clinical history and tamper-evident audit trails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Triage */}
            <div
              onClick={() => setActiveTab('triage')}
              className="p-6 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
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
                <span>Open Queue & Intake</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 2: SOS Referral */}
            <div
              onClick={() => setActiveTab('emergency')}
              className="p-6 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
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

            {/* Card 3: Sahayak Copilot */}
            <div
              onClick={() => setActiveTab('sahayak')}
              className="p-6 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#efeeeb] text-[#1a1c1a] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="font-medium text-lg text-[#1a1c1a]">Sahayak Copilot</h3>
                <p className="text-xs text-[#444748] leading-relaxed">
                  Vernacular audio & conversational guidance (English, Hindi, Punjabi) with deterministic red-flag emergency pre-filtering.
                </p>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs text-[#2a6a48] font-medium mt-6 group-hover:underline">
                <span>Start Dialogue & Voice</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 4: Telemetry Sync */}
            <div
              onClick={() => setActiveTab('telemetry')}
              className="p-6 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex flex-col gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#f4f3f1] text-[#444748] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="font-medium text-lg text-[#1a1c1a]">Telemetry & Sync Outbox</h3>
                <p className="text-xs text-[#444748] leading-relaxed">
                  Offline-first SQLite outbox registry with automatic store-and-forward sync, delta flushing, and audit state verification.
                </p>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs text-[#2a6a48] font-medium mt-6 group-hover:underline">
                <span>Inspect Outbox Buffer</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
