import React from 'react';
import { useApp } from '../context/AppContext';
import { ArrowUpRight, ShieldCheck, Zap, Database, Cpu, Activity, Stethoscope, MessageSquare, RefreshCw } from 'lucide-react';
import { InteractiveOrb } from './InteractiveOrb';

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

          {/* Interactive Light Mode Bio-Synthetic Orb Animation */}
          <div className="w-full max-w-[853px] mx-auto mt-2 relative z-0">
            <InteractiveOrb />
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
