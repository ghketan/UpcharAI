import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api, ApiError } from '../api';
import { PatientHistory, Assessment, Priority, Finding } from '../types';
import { X, ShieldAlert, ArrowUpRight, CheckCircle2, AlertTriangle, AlertCircle, Clock, Stethoscope, ChevronRight, User } from 'lucide-react';

export const AssessmentModal: React.FC = () => {
  const {
    role,
    setRole,
    selectedPatientId,
    closePatientAudit,
    initiateReferral,
    refreshQueue,
    showToast,
  } = useApp();

  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Escalation sub-form
  const [showEscalate, setShowEscalate] = useState<boolean>(false);
  const [escalateTo, setEscalateTo] = useState<'URGENT' | 'EMERGENCY'>('URGENT');
  const [escalateReason, setEscalateReason] = useState<string>('');
  const [submittingEscalate, setSubmittingEscalate] = useState<boolean>(false);

  // Finalisation sub-form
  const [showFinalise, setShowFinalise] = useState<boolean>(false);
  const [finalPriority, setFinalPriority] = useState<Priority>('URGENT');
  const [finaliseReason, setFinaliseReason] = useState<string>('');
  const [submittingFinalise, setSubmittingFinalise] = useState<boolean>(false);

  const fetchHistory = async () => {
    if (!selectedPatientId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPatientHistory(selectedPatientId, role);
      setHistory(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch patient history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedPatientId, role]);

  if (!selectedPatientId) return null;

  const latestAssessment: Assessment | undefined =
    history?.assessments && history.assessments.length > 0
      ? history.assessments[history.assessments.length - 1]
      : undefined;

  const effectivePriority = latestAssessment?.effective_priority || latestAssessment?.priority || 'ROUTINE';
  const isFinalised = latestAssessment?.state === 'FINALISED';

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!latestAssessment) return;
    if (escalateReason.trim().length < 5) {
      showToast('Escalation reason must be at least 5 characters', 'warning');
      return;
    }

    setSubmittingEscalate(true);
    try {
      await api.escalateAssessment(latestAssessment.assessment_id, escalateTo, escalateReason, role);
      showToast(`Assessment escalated to ${escalateTo}`, 'success');
      setShowEscalate(false);
      setEscalateReason('');
      await fetchHistory();
      await refreshQueue();
    } catch (err: any) {
      showToast(err.message || 'Escalation failed', 'error');
    } finally {
      setSubmittingEscalate(false);
    }
  };

  const handleFinaliseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!latestAssessment) return;

    if (role !== 'DOCTOR') {
      showToast('Only DOCTOR role can finalise an assessment', 'warning');
      return;
    }

    setSubmittingFinalise(true);
    try {
      await api.finaliseAssessment(latestAssessment.assessment_id, finalPriority, finaliseReason.trim() || undefined, role);
      showToast(`Assessment finalised as ${finalPriority}`, 'success');
      setShowFinalise(false);
      setFinaliseReason('');
      await fetchHistory();
      await refreshQueue();
    } catch (err: any) {
      showToast(err.message || 'Finalisation failed', 'error');
    } finally {
      setSubmittingFinalise(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000]/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#faf9f6] rounded-3xl border border-[#c4c7c7] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 bg-[#ffffff] border-b border-[#e3e2e0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#2a6a48] shadow-[0_0_10px_rgba(42,106,72,0.5)]" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-[#1a1c1a]">
                  Clinical Case Audit & Inspector
                </h3>
                {history?.patient?.display_code && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#efeeeb] font-mono text-xs font-semibold text-[#1a1c1a]">
                    #{history.patient.display_code}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#747878] font-mono">
                Deterministic rule derivation & auditable event log
              </p>
            </div>
          </div>

          <button
            onClick={closePatientAudit}
            className="w-9 h-9 rounded-full bg-[#f4f3f1] hover:bg-[#e9e8e5] text-[#444748] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#444748]">
              <div className="w-8 h-8 border-2 border-[#2a6a48] border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-xs">Retrieving patient history...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-[#ffdad6] text-[#ba1a1a] text-sm">
              {error}
            </div>
          ) : !history ? (
            <div className="text-center py-8 text-[#747878]">No patient record found.</div>
          ) : (
            <>
              {/* Patient Demographics Strip */}
              <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#1a1c1a]">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-base text-[#1a1c1a]">
                      Patient ID: {history.patient.id.slice(0, 8)}...
                    </span>
                    <span className="text-xs text-[#444748] font-mono">
                      {history.patient.age} yrs · {history.patient.sex}{' '}
                      {history.patient.pregnant && '· Pregnant'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-[#747878]">Arrived:</span>
                  <span className="text-[#1a1c1a]">
                    {new Date(history.patient.arrived_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#f4f3f1] text-[#444748] border border-[#e3e2e0]">
                    By {history.patient.created_by_role}
                  </span>
                </div>
              </div>

              {/* Priority & State Overview Badge */}
              {latestAssessment ? (
                <div
                  className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                    effectivePriority === 'EMERGENCY'
                      ? 'bg-[#ffdad6]/50 border-[#ba1a1a]/30'
                      : effectivePriority === 'URGENT'
                      ? 'bg-[#fff4e5] border-[#f59e0b]/30'
                      : 'bg-[#aceec4]/25 border-[#2a6a48]/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-3.5 h-3.5 rounded-full ${
                        effectivePriority === 'EMERGENCY'
                          ? 'bg-[#ba1a1a] animate-ping'
                          : effectivePriority === 'URGENT'
                          ? 'bg-[#f59e0b]'
                          : 'bg-[#2a6a48]'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#1a1c1a]">
                          Effective Priority: {effectivePriority}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                            isFinalised
                              ? 'bg-[#2a6a48] text-white'
                              : 'bg-[#000000] text-white'
                          }`}
                        >
                          {isFinalised ? 'FINALISED BY CLINICIAN' : 'PRELIMINARY — AWAITING CLINICIAN'}
                        </span>
                      </div>
                      <p className="text-xs text-[#444748] mt-0.5 font-medium">
                        Suggested Action: "{latestAssessment.suggested_action}"
                      </p>
                    </div>
                  </div>

                  {/* Actions for this assessment */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowEscalate(!showEscalate)}
                      className="px-3.5 py-1.5 rounded-full bg-[#ffffff] hover:bg-[#f4f3f1] text-[#1a1c1a] font-mono text-xs border border-[#c4c7c7] transition-all cursor-pointer"
                    >
                      Escalate Priority ↑
                    </button>
                    <button
                      onClick={() => {
                        if (role !== 'DOCTOR') {
                          if (window.confirm('Finalisation requires DOCTOR role. Switch to DOCTOR mode now?')) {
                            setRole('DOCTOR');
                            setShowFinalise(true);
                          }
                        } else {
                          setShowFinalise(!showFinalise);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-[#000000] hover:bg-[#1c1b1b] text-[#ffffff] font-mono text-xs transition-all cursor-pointer"
                    >
                      {role === 'DOCTOR' ? 'Finalise Case' : 'Finalise (Doctor)'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#f4f3f1] text-xs text-[#747878] font-mono">
                  No assessments entered for this patient yet.
                </div>
              )}

              {/* Sub-Form: Escalate */}
              {showEscalate && latestAssessment && (
                <form
                  onSubmit={handleEscalateSubmit}
                  className="p-4 rounded-2xl bg-[#ffffff] border border-[#f59e0b] shadow-sm flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#1a1c1a] uppercase tracking-wider">
                      Upward Clinical Escalation
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowEscalate(false)}
                      className="text-xs text-[#747878] hover:text-[#1a1c1a]"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-mono text-[#444748]">Target Priority (Must be higher)</label>
                      <select
                        value={escalateTo}
                        onChange={(e) => setEscalateTo(e.target.value as any)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-[#f4f3f1] text-sm text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none"
                      >
                        {effectivePriority === 'ROUTINE' && <option value="URGENT">URGENT</option>}
                        <option value="EMERGENCY">EMERGENCY</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-mono text-[#444748]">Clinical Reason (Required, min 5 chars)</label>
                      <input
                        type="text"
                        placeholder="e.g. Patient looks unwell, diaphoresis noted"
                        value={escalateReason}
                        onChange={(e) => setEscalateReason(e.target.value)}
                        required
                        minLength={5}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-[#f4f3f1] text-sm text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={submittingEscalate}
                      className="px-4 py-2 rounded-full bg-[#f59e0b] text-white font-mono text-xs font-bold hover:bg-[#d97706] transition-colors cursor-pointer"
                    >
                      {submittingEscalate ? 'Submitting...' : 'Confirm Escalation'}
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-Form: Finalise (Doctor Only) */}
              {showFinalise && latestAssessment && (
                <form
                  onSubmit={handleFinaliseSubmit}
                  className="p-4 rounded-2xl bg-[#ffffff] border border-[#2a6a48] shadow-sm flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-[#2a6a48]" />
                      <span className="font-mono text-xs font-bold text-[#1a1c1a] uppercase tracking-wider">
                        Doctor Finalisation (Clinician Decision)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFinalise(false)}
                      className="text-xs text-[#747878] hover:text-[#1a1c1a]"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-mono text-[#444748]">Final Clinician Priority</label>
                      <select
                        value={finalPriority}
                        onChange={(e) => setFinalPriority(e.target.value as Priority)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-[#f4f3f1] text-sm text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none"
                      >
                        <option value="EMERGENCY">EMERGENCY</option>
                        <option value="URGENT">URGENT</option>
                        <option value="ROUTINE">ROUTINE</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-mono text-[#444748]">
                        Reason (Required if overriding triage priority)
                      </label>
                      <input
                        type="text"
                        placeholder="Clinician notes / justification"
                        value={finaliseReason}
                        onChange={(e) => setFinaliseReason(e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-[#f4f3f1] text-sm text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={submittingFinalise}
                      className="px-5 py-2 rounded-full bg-[#2a6a48] text-white font-mono text-xs font-bold hover:bg-[#1e4a32] transition-colors cursor-pointer"
                    >
                      {submittingFinalise ? 'Finalising...' : 'Confirm Finalisation'}
                    </button>
                  </div>
                </form>
              )}

              {/* NEWS2 & Quantitative Vitals Matrix */}
              {latestAssessment && latestAssessment.news2 && (
                <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#1a1c1a] uppercase tracking-wider">
                      NEWS2 Risk Aggregate: {latestAssessment.news2.total} points
                    </span>
                    <span className="font-mono text-xs text-[#747878]">
                      {latestAssessment.news2.params_scored}/6 Parameters Scored
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    <div className="p-2.5 rounded-xl bg-[#f4f3f1] flex flex-col">
                      <span className="text-[11px] text-[#747878]">SpO2</span>
                      <span className="font-mono font-bold text-sm text-[#1a1c1a]">
                        {latestAssessment.inputs?.spo2 ?? '—'}%
                      </span>
                      <span className="text-[10px] text-[#2a6a48] font-mono">
                        Score: {latestAssessment.news2.params.spo2 ?? '0'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#f4f3f1] flex flex-col">
                      <span className="text-[11px] text-[#747878]">SBP</span>
                      <span className="font-mono font-bold text-sm text-[#1a1c1a]">
                        {latestAssessment.inputs?.sbp ?? '—'} mmHg
                      </span>
                      <span className="text-[10px] text-[#2a6a48] font-mono">
                        Score: {latestAssessment.news2.params.sbp ?? '0'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#f4f3f1] flex flex-col">
                      <span className="text-[11px] text-[#747878]">Pulse</span>
                      <span className="font-mono font-bold text-sm text-[#1a1c1a]">
                        {latestAssessment.inputs?.pulse ?? '—'} bpm
                      </span>
                      <span className="text-[10px] text-[#2a6a48] font-mono">
                        Score: {latestAssessment.news2.params.pulse ?? '0'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#f4f3f1] flex flex-col">
                      <span className="text-[11px] text-[#747878]">Temp</span>
                      <span className="font-mono font-bold text-sm text-[#1a1c1a]">
                        {latestAssessment.inputs?.temp_c ? `${latestAssessment.inputs.temp_c}°C` : '—'}
                      </span>
                      <span className="text-[10px] text-[#2a6a48] font-mono">
                        Score: {latestAssessment.news2.params.temp_c ?? '0'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#f4f3f1] flex flex-col">
                      <span className="text-[11px] text-[#747878]">Resp Rate</span>
                      <span className="font-mono font-bold text-sm text-[#1a1c1a]">
                        {latestAssessment.inputs?.rr ?? '—'} /min
                      </span>
                      <span className="text-[10px] text-[#2a6a48] font-mono">
                        Score: {latestAssessment.news2.params.rr ?? '0'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#f4f3f1] flex flex-col">
                      <span className="text-[11px] text-[#747878]">AVPU</span>
                      <span className="font-mono font-bold text-sm text-[#1a1c1a]">
                        {latestAssessment.inputs?.avpu ?? '—'}
                      </span>
                      <span className="text-[10px] text-[#2a6a48] font-mono">
                        Score: {latestAssessment.news2.params.alertness ?? '0'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#f4f3f1] flex flex-col">
                      <span className="text-[11px] text-[#747878]">Oxygen</span>
                      <span className="font-mono font-bold text-sm text-[#1a1c1a]">
                        {latestAssessment.inputs?.on_oxygen ? 'Yes' : 'Room Air'}
                      </span>
                      <span className="text-[10px] text-[#2a6a48] font-mono">
                        Score: {latestAssessment.news2.params.on_oxygen ?? '0'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Fired Deterministic Rules */}
              <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#1a1c1a] uppercase tracking-wider">
                    Fired Deterministic Rules ({latestAssessment?.findings?.length ?? 0})
                  </span>
                  <span className="font-mono text-xs text-[#747878]">
                    Rule Set: {latestAssessment?.rule_set_version ?? 'v1'}
                  </span>
                </div>

                {latestAssessment?.findings && latestAssessment.findings.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {latestAssessment.findings.map((f, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          f.tier === 'EMERGENCY'
                            ? 'bg-[#ffdad6]/30 border-[#ba1a1a]/20 text-[#ba1a1a]'
                            : f.tier === 'URGENT'
                            ? 'bg-[#fff4e5]/50 border-[#f59e0b]/20 text-[#d97706]'
                            : 'bg-[#f4f3f1] border-[#e3e2e0] text-[#1a1c1a]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-[#ffffff] text-[#1a1c1a] border border-[#e3e2e0]">
                            {f.rule_id}
                          </span>
                          <span className="text-sm font-medium text-[#1a1c1a]">
                            {f.plain_message}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-[#747878] shrink-0">
                          [{f.observed_value}]
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#747878] font-mono py-2">
                    No clinical emergency or urgent rules were triggered.
                  </p>
                )}
              </div>

              {/* Clinical Flags */}
              {latestAssessment?.flags && latestAssessment.flags.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] flex flex-col gap-2">
                  <span className="font-mono text-xs font-bold text-[#1a1c1a] uppercase tracking-wider">
                    Safety Flags Triggered
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {latestAssessment.flags.map((flag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-[#efeeeb] text-[#1a1c1a] border border-[#c4c7c7] font-mono text-xs font-medium flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b]" />
                        <span>{flag}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Assessment Timeline / Sequence History */}
              {history.assessments.length > 1 && (
                <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#e3e2e0] flex flex-col gap-2">
                  <span className="font-mono text-xs font-bold text-[#1a1c1a] uppercase tracking-wider">
                    Assessment History ({history.assessments.length} Re-evaluations)
                  </span>
                  <div className="flex flex-col gap-2">
                    {history.assessments.map((a) => (
                      <div
                        key={a.assessment_id}
                        className="p-2.5 rounded-xl bg-[#f4f3f1] flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold">Seq #{a.seq}</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#ffffff] text-[#1a1c1a] font-semibold">
                            {a.priority}
                          </span>
                        </div>
                        <span className="text-[#747878]">
                          {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {a.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:p-5 bg-[#ffffff] border-t border-[#e3e2e0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {latestAssessment && (
              <button
                onClick={() => {
                  initiateReferral(
                    history!.patient.id,
                    latestAssessment.assessment_id,
                    history!.patient.display_code
                  );
                  closePatientAudit();
                }}
                className="px-4 py-2 rounded-full bg-[#ba1a1a] text-white font-mono text-xs font-medium tracking-wide hover:bg-[#93000a] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Initiate SOS Referral</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={closePatientAudit}
            className="px-5 py-2 rounded-full bg-[#efeeeb] text-[#1a1c1a] hover:bg-[#e3e2e0] font-mono text-xs font-medium transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
