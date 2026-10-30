import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { SyncOutboxItem, TargetHubSummary } from '../types';
import {
  Database,
  RefreshCw,
  Lock,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  RotateCcw,
  AlertTriangle,
  Server,
  CloudOff,
  Cloud,
  Network,
  RotateCw,
} from 'lucide-react';

export const TelemetrySyncView: React.FC = () => {
  const {
    role,
    queue,
    syncStatus,
    refreshSyncStatus,
    refreshQueue,
    openPatientAudit,
    resetDemoDatabase,
    showToast,
  } = useApp();

  const [syncing, setSyncing] = useState<boolean>(false);
  const [filterText, setFilterText] = useState<string>('');
  const [outboxItems, setOutboxItems] = useState<SyncOutboxItem[]>([]);
  const [loadingOutbox, setLoadingOutbox] = useState<boolean>(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [targetHub, setTargetHub] = useState<TargetHubSummary | null>(null);

  const fetchOutboxAndHub = async () => {
    setLoadingOutbox(true);
    try {
      const [outboxRes, hubRes] = await Promise.all([
        api.getSyncOutbox(50, role),
        api.getTargetHubSummary(role),
      ]);
      setOutboxItems(outboxRes.items);
      setTargetHub(hubRes);
    } catch {
      // Graceful fallback for offline
    } finally {
      setLoadingOutbox(false);
    }
  };

  useEffect(() => {
    fetchOutboxAndHub();
  }, [role]);

  const handlePushSync = async () => {
    setSyncing(true);
    try {
      const res = await api.pushSync(role);
      showToast(
        `Sync complete: ${res.processed} records processed (${res.errors} errors).`,
        res.errors > 0 ? 'warning' : 'success'
      );
      await refreshSyncStatus();
      await refreshQueue();
      await fetchOutboxAndHub();
    } catch (err: any) {
      showToast(err.message || 'Push sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryItem = async (itemId: string) => {
    setRetryingId(itemId);
    try {
      await api.retryOutboxItem(itemId, role);
      showToast('Outbox record reset to PENDING for retry', 'success');
      await fetchOutboxAndHub();
      await refreshSyncStatus();
    } catch (err: any) {
      showToast(err.message || 'Failed to retry item', 'error');
    } finally {
      setRetryingId(null);
    }
  };

  const filteredItems = queue.filter((item) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      item.display_code.toLowerCase().includes(q) ||
      item.effective_priority.toLowerCase().includes(q) ||
      item.top_reason.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      
      {/* Top Editorial Telemetry Header */}
      <section className="flex flex-col items-center text-center max-w-3xl mx-auto gap-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f3eee3] border border-[#e3e2e0] text-[#2a6a48] font-mono text-xs shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#2a6a48] animate-pulse" />
          <span>Autonomous Edge Enclave · Zero-Bandwidth Engine</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1c1a]">
          Offline Edge Telemetry &<br />
          <span className="text-[#2a6a48] font-serif italic">Synchronization Registry</span>
        </h1>

        <p className="text-sm text-[#444748] max-w-2xl leading-relaxed">
          Store-and-forward resilience for remote village outposts with tamper-evident cryptographic state logs and autonomous backhaul.
        </p>

        {/* Edge Gateway Node Banner */}
        <div className="mt-4 w-full p-4 sm:p-5 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#f3eee3] border border-[#e3e2e0] flex items-center justify-center text-[#2a6a48] shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#1a1c1a]">
                  Sub-Centre Khunnan Kalan Gateway
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#f3eee3] text-[10px] font-mono text-[#444748]">
                  PB-MKT-088
                </span>
              </div>
              <p className="text-xs text-[#747878] font-mono mt-0.5">
                Local Encrypted SQLite WAL Engine · Target: {syncStatus?.target_label || 'MOCK'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3eee3] text-[#1a1c1a] font-mono text-xs border border-[#e3e2e0]">
              <span className="w-2 h-2 rounded-full bg-[#2a6a48]" />
              <span>{syncStatus?.online ? 'EDGE READY' : 'OFFLINE'}</span>
            </div>

            <button
              onClick={handlePushSync}
              disabled={syncing}
              className="px-4 py-1.5 rounded-full bg-[#000000] text-white font-mono text-xs font-semibold hover:bg-[#1c1b1b] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#aff1c6] ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Transmitting...' : 'Push Sync Delta'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* KPI Telemetry Metrics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Pending Outbox */}
        <div className="p-5 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-[#747878] uppercase">
            <span>Local Buffer Queue</span>
            <Layers className="w-4 h-4 text-[#2a6a48]" />
          </div>
          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-bold font-mono text-[#1a1c1a]">
              {syncStatus?.pending ?? 0}
            </span>
            <span className="text-xs font-mono text-[#2a6a48] ml-2 font-semibold">
              Pending Records
            </span>
          </div>
          <span className="text-xs text-[#747878] font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2a6a48]" />
            <span>Store-and-forward outbox</span>
          </span>
        </div>

        {/* Metric 2: Failed Retries */}
        <div className="p-5 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-[#747878] uppercase">
            <span>Sync Anomalies</span>
            <AlertTriangle className="w-4 h-4 text-[#ba1a1a]" />
          </div>
          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-bold font-mono text-[#1a1c1a]">
              {syncStatus?.failed ?? 0}
            </span>
            <span className="text-xs font-mono text-[#747878] ml-2">Failed Attempts</span>
          </div>
          <span className="text-xs text-[#747878] font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2a6a48]" />
            <span>Deterministic idempotency</span>
          </span>
        </div>

        {/* Metric 3: Storage Engine */}
        <div className="p-5 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-[#747878] uppercase">
            <span>Storage Engine</span>
            <Lock className="w-4 h-4 text-[#2a6a48]" />
          </div>
          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-bold font-mono text-[#1a1c1a]">
              SQLite
            </span>
            <span className="text-xs font-mono text-[#2a6a48] ml-2 font-semibold">WAL Mode</span>
          </div>
          <span className="text-xs text-[#747878] font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2a6a48]" />
            <span>OS disk encryption recommended</span>
          </span>
        </div>

        {/* Metric 4: Last Success Timestamp */}
        <div className="p-5 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-[#747878] uppercase">
            <span>Last Sync Ingest</span>
            <Clock className="w-4 h-4 text-[#2a6a48]" />
          </div>
          <div className="my-3">
            <span className="text-lg font-bold font-mono text-[#1a1c1a] block truncate">
              {syncStatus?.last_success_at
                ? new Date(syncStatus.last_success_at).toLocaleTimeString()
                : 'Awaiting sync'}
            </span>
            <span className="text-xs font-mono text-[#747878]">
              Target: {syncStatus?.target_label || 'MOCK'}
            </span>
          </div>
          <span className="text-xs text-[#747878] font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2a6a48]" />
            <span>Tamper-evident logs</span>
          </span>
        </div>

      </section>

      {/* Synchronized Case Registry Table Section */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-[#2a6a48] font-bold uppercase tracking-wider">
                Active Ledger
              </span>
              <span className="text-[#c4c7c7]">•</span>
              <span className="text-xs font-mono text-[#747878]">
                SQLite Local Outbox Log
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#1a1c1a]">
              Synchronized Case Registry
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#747878]" />
              <input
                type="text"
                placeholder="Filter cases..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-9 pr-4 py-1.5 rounded-full bg-[#ffffff] text-xs font-mono text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none w-48 sm:w-60"
              />
            </div>

            {/* Reset Demo Button */}
            <button
              onClick={() => {
                if (window.confirm('Reset database and reload canonical test scenarios?')) {
                  resetDemoDatabase();
                }
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#f3eee3] hover:bg-[#eae4d6] text-[#1a1c1a] font-mono text-xs border border-[#e3e2e0] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#444748]" />
              <span>Reset Demo DB</span>
            </button>
          </div>
        </div>

        {/* Minimal Table Container */}
        <div className="w-full overflow-x-auto rounded-3xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm">
          <table className="w-full text-left font-mono text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#f3eee3] text-[#747878] uppercase border-b border-[#e3e2e0]">
                <th className="py-3 px-4 font-semibold">Patient Code</th>
                <th className="py-3 px-4 font-semibold">Triage Tier</th>
                <th className="py-3 px-4 font-semibold">Clinical Reason</th>
                <th className="py-3 px-4 font-semibold">State</th>
                <th className="py-3 px-4 font-semibold">Sync Status</th>
                <th className="py-3 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e2e0]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#747878]">
                    No cases in registry.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.patient_id} className="hover:bg-[#f3eee3]/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#1a1c1a]">
                      #{item.display_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          item.effective_priority === 'EMERGENCY'
                            ? 'bg-[#ffdad6] text-[#ba1a1a]'
                            : item.effective_priority === 'URGENT'
                            ? 'bg-[#fff4e5] text-[#d97706]'
                            : 'bg-[#aceec4]/40 text-[#2a6a48]'
                        }`}
                      >
                        {item.effective_priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#444748] max-w-xs truncate font-sans">
                      {item.top_reason}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-[#f3eee3] text-[#444748] border border-[#e3e2e0] text-[10px]">
                        {item.state}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#aceec4]/30 text-[#2a6a48] text-[10px] font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-[#2a6a48]" />
                        <span>Enclave Logged</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openPatientAudit(item.patient_id, item.latest_assessment_id || undefined)}
                        className="px-3 py-1 rounded-full bg-[#000000] text-white hover:bg-[#1c1b1b] transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Outbox Items Telemetry Inspection & Retry Section */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-[#2a6a48] font-bold uppercase tracking-wider">
                Store-and-Forward Buffer
              </span>
              <span className="text-[#c4c7c7]">•</span>
              <span className="text-xs font-mono text-[#747878]">
                Outbox Telemetry & Retry Queue ({outboxItems.length} records)
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#1a1c1a]">
              Outbox Transmission Queue
            </h2>
          </div>

          <button
            onClick={fetchOutboxAndHub}
            disabled={loadingOutbox}
            className="px-3.5 py-1.5 rounded-full bg-[#ffffff] hover:bg-[#f3eee3] text-[#1a1c1a] font-mono text-xs border border-[#e3e2e0] flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#2a6a48] ${loadingOutbox ? 'animate-spin' : ''}`} />
            <span>Refresh Outbox</span>
          </button>
        </div>

        <div className="w-full overflow-x-auto rounded-3xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm">
          <table className="w-full text-left font-mono text-xs border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-[#f3eee3] text-[#747878] uppercase border-b border-[#e3e2e0]">
                <th className="py-3 px-4 font-semibold">Entity Type</th>
                <th className="py-3 px-4 font-semibold">Entity ID</th>
                <th className="py-3 px-4 font-semibold">State</th>
                <th className="py-3 px-4 font-semibold">Attempts</th>
                <th className="py-3 px-4 font-semibold">Error Diagnostic</th>
                <th className="py-3 px-4 font-semibold">Created At</th>
                <th className="py-3 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e3e2e0]">
              {outboxItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#747878]">
                    No pending or historical outbox records found.
                  </td>
                </tr>
              ) : (
                outboxItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f3eee3]/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#1a1c1a] uppercase">
                      {item.entity}
                    </td>
                    <td className="py-3 px-4 text-[#747878] truncate max-w-[140px]">
                      {item.entity_id}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          item.state === 'SENT'
                            ? 'bg-[#aceec4]/40 text-[#2a6a48]'
                            : item.state === 'FAILED'
                            ? 'bg-[#ffdad6] text-[#ba1a1a]'
                            : 'bg-[#fff4e5] text-[#d97706]'
                        }`}
                      >
                        {item.state}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#444748]">
                      {item.attempts}/8
                    </td>
                    <td className="py-3 px-4 text-[#747878] max-w-xs truncate">
                      {item.last_error ? (
                        <span className="text-[#ba1a1a] font-sans text-xs">
                          {item.last_error}
                        </span>
                      ) : (
                        'None — Ready'
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#747878]">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.state !== 'SENT' && (
                        <button
                          onClick={() => handleRetryItem(item.id)}
                          disabled={retryingId === item.id}
                          className="px-2.5 py-1 rounded-full bg-[#f3eee3] hover:bg-[#e3e2e0] text-[#1a1c1a] font-mono text-[11px] border border-[#c4c7c7] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {retryingId === item.id ? 'Resetting...' : 'Force Retry'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Central Hospital Target Hub Aggregation Node Card */}
      {targetHub && (
        <section className="p-6 rounded-3xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#aceec4]/30 border border-[#2a6a48]/20 flex items-center justify-center text-[#2a6a48]">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1a1c1a]">
                  District Hospital Target Hub Telemetry
                </h3>
                <p className="text-xs text-[#747878] font-mono">
                  Aggregator Status: {targetHub.node_status} (Target Mode: {targetHub.target_mode ? 'ENABLED' : 'STANDALONE_ENCLAVE'})
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#f3eee3] text-[#2a6a48] font-mono text-xs font-bold border border-[#e3e2e0]">
              Ingest Node Active
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-[#f3eee3] flex flex-col">
              <span className="text-[10px] font-mono uppercase text-[#747878]">Total Patients</span>
              <span className="text-2xl font-bold font-mono text-[#1a1c1a]">{targetHub.ingested_patients}</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#f3eee3] flex flex-col">
              <span className="text-[10px] font-mono uppercase text-[#747878]">Total Assessments</span>
              <span className="text-2xl font-bold font-mono text-[#1a1c1a]">{targetHub.ingested_assessments}</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#f3eee3] flex flex-col">
              <span className="text-[10px] font-mono uppercase text-[#747878]">Total Referrals</span>
              <span className="text-2xl font-bold font-mono text-[#1a1c1a]">{targetHub.ingested_referrals}</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#f3eee3] flex flex-col">
              <span className="text-[10px] font-mono uppercase text-[#747878]">Source Outposts</span>
              <span className="text-sm font-bold font-mono text-[#2a6a48] mt-1">{targetHub.remote_sources.join(', ')}</span>
            </div>
          </div>
        </section>
      )}

    </div>
  );
};
