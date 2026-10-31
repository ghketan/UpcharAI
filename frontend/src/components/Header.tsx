import React from 'react';
import { useApp, TabKey } from '../context/AppContext';
import { UserCheck, Stethoscope, RefreshCw, Activity, ArrowUpRight } from 'lucide-react';
import { GooeyNav } from './GooeyNav';

export const Header: React.FC = () => {
  const { role, toggleRole, activeTab, setActiveTab, resetDemoDatabase, syncStatus } = useApp();

  const navItems: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Platform' },
    { key: 'triage', label: 'Triage Engine' },
    { key: 'emergency', label: 'Emergency Referral' },
    { key: 'sahayak', label: 'Sahayak Chatbot' },
    { key: 'telemetry', label: 'Telemetry Sync' },
  ];

  const activeIndex = navItems.findIndex((item) => item.key === activeTab);

  const handleNavChange = (index: number) => {
    if (navItems[index]) {
      setActiveTab(navItems[index].key);
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#faf7ee]/90 backdrop-blur-xl border-b border-[#e3e2e0]/60 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="h-20 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        
        {/* Brand & Edge Status */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none shrink-0"
          >
            <span className="w-3 h-3 rounded-full bg-[#2a6a48] shadow-[0_0_12px_rgba(42,106,72,0.6)] transition-transform group-hover:scale-125 shrink-0" />
            <span className="font-semibold text-xl tracking-tight text-[#1a1c1a] whitespace-nowrap">
              Upchar<span className="text-[#2a6a48] font-mono text-sm ml-0.5 tracking-wider font-bold">AI</span>
            </span>
          </button>

          <div className="hidden xl:inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-[#f3eee3] text-[#444748] font-mono text-[11px] border border-[#e3e2e0]/70 whitespace-nowrap shrink-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                syncStatus?.online ? 'bg-[#2a6a48] animate-pulse' : 'bg-[#d97706]'
              }`}
            />
            <span className="whitespace-nowrap">
              {syncStatus?.online
                ? `Edge Enclave: Hub Linked (${syncStatus.pending} pending)`
                : 'Edge Enclave: Offline SQLite Active'}
            </span>
          </div>
        </div>

        {/* Gooey Navigation Island from React Bits */}
        <div className="hidden lg:flex items-center justify-center shrink-0">
          <GooeyNav
            items={navItems.map((item) => ({ label: item.label }))}
            activeIndex={activeIndex >= 0 ? activeIndex : 0}
            onChange={(idx) => handleNavChange(idx)}
            theme="light"
            size="sm"
            frame={true}
            color="#000000"
            activeTextColor="#ffffff"
            colors={['#2a6a48', '#4ade80', '#aff1c6', '#10b981']}
            particleCount={15}
            spread={50}
            animationTime={600}
            timeVariance={300}
            gooeyness={0.5}
            wobble={0.5}
            hoverEffect={true}
          />
        </div>

        {/* Controls: Role Selector, Reset Scenarios, Launch Outpost CDSS */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Reset Demo Button */}
          <button
            onClick={() => {
              if (window.confirm('Reset database and re-seed the 4 canonical judge scenarios?')) {
                resetDemoDatabase();
              }
            }}
            title="Reset DB & reload 4 canonical judge scenarios"
            className="hidden sm:inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full bg-[#f3eee3] text-[#444748] hover:text-[#1a1c1a] hover:bg-[#eae4d6] font-mono text-xs border border-[#e3e2e0] transition-colors cursor-pointer shadow-sm whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Reset Demo</span>
          </button>

          {/* Role Switcher Pill */}
          <button
            onClick={toggleRole}
            title="Click to toggle Demo Role between NURSE and DOCTOR"
            className={`inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full border transition-all duration-200 cursor-pointer shadow-sm whitespace-nowrap shrink-0 ${
              role === 'DOCTOR'
                ? 'bg-[#aceec4]/40 border-[#2a6a48] text-[#2a6a48]'
                : 'bg-[#f3eee3] border-[#c4c7c7] text-[#1a1c1a]'
            }`}
          >
            {role === 'DOCTOR' ? (
              <Stethoscope className="w-3.5 h-3.5 text-[#2a6a48] shrink-0" />
            ) : (
              <UserCheck className="w-3.5 h-3.5 text-[#444748] shrink-0" />
            )}
            <span className="font-mono text-xs font-bold tracking-tight whitespace-nowrap">
              {role === 'DOCTOR' ? 'Doctor Mode' : 'Nurse Mode'}
            </span>
          </button>

          {/* Launch Outpost CDSS Action Button */}
          <button
            onClick={() => setActiveTab('triage')}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-[#000000] text-[#ffffff] font-mono text-xs font-medium tracking-wider shadow-md hover:bg-[#1c1b1b] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Activity className="w-3.5 h-3.5 text-[#aff1c6] shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Launch CDSS</span>
            <span className="sm:hidden whitespace-nowrap">CDSS</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer Strip */}
      <div className="lg:hidden flex overflow-x-auto py-2 px-4 gap-1.5 bg-[#f3eee3]/90 border-t border-[#e3e2e0]/60 no-scrollbar">
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`h-8 inline-flex items-center px-3.5 rounded-full font-mono text-xs whitespace-nowrap cursor-pointer transition-colors ${
                isActive ? 'bg-[#000000] text-white' : 'text-[#444748] bg-[#faf7ee]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
