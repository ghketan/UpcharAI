import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api, ApiError } from '../api';
import { QueueItem, Priority } from '../types';
import {
  Activity,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Shield,
  ChevronRight,
  Heart,
  User,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const SYMPTOM_OPTIONS = [
  { code: 'CHEST_PAIN', label: 'Chest Pain', emergency: false },
  { code: 'SEVERE_BREATHING_DIFFICULTY', label: 'Severe Breathing Difficulty', emergency: true },
  { code: 'BREATHING_DIFFICULTY', label: 'Breathing Difficulty (Moderate)', emergency: false },
  { code: 'SEIZURE_ONGOING', label: 'Ongoing Seizure', emergency: true },
  { code: 'SEVERE_BLEEDING', label: 'Severe / Uncontrolled Bleeding', emergency: true },
  { code: 'STROKE_SIGNS', label: 'Sudden Stroke Signs', emergency: true },
  { code: 'SNAKEBITE_OR_POISONING', label: 'Snakebite or Poisoning', emergency: true },
  { code: 'PREGNANCY_HEAVY_BLEEDING', label: 'Obstetric Heavy Bleeding', emergency: true },
  { code: 'PREGNANCY_CONVULSION', label: 'Obstetric Convulsion', emergency: true },
  { code: 'VOMITING_DIARRHOEA_DEHYDRATION', label: 'Vomiting / Dehydration', emergency: false },
  { code: 'FEVER', label: 'Fever', emergency: false },
  { code: 'ABDOMINAL_PAIN', label: 'Abdominal Pain', emergency: false },
  { code: 'SEVERE_HEADACHE', label: 'Severe Headache', emergency: false },
  { code: 'COUGH', label: 'Cough', emergency: false },
  { code: 'OTHER_TEXT', label: 'Other Symptoms (Free-Text)', emergency: false },
];

const HISTORY_OPTIONS = [
  { code: 'DIABETES', label: 'Diabetes' },
  { code: 'HYPERTENSION', label: 'Hypertension' },
  { code: 'HEART_DISEASE', label: 'Heart Disease' },
  { code: 'COPD_ASTHMA', label: 'COPD / Asthma' },
  { code: 'IMMUNOCOMPROMISED', label: 'Immunocompromised' },
];

export const TriageQueueView: React.FC = () => {
  const {
    role,
    queue,
    queueLoading,
    queueStale,
    refreshQueue,
    openPatientAudit,
    initiateReferral,
    showToast,
  } = useApp();

  // Filters & Search
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State
  const [displayCode, setDisplayCode] = useState<string>('');
  const [age, setAge] = useState<string>('45');
  const [sex, setSex] = useState<'M' | 'F' | 'OTHER'>('F');
  const [pregnant, setPregnant] = useState<boolean>(false);

  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [historyCodes, setHistoryCodes] = useState<string[]>([]);
  const [freeText, setFreeText] = useState<string>('');
  const [durationDays, setDurationDays] = useState<string>('');

  // Vitals State
  const [spo2, setSpo2] = useState<string>('96');
  const [sbp, setSbp] = useState<string>('120');
  const [dbp, setDbp] = useState<string>('80');
  const [pulse, setPulse] = useState<string>('76');
  const [tempC, setTempC] = useState<string>('37.0');
  const [rr, setRr] = useState<string>('16');
  const [avpu, setAvpu] = useState<string>('A');
  const [onOxygen, setOnOxygen] = useState<boolean>(false);

  // Submission & Confirmation State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [implausibleWarning, setImplausibleWarning] = useState<string | null>(null);

  // Toggle symptom chip
  const toggleSymptom = (code: string) => {
    setSymptoms((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Toggle history chip
  const toggleHistory = (code: string) => {
    setHistoryCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Live client-side preview calculation
  const livePreview = useMemo(() => {
    const s = parseFloat(spo2);
    const sys = parseFloat(sbp);
    const d = parseFloat(dbp);
    const p = parseFloat(pulse);
    const t = parseFloat(tempC);

    const hasEmergencySymptom = symptoms.some((code) =>
      [
        'SEVERE_BREATHING_DIFFICULTY',
        'SEIZURE_ONGOING',
        'SEVERE_BLEEDING',
        'STROKE_SIGNS',
        'SNAKEBITE_OR_POISONING',
        'PREGNANCY_HEAVY_BLEEDING',
        'PREGNANCY_CONVULSION',
      ].includes(code)
    );

    const isChestPainEmergency =
      symptoms.includes('CHEST_PAIN') && ((s && s <= 93) || (sys && sys <= 100) || (p && p >= 111));

    if (
      hasEmergencySymptom ||
      isChestPainEmergency ||
      (s && s <= 90) ||
      (sys && sys <= 90) ||
      ['P', 'U'].includes(avpu)
    ) {
      return {
        priority: 'EMERGENCY' as Priority,
        badgeClass: 'bg-[#ffdad6] text-[#ba1a1a] border-[#ba1a1a]',
        title: 'Tier 1 Red Emergency Detected',
        message: 'Critical physiological threshold or red-flag symptom triggered.',
      };
    }

    if (
      symptoms.includes('CHEST_PAIN') ||
      symptoms.includes('BREATHING_DIFFICULTY') ||
      symptoms.includes('VOMITING_DIARRHOEA_DEHYDRATION') ||
      parseInt(age, 10) < 16 ||
      pregnant ||
      (s && s <= 95) ||
      (t && t >= 38.5)
    ) {
      return {
        priority: 'URGENT' as Priority,
        badgeClass: 'bg-[#fff4e5] text-[#d97706] border-[#f59e0b]',
        title: 'Tier 2 Urgent Detected',
        message: 'High-risk condition, age/pregnancy floor, or abnormal biometrics.',
      };
    }

    return {
      priority: 'ROUTINE' as Priority,
      badgeClass: 'bg-[#aceec4]/40 text-[#2a6a48] border-[#2a6a48]',
      title: 'Tier 3 Routine OPD',
      message: 'No immediate red-flag thresholds breached.',
    };
  }, [spo2, sbp, dbp, pulse, tempC, avpu, symptoms, age, pregnant]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent, confirmImplausible: boolean = false) => {
    if (e) e.preventDefault();

    if (!displayCode.trim()) {
      showToast('Please provide a patient display code or identifier', 'warning');
      return;
    }

    setSubmitting(true);
    setImplausibleWarning(null);

    try {
      // 1. Create Patient
      const patient = await api.createPatient(
        {
          display_code: displayCode.trim(),
          age: parseInt(age, 10) || 0,
          sex,
          pregnant,
        },
        role
      );

      // 2. Create Assessment
      const assessment = await api.createAssessment(
        patient.patient_id || patient.id,
        {
          symptom_codes: symptoms,
          history_codes: historyCodes,
          free_text: freeText.trim() || null,
          duration_days: durationDays ? parseInt(durationDays, 10) : null,
          temp_c: tempC ? parseFloat(tempC) : null,
          sbp: sbp ? parseInt(sbp, 10) : null,
          dbp: dbp ? parseInt(dbp, 10) : null,
          spo2: spo2 ? parseInt(spo2, 10) : null,
          pulse: pulse ? parseInt(pulse, 10) : null,
          rr: rr ? parseInt(rr, 10) : null,
          avpu: avpu || null,
          on_oxygen: onOxygen,
          confirm_implausible: confirmImplausible,
        },
        role
      );

      showToast(
        `Patient ${patient.display_code} registered. Priority: ${assessment.priority}`,
        'success'
      );

      // Clear or reset form
      setDisplayCode('');
      setFreeText('');
      setSymptoms([]);
      setHistoryCodes([]);
      setDurationDays('');

      await refreshQueue();
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'implausible_value_needs_confirmation') {
        setImplausibleWarning(err.message);
      } else {
        showToast(err.message || 'Intake registration failed', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Queue
  const filteredQueue = useMemo(() => {
    return queue.filter((item) => {
      // Filter by priority
      if (filterPriority === 'tier1' && item.effective_priority !== 'EMERGENCY') return false;
      if (filterPriority === 'tier2' && item.effective_priority !== 'URGENT') return false;
      if (filterPriority === 'tier3' && item.effective_priority !== 'ROUTINE') return false;
      if (
        filterPriority === 'flagged' &&
        !item.flags.some((f) => ['INCOMPLETE', 'NEEDS_REVIEW', 'SCORE_MAY_BE_UNDERSTATED'].includes(f))
      ) {
        return false;
      }

      // Filter by search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const code = item.display_code.toLowerCase();
        const reason = item.top_reason.toLowerCase();
        return code.includes(query) || reason.includes(query);
      }

      return true;
    });
  }, [queue, filterPriority, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const tier1 = queue.filter((q) => q.effective_priority === 'EMERGENCY').length;
    const tier2 = queue.filter((q) => q.effective_priority === 'URGENT').length;
    const tier3 = queue.filter((q) => q.effective_priority === 'ROUTINE').length;
    return { total: queue.length, tier1, tier2, tier3 };
  }, [queue]);

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  };

  return (
    <div className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      
      {/* Top Ambient CDSS Header & Node Metadata */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e3e2e0]">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#444748]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f3f1] text-[#1a1c1a] border border-[#e3e2e0]">
              <span className="w-2 h-2 rounded-full bg-[#2a6a48]" />
              <span>Sub-Centre Outpost (Punjab)</span>
            </span>
            <span className="text-[#c4c7c7]">/</span>
            <span>CDSS Node #KK-04</span>
            <span className="text-[#c4c7c7]">/</span>
            <span className="text-[#2a6a48] font-semibold">Rule Set: rules.v1.yaml</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              onClick={refreshQueue}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#efeeeb] text-[#444748] hover:text-[#1a1c1a] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${queueLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#efeeeb] text-[#444748]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2a6a48] animate-pulse" />
              <span>100% Offline SQLite</span>
            </div>
          </div>
        </div>

        {/* Hero Header & Real-Time Station Counts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#aceec4]/40 text-[#2f6e4c] font-mono text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#2a6a48]" />
              <span>Deterministic Frontline Triage Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1c1a]">
              Frontline Triage Engine <span className="text-[#747878] font-light">//</span>{' '}
              <span className="text-[#2a6a48] italic font-serif">Deterministic Matrix</span>
            </h1>
            <p className="text-sm sm:text-base text-[#444748] max-w-2xl leading-relaxed">
              Algorithmic physiological red-flag validation for ANMs and Community Health Officers. Generates auditable clinical triage trails in under 10 milliseconds.
            </p>
          </div>

          <div className="lg:col-span-4 flex justify-start lg:justify-end">
            <div className="w-full max-w-[280px] p-4 rounded-2xl bg-[#f4f3f1] border border-[#e3e2e0] shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between text-[#444748] font-mono text-xs">
                <span className="uppercase tracking-wider">Active Queue Matrix</span>
                <span className="text-[#2a6a48] font-bold">LIVE EVAL</span>
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-bold text-[#1a1c1a] font-mono">{counts.total}</span>
                <span className="text-xs text-[#747878] font-mono">Patients in Outpost</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-2 font-mono text-center">
                <div className="p-2 rounded-xl bg-[#ffdad6]/60 flex flex-col">
                  <span className="text-[10px] text-[#ba1a1a] font-bold">TIER 1</span>
                  <span className="text-lg font-bold text-[#ba1a1a]">{counts.tier1}</span>
                </div>
                <div className="p-2 rounded-xl bg-[#fff4e5] flex flex-col">
                  <span className="text-[10px] text-[#d97706] font-bold">TIER 2</span>
                  <span className="text-lg font-bold text-[#d97706]">{counts.tier2}</span>
                </div>
                <div className="p-2 rounded-xl bg-[#aceec4]/40 flex flex-col">
                  <span className="text-[10px] text-[#2a6a48] font-bold">TIER 3</span>
                  <span className="text-lg font-bold text-[#2a6a48]">{counts.tier3}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Staleness Banner */}
      {queueStale && (
        <div className="p-3.5 rounded-2xl bg-[#ffdad6]/80 border border-[#ba1a1a] flex items-center justify-between gap-3 text-xs text-[#ba1a1a] shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">
              Warning: Queue telemetry refresh is delayed (&gt; 6s). Check local connection.
            </span>
          </div>
          <button
            onClick={refreshQueue}
            className="px-3 py-1 rounded-full bg-[#ba1a1a] text-white font-mono hover:bg-[#93000a] transition-colors cursor-pointer"
          >
            Retry Poll
          </button>
        </div>
      )}

      {/* Split Interactive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Intake Registration & Vitals Telemetry (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6" id="intake-form">
          <div className="p-5 sm:p-6 rounded-3xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm flex flex-col gap-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#e3e2e0]">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#2a6a48]" />
                <h2 className="text-lg font-bold text-[#1a1c1a]">Point-of-Care Intake</h2>
              </div>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#f4f3f1] text-[#444748] border border-[#e3e2e0]">
                ANM TELEMETRY
              </span>
            </div>

            {/* Implausible Value Warning Box */}
            {implausibleWarning && (
              <div className="p-4 rounded-2xl bg-[#ffdad6] border border-[#ba1a1a] flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#ba1a1a] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono text-xs font-bold text-[#ba1a1a] uppercase">
                      Implausible Physiological Value
                    </span>
                    <p className="text-xs text-[#93000a] mt-0.5">{implausibleWarning}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setImplausibleWarning(null)}
                    className="px-3 py-1 rounded-full bg-white text-xs font-mono text-[#444748] border border-[#c4c7c7] cursor-pointer"
                  >
                    Edit Value
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    className="px-3 py-1 rounded-full bg-[#ba1a1a] text-white text-xs font-mono font-bold hover:bg-[#93000a] cursor-pointer"
                  >
                    Confirm Implausible Value
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={(e) => handleSubmit(e, false)} className="flex flex-col gap-4">
              
              {/* Demographics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-[#444748] uppercase">
                    Patient Display Code / Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. P-105 or Jasleen Kaur"
                    value={displayCode}
                    onChange={(e) => setDisplayCode(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-[#f4f3f1] text-sm text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-[#444748] uppercase">
                    Age & Sex *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      min={0}
                      max={120}
                      placeholder="Age"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-1/2 px-3 py-2 rounded-xl bg-[#f4f3f1] text-sm text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none focus:ring-1 focus:ring-black font-mono"
                    />
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value as any)}
                      className="w-1/2 px-3 py-2 rounded-xl bg-[#f4f3f1] text-sm text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none"
                    >
                      <option value="F">Female (F)</option>
                      <option value="M">Male (M)</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pregnancy Checkbox */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0]">
                <input
                  type="checkbox"
                  id="pregCheck"
                  checked={pregnant}
                  onChange={(e) => setPregnant(e.target.checked)}
                  className="w-4 h-4 rounded text-[#2a6a48] focus:ring-[#2a6a48]"
                />
                <label htmlFor="pregCheck" className="text-xs font-mono text-[#1a1c1a] cursor-pointer">
                  Patient is currently pregnant (triggers Obstetric Urgency Floor)
                </label>
              </div>

              {/* Chief Complaints Checklist Chips */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-[#444748] uppercase">
                    Reported Symptoms & Red-Flags
                  </label>
                  <span className="text-[11px] font-mono text-[#747878]">
                    {symptoms.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-[#f4f3f1] rounded-2xl border border-[#e3e2e0]">
                  {SYMPTOM_OPTIONS.map((item) => {
                    const isSelected = symptoms.includes(item.code);
                    return (
                      <button
                        type="button"
                        key={item.code}
                        onClick={() => toggleSymptom(item.code)}
                        className={`px-3 py-1 rounded-full font-mono text-xs transition-all cursor-pointer ${
                          isSelected
                            ? item.emergency
                              ? 'bg-[#ba1a1a] text-white shadow-sm'
                              : 'bg-[#000000] text-white shadow-sm'
                            : 'bg-white text-[#444748] hover:text-[#1a1c1a] border border-[#e3e2e0]'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Medical History Checklist */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-[#444748] uppercase">
                  Past Medical History Codes
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {HISTORY_OPTIONS.map((item) => {
                    const isSelected = historyCodes.includes(item.code);
                    return (
                      <button
                        type="button"
                        key={item.code}
                        onClick={() => toggleHistory(item.code)}
                        className={`px-2.5 py-0.5 rounded-full font-mono text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#2a6a48] text-white'
                            : 'bg-[#f4f3f1] text-[#444748] hover:bg-[#e9e8e5]'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantitative Vitals Grid */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#e3e2e0]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-[#444748] font-bold">
                    Physiological Biometrics (NEWS2)
                  </span>
                  <span className="text-[11px] font-mono text-[#2a6a48]">Live Rule Engine Active</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* SpO2 */}
                  <div className="p-2.5 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col gap-1">
                    <span className="text-[11px] text-[#747878] font-mono">SpO2 (%)</span>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      placeholder="e.g. 96"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      className="font-mono text-lg font-bold text-[#1a1c1a] bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] text-[#747878] font-mono">Target &gt;94%</span>
                  </div>

                  {/* SBP */}
                  <div className="p-2.5 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col gap-1">
                    <span className="text-[11px] text-[#747878] font-mono">Systolic BP (mmHg)</span>
                    <input
                      type="number"
                      min={40}
                      max={300}
                      placeholder="e.g. 120"
                      value={sbp}
                      onChange={(e) => setSbp(e.target.value)}
                      className="font-mono text-lg font-bold text-[#1a1c1a] bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] text-[#747878] font-mono">Normal: 111-219</span>
                  </div>

                  {/* DBP */}
                  <div className="p-2.5 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col gap-1">
                    <span className="text-[11px] text-[#747878] font-mono">Diastolic BP (mmHg)</span>
                    <input
                      type="number"
                      min={20}
                      max={200}
                      placeholder="e.g. 80"
                      value={dbp}
                      onChange={(e) => setDbp(e.target.value)}
                      className="font-mono text-lg font-bold text-[#1a1c1a] bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] text-[#747878] font-mono">Normal: 60-90</span>
                  </div>

                  {/* Pulse */}
                  <div className="p-2.5 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col gap-1">
                    <span className="text-[11px] text-[#747878] font-mono">Pulse (bpm)</span>
                    <input
                      type="number"
                      min={20}
                      max={250}
                      placeholder="e.g. 76"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      className="font-mono text-lg font-bold text-[#1a1c1a] bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] text-[#747878] font-mono">Normal: 51-90</span>
                  </div>

                  {/* Temp */}
                  <div className="p-2.5 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col gap-1">
                    <span className="text-[11px] text-[#747878] font-mono">Temp (°C)</span>
                    <input
                      type="number"
                      step="0.1"
                      min={30}
                      max={45}
                      placeholder="e.g. 37.0"
                      value={tempC}
                      onChange={(e) => setTempC(e.target.value)}
                      className="font-mono text-lg font-bold text-[#1a1c1a] bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] text-[#747878] font-mono">Normal: 36.1-38.0</span>
                  </div>

                  {/* Resp Rate */}
                  <div className="p-2.5 rounded-xl bg-[#f4f3f1] border border-[#e3e2e0] flex flex-col gap-1">
                    <span className="text-[11px] text-[#747878] font-mono">Resp Rate (rr)</span>
                    <input
                      type="number"
                      min={4}
                      max={70}
                      placeholder="e.g. 16"
                      value={rr}
                      onChange={(e) => setRr(e.target.value)}
                      className="font-mono text-lg font-bold text-[#1a1c1a] bg-transparent focus:outline-none"
                    />
                    <span className="text-[10px] text-[#747878] font-mono">Normal: 12-20</span>
                  </div>
                </div>

                {/* AVPU & Oxygen Toggles */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-[#747878]">AVPU Consciousness</label>
                    <select
                      value={avpu}
                      onChange={(e) => setAvpu(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-[#f4f3f1] text-xs font-mono text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none"
                    >
                      <option value="A">Alert (A)</option>
                      <option value="V">Voice Response (V)</option>
                      <option value="P">Pain Response (P)</option>
                      <option value="U">Unresponsive (U)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-[#747878]">Supplemental Oxygen</label>
                    <button
                      type="button"
                      onClick={() => setOnOxygen(!onOxygen)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-colors cursor-pointer border ${
                        onOxygen
                          ? 'bg-[#2a6a48] text-white border-[#2a6a48]'
                          : 'bg-[#f4f3f1] text-[#444748] border-[#e3e2e0]'
                      }`}
                    >
                      {onOxygen ? 'On Oxygen (+2 NEWS2)' : 'Room Air (0)'}
                    </button>
                  </div>
                </div>

                {/* Free Text & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="sm:col-span-1 flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-[#747878]">Duration (Days)</label>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      placeholder="e.g. 2"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-[#f4f3f1] text-xs font-mono text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-[#747878]">
                      Clinical Notes (Triggers Review Flag)
                    </label>
                    <input
                      type="text"
                      maxLength={300}
                      placeholder="Optional free-text observations"
                      value={freeText}
                      onChange={(e) => setFreeText(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-[#f4f3f1] text-xs text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div
                className={`p-3.5 rounded-2xl border flex flex-col gap-1 transition-all ${livePreview.badgeClass}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">
                    {livePreview.title}
                  </span>
                  <span className="font-mono text-[11px] font-bold">PREVIEW</span>
                </div>
                <p className="text-xs opacity-90">{livePreview.message}</p>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-full bg-[#000000] text-[#ffffff] font-mono text-xs uppercase tracking-wider font-semibold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-[#aff1c6]" />
                <span>
                  {submitting ? 'Evaluating & Registering...' : 'Commit Patient to Priority Queue'}
                </span>
              </button>
            </form>
          </div>
        </section>

        {/* RIGHT COLUMN: Active Priority Queue & Live Inspector (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Priority Queue Header & Search/Filter Controls */}
          <div className="p-4 rounded-3xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2a6a48]" />
                <h2 className="text-lg font-bold text-[#1a1c1a]">Active Priority Queue</h2>
                <span className="text-xs font-mono text-[#747878]">
                  ({filteredQueue.length} cases)
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#747878]" />
                <input
                  type="text"
                  placeholder="Search code / reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-full bg-[#f4f3f1] text-xs font-mono text-[#1a1c1a] border border-[#e3e2e0] focus:outline-none"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
              <button
                onClick={() => setFilterPriority('all')}
                className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  filterPriority === 'all'
                    ? 'bg-[#000000] text-white'
                    : 'bg-[#f4f3f1] text-[#444748] hover:text-[#1a1c1a]'
                }`}
              >
                All ({counts.total})
              </button>
              <button
                onClick={() => setFilterPriority('tier1')}
                className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer ${
                  filterPriority === 'tier1'
                    ? 'bg-[#ba1a1a] text-white'
                    : 'bg-[#f4f3f1] text-[#ba1a1a] hover:bg-[#ffdad6]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] animate-ping" />
                Emergency ({counts.tier1})
              </button>
              <button
                onClick={() => setFilterPriority('tier2')}
                className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  filterPriority === 'tier2'
                    ? 'bg-[#d97706] text-white'
                    : 'bg-[#f4f3f1] text-[#d97706] hover:bg-[#fff4e5]'
                }`}
              >
                Urgent ({counts.tier2})
              </button>
              <button
                onClick={() => setFilterPriority('tier3')}
                className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  filterPriority === 'tier3'
                    ? 'bg-[#2a6a48] text-white'
                    : 'bg-[#f4f3f1] text-[#2a6a48] hover:bg-[#aceec4]/30'
                }`}
              >
                Routine ({counts.tier3})
              </button>
              <button
                onClick={() => setFilterPriority('flagged')}
                className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  filterPriority === 'flagged'
                    ? 'bg-[#1a1c1a] text-white'
                    : 'bg-[#f4f3f1] text-[#747878] hover:bg-[#e9e8e5]'
                }`}
              >
                Flagged / Incomplete
              </button>
            </div>
          </div>

          {/* Queue Cards List */}
          <div className="flex flex-col gap-3">
            {filteredQueue.length === 0 ? (
              <div className="p-12 rounded-3xl bg-[#ffffff] border border-[#e3e2e0] text-center flex flex-col items-center gap-2">
                <span className="text-sm font-mono text-[#747878]">No patients matching current filter.</span>
                <span className="text-xs text-[#747878]">
                  Register a new case using the intake form on the left.
                </span>
              </div>
            ) : (
              filteredQueue.map((item) => {
                const isEmergency = item.effective_priority === 'EMERGENCY';
                const isUrgent = item.effective_priority === 'URGENT';

                return (
                  <article
                    key={item.patient_id}
                    className="p-4 sm:p-5 rounded-3xl bg-[#ffffff] border border-[#e3e2e0] shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative overflow-hidden group"
                  >
                    {/* Priority Accent Border Stripe */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        isEmergency ? 'bg-[#ba1a1a]' : isUrgent ? 'bg-[#f59e0b]' : 'bg-[#2a6a48]'
                      }`}
                    />

                    {/* Top Row: Patient Info & Priority Badge */}
                    <div className="flex flex-wrap items-start justify-between gap-2 pl-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-[#1a1c1a]">
                            #{item.display_code}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                              item.state === 'FINALISED'
                                ? 'bg-[#2a6a48] text-white'
                                : 'bg-[#f4f3f1] text-[#444748] border border-[#e3e2e0]'
                            }`}
                          >
                            {item.state}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[#444748] font-medium pt-0.5">
                          <span>Reason:</span>
                          <span className="text-[#1a1c1a]">{item.top_reason}</span>
                        </div>
                      </div>

                      {/* Priority Tag */}
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold ${
                          isEmergency
                            ? 'bg-[#ffdad6] text-[#ba1a1a]'
                            : isUrgent
                            ? 'bg-[#fff4e5] text-[#d97706]'
                            : 'bg-[#aceec4]/40 text-[#2a6a48]'
                        }`}
                      >
                        {isEmergency && <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-ping" />}
                        <span>{item.effective_priority}</span>
                      </div>
                    </div>

                    {/* Flags Strip */}
                    {item.flags && item.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-2">
                        {item.flags.map((flag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-full bg-[#f4f3f1] text-[#747878] text-[10px] font-mono border border-[#e3e2e0] flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3 text-[#f59e0b]" />
                            <span>{flag}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bottom Action Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pl-2 pt-2 border-t border-[#e3e2e0]/70 text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-[#747878]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Wait: {formatWaitTime(item.wait_seconds)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEmergency && (
                          <button
                            onClick={() =>
                              initiateReferral(
                                item.patient_id,
                                item.latest_assessment_id || '',
                                item.display_code
                              )
                            }
                            className="px-3 py-1.5 rounded-full bg-[#ba1a1a] text-white hover:bg-[#93000a] transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                          >
                            <span>SOS Referral</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => openPatientAudit(item.patient_id, item.latest_assessment_id || undefined)}
                          className="px-3.5 py-1.5 rounded-full bg-[#f4f3f1] hover:bg-[#e9e8e5] text-[#1a1c1a] font-medium border border-[#e3e2e0] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>Audit & Finalise</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

      </div>
    </div>
  );
};
