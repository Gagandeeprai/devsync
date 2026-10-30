import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Database,
  Server,
  Layers,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { api } from '../api/client';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';

export const Settings: React.FC = () => {
  const { user, updateUser, login } = useAuthStore();
  const { addToast } = useUiStore();

  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const res = await api.put<{ success: boolean; user: any }>('/auth/profile', {
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });

      updateUser(res.user);
      addToast({
        type: 'success',
        title: 'Profile Saved',
        message: 'Your profile details have been updated.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Failed to update profile',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchAccount = async (email: string) => {
    await login(email, 'password123');
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Card */}
      <div className="p-6 rounded-2xl bg-[#12131a] border border-surface-border shadow-surface-card">
        <div className="flex items-center gap-2.5 pb-4 border-b border-surface-border">
          <User className="w-5 h-5 text-brand-400" />
          <h3 className="text-base font-semibold text-slate-100">User Profile</h3>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
          <div className="flex items-center gap-4 pb-4">
            <Avatar src={avatarUrl || user?.avatarUrl} name={name || user?.name} size="lg" />
            <div>
              <h4 className="text-sm font-semibold text-slate-200">{user?.name}</h4>
              <p className="text-xs text-slate-400">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {user?.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 bg-surface-200/50 border border-surface-border rounded-xl text-slate-500 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Avatar URL (Image link or avatar seed)
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or leave empty"
              className="w-full px-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500 font-mono text-xs transition-all"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-surface-border">
            <Button
              type="submit"
              size="sm"
              isLoading={isSaving}
            >
              Update Profile
            </Button>
          </div>
        </form>
      </div>

      {/* Switch Demo User (For testing different collaboration roles) */}
      <div className="p-6 rounded-2xl bg-[#12131a] border border-surface-border shadow-surface-card">
        <div className="flex items-center gap-2.5 pb-4 border-b border-surface-border">
          <Users className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-100">Switch Team Member</h3>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Switch between users to simulate team collaboration, assignments, and audit logging.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: 'Alex Rivers', email: 'alex@devsync.io', role: 'LEAD', roleLabel: 'Lead Architect' },
            { name: 'Sarah Chen', email: 'sarah@devsync.io', role: 'DEVELOPER', roleLabel: 'Full-Stack Eng' },
            { name: 'Marcus Vance', email: 'marcus@devsync.io', role: 'DEVELOPER', roleLabel: 'Backend Specialist' },
          ].map((u) => {
            const isCurrent = user?.email === u.email;
            return (
              <button
                key={u.email}
                type="button"
                onClick={() => handleSwitchAccount(u.email)}
                disabled={isCurrent}
                className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-brand-500/10 border-brand-500/40 cursor-default ring-1 ring-brand-500/30'
                    : 'bg-surface-200/60 border-surface-border hover:bg-surface-200 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{u.name}</span>
                    {isCurrent && <CheckCircle2 className="w-4 h-4 text-brand-400" />}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">{u.roleLabel}</span>
                  <span className="text-[10px] text-slate-500 font-mono block mt-1">{u.email}</span>
                </div>
                {!isCurrent && (
                  <span className="mt-3 text-[11px] text-brand-400 font-medium">Switch to user →</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* System Infrastructure Card */}
      <div className="p-6 rounded-2xl bg-[#12131a] border border-surface-border shadow-surface-card">
        <div className="flex items-center gap-2.5 pb-4 border-b border-surface-border">
          <Server className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-slate-100">System Architecture & Health</h3>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-200/50 border border-surface-border/60">
            <span className="text-slate-400 block">Database</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              PostgreSQL 18.6 (Prisma ORM)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-200/50 border border-surface-border/60">
            <span className="text-slate-400 block">Backend Server</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Express 4.21 / Node.js 26 (TypeScript)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-200/50 border border-surface-border/60">
            <span className="text-slate-400 block">Authentication</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              JSON Web Tokens (JWT) + bcrypt Hashing
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-200/50 border border-surface-border/60">
            <span className="text-slate-400 block">Frontend Stack</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              React 18, Vite 5, Tailwind CSS, Zustand
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
