import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  Stethoscope,
  MessageSquareHeart,
  Lock,
  User,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
  onClose?: () => void;
  asModal?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onClose, asModal = false }) => {
  const { login, registerUser, showToast, setRole } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('auth');
  const [username, setUsername] = useState<string>('doctor');
  const [password, setPassword] = useState<string>('doctor123');
  const [fullName, setFullName] = useState<string>('Dr. Ananya Sharma');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ username, password });
      } else {
        await registerUser({
          username,
          password,
          role: selectedRole,
          full_name: fullName || undefined,
        });
      }
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const setQuickFill = (u: string, p: string, r: UserRole, name?: string) => {
    setUsername(u);
    setPassword(p);
    setSelectedRole(r);
    if (name) setFullName(name);
    setError(null);
  };

  const handleGuestDemo = async () => {
    setLoading(true);
    try {
      await login({ username: 'doctor', password: 'doctor123' });
      setRole('DOCTOR');
      showToast('Entered as Demo Clinician (Dr. Ananya Sharma)', 'success');
      if (onSuccess) onSuccess();
    } catch {
      // Fallback
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const cardContent = (
    <div className="w-full max-w-[1140px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(20,55,35,0.18),0_0_1px_1px_rgba(30,90,55,0.08)] border border-[#cbe4d4] overflow-hidden relative">
      {/* Optional Close Button for Modal Mode */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-30 p-2.5 rounded-full text-[#527a60] hover:text-[#123520] hover:bg-[#e4f4e9] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
        {/* BEGIN: Left Brand & Organic Illustration Section */}
        <section className="lg:col-span-6 bg-[#fbfdfc] p-7 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden z-10 border-b lg:border-b-0 lg:border-r border-[#e0ece4]">
          {/* Subtle background organic foliage watermark bubbles */}
          <div className="absolute -right-16 top-1/4 w-60 h-60 bg-[#d7f7e4]/60 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-[#e8f5ec]/70 rounded-full pointer-events-none" />

          {/* Top Header & Brand Identity */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#1e4b30] flex items-center justify-center text-[#aceec4] shadow-md ring-2 ring-[#1e4b30]/10 shrink-0">
                <Stethoscope className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold tracking-tight text-[#123520]">
                    Upchar<span className="text-[#238654]">AI</span>
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#e8f5ec] text-[#1e4b30] font-bold border border-[#cce4d4]">
                    v2.4
                  </span>
                </div>
                <p className="text-xs text-[#486352] font-medium">
                  Rural &amp; Community Health Telemetry Network
                </p>
              </div>
            </div>

            <div className="mt-7">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaf6ee] border border-[#bfe0cc] text-[#1b5e37] text-[11px] font-mono font-medium mb-3">
                <Shield className="w-3.5 h-3.5 text-[#238654]" />
                <span>Role-Gated Access Control · SQLite DB</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123520] tracking-tight leading-tight">
                Designated Clinical <br className="hidden sm:inline" />&amp; Citizen Workspace
              </h1>
              <p className="text-xs sm:text-sm text-[#466050] mt-2 max-w-sm leading-relaxed">
                Sign in to automatically bind telemetry nodes, emergency referral rosters, and local triage intelligence according to role scope.
              </p>
            </div>
          </div>

          {/* Center: Artistic Healthcare & Tree of Life Vector Illustration */}
          <div className="my-6 lg:my-3 relative z-10 flex items-center justify-center select-none">
            <div className="relative w-full max-w-[320px] aspect-[4/3] flex items-center justify-center">
              <svg className="w-full h-full" fill="none" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
                {/* Soft Organic Backdrop Ellipse */}
                <path d="M380 150C380 230 300 285 200 285C100 285 25 220 25 140C25 60 110 20 210 20C310 20 380 70 380 150Z" fill="#E8F4EC" opacity="0.8" />
                <circle cx="95" cy="85" fill="#DCEDE1" opacity="0.8" r="28" />
                <circle cx="330" cy="190" fill="#DCEDE1" opacity="0.8" r="18" />
                <circle cx="290" cy="80" fill="#D3E8DA" opacity="0.6" r="10" />

                {/* Ground mounds */}
                <ellipse cx="205" cy="245" fill="#CFE6D7" rx="145" ry="24" />
                <ellipse cx="205" cy="242" fill="#BEDDC8" rx="125" ry="16" />

                {/* Tree Trunk / Healing Caduceus Branch */}
                <path d="M196 242V155C196 150 206 150 206 155V242H196Z" fill="#20402E" />

                {/* Canopy Tiers */}
                <path d="M201 50L135 125H267L201 50Z" fill="#286845" />
                <path d="M201 100L120 175H282L201 100Z" fill="#22583a" />
                <path d="M201 150L105 230H297L201 150Z" fill="#1b4930" />

                {/* Medical cross on tree crown */}
                <circle cx="201" cy="48" fill="#EFA929" r="12" />
                <rect fill="#FFFFFF" height="14" rx="1" width="5" x="198.5" y="41" />
                <rect fill="#FFFFFF" height="5" rx="1" width="14" x="194" y="45.5" />

                {/* Heart Pulse & Sensor nodes on foliage */}
                <circle cx="160" cy="130" fill="#ACEEC4" r="5" />
                <circle cx="240" cy="140" fill="#ACEEC4" r="5" />
                <circle cx="150" cy="180" fill="#F87171" r="6" />
                <circle cx="250" cy="190" fill="#60A5FA" r="6" />
                <circle cx="190" cy="205" fill="#ACEEC4" r="5.5" />
                <circle cx="215" cy="170" fill="#FBBF24" r="5" />

                {/* Left Character: Healthcare Worker / Clinician with tablet */}
                <circle cx="95" cy="188" fill="#1C3829" r="8" />
                <path d="M88 200C88 196 102 196 102 200V242H88V200Z" fill="#2A5C41" />
                <path d="M102 206L112 214" stroke="#2A5C41" strokeLinecap="round" strokeWidth="3" />
                <rect fill="#FFFFFF" height="16" rx="2" stroke="#1C3829" strokeWidth="1.5" width="12" x="110" y="209" />
                <path d="M91 202C91 209 99 209 99 202" fill="none" stroke="#ACEEC4" strokeWidth="1.5" />

                {/* Right Character: Citizen / Patient interacting */}
                <circle cx="308" cy="196" fill="#1C3829" r="7" />
                <path d="M302 206C302 203 314 203 314 206V242H302V206Z" fill="#4b785d" />
                <path d="M302 212L292 218" stroke="#4b785d" strokeLinecap="round" strokeWidth="2.5" />

                {/* Chat heartbeat bubble */}
                <rect fill="#FFFFFF" height="20" rx="6" stroke="#c0dcc9" strokeWidth="1" width="28" x="282" y="165" />
                <path d="M288 175H292L294 171L297 179L299 173L301 175H304" fill="none" stroke="#E11D48" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                <polygon fill="#FFFFFF" points="292,185 296,189 298,185" />
              </svg>
            </div>
          </div>

          {/* Left Bottom Footer Meta */}
          <div className="relative z-10 pt-4 border-t border-[#d8eae0] flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-[#4d6a57] gap-2">
            <p>© 2025 UpcharAI Healthcare Systems. All rights reserved.</p>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-[#edf7f1] text-[#1b5e37] px-2 py-0.5 rounded-md border border-[#c2e2cc]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#238654] animate-pulse" />
              Sync: Local SQLite active
            </span>
          </div>
        </section>

        {/* BEGIN: Right Interactive Form Section */}
        <section className="lg:col-span-6 bg-[#f0f8f3] text-[#123520] p-6 sm:p-10 lg:p-11 flex flex-col justify-between relative border-l border-[#dceee2]">
          <div>
            {/* Top Mode Switcher Bar */}
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <span className="text-xs font-mono tracking-widest uppercase text-[#238654] font-semibold block">
                  Authentication
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#123520] mt-0.5">
                  {mode === 'login' ? 'Existing User Sign In' : 'Register New Identity'}
                </h2>
              </div>

              {/* Mode Switcher Buttons */}
              <div className="inline-flex p-1 bg-[#deede2] border border-[#c3dfcb] rounded-2xl shadow-inner shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-mono font-semibold rounded-xl transition-all duration-150 cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-[#123520] shadow-sm border border-[#b8dbc3]'
                      : 'text-[#3b674b] hover:text-[#123520]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-mono font-semibold rounded-xl transition-all duration-150 cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-[#123520] shadow-sm border border-[#b8dbc3]'
                      : 'text-[#3b674b] hover:text-[#123520]'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {/* Role Attribute Selector: 2 Cards (auth vs user) */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#1e4b30] font-semibold">
                  Select Login Attribute &amp; Workspace
                </label>
                <span className="text-[10px] font-mono text-[#196139] bg-[#d9f0e1] border border-[#abd8ba] px-2 py-0.5 rounded-full font-medium">
                  Active: {selectedRole === 'auth' ? 'Clinician (auth)' : 'Citizen (user)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Card 1: Clinical Staff ('auth') */}
                <div
                  onClick={() => {
                    setSelectedRole('auth');
                    if (username === 'patient' || username === 'user') {
                      setUsername('doctor');
                      setPassword('doctor123');
                      setFullName('Dr. Ananya Sharma');
                    }
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    selectedRole === 'auth'
                      ? 'border-[#238654] bg-white ring-2 ring-[#238654]/20 shadow-[0_4px_16px_rgba(35,134,84,0.12)]'
                      : 'border-[#cce4d4] bg-[#fbfdfc] hover:border-[#9ecfad] hover:bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-8 h-8 rounded-xl bg-[#e3f6ea] text-[#1c6e43] border border-[#bde5cb] flex items-center justify-center font-bold">
                        <Stethoscope className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#dcf3e5] text-[#145330] border border-[#b2e2c3]">
                        role: auth
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[#123520]">Clinical Staff</h3>
                    <p className="text-[11px] text-[#446650] mt-1 leading-snug">
                      Full triage system, emergency referrals, vitals telemetry &amp; clinical roster.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#e2efe6] flex flex-wrap gap-1">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ebf7f0] text-[#1b6b44] border border-[#cde8d7] font-medium">
                      Triage
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ebf7f0] text-[#1b6b44] border border-[#cde8d7] font-medium">
                      Referrals
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ebf7f0] text-[#1b6b44] border border-[#cde8d7] font-medium">
                      Chat
                    </span>
                  </div>
                </div>

                {/* Card 2: Patient / Citizen ('user') */}
                <div
                  onClick={() => {
                    setSelectedRole('user');
                    if (username === 'doctor' || username === 'staff') {
                      setUsername('patient');
                      setPassword('user123');
                      setFullName('Rahul Verma');
                    }
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    selectedRole === 'user'
                      ? 'border-[#238654] bg-white ring-2 ring-[#238654]/20 shadow-[0_4px_16px_rgba(35,134,84,0.12)]'
                      : 'border-[#cce4d4] bg-[#fbfdfc] hover:border-[#9ecfad] hover:bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-8 h-8 rounded-xl bg-[#e8f1eb] text-[#3e6b4e] flex items-center justify-center font-bold">
                        <MessageSquareHeart className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#e6ede8] text-[#3f674f]">
                        role: user
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[#1e422c]">Patient / Citizen</h3>
                    <p className="text-[11px] text-[#4d6b57] mt-1 leading-snug">
                      Sahayak multilingual informational chatbot, preventive wellness guides.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#e2efe6] flex flex-wrap gap-1">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ebf7f0] text-[#1b6b44] border border-[#cde8d7] font-medium">
                      Chatbot Only
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca] font-medium">
                      Triage Locked
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick-Fill Preset Credentials Bar */}
            <div className="mb-4 p-2.5 rounded-2xl bg-white border border-[#c8e2d2] shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#1e5c36] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#238654]" />
                  Quick-Fill Test Accounts:
                </span>
                <span className="text-[9px] font-mono text-[#587c65]">1-click populated</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickFill('doctor', 'doctor123', 'auth', 'Dr. Ananya Sharma')}
                  title="doctor / doctor123"
                  className={`px-2 py-1.5 rounded-xl border text-[10px] font-mono text-left truncate transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                    username === 'doctor'
                      ? 'bg-[#dcf3e5] border-[#238654] text-[#145330] font-bold'
                      : 'bg-[#f2f9f4] hover:bg-[#e4f4e9] border-[#cbe5d4] text-[#123520]'
                  }`}
                >
                  <span>👨‍⚕️</span> <span className="truncate">Clinician (auth)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFill('staff', 'staff123', 'auth', 'Pooja Devi')}
                  title="staff / staff123"
                  className={`px-2 py-1.5 rounded-xl border text-[10px] font-mono text-left truncate transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                    username === 'staff'
                      ? 'bg-[#dcf3e5] border-[#238654] text-[#145330] font-bold'
                      : 'bg-[#f2f9f4] hover:bg-[#e4f4e9] border-[#cbe5d4] text-[#123520]'
                  }`}
                >
                  <span>👩‍⚕️</span> <span className="truncate">Nurse (auth)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFill('patient', 'user123', 'user', 'Rahul Verma')}
                  title="patient / user123"
                  className={`px-2 py-1.5 rounded-xl border text-[10px] font-mono text-left truncate transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                    username === 'patient'
                      ? 'bg-[#dcf3e5] border-[#238654] text-[#145330] font-bold'
                      : 'bg-[#f2f9f4] hover:bg-[#e4f4e9] border-[#cbe5d4] text-[#123520]'
                  }`}
                >
                  <span>👤</span> <span className="truncate">Patient (user)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFill('user', 'user123', 'user', 'Sita Devi')}
                  title="user / user123"
                  className={`px-2 py-1.5 rounded-xl border text-[10px] font-mono text-left truncate transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                    username === 'user'
                      ? 'bg-[#dcf3e5] border-[#238654] text-[#145330] font-bold'
                      : 'bg-[#f2f9f4] hover:bg-[#e4f4e9] border-[#cbe5d4] text-[#123520]'
                  }`}
                >
                  <span>👩</span> <span className="truncate">Citizen (user)</span>
                </button>
              </div>
            </div>

            {/* Main Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Optional Register-Only Field: Full Name */}
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#1e4b30] mb-1 font-semibold">
                    Full Name &amp; Title
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#527a60]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Ananya Sharma or Rahul Verma"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#c0e0cc] text-sm text-[#123520] placeholder-[#7a9e86] focus:outline-none focus:border-[#238654] focus:ring-2 focus:ring-[#238654]/20 transition-all shadow-xs"
                    />
                  </div>
                </div>
              )}

              {/* Username Field */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#1e4b30] mb-1 font-semibold">
                  Username or Identifier
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#527a60]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="doctor, staff, patient or citizen identifier"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#c0e0cc] text-sm text-[#123520] placeholder-[#7a9e86] font-mono focus:outline-none focus:border-[#238654] focus:ring-2 focus:ring-[#238654]/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#1e4b30] font-semibold">
                    Password
                  </label>
                  <span
                    onClick={() => showToast('Preset accounts use doctor123, staff123, or user123.', 'info')}
                    className="text-[11px] text-[#1e6e42] hover:text-[#124b2a] hover:underline cursor-pointer font-medium"
                  >
                    Forgot Password?
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#527a60]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-white border border-[#c0e0cc] text-sm text-[#123520] placeholder-[#7a9e86] font-mono focus:outline-none focus:border-[#238654] focus:ring-2 focus:ring-[#238654]/20 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#527a60] hover:text-[#123520] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Notice Banner */}
              {error && (
                <div className="p-2.5 rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/40 text-[#ba1a1a] text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#1e7e45] hover:bg-[#249150] active:bg-[#186838] text-white font-bold text-sm tracking-wide transition-all duration-200 shadow-[0_6px_20px_rgba(30,126,69,0.3)] hover:shadow-[0_8px_24px_rgba(30,126,69,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>
                    {loading
                      ? 'Authenticating...'
                      : mode === 'login'
                      ? `Sign In as ${selectedRole === 'auth' ? 'Staff (auth)' : 'Patient (user)'}`
                      : `Create Account as ${selectedRole === 'auth' ? 'Staff (auth)' : 'Patient (user)'}`}
                  </span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Guest / Demo Mode Quick Access */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleGuestDemo}
                  disabled={loading}
                  className="text-xs font-mono text-[#1b5e37] hover:text-[#0c1b13] hover:underline cursor-pointer transition-colors"
                >
                  ⚡ Skip &amp; Explore Platform as Guest (Doctor Mode) →
                </button>
              </div>
            </form>
          </div>

          {/* Right Section Security Footer Notice */}
          <div className="pt-4 mt-3 border-t border-[#d8eae0] text-center lg:text-left">
            <p className="text-[11px] text-[#4d6f59] leading-relaxed">
              Encrypted &amp; role-isolated session. <span className="text-[#194e2e] font-mono font-semibold">'user'</span> accounts are locked to the informational chatbot, while <span className="text-[#156b39] font-mono font-bold">'auth'</span> grants emergency clinical referral controls.
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#557861]">
              <span className="hover:text-[#185e34] cursor-pointer">Terms &amp; Security Policy</span>
              <span>Assistance: support@upcharai.org</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  // If rendered as a standalone page (default), center it with ambient decor
  if (!asModal) {
    return (
      <div className="w-full flex items-center justify-center py-6 sm:py-10">
        {cardContent}
      </div>
    );
  }

  // If rendered as a modal overlay on top of existing view
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      {cardContent}
    </div>
  );
};
