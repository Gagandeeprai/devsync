import React, { useState, useEffect } from 'react';
import { X, FolderGit2, GitBranch, Terminal, Copy, Check, Lock, Globe, Plus, Sparkles } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import { ProjectStatus } from '../../types';
import { Button } from '../ui/Button';
import { api } from '../../api/client';

export const CreateProjectModal: React.FC = () => {
  const { isCreateProjectOpen, closeCreateProject, addToast } = useUiStore();
  const { createProject, fetchProjects } = useProjectStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNING');
  const [deadline, setDeadline] = useState('');
  
  // GitHub Provisioning State
  const [repoMode, setRepoMode] = useState<'none' | 'create_new' | 'existing'>('none');
  const [repoName, setRepoName] = useState('');
  const [repoDescription, setRepoDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);
  
  // Existing Repos
  const [availableRepos, setAvailableRepos] = useState<any[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  // Success Wizard Result
  const [provisionedRepo, setProvisionedRepo] = useState<{
    name: string;
    cloneUrl: string;
    sshUrl: string;
    cloneCommands: string[];
  } | null>(null);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreateProjectOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateProjectOpen]);

  // Auto-fill repo name from project name
  useEffect(() => {
    if (name) {
      setRepoName(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }, [name]);

  // Fetch accessible repositories if user chooses 'existing'
  useEffect(() => {
    if (repoMode === 'existing' && availableRepos.length === 0) {
      setIsLoadingRepos(true);
      api.get<{ success: boolean; repositories: any[] }>('/github/repositories')
        .then((res) => {
          setAvailableRepos(res.repositories || []);
          if (res.repositories && res.repositories.length > 0) {
            setSelectedRepoId(String(res.repositories[0].id));
          }
        })
        .catch(() => {
          addToast({
            type: 'warning',
            title: 'GitHub Connection Required',
            message: 'Connect your GitHub account in Settings to browse repositories.',
          });
        })
        .finally(() => setIsLoadingRepos(false));
    }
  }, [repoMode, availableRepos.length, addToast]);

  const handleClose = () => {
    setName('');
    setDescription('');
    setStatus('PLANNING');
    setDeadline('');
    setRepoMode('none');
    setRepoName('');
    setProvisionedRepo(null);
    closeCreateProject();
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const newProject = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });

      if (!newProject) {
        setIsSubmitting(false);
        return;
      }

      // If user selected to automatically provision a new GitHub repository
      if (repoMode === 'create_new') {
        const repoRes = await api.post<{
          success: boolean;
          cloneUrl: string;
          sshUrl: string;
          cloneCommands: string[];
          repository: any;
        }>(`/github/projects/${newProject.id}/create-repository`, {
          name: repoName.trim() || name.trim(),
          description: repoDescription.trim() || description.trim(),
          isPrivate,
          autoInit,
        });

        if (repoRes.success) {
          setProvisionedRepo({
            name: repoRes.repository.repositoryName,
            cloneUrl: repoRes.cloneUrl,
            sshUrl: repoRes.sshUrl,
            cloneCommands: repoRes.cloneCommands,
          });
          fetchProjects();
          setIsSubmitting(false);
          return;
        }
      } else if (repoMode === 'existing' && selectedRepoId) {
        const selected = availableRepos.find((r) => String(r.id) === selectedRepoId);
        if (selected) {
          await api.post(`/github/projects/${newProject.id}/repository`, {
            repositoryId: String(selected.id),
            repositoryName: selected.name,
            repositoryOwner: selected.owner?.login || '',
            repositoryUrl: selected.html_url,
            defaultBranch: selected.default_branch || 'main',
            isPrivate: selected.private || false,
          });
        }
      }

      fetchProjects();
      handleClose();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Project Setup Warning',
        message: err.message || 'Project created but repository could not be linked',
      });
      fetchProjects();
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isCreateProjectOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-[#12131a] border border-surface-border rounded-2xl shadow-surface-card p-6 z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                {provisionedRepo ? 'Repository Provisioned!' : 'Create New Project'}
              </h3>
              <p className="text-xs text-slate-400">
                {provisionedRepo ? 'Quick clone instructions for your engineering workspace' : 'Initialize workspace with optional GitHub automation'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PROVISIONED SUCCESS VIEW */}
        {provisionedRepo ? (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-3">
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-200">
                  Repository created on GitHub and linked to DevSync!
                </p>
                <p className="text-xs text-emerald-300/80 mt-1">
                  Repository: <span className="font-mono text-white">{provisionedRepo.name}</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-brand-400" />
                <span>Clone & Setup Commands</span>
              </label>
              <div className="bg-[#0b0c10] border border-white/[0.08] rounded-xl p-3 font-mono text-xs text-zinc-300 space-y-2">
                {provisionedRepo.cloneCommands.map((cmd, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-1.5 hover:bg-white/[0.04] rounded">
                    <span className="text-zinc-200 select-all">$ {cmd}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(cmd, idx)}
                      className="p-1 text-zinc-400 hover:text-white transition-colors"
                      title="Copy command"
                    >
                      {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-surface-200/50 border border-surface-border rounded-xl">
              <span className="text-[11px] text-zinc-400 block mb-1">HTTPS Clone URL:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={provisionedRepo.cloneUrl}
                  className="w-full px-2.5 py-1.5 bg-[#0a0b10] border border-white/10 rounded-lg text-xs font-mono text-zinc-200"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(provisionedRepo.cloneUrl, 99)}
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs flex items-center gap-1 shrink-0"
                >
                  {copiedIndex === 99 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button type="button" size="sm" onClick={handleClose}>
                Done & Open Workspace
              </Button>
            </div>
          </div>
        ) : (
          /* STANDARD PROJECT CREATION FORM WITH REPO WIZARD */
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Project Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Distributed Consensus Engine"
                className="w-full px-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Outline goals, architecture milestones, and team objectives..."
                className="w-full px-3.5 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ON_HOLD">On Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* GITHUB PROVISIONING CHOICES */}
            <div className="pt-3 border-t border-surface-border">
              <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-brand-400" />
                <span>GitHub Repository Setup</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRepoMode('none')}
                  className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                    repoMode === 'none'
                      ? 'border-brand-500 bg-brand-500/10 text-white font-medium'
                      : 'border-white/[0.08] bg-surface-200/50 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="font-medium text-zinc-200">No Repository</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Configure later</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRepoMode('create_new')}
                  className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                    repoMode === 'create_new'
                      ? 'border-brand-500 bg-brand-500/10 text-white font-medium shadow-glow-brand/20'
                      : 'border-white/[0.08] bg-surface-200/50 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="font-medium text-zinc-200 flex items-center gap-1">
                    <Plus className="w-3 h-3 text-brand-400" />
                    <span>Create New Repo</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Auto-provision</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRepoMode('existing')}
                  className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                    repoMode === 'existing'
                      ? 'border-brand-500 bg-brand-500/10 text-white font-medium'
                      : 'border-white/[0.08] bg-surface-200/50 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="font-medium text-zinc-200">Connect Existing</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">Choose from GitHub</div>
                </button>
              </div>

              {/* CREATE REPOSITORY OPTIONS */}
              {repoMode === 'create_new' && (
                <div className="mt-3 p-3.5 rounded-xl bg-surface-200/60 border border-brand-500/30 space-y-3 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Repository Name on GitHub
                    </label>
                    <input
                      type="text"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="e.g. distributed-consensus-engine"
                      className="w-full px-3 py-1.5 bg-[#0a0b10] border border-white/10 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPrivate(!isPrivate)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                          isPrivate
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                        <span>{isPrivate ? 'Private Repository' : 'Public Repository'}</span>
                      </button>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoInit}
                        onChange={(e) => setAutoInit(e.target.checked)}
                        className="rounded border-white/20 bg-surface-200 text-brand-600 focus:ring-0"
                      />
                      <span className="text-[11px]">Initialize with README</span>
                    </label>
                  </div>
                </div>
              )}

              {/* CONNECT EXISTING OPTIONS */}
              {repoMode === 'existing' && (
                <div className="mt-3 p-3.5 rounded-xl bg-surface-200/60 border border-white/[0.08] space-y-2 animate-in fade-in duration-200">
                  <label className="block text-[11px] font-medium text-slate-300">
                    Select GitHub Repository
                  </label>
                  {isLoadingRepos ? (
                    <div className="text-xs text-zinc-400 py-2">Loading your GitHub repositories...</div>
                  ) : availableRepos.length === 0 ? (
                    <div className="text-xs text-amber-400 py-1">
                      No repositories found. Ensure your GitHub account is connected in Settings.
                    </div>
                  ) : (
                    <select
                      value={selectedRepoId}
                      onChange={(e) => setSelectedRepoId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0a0b10] border border-white/10 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
                    >
                      {availableRepos.map((repo) => (
                        <option key={repo.id} value={String(repo.id)}>
                          {repo.owner?.login}/{repo.name} ({repo.private ? 'Private' : 'Public'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border mt-6">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmitting}
                disabled={!name.trim()}
              >
                {repoMode === 'create_new' ? 'Create Project & GitHub Repo' : 'Create Project'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
