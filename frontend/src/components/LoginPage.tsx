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
  CheckCircle2,
  Shield,
  ArrowRight,
  AlertCircle,
  Sparkles,
  HeartPulse,
  Hospital,
  Activity,
  Bot,
  X,
} from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
  onClose?: () => void;
  asModal?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onClose, asModal = false }) => {
  const { login, registerUser, showToast } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('auth');
  const [username, setUsername] = useState<string>('doctor');
  const [password, setPassword] = useState<string>('doctor123');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
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
          email: email || undefined,
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

  const content = (
    <div className="w-full max-w-xl mx-auto bg-[#ffffff] rounded-3xl border border-[#e3e2e0] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] p-6 sm:p-10 relative">
      {/* Optional Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-[#747878] hover:text-[#1a1c1a] hover:bg-[#f3eee3] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header & Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-[#aceec4]/40 border border-[#2a6a48]/20 text-[#2a6a48] text-xs font-mono font-medium mb-3">
          <Shield className="w-3.5 h-3.5" />
          <span>Role-Gated Access Control · SQLite DB</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1c1a]">
          Upchar<span className="text-[#2a6a48]">AI</span> Access Portal
        </h1>
        <p className="text-sm text-[#444748] mt-2 max-w-md mx-auto">
          Sign in to access your designated health centre workspace based on your login attribute.
        </p>
      </div>

      {/* Mode Switcher: Sign In vs Register */}
      <div className="flex p-1 bg-[#f3eee3] rounded-2xl mb-6">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError(null);
          }}
          className={`flex-1 py-2.5 text-xs font-mono font-semibold rounded-xl transition-all cursor-pointer ${
            mode === 'login'
              ? 'bg-[#ffffff] text-[#1a1c1a] shadow-sm'
              : 'text-[#747878] hover:text-[#1a1c1a]'
          }`}
        >
          Existing User (Sign In)
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError(null);
          }}
          className={`flex-1 py-2.5 text-xs font-mono font-semibold rounded-xl transition-all cursor-pointer ${
            mode === 'register'
              ? 'bg-[#ffffff] text-[#1a1c1a] shadow-sm'
              : 'text-[#747878] hover:text-[#1a1c1a]'
          }`}
        >
          New Registration
        </button>
      </div>

      {/* 2 Core Attributes Selector Cards */}
      <div className="mb-6">
        <label className="block text-xs font-mono uppercase tracking-wider text-[#747878] mb-2 font-medium">
          Select Login Attribute & Workspace
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Attribute 1: 'auth' (Clinician / Staff) */}
          <div
            onClick={() => {
              setSelectedRole('auth');
              if (mode === 'login' && username === 'patient') {
                setUsername('doctor');
                setPassword('doctor123');
              }
            }}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-left relative flex flex-col justify-between ${
              selectedRole === 'auth'
                ? 'border-[#2a6a48] bg-[#aceec4]/10 shadow-[0_0_20px_rgba(42,106,72,0.12)]'
                : 'border-[#e3e2e0] bg-[#faf7ee]/50 hover:border-[#c4c7c7]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    selectedRole === 'auth' ? 'bg-[#2a6a48] text-white' : 'bg-[#e2dcce] text-[#444748]'
                  }`}
                >
                  <Stethoscope className="w-5 h-5" />
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    selectedRole === 'auth'
                      ? 'bg-[#2a6a48] text-white'
                      : 'bg-[#e2dcce] text-[#747878]'
                  }`}
                >
                  role: auth
                </span>
              </div>
              <h3 className="font-semibold text-sm text-[#1a1c1a]">Clinical Staff</h3>
              <p className="text-[11px] text-[#444748] mt-1 leading-snug">
                Full triage system, emergency referrals, vitals assessments & telemetry.
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-[#e3e2e0]/60 flex flex-wrap gap-1">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f3eee3] text-[#2a6a48] font-medium flex items-center gap-1">
                <Activity className="w-2.5 h-2.5" /> Triage
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f3eee3] text-[#2a6a48] font-medium flex items-center gap-1">
                <Hospital className="w-2.5 h-2.5" /> Referrals
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f3eee3] text-[#2a6a48] font-medium flex items-center gap-1">
                <Bot className="w-2.5 h-2.5" /> Chat
              </span>
            </div>
          </div>

          {/* Attribute 2: 'user' (Patient / Public Citizen) */}
          <div
            onClick={() => {
              setSelectedRole('user');
              if (mode === 'login' && username === 'doctor') {
                setUsername('patient');
                setPassword('user123');
              }
            }}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-left relative flex flex-col justify-between ${
              selectedRole === 'user'
                ? 'border-[#2a6a48] bg-[#aceec4]/10 shadow-[0_0_20px_rgba(42,106,72,0.12)]'
                : 'border-[#e3e2e0] bg-[#faf7ee]/50 hover:border-[#c4c7c7]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    selectedRole === 'user' ? 'bg-[#2a6a48] text-white' : 'bg-[#e2dcce] text-[#444748]'
                  }`}
                >
                  <MessageSquareHeart className="w-5 h-5" />
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    selectedRole === 'user'
                      ? 'bg-[#2a6a48] text-white'
                      : 'bg-[#e2dcce] text-[#747878]'
                  }`}
                >
                  role: user
                </span>
              </div>
              <h3 className="font-semibold text-sm text-[#1a1c1a]">Patient / Citizen</h3>
              <p className="text-[11px] text-[#444748] mt-1 leading-snug">
                Access to the Sahayak Multilingual Informational Chatbot only.
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-[#e3e2e0]/60 flex flex-wrap gap-1">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f3eee3] text-[#2a6a48] font-medium flex items-center gap-1">
                <Bot className="w-2.5 h-2.5" /> Chatbot Only
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#ffdad6] text-[#ba1a1a] font-medium">
                Triage Locked
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Fill Test Accounts Banner */}
      <div className="mb-6 p-3 rounded-2xl bg-[#f3eee3]/80 border border-[#e3e2e0]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono font-semibold text-[#444748] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#2a6a48]" />
            Quick-Fill Preset Credentials:
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setQuickFill('doctor', 'doctor123', 'auth', 'Dr. Ananya Sharma')}
            className="px-2 py-1.5 rounded-xl bg-white hover:bg-[#eae4d6] border border-[#e3e2e0] text-[10px] font-mono font-medium text-[#1a1c1a] transition-all text-left truncate cursor-pointer shadow-xs"
            title="Clinician: doctor / doctor123"
          >
            👨‍⚕️ Clinician (auth)
          </button>
          <button
            type="button"
            onClick={() => setQuickFill('staff', 'staff123', 'auth', 'Pooja Devi')}
            className="px-2 py-1.5 rounded-xl bg-white hover:bg-[#eae4d6] border border-[#e3e2e0] text-[10px] font-mono font-medium text-[#1a1c1a] transition-all text-left truncate cursor-pointer shadow-xs"
            title="Nurse: staff / staff123"
          >
            👩‍⚕️ Nurse (auth)
          </button>
          <button
            type="button"
            onClick={() => setQuickFill('patient', 'user123', 'user', 'Rahul Verma')}
            className="px-2 py-1.5 rounded-xl bg-white hover:bg-[#eae4d6] border border-[#e3e2e0] text-[10px] font-mono font-medium text-[#1a1c1a] transition-all text-left truncate cursor-pointer shadow-xs"
            title="Patient: patient / user123"
          >
            👤 Patient (user)
          </button>
          <button
            type="button"
            onClick={() => setQuickFill('user', 'user123', 'user', 'Sita Devi')}
            className="px-2 py-1.5 rounded-xl bg-white hover:bg-[#eae4d6] border border-[#e3e2e0] text-[10px] font-mono font-medium text-[#1a1c1a] transition-all text-left truncate cursor-pointer shadow-xs"
            title="Citizen: user / user123"
          >
            👩 Citizen (user)
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-5 p-3 rounded-2xl bg-[#ffdad6] text-[#ba1a1a] text-xs font-mono flex items-start gap-2 border border-[#ba1a1a]/30">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Inputs */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#747878] mb-1 font-medium">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747878]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dr. Ananya Sharma or Rahul Verma"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#faf7ee] border border-[#e3e2e0] text-sm text-[#1a1c1a] focus:outline-none focus:border-[#2a6a48] transition-colors"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-[#747878] mb-1 font-medium">
            Username or Identifier
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747878]">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (e.g. doctor, patient)"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#faf7ee] border border-[#e3e2e0] text-sm text-[#1a1c1a] font-mono focus:outline-none focus:border-[#2a6a48] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-[#747878] mb-1 font-medium">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747878]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#faf7ee] border border-[#e3e2e0] text-sm text-[#1a1c1a] font-mono focus:outline-none focus:border-[#2a6a48] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#747878] hover:text-[#1a1c1a] cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-4 rounded-2xl bg-[#000000] text-white hover:bg-[#2a6a48] font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>
                {mode === 'login'
                  ? `Sign In as ${selectedRole === 'auth' ? 'Staff (auth)' : 'Patient (user)'}`
                  : `Create Account as ${selectedRole === 'auth' ? 'Staff (auth)' : 'Patient (user)'}`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Security notice footer */}
      <div className="mt-6 pt-5 border-t border-[#e3e2e0] text-center">
        <p className="text-[11px] text-[#747878] leading-relaxed">
          Credentials are encrypted and validated in the local SQLite database. Role permissions are enforced
          server-side: <span className="font-semibold text-[#1a1c1a]">'user'</span> accounts are restricted to the
          chatbot, while <span className="font-semibold text-[#1a1c1a]">'auth'</span> accounts unlock clinical triage
          and referrals.
        </p>
      </div>
    </div>
  );

  if (asModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto">{content}</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-8">
      {content}
    </div>
  );
};
