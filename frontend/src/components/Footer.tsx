import React from 'react';
import { Shield, Database, Lock, HeartHandshake } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#f4f3f1] border-t border-[#e3e2e0] mt-auto">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
        
        {/* Core Regulatory & Clinical Disclaimers Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#ffdad6]/60 text-[#ba1a1a] shrink-0 mt-0.5">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xs uppercase tracking-wider text-[#ba1a1a] font-bold">
                Clinical Decision Support Notice (Non-Autonomous)
              </span>
              <p className="text-sm text-[#1a1c1a] font-medium mt-0.5">
                Assists the clinician. A clinician makes the decision. Does not diagnose conditions, prescribe treatments, or recommend medication doses.
              </p>
              <span className="text-xs text-[#444748] mt-1">
                Data Mode: <strong className="text-[#1a1c1a]">SYNTHETIC_DATA_ONLY</strong> — do not enter real patient details.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0 justify-end font-mono text-xs text-[#444748] bg-[#f4f3f1] px-3.5 py-2 rounded-full border border-[#e3e2e0]">
            <HeartHandshake className="w-4 h-4 text-[#2a6a48]" />
            <span>Demo roles — not authentication</span>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs text-[#444748]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-[#1a1c1a]">
              <span className="w-2 h-2 rounded-full bg-[#2a6a48]" />
              <span className="font-mono text-sm">UpcharAI Outpost</span>
            </div>
            <p className="text-xs leading-relaxed text-[#747878]">
              Deterministic rural triage assistant and physiological red-flag validator designed for frontline health workers in low-connectivity settings.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono font-semibold text-[#1a1c1a] uppercase tracking-wider">Engine Protocol</span>
            <span className="text-[#444748]">Rule Set: rules.v1.yaml</span>
            <span className="text-[#444748]">NEWS2 Scoring: 6 Physiological Parameters</span>
            <span className="text-[#444748]">Deterministic Logic: Python 3.12 Engine</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono font-semibold text-[#1a1c1a] uppercase tracking-wider">Edge Resilience</span>
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-[#2a6a48]" />
              <span>Offline SQLite WAL Mode</span>
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-[#2a6a48]" />
              <span>Cryptographic Outbox Queue</span>
            </span>
            <span className="text-[#444748]">State Backhaul: Outbox Sync Pattern</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono font-semibold text-[#1a1c1a] uppercase tracking-wider">Legal & Compliance</span>
            <span className="text-[#747878]">Hackathon demonstrator on synthetic test cases.</span>
            <span className="text-[#747878]">No external communications or emergency dispatch occurs.</span>
            <span className="text-[#747878]">© 2026 UpcharAI Project</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
