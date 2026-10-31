import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DemoRole, QueueItem, SyncStatus, AuthUser, LoginInput, RegisterInput, LoginResponse } from '../types';
import { api, getStoredUser } from '../api';

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
  // Auth state & actions
  currentUser: AuthUser | null;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  login: (input: LoginInput) => Promise<LoginResponse>;
  registerUser: (input: RegisterInput) => Promise<LoginResponse>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser());
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [role, setRoleState] = useState<DemoRole>('NURSE');
  const [activeTab, setActiveTabState] = useState<TabKey>(() => {
    const user = getStoredUser();
    return user?.role === 'user' ? 'sahayak' : 'overview';
  });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [referralTarget, setReferralTarget] = useState<{ patientId: string; assessmentId: string; displayCode?: string } | null>(null);
  
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState<boolean>(false);
  const [queueStale, setQueueStale] = useState<boolean>(false);
  const [lastQueueFetch, setLastQueueFetch] = useState<number>(() => Date.now());
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const queueSeq = React.useRef(0);
  const toastTimers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      toastTimers.current.delete(id);
    }, 4500);
    toastTimers.current.set(id, timer);
  }, []);

  const removeToast = useCallback((id: string) => {
    const timer = toastTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setActiveTab = (tab: TabKey) => {
    const isClient = currentUser?.role === 'user' || (currentUser?.role as any) === 'client';
    if (isClient && tab !== 'sahayak') {
      showToast("Access restricted: Client / Patient accounts are limited to the Sahayak Chatbot only. Triage & referrals require a Staff ('auth') login.", 'warning');
      return;
    }
    setActiveTabState(tab);
  };

  const login = async (input: LoginInput): Promise<LoginResponse> => {
    const res = await api.login(input);
    setCurrentUser(res.user);
    const isClient = res.user.role === 'user' || (res.user.role as any) === 'client';
    if (isClient) {
      setActiveTabState('sahayak');
      showToast(`Logged in as Client (${res.user.username}). Workspace set to Sahayak Chatbot.`, 'info');
    } else {
      if (res.user.username.toLowerCase().includes('doctor')) {
        setRoleState('DOCTOR');
      }
      showToast(`Welcome ${res.user.full_name || res.user.username}! Clinical staff access active.`, 'success');
    }
    return res;
  };

  const registerUser = async (input: RegisterInput): Promise<LoginResponse> => {
    const res = await api.register(input);
    setCurrentUser(res.user);
    const isClient = res.user.role === 'user' || (res.user.role as any) === 'client';
    if (isClient) {
      setActiveTabState('sahayak');
      showToast(`Account created for Client (${res.user.username}). Welcome to Sahayak!`, 'success');
    } else {
      showToast(`Staff account created for ${res.user.full_name || res.user.username}. Clinical access active.`, 'success');
    }
    return res;
  };

  const logout = async () => {
    await api.logout();
    setCurrentUser(null);
    showToast('Logged out successfully.', 'info');
  };

  const setRole = (newRole: DemoRole) => {
    setRoleState(newRole);
    showToast(`Active role switched to: ${newRole}`, 'info');
  };

  const toggleRole = () => {
    const nextRole = role === 'NURSE' ? 'DOCTOR' : 'NURSE';
    setRole(nextRole);
  };

  const refreshQueue = useCallback(async (isBackground = false) => {
    if (currentUser?.role === 'user') return;
    const seq = ++queueSeq.current;
    if (!isBackground) {
      setQueueLoading(true);
    }
    try {
      const res = await api.getQueue(role);
      if (seq === queueSeq.current) {
        setQueue(res.items);
        setLastQueueFetch(Date.now());
        setQueueStale(false);
      }
    } catch {
      if (seq === queueSeq.current) {
        setQueueStale(true);
      }
    } finally {
      if (seq === queueSeq.current && !isBackground) {
        setQueueLoading(false);
      }
    }
  }, [role, currentUser]);

  const refreshSyncStatus = useCallback(async () => {
    if (currentUser?.role === 'user') return;
    try {
      const res = await api.getSyncStatus(role);
      setSyncStatus(res);
    } catch {
      // Keep previous
    }
  }, [role, currentUser]);

  // Periodic polling for queue and sync (only when user has clinical access)
  useEffect(() => {
    if (currentUser?.role === 'user') return;

    refreshQueue(false);
    refreshSyncStatus();

    const interval = setInterval(() => {
      refreshQueue(true);
      refreshSyncStatus();
    }, 4000);

    return () => clearInterval(interval);
  }, [refreshQueue, refreshSyncStatus, currentUser]);

  // Stale detection: if no successful queue update in > 6 seconds
  useEffect(() => {
    if (currentUser?.role === 'user') return;

    const staleInterval = setInterval(() => {
      if (Date.now() - lastQueueFetch > 6000) {
        setQueueStale(true);
      }
    }, 1000);
    return () => clearInterval(staleInterval);
  }, [lastQueueFetch, currentUser]);

  const openPatientAudit = (patientId: string, assessmentId?: string) => {
    setSelectedPatientId(patientId);
    setSelectedAssessmentId(assessmentId || null);
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
      showToast(res.message || 'Database reset successfully', 'success');
      await refreshQueue(false);
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
        currentUser,
        showLoginModal,
        setShowLoginModal,
        login,
        registerUser,
        logout,
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
