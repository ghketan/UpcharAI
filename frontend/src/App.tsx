import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { OverviewView } from './components/OverviewView';
import { TriageQueueView } from './components/TriageQueueView';
import { EmergencyReferralView } from './components/EmergencyReferralView';
import { SahayakChatView } from './components/SahayakChatView';
import { TelemetrySyncView } from './components/TelemetrySyncView';
import { AssessmentModal } from './components/AssessmentModal';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start justify-between gap-3 transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${
              isError
                ? 'bg-[#ffdad6] text-[#ba1a1a] border-[#ba1a1a]'
                : isWarning
                ? 'bg-[#fff4e5] text-[#d97706] border-[#f59e0b]'
                : isSuccess
                ? 'bg-[#ffffff] text-[#2a6a48] border-[#2a6a48]'
                : 'bg-[#ffffff] text-[#1a1c1a] border-[#e3e2e0]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#2a6a48]" />
              ) : (
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#747878]" />
              )}
              <span className="text-xs font-mono font-medium leading-relaxed">
                {toast.message}
              </span>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

const MainContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6]">
      <Header />
      <main className="flex-1 pt-20 flex flex-col">
        {activeTab === 'overview' && <OverviewView />}
        {activeTab === 'triage' && <TriageQueueView />}
        {activeTab === 'emergency' && <EmergencyReferralView />}
        {activeTab === 'sahayak' && <SahayakChatView />}
        {activeTab === 'telemetry' && <TelemetrySyncView />}
      </main>
      <Footer />
      <AssessmentModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
