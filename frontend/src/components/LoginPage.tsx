import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import {
  Stethoscope,
  MessageSquareHeart,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  AlertCircle,
  X,
  Sparkles,
  Bot,
  Activity,
  Hospital,
  UserPlus,
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
  const [email, setEmail] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setError('Please enter a username.');
      return;
    }
    if (!cleanPassword) {
      setError('Please enter a password.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ username: cleanUsername, password: cleanPassword });
      } else {
        await registerUser({
          username: cleanUsername,
          password: cleanPassword,
          role: selectedRole,
          full_name: fullName.trim() || undefined,
          email: email.trim() || undefined,
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
    setMode('login');
    setUsername(u);
    setPassword(p);
    setSelectedRole(r);
    if (name) setFullName(name);
    setError(null);
  };

  const setRegisterTemplate = (u: string, p: string, r: UserRole, name: string) => {
    setMode('register');
    setUsername(u);
    setPassword(p);
    setSelectedRole(r);
    setFullName(name);
    setEmail(`${u}@example.com`);
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
        {/* BEGIN: Left Brand & Illustration Section */}
        <section className="lg:col-span-6 bg-[#fbfdfc] p-7 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden z-10 border-b lg:border-b-0 lg:border-r border-[#e0ece4]">
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
                Designated Clinical <br className="hidden sm:inline" />&amp; Client Workspace
              </h1>
              <p className="text-xs sm:text-sm text-[#466050] mt-2 max-w-sm leading-relaxed">
                Sign in or register to bind telemetry nodes, emergency referral rosters, or the Sahayak multilingual chatbot according to role scope.
              </p>
            </div>
          </div>

          {/* Role Comparison Visual Matrix */}
          <div className="relative z-10 my-6 p-4 rounded-2xl bg-[#f2f9f4] border border-[#cbe5d4] shadow-xs">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#1e5c36] font-bold block mb-2">
              System Access Matrix
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-[#1e4b30] text-[#aceec4] font-mono text-[10px] font-bold shrink-0">
                  auth
                </span>
                <span className="text-[#2b4c38] leading-tight">
                  <strong className="text-[#123520]">Clinical Staff:</strong> Triage engine, patient intake, emergency hospital referrals, telemetry sync, and chatbot.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-[#e2dcce] text-[#123520] font-mono text-[10px] font-bold shrink-0">
                  client
                </span>
                <span className="text-[#2b4c38] leading-tight">
                  <strong className="text-[#123520]">Client / Patient:</strong> Sahayak multilingual informational chatbot. Clinical triage &amp; hospital records strictly restricted.
                </span>
              </div>
            </div>
          </div>

          {/* Quick Demo Access & Node Sync Status */}
          <div className="relative z-10 flex items-center justify-between pt-4 border-t border-[#d8e8dd]">
            <button
              type="button"
              onClick={handleGuestDemo}
              disabled={loading}
              className="text-xs font-mono font-semibold text-[#1c6e43] hover:text-[#0d4427] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Instant Clinician Demo Access</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-[#527a60] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#238654] animate-pulse" />
              SQLite DB Active
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
                    if (!username || username.includes('_new')) {
                      setUsername('doctor');
                      setPassword('doctor123');
                      setFullName('Dr. Ananya Sharma');
                    }
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
                    // Clear prefilled credentials of existing accounts so registration doesn't collide
                    if (['doctor', 'staff', 'patient', 'user'].includes(username)) {
                      setUsername('');
                      setPassword('');
                      setFullName('');
                      setEmail('');
                    }
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

            {/* Role Attribute Selector: 2 Cards (auth vs client/user) */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#1e4b30] font-semibold">
                  Select Login Attribute &amp; Workspace
                </label>
                <span className="text-[10px] font-mono text-[#196139] bg-[#d9f0e1] border border-[#abd8ba] px-2 py-0.5 rounded-full font-medium">
                  Active: {selectedRole === 'auth' ? 'Clinical Staff (auth)' : 'Client / Patient (client)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Card 1: Clinical Staff ('auth') */}
                <div
                  onClick={() => {
                    setSelectedRole('auth');
                    if (mode === 'login' && (username === 'patient' || username === 'user')) {
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
                      Triage system, red-flag alerts, emergency referrals &amp; sync.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#e2efe6] flex flex-wrap gap-1">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ebf7f0] text-[#1b6b44] border border-[#cde8d7] font-medium flex items-center gap-1">
                      <Activity className="w-2.5 h-2.5" /> Triage
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ebf7f0] text-[#1b6b44] border border-[#cde8d7] font-medium flex items-center gap-1">
                      <Hospital className="w-2.5 h-2.5" /> Referrals
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ebf7f0] text-[#1b6b44] border border-[#cde8d7] font-medium flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5" /> Chat
                    </span>
                  </div>
                </div>

                {/* Card 2: Client / Patient ('client' / 'user') */}
                <div
                  onClick={() => {
                    setSelectedRole('user');
                    if (mode === 'login' && (username === 'doctor' || username === 'staff')) {
                      setUsername('patient');
                      setPassword('user123');
                      setFullName('Rahul Verma');
                    }
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    selectedRole === 'user' || selectedRole === 'client'
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
                        role: client
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[#1e422c]">Client / Patient</h3>
                    <p className="text-[11px] text-[#4d6b57] mt-1 leading-snug">
                      Sahayak multilingual chatbot for health education &amp; advice.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#e2efe6] flex flex-wrap gap-1">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ebf7f0] text-[#1b6b44] border border-[#cde8d7] font-medium flex items-center gap-1">
                      <Bot className="w-2.5 h-2.5" /> Chatbot Only
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca] font-medium">
                      Triage Locked
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick-Fill Preset Credentials (Login Mode) / Fast Registration Templates (Register Mode) */}
            {mode === 'login' ? (
              <div className="mb-4 p-2.5 rounded-2xl bg-white border border-[#c8e2d2] shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#1e5c36] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#238654]" />
                    Quick-Fill Test Accounts (Sign In):
                  </span>
                  <span className="text-[9px] font-mono text-[#587c65]">1-click fill</span>
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
                    <span>👤</span> <span className="truncate">Patient (client)</span>
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
                    <span>👩</span> <span className="truncate">Citizen (client)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-2.5 rounded-2xl bg-white border border-[#c8e2d2] shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#1e5c36] font-bold flex items-center gap-1">
                    <UserPlus className="w-3 h-3 text-[#238654]" />
                    Fast New Account Sample Data:
                  </span>
                  <span className="text-[9px] font-mono text-[#587c65]">1-click populate</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const rand = Math.floor(100 + Math.random() * 900);
                      setRegisterTemplate(`doc_${rand}`, 'password123', 'auth', `Dr. Priya Sharma`);
                    }}
                    className="px-2.5 py-1.5 rounded-xl border bg-[#f2f9f4] hover:bg-[#e4f4e9] border-[#cbe5d4] text-[10px] font-mono text-left transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>👨‍⚕️</span> <span>New Staff Account (auth)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const rand = Math.floor(100 + Math.random() * 900);
                      setRegisterTemplate(`client_${rand}`, 'password123', 'user', `Aarav Mehta`);
                    }}
                    className="px-2.5 py-1.5 rounded-xl border bg-[#f2f9f4] hover:bg-[#e4f4e9] border-[#cbe5d4] text-[10px] font-mono text-left transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>👤</span> <span>New Client Account (client)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Main Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Register-Only Fields: Full Name & Optional Email */}
              {mode === 'register' && (
                <>
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
                        placeholder="e.g. Dr. Priya Sharma or Aarav Mehta"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#c0e0cc] text-sm text-[#123520] placeholder-[#7a9e86] focus:outline-none focus:border-[#238654] focus:ring-2 focus:ring-[#238654]/20 transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#1e4b30] mb-1 font-semibold">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#527a60]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. name@example.com (or auto-assigned)"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#c0e0cc] text-sm text-[#123520] placeholder-[#7a9e86] font-mono focus:outline-none focus:border-[#238654] focus:ring-2 focus:ring-[#238654]/20 transition-all shadow-xs"
                      />
                    </div>
                  </div>
                </>
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
                    placeholder="Enter your username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#c0e0cc] text-sm text-[#123520] placeholder-[#7a9e86] font-mono focus:outline-none focus:border-[#238654] focus:ring-2 focus:ring-[#238654]/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#1e4b30] mb-1 font-semibold">
                    Password
                  </label>
                  {mode === 'login' && (
                    <span
                      onClick={() => showToast('Preset accounts use doctor123, staff123, or user123.', 'info')}
                      className="text-[11px] text-[#1e6e42] hover:text-[#124b2a] hover:underline cursor-pointer font-medium"
                    >
                      Forgot Password?
                    </span>
                  )}
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
                <div className="p-3 rounded-xl bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] text-xs font-mono flex items-start gap-2 shadow-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#b91c1c]" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#1e4b30] text-white hover:bg-[#153823] font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group active:scale-[0.99]"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'login'
                        ? `Sign In as ${selectedRole === 'auth' ? 'Staff (auth)' : 'Client (client)'}`
                        : `Create New Account as ${selectedRole === 'auth' ? 'Staff (auth)' : 'Client (client)'}`}
                    </span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Secure Audit Notice at bottom */}
          <div className="mt-5 pt-3 border-t border-[#d8e8dd] text-center">
            <p className="text-[11px] text-[#486b54] leading-relaxed">
              Role permissions are verified against SQLite. <span className="font-semibold text-[#123520]">Client</span> accounts are routed to the chatbot; <span className="font-semibold text-[#123520]">Staff</span> accounts unlock the triage queue and referrals.
            </p>
          </div>
        </section>
      </div>
    </div>
  );

  if (asModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-[1140px] max-h-[95vh] overflow-y-auto">{cardContent}</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-8">
      {cardContent}
    </div>
  );
};
