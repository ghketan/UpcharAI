import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DemoRole, QueueItem, SyncStatus } from '../types';
import { api } from '../api';

export type TabKey = 'overview' | 'triage' | 'emergency' | 'sahayak' | 'telemetry';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface AppContextType {
  role: DemoRole;
  setRole: (role: DemoRole) => void;
  toggleRole: () => void;
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
  selectedAssessmentId: string | null;
  setSelectedAssessmentId: (id: string | null) => void;
  openPatientAudit: (patientId: string, assessmentId?: string) => void;
  closePatientAudit: () => void;
  referralTarget: { patientId: string; assessmentId: string; displayCode?: string } | null;
  initiateReferral: (patientId: string, assessmentId: string, displayCode?: string) => void;
  clearReferralTarget: () => void;
  queue: QueueItem[];
  queueLoading: boolean;
  queueStale: boolean;
  refreshQueue: () => Promise<void>;
  syncStatus: SyncStatus | null;
  refreshSyncStatus: () => Promise<void>;
  toasts: Toast[];
  showToast: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  removeToast: (id: string) => void;
  resetDemoDatabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<DemoRole>('NURSE');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [referralTarget, setReferralTarget] = useState<{ patientId: string; assessmentId: string; displayCode?: string } | null>(null);
  
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState<boolean>(false);
  const [queueStale, setQueueStale] = useState<boolean>(false);
  const [lastQueueFetch, setLastQueueFetch] = useState<number>(Date.now());
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setRole = (newRole: DemoRole) => {
    setRoleState(newRole);
    showToast(`Active role switched to: ${newRole}`, 'info');
  };

  const toggleRole = () => {
    const nextRole = role === 'NURSE' ? 'DOCTOR' : 'NURSE';
    setRole(nextRole);
  };

  const refreshQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await api.getQueue(role);
      setQueue(res.items);
      setLastQueueFetch(Date.now());
      setQueueStale(false);
    } catch {
      setQueueStale(true);
    } finally {
      setQueueLoading(false);
    }
  }, [role]);

  const refreshSyncStatus = useCallback(async () => {
    try {
      const res = await api.getSyncStatus(role);
      setSyncStatus(res);
    } catch {
      // Keep previous
    }
  }, [role]);

  // Periodic polling for queue and sync
  useEffect(() => {
    refreshQueue();
    refreshSyncStatus();

    const interval = setInterval(() => {
      refreshQueue();
      refreshSyncStatus();
    }, 4000);

    return () => clearInterval(interval);
  }, [refreshQueue, refreshSyncStatus]);

  // Stale detection: if no successful queue update in > 6 seconds
  useEffect(() => {
    const staleInterval = setInterval(() => {
      if (Date.now() - lastQueueFetch > 6000) {
        setQueueStale(true);
      }
    }, 1000);
    return () => clearInterval(staleInterval);
  }, [lastQueueFetch]);

  const openPatientAudit = (patientId: string, assessmentId?: string) => {
    setSelectedPatientId(patientId);
    if (assessmentId) {
      setSelectedAssessmentId(assessmentId);
    }
  };

  const closePatientAudit = () => {
    setSelectedPatientId(null);
    setSelectedAssessmentId(null);
  };

  const initiateReferral = (patientId: string, assessmentId: string, displayCode?: string) => {
    setReferralTarget({ patientId, assessmentId, displayCode });
    setActiveTab('emergency');
  };

  const clearReferralTarget = () => {
    setReferralTarget(null);
  };

  const resetDemoDatabase = async () => {
    try {
      const res = await api.resetDemo(role);
      showToast(`Database reset complete. ${res.seeded_scenarios} canonical judge scenarios loaded.`, 'success');
      await refreshQueue();
      await refreshSyncStatus();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset database', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        toggleRole,
        activeTab,
        setActiveTab,
        selectedPatientId,
        setSelectedPatientId,
        selectedAssessmentId,
        setSelectedAssessmentId,
        openPatientAudit,
        closePatientAudit,
        referralTarget,
        initiateReferral,
        clearReferralTarget,
        queue,
        queueLoading,
        queueStale,
        refreshQueue,
        syncStatus,
        refreshSyncStatus,
        toasts,
        showToast,
        removeToast,
        resetDemoDatabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
