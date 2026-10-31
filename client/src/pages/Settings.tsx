import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Database,
  Server,
  Layers,
  CheckCircle2,
  Users,
  ExternalLink,
  GitBranch,
  Unlink,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { api } from '../api/client';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';

const GitHubIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateUser, login } = useAuthStore();
  const { addToast } = useUiStore();

  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  // GitHub connection state
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [githubConfigured, setGithubConfigured] = useState(true);
  const [githubConnectedAt, setGithubConnectedAt] = useState<string | null>(null);

  // Fetch GitHub connection status
  const fetchGitHubStatus = async () => {
    try {
      const res = await api.get<{
        success: boolean;
        connected: boolean;
        connection?: { githubUsername: string; updatedAt: string };
        configured: boolean;
      }>('/github/connection');

      setGithubConnected(res.connected);
      setGithubConfigured(res.configured);
      if (res.connection) {
        setGithubUsername(res.connection.githubUsername);
        setGithubConnectedAt(res.connection.updatedAt);
      } else {
        setGithubUsername(null);
        setGithubConnectedAt(null);
      }
    } catch (err) {
      console.error('Failed to load GitHub status:', err);
    }
  };

  useEffect(() => {
    fetchGitHubStatus();

    // Check for query params from OAuth callback
    const ghStatus = searchParams.get('github');
    const ghUser = searchParams.get('username');
    const ghError = searchParams.get('github_error');

    if (ghStatus === 'connected') {
      addToast({
        type: 'success',
        title: 'GitHub Connected',
        message: ghUser ? `Connected to GitHub as @${ghUser}` : 'GitHub account linked successfully',
      });
      fetchGitHubStatus();
      searchParams.delete('github');
      searchParams.delete('username');
      setSearchParams(searchParams);
    } else if (ghError) {
      addToast({
        type: 'error',
        title: 'GitHub Authorization Error',
        message: decodeURIComponent(ghError),
      });
      searchParams.delete('github_error');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const handleConnectGitHub = async () => {
    try {
      setGithubLoading(true);
      const res = await api.get<{ success: boolean; authUrl: string }>('/github/auth');
      if (res.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Connection Failed',
        message: err.message || 'Could not initiate GitHub OAuth',
      });
    } finally {
      setGithubLoading(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!window.confirm('Disconnect your GitHub account from DevSync?')) return;
    try {
      setGithubLoading(true);
      await api.delete('/github/disconnect');
      setGithubConnected(false);
      setGithubUsername(null);
      setGithubConnectedAt(null);
      addToast({
        type: 'info',
        title: 'GitHub Disconnected',
        message: 'Your GitHub account has been unlinked.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Disconnect Failed',
        message: err.message || 'Could not disconnect GitHub',
      });
    } finally {
      setGithubLoading(false);
    }
  };

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
    <div className="space-y-6 max-w-4xl pb-10">
      {/* Profile Card */}
      <div className="p-6 rounded-2xl bg-[#0e0f16]/95 border border-white/[0.08] shadow-surface-card">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
          <User className="w-5 h-5 text-brand-400" />
          <h3 className="text-base font-semibold text-slate-100">User Profile</h3>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
          <div className="flex items-center gap-4 pb-4">
            <Avatar src={avatarUrl || user?.avatarUrl} name={name || user?.name} size="lg" />
            <div>
              <h4 className="text-sm font-semibold text-slate-200">{user?.name}</h4>
              <p className="text-xs text-slate-400">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-semibold">
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

          <div className="flex justify-end pt-4 border-t border-white/[0.06]">
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

      {/* GitHub Integration Card */}
      <div className="p-6 rounded-2xl bg-[#0e0f16]/95 border border-white/[0.08] shadow-surface-card">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <GitHubIcon className="w-5 h-5 text-white" />
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                GitHub Integration
                {githubConnected ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                    Not Linked
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Link repositories, stream live commit logs, view PRs, and automate issue delivery.
              </p>
            </div>
          </div>

          {githubConnected ? (
            <button
              onClick={handleDisconnectGitHub}
              disabled={githubLoading}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Unlink className="w-3.5 h-3.5" />
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnectGitHub}
              disabled={githubLoading}
              className="px-4 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold transition-all shadow-sm flex items-center gap-2 group"
            >
              <GitHubIcon className="w-4 h-4 text-zinc-950" />
              <span>Connect GitHub</span>
              <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

        {githubConnected ? (
          <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-white ring-1 ring-white/10">
                <GitHubIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-100 flex items-center gap-1">
                  @{githubUsername}
                </span>
                <span className="text-[11px] text-slate-500 font-mono block">
                  Connected on {githubConnectedAt ? formatDate(githubConnectedAt) : 'Active'}
                </span>
              </div>
            </div>
            <a
              href={`https://github.com/${githubUsername}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
            >
              View GitHub Profile <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="mt-4 p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 space-y-2">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-zinc-300">Minimum Permission Principle:</span> DevSync requests
                OAuth scopes only for repository metadata and read-only commits/PRs. Tokens are encrypted at rest via AES-256-GCM.
              </div>
            </div>
            {!githubConfigured && (
              <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-amber-400/90 font-mono">
                ℹ️ Note: Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in server/.env to enable live GitHub OAuth flow.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Switch Demo User (For testing different collaboration roles) */}
      <div className="p-6 rounded-2xl bg-[#0e0f16]/95 border border-white/[0.08] shadow-surface-card">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
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
      <div className="p-6 rounded-2xl bg-[#0e0f16]/95 border border-white/[0.08] shadow-surface-card">
        <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
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
            <span className="text-slate-400 block">Authentication & Integrations</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              JWT, Google OAuth, GitHub REST & Webhooks
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-200/50 border border-surface-border/60">
            <span className="text-slate-400 block">Security & Encryption</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              AES-256-GCM Token Encryption at Rest
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
