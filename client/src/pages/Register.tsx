import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, ArrowRight, Lock, Mail, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { UserRole } from '../types';

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.41 7.34 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.98 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.59 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('DEVELOPER');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    const success = await register({ name, email, password, role });
    if (success) {
      navigate('/');
    }
  };

  const handleGoogleSignUp = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-accent-cyan text-white shadow-glow-brand ring-1 ring-white/20 mb-4">
          <Layers className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
          Create DevSync Account
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Join your engineering team on DevSync
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-[#12131a] border border-surface-border rounded-2xl shadow-surface-card p-6 sm:p-8 backdrop-blur-xl">
          {/* Google Sign-Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-zinc-100 border border-white/[0.1] text-xs font-semibold shadow-sm transition-all hover:border-white/[0.2] mb-5 group"
          >
            <GoogleIcon />
            <span>Sign up with Google</span>
          </button>

          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-surface-border w-full" />
            <span className="bg-[#12131a] px-2.5 text-[11px] text-slate-500 font-medium uppercase tracking-wider absolute">
              or register with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="elena@devsync.io"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="DEVELOPER">Developer / Engineer</option>
                <option value="LEAD">Team Lead / Architect</option>
                <option value="INTERN">Intern</option>
                <option value="HR">Human Resources (HR)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowPassword(true);
                  }}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    setShowPassword(true);
                  }}
                  onTouchEnd={() => setShowPassword(false)}
                  onTouchCancel={() => setShowPassword(false)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      setShowPassword(true);
                    }
                  }}
                  onKeyUp={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      setShowPassword(false);
                    }
                  }}
                  onBlur={() => setShowPassword(false)}
                  title="Hold to view password"
                  aria-label="Hold to view password"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 active:text-brand-400 transition-colors cursor-pointer select-none"
                >
                  {showPassword ? (
                    <Eye className="w-4 h-4 text-brand-400 animate-in fade-in zoom-in-95 duration-100" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full mt-2"
              size="lg"
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
