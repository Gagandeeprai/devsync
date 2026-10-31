import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Layers, ArrowRight, Lock, Mail, Sparkles, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';

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

export const Login: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for Google OAuth callback parameters
    const googleToken = searchParams.get('google_token');
    const googleUserStr = searchParams.get('google_user');
    const errorParam = searchParams.get('auth_error');

    if (errorParam) {
      setAuthError(decodeURIComponent(errorParam));
    }

    if (googleToken && googleUserStr) {
      try {
        const user = JSON.parse(decodeURIComponent(googleUserStr));
        localStorage.setItem('devsync_token', googleToken);
        // Set user in auth store and redirect
        useAuthStore.setState({ user, token: googleToken, isAuthenticated: true });
        navigate('/');
      } catch (e) {
        console.error('Failed to parse Google user payload:', e);
      }
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setAuthError(null);

    const success = await login(email, password);
    if (success) {
      navigate('/');
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setAuthError(null);
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
          {/* Auth Error Banner */}
          {authError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-zinc-100 border border-white/[0.1] text-xs font-semibold shadow-sm transition-all hover:border-white/[0.2] mb-5 group"
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-surface-border w-full" />
            <span className="bg-[#12131a] px-2.5 text-[11px] text-slate-500 font-medium uppercase tracking-wider absolute">
              or continue with email
            </span>
          </div>

          {/* Demo account quick login helper */}
          <div className="mb-6 p-3.5 rounded-xl bg-surface-200/80 border border-surface-border">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-300 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              Quick Demo Access (1-Click)
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('alex@devsync.io')}
                className="text-left px-3 py-2 rounded-lg bg-surface-100 hover:bg-surface-50 text-xs text-slate-300 hover:text-white border border-surface-border/60 transition-colors flex items-center justify-between"
              >
                <span><strong>Alex Rivers</strong> (Lead Architect)</span>
                <span className="text-[10px] text-slate-500 font-mono">alex@devsync.io</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('sarah@devsync.io')}
                className="text-left px-3 py-2 rounded-lg bg-surface-100 hover:bg-surface-50 text-xs text-slate-300 hover:text-white border border-surface-border/60 transition-colors flex items-center justify-between"
              >
                <span><strong>Sarah Chen</strong> (Full-Stack)</span>
                <span className="text-[10px] text-slate-500 font-mono">sarah@devsync.io</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('marcus@devsync.io')}
                className="text-left px-3 py-2 rounded-lg bg-surface-100 hover:bg-surface-50 text-xs text-slate-300 hover:text-white border border-surface-border/60 transition-colors flex items-center justify-between"
              >
                <span><strong>Marcus Vance</strong> (Backend)</span>
                <span className="text-[10px] text-slate-500 font-mono">marcus@devsync.io</span>
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
                <span className="text-[11px] text-slate-500 font-mono">password123</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
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
