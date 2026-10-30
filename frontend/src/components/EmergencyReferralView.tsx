import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Hospital, ReferralSummary, QueueItem } from '../types';
import {
  ShieldAlert,
  Phone,
  Printer,
  FileText,
  AlertTriangle,
  Building2,
  Clock,
  ArrowRight,
  Send,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';

export const EmergencyReferralView: React.FC = () => {
  const { role, queue, referralTarget, clearReferralTarget, showToast } = useApp();

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('HOSP-001');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  const [loadingHospitals, setLoadingHospitals] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [referralResult, setReferralResult] = useState<ReferralSummary | null>(null);

  // Initialize with referralTarget if available, or first emergency/urgent case in queue if unselected
  useEffect(() => {
    if (referralTarget) {
      setSelectedPatientId(referralTarget.patientId);
      setSelectedAssessmentId(referralTarget.assessmentId);
    } else if (!selectedPatientId && queue.length > 0) {
      const emergencyCase = queue.find((q) => q.effective_priority === 'EMERGENCY') || queue[0];
      setSelectedPatientId(emergencyCase.patient_id);
      setSelectedAssessmentId(emergencyCase.latest_assessment_id || '');
    }
  }, [referralTarget, queue.length, selectedPatientId, setSelectedPatientId, setSelectedAssessmentId]);

  // Load hospitals
  useEffect(() => {
    const fetchHospitals = async () => {
      setLoadingHospitals(true);
      try {
        const data = await api.getHospitals(role);
        setHospitals(data);
        if (data.length > 0 && !selectedHospitalId) {
          setSelectedHospitalId(data[0].id);
        }
      } catch {
        showToast('Failed to load referral hospitals', 'error');
      } finally {
        setLoadingHospitals(false);
      }
    };
    fetchHospitals();
  }, [role]);

  // Handle patient selection change
  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    const item = queue.find((q) => q.patient_id === patientId);
    setSelectedAssessmentId(item?.latest_assessment_id || '');
    setReferralResult(null);
  };

  const handleGenerateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessmentId) {
      showToast('Selected patient does not have an assessment to refer', 'warning');
      return;
    }

    setGenerating(true);
    try {
      const result = await api.createReferral(selectedAssessmentId, selectedHospitalId, role);
      setReferralResult(result);
      showToast('Referral summary packet generated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate referral', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const selectedPatientItem = queue.find((q) => q.patient_id === selectedPatientId);
  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId);

  return (
    <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      
      {/* Top Ambient Emergency Handover Header */}
      <section className="flex flex-col gap-4">
        
        {/* Tier Breached Pill & Enclave Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e3e2e0]">
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] font-mono text-xs tracking-wider shadow-sm border border-[#ba1a1a]/30">
            <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-ping" />
            <span className="font-bold uppercase">Referral Handover Center</span>
            <span className="opacity-40">/</span>
            <span>Sub-Centre Outpost #KK-04</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-[#444748]">
            <span className="px-3 py-1 rounded-full bg-[#f4f3f1] border border-[#e3e2e0]">
              ABDM & FHIR R4 Structure
            </span>
          </div>
        </div>

        {/* Legal & Safety Compliance Alert Banner (Strict Acceptance Criteria UI-005) */}
        <div className="p-4 rounded-2xl bg-[#ffdad6]/60 border border-[#ba1a1a] flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-[#ba1a1a] shrink-0 mt-0.5" />
          <div className="flex flex-col text-xs text-[#ba1a1a]">
            <span className="font-mono font-bold uppercase tracking-wider">
              Simulation Notice (SEC-006 & NON-003 Compliance)
            </span>
            <p className="mt-0.5 font-medium text-[#93000a]">
              SIMULATED — not transmitted to anyone. No ambulance dispatch or hospital notification occurs. All referral workflows and target facility information are demonstrative.
            </p>
          </div>
        </div>
      </section>

      {/* Referral Generation & Command Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Case & Hospital Selection Form (4 cols) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm flex flex-col gap-5">
            <div className="flex items-center gap-2 pb-2 border-b border-[#e3e2e0]">
              <FileText className="w-5 h-5 text-[#2a6a48]" />
              <h2 className="text-base font-bold text-[#1a1c1a]">Referral Configuration</h2>
            </div>

            <form onSubmit={handleGenerateReferral} className="flex flex-col gap-4">
              
              {/* Select Case */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase text-[#444748]">
                  Select Patient Case *
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => handlePatientChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#f4f3f1] text-xs font-mono text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none"
                >
                  {queue.length === 0 ? (
                    <option value="">No patients in queue</option>
                  ) : (
                    queue.map((q) => (
                      <option key={q.patient_id} value={q.patient_id}>
                        #{q.display_code} — {q.effective_priority} ({q.top_reason.slice(0, 30)}...)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Selected Patient Snapshot */}
              {selectedPatientItem && (
                <div className="p-3.5 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col gap-1 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1a1c1a]">#{selectedPatientItem.display_code}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedPatientItem.effective_priority === 'EMERGENCY'
                          ? 'bg-[#ffdad6] text-[#ba1a1a]'
                          : selectedPatientItem.effective_priority === 'URGENT'
                          ? 'bg-[#fff4e5] text-[#d97706]'
                          : 'bg-[#aceec4]/40 text-[#2a6a48]'
                      }`}
                    >
                      {selectedPatientItem.effective_priority}
                    </span>
                  </div>
                  <span className="text-[#747878]">Reason: {selectedPatientItem.top_reason}</span>
                  <span className="text-[#747878]">State: {selectedPatientItem.state}</span>
                </div>
              )}

              {/* Target Facility Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono uppercase text-[#444748]">
                  Designated Referral Facility *
                </label>
                {loadingHospitals ? (
                  <div className="text-xs text-[#747878] font-mono">Loading referral centers...</div>
                ) : (
                  <select
                    value={selectedHospitalId}
                    onChange={(e) => setSelectedHospitalId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f4f3f1] text-xs font-mono text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.area})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selected Hospital Quick Contact Card with tel: link (UI-005) */}
              {selectedHospital && (
                <div className="p-3.5 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1a1c1a]">{selectedHospital.name}</span>
                    <span className="text-[10px] text-[#747878] font-mono">Simulated</span>
                  </div>
                  <span className="text-xs text-[#444748] font-mono">{selectedHospital.area}</span>
                  
                  <a
                    href={`tel:${selectedHospital.phone.replace(/[^0-9+\-]/g, '')}`}
                    className="mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-[#000000] text-white font-mono text-xs hover:bg-[#1c1b1b] transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#aff1c6]" />
                    <span>Call Center: {selectedHospital.phone}</span>
                  </a>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={generating || !selectedAssessmentId}
                className="w-full py-3 px-4 rounded-full bg-[#000000] text-white font-mono text-xs uppercase tracking-wider font-semibold shadow-md hover:bg-[#1c1b1b] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5 text-[#aff1c6]" />
                <span>{generating ? 'Compiling Packet...' : 'Generate Referral Summary Slip'}</span>
              </button>
            </form>
          </div>
        </section>

        {/* RIGHT COLUMN: Official Referral Packet & Print Slip (8 cols) */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          {referralResult ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm flex flex-col gap-6 print:border-none print:shadow-none">
              
              {/* Slip Official Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e3e2e0]">
                <div className="flex flex-col">
                  <span className="font-mono text-xs text-[#2a6a48] font-bold uppercase tracking-wider">
                    Government of Punjab · Department of Health & Family Welfare
                  </span>
                  <h2 className="text-xl font-bold text-[#1a1c1a]">
                    Frontline Emergency Referral Handover Slip (Form #7)
                  </h2>
                  <span className="font-mono text-xs text-[#747878]">
                    Referral ID: #{referralResult.referral_id} · Generated: {new Date(referralResult.generated_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-full bg-[#f4f3f1] hover:bg-[#e9e8e5] text-[#1a1c1a] font-mono text-xs border border-[#e3e2e0] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-[#444748]" />
                    <span>Print Slip</span>
                  </button>
                </div>
              </div>

              {/* Demographics & Priority Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-[#f4f3f1] border border-[#e3e2e0] font-mono text-xs">
                <div>
                  <span className="text-[#747878]">Patient Code:</span>
                  <p className="font-bold text-sm text-[#1a1c1a]">#{referralResult.display_code}</p>
                </div>
                <div>
                  <span className="text-[#747878]">Demographics:</span>
                  <p className="font-bold text-sm text-[#1a1c1a]">
                    {referralResult.age} yrs · {referralResult.sex}{' '}
                    {referralResult.pregnant && '· Pregnant'}
                  </p>
                </div>
                <div>
                  <span className="text-[#747878]">Effective Priority:</span>
                  <p
                    className={`font-bold text-sm ${
                      referralResult.effective_priority === 'EMERGENCY'
                        ? 'text-[#ba1a1a]'
                        : referralResult.effective_priority === 'URGENT'
                        ? 'text-[#d97706]'
                        : 'text-[#2a6a48]'
                    }`}
                  >
                    {referralResult.effective_priority} ({referralResult.finalisation_state})
                  </p>
                </div>
              </div>

              {/* Vitals Telemetry Matrix */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#1a1c1a]">
                  Recorded Physiological Telemetry
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col">
                    <span className="text-[11px] text-[#747878] font-mono">SpO2 Level</span>
                    <span className="text-base font-bold text-[#1a1c1a] font-mono">
                      {referralResult.vitals.spo2 ?? '—'}%
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col">
                    <span className="text-[11px] text-[#747878] font-mono">Blood Pressure</span>
                    <span className="text-base font-bold text-[#1a1c1a] font-mono">
                      {referralResult.vitals.sbp ?? '—'}/{referralResult.vitals.dbp ?? '—'} mmHg
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col">
                    <span className="text-[11px] text-[#747878] font-mono">Heart Rate</span>
                    <span className="text-base font-bold text-[#1a1c1a] font-mono">
                      {referralResult.vitals.pulse ?? '—'} bpm
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col">
                    <span className="text-[11px] text-[#747878] font-mono">Temperature</span>
                    <span className="text-base font-bold text-[#1a1c1a] font-mono">
                      {referralResult.vitals.temp_c ? `${referralResult.vitals.temp_c}°C` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fired Clinical Rules & Reasons */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#1a1c1a]">
                  Fired Deterministic Rules & Rationale
                </span>
                <div className="flex flex-col gap-1.5 font-mono text-xs">
                  {referralResult.fired_rules.length > 0 ? (
                    referralResult.fired_rules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] text-[#1a1c1a]"
                      >
                        {rule}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-xl bg-[#f4f3f1] text-[#747878]">
                      No critical rules fired.
                    </div>
                  )}
                </div>
              </div>

              {/* Destination Facility Summary */}
              <div className="p-4 rounded-2xl bg-[#aceec4]/25 border border-[#2a6a48]/40 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#2a6a48] uppercase">
                    Receiving Medical Facility
                  </span>
                  <span className="font-mono text-[11px] text-[#2a6a48]">Phone: {referralResult.hospital.phone}</span>
                </div>
                <span className="text-base font-bold text-[#1a1c1a]">{referralResult.hospital.name}</span>
                <span className="text-xs text-[#444748] font-mono">{referralResult.hospital.area}</span>
              </div>

              {/* Fallback 140-Character SMS Format Preview */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-[#e3e2e0]">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#747878]">
                  Zero-Connectivity GSM SMS Fallback Packet
                </span>
                <code className="p-3 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] font-mono text-xs text-[#1a1c1a] block overflow-x-auto">
                  UPCHAR/REF:{referralResult.referral_id.slice(0, 6)}/P:{referralResult.display_code}/
                  {referralResult.effective_priority}/O2:{referralResult.vitals.spo2 ?? 'NA'}/BP:
                  {referralResult.vitals.sbp ?? 'NA'}/{referralResult.vitals.dbp ?? 'NA'}/HR:
                  {referralResult.vitals.pulse ?? 'NA'}/HOSP:{referralResult.hospital.id}
                </code>
              </div>

              {/* Mandatory Simulated Disclaimer Footer */}
              <div className="p-3 rounded-xl bg-[#ffdad6]/40 border border-[#ba1a1a]/30 text-center font-mono text-xs text-[#ba1a1a]">
                {referralResult.disclaimer}
              </div>

            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#ffffff] border border-[#e3e2e0] text-center flex flex-col items-center justify-center gap-3 min-h-[400px]">
              <FileText className="w-10 h-10 text-[#c4c7c7]" />
              <h3 className="text-base font-bold text-[#1a1c1a]">No Referral Packet Generated Yet</h3>
              <p className="text-xs text-[#747878] max-w-sm">
                Select an assessed patient and designated hospital facility on the left, then click "Generate Referral Summary Slip".
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
