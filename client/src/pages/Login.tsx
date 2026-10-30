import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const success = await login(email, password);
    if (success) {
      navigate('/');
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    const success = await login(demoEmail, 'password123');
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-accent-cyan text-white shadow-glow-brand ring-1 ring-white/20 mb-4">
          <Layers className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
          DevSync
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Developer collaboration & project tracking platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-[#12131a] border border-surface-border rounded-2xl shadow-surface-card p-6 sm:p-8 backdrop-blur-xl">
          {/* Demo account quick login helper */}
          <div className="mb-6 p-3 rounded-xl bg-surface-200/80 border border-surface-border">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-300 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              Quick Demo Access (1-Click)
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => handleDemoLogin('alex@devsync.io')}
                className="text-left px-2.5 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-50 text-xs text-slate-300 hover:text-white border border-surface-border/60 transition-colors flex items-center justify-between"
              >
                <span><strong>Alex Rivers</strong> (Lead Architect)</span>
                <span className="text-[10px] text-slate-500 font-mono">alex@devsync.io</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('sarah@devsync.io')}
                className="text-left px-2.5 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-50 text-xs text-slate-300 hover:text-white border border-surface-border/60 transition-colors flex items-center justify-between"
              >
                <span><strong>Sarah Chen</strong> (Full-Stack)</span>
                <span className="text-[10px] text-slate-500 font-mono">sarah@devsync.io</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email address
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
                  placeholder="alex@devsync.io"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-slate-500">Default: password123</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoading ? (
                'Signing in...'
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
              Create one now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
