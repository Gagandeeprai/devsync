import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderGit2,
  Calendar,
  CheckCircle2,
  Plus,
  ArrowLeft,
  Kanban as KanbanIcon,
  ListTodo,
  Clock,
  GitBranch,
  GitCommit,
  GitPullRequest,
  ExternalLink,
  Unlink,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import { useUiStore } from '../store/uiStore';
import { ProjectStatusBadge, PriorityBadge, StatusBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate, formatTimeAgo, isOverdue } from '../lib/utils';
import { Task, TaskStatus } from '../types';
import { api } from '../api/client';

const GitHubIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentProject, fetchProjectById, isLoading } = useProjectStore();
  const { updateTaskStatus } = useTaskStore();
  const { openCreateTask, openEditTask, addToast } = useUiStore();

  const [activeTab, setActiveTab] = useState<'KANBAN' | 'LIST' | 'CODE'>('KANBAN');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<TaskStatus | null>(null);

  // GitHub Code state
  const [linkedRepo, setLinkedRepo] = useState<any>(null);
  const [commits, setCommits] = useState<any[]>([]);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  const [prFilter, setPrFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [codeSubTab, setCodeSubTab] = useState<'COMMITS' | 'PRS' | 'WEBHOOK'>('COMMITS');
  const [isCodeLoading, setIsCodeLoading] = useState(false);
  const [accessibleRepos, setAccessibleRepos] = useState<any[]>([]);
  const [selectedRepoToLink, setSelectedRepoToLink] = useState('');
  const [manualRepoOwner, setManualRepoOwner] = useState('');
  const [manualRepoName, setManualRepoName] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProjectById(id);
      loadGitHubData(id);
    }
  }, [id, fetchProjectById]);

  const loadGitHubData = async (projectId: string) => {
    setIsCodeLoading(true);
    try {
      // 1. Commits
      const commitRes = await api.get<{ success: boolean; commits: any[]; repository?: any; linked?: boolean }>(
        `/github/projects/${projectId}/commits`
      );
      if (commitRes.linked && commitRes.repository) {
        setLinkedRepo(commitRes.repository);
        setCommits(commitRes.commits || []);
      } else {
        setLinkedRepo(null);
      }

      // 2. PRs
      if (commitRes.linked) {
        const prRes = await api.get<{ success: boolean; pullRequests: any[] }>(
          `/github/projects/${projectId}/pull-requests?state=${prFilter}`
        );
        setPullRequests(prRes.pullRequests || []);
      }

      // 3. User repos for linking picker
      api.get<{ success: boolean; repositories?: any[] }>('/github/repositories')
        .then((res) => {
          if (res.repositories) setAccessibleRepos(res.repositories);
        })
        .catch(() => {});
    } catch (err) {
      console.error('Failed to load GitHub activity:', err);
    } finally {
      setIsCodeLoading(false);
    }
  };

  const handleLinkRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    let repoId = '0';
    let repoName = '';
    let repoOwner = '';
    let repoUrl = '';

    if (selectedRepoToLink && accessibleRepos.length > 0) {
      const chosen = accessibleRepos.find((r) => r.fullName === selectedRepoToLink);
      if (chosen) {
        repoId = chosen.id;
        repoName = chosen.name;
        repoOwner = chosen.owner;
        repoUrl = chosen.url;
      }
    } else if (manualRepoOwner && manualRepoName) {
      repoName = manualRepoName.trim();
      repoOwner = manualRepoOwner.trim();
      repoUrl = `https://github.com/${repoOwner}/${repoName}`;
    } else {
      addToast({ type: 'error', message: 'Please select or enter a repository' });
      return;
    }

    try {
      setIsLinking(true);
      await api.post(`/github/projects/${id}/repository`, {
        repositoryId: repoId,
        repositoryName: repoName,
        repositoryOwner: repoOwner,
        repositoryUrl: repoUrl,
      });

      addToast({
        type: 'success',
        title: 'Repository Linked',
        message: `Linked ${repoOwner}/${repoName} to this project`,
      });

      loadGitHubData(id);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Link Failed',
        message: err.message || 'Could not link repository',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkRepository = async () => {
    if (!id || !window.confirm('Unlink GitHub repository from this project?')) return;
    try {
      await api.delete(`/github/projects/${id}/repository`);
      setLinkedRepo(null);
      setCommits([]);
      setPullRequests([]);
      addToast({ type: 'info', message: 'Repository unlinked successfully' });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Could not unlink repository' });
    }
  };

  if (isLoading || !currentProject) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  const columns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'BACKLOG', label: 'Backlog', color: 'border-slate-700' },
    { status: 'TODO', label: 'Todo', color: 'border-sky-500/40' },
    { status: 'IN_PROGRESS', label: 'In Progress', color: 'border-amber-500/40' },
    { status: 'REVIEW', label: 'Review', color: 'border-purple-500/40' },
    { status: 'DONE', label: 'Done', color: 'border-emerald-500/40' },
  ];

  const projectTasks = currentProject.tasks || [];

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropCol !== status) {
      setActiveDropCol(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setActiveDropCol(null);
    setDraggedTaskId(null);

    if (taskId) {
      const updatedTasks = projectTasks.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t));
      useProjectStore.setState({
        currentProject: {
          ...currentProject,
          tasks: updatedTasks,
          completedTasks: updatedTasks.filter((t) => t.status === 'DONE').length,
          progress:
            updatedTasks.length > 0
              ? Math.round((updatedTasks.filter((t) => t.status === 'DONE').length / updatedTasks.length) * 100)
              : 0,
        },
      });

      await updateTaskStatus(taskId, targetStatus);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button & top navigation */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>
      </div>

      {/* Project Banner Header */}
      <div className="p-6 rounded-2xl bg-[#0e0f16]/95 border border-white/[0.08] shadow-surface-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
                {currentProject.name}
              </h2>
              <ProjectStatusBadge status={currentProject.status} />
              {linkedRepo && (
                <a
                  href={linkedRepo.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-white/[0.04] text-zinc-300 border border-white/[0.1] hover:text-white transition-colors"
                >
                  <GitHubIcon className="w-3.5 h-3.5" />
                  <span>{linkedRepo.repositoryOwner}/{linkedRepo.repositoryName}</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              )}
            </div>

            {currentProject.description && (
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                {currentProject.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => openCreateTask({ projectId: currentProject.id })}
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </Button>
          </div>
        </div>

        {/* Project Meta Bar */}
        <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Lead:</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-200">
                <Avatar
                  src={currentProject.owner?.avatarUrl}
                  name={currentProject.owner?.name || 'Owner'}
                  size="xs"
                />
                <span>{currentProject.owner?.name || 'Unassigned'}</span>
              </div>
            </div>

            {currentProject.deadline && (
              <div className="flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className={isOverdue(currentProject.deadline) ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                  Due {formatDate(currentProject.deadline)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-300 font-semibold">
              {currentProject.completedTasks || 0} / {currentProject.totalTasks || 0} tasks
            </span>
            <span className="text-brand-400 font-semibold font-mono">
              ({currentProject.progress || 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Kanban / List / GitHub Activity */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-1.5 bg-[#0e0f16] p-1 rounded-xl border border-white/[0.08]">
          <button
            onClick={() => setActiveTab('KANBAN')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'KANBAN'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <KanbanIcon className="w-3.5 h-3.5" />
            <span>Board</span>
          </button>
          <button
            onClick={() => setActiveTab('LIST')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'LIST'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Tasks ({projectTasks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('CODE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'CODE'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <GitHubIcon className="w-3.5 h-3.5" />
            <span>Code & GitHub {linkedRepo ? '✓' : ''}</span>
          </button>
        </div>
      </div>

      {/* Kanban Tab */}
      {activeTab === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto pb-6 items-start">
          {columns.map((col) => {
            const columnTasks = projectTasks.filter((t) => t.status === col.status);
            const isTarget = activeDropCol === col.status;

            return (
              <div
                key={col.status}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
                className={`rounded-2xl bg-[#0c0d13]/90 border p-3 flex flex-col min-h-[520px] transition-all ${
                  isTarget
                    ? 'border-brand-500 bg-brand-950/20 shadow-glow-brand ring-2 ring-brand-500/30'
                    : 'border-white/[0.07]'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">{col.label}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-300 font-mono font-medium">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openCreateTask({ projectId: currentProject.id, status: col.status })}
                    className="p-1 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {columnTasks.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      onClick={() => openEditTask(t.id)}
                      className={`p-3 rounded-xl bg-[#11131c] border border-white/[0.08] hover:border-brand-500/50 cursor-grab active:cursor-grabbing transition-all hover:shadow-md select-none group ${
                        draggedTaskId === t.id ? 'opacity-40 scale-95' : ''
                      }`}
                    >
                      <span className="text-[13px] font-medium text-slate-200 group-hover:text-white leading-snug">
                        {t.title}
                      </span>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/[0.06]">
                        <PriorityBadge priority={t.priority} size="sm" />
                        <Avatar src={t.assignee?.avatarUrl} name={t.assignee?.name || 'Unassigned'} size="xs" />
                      </div>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="h-28 border border-dashed border-white/[0.08] rounded-xl flex items-center justify-center text-xs text-slate-600">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List Tab */}
      {activeTab === 'LIST' && (
        <div className="rounded-2xl bg-[#0e0f16]/95 border border-white/[0.08] overflow-hidden shadow-surface-card">
          {projectTasks.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="No tasks in this project"
              description="Get started by creating the first engineering task for this project."
              actionLabel="Add Task"
              onAction={() => openCreateTask({ projectId: currentProject.id })}
            />
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {projectTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => openEditTask(t.id)}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusBadge status={t.status} />
                    <span className="text-sm font-medium text-slate-200 truncate">{t.title}</span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <PriorityBadge priority={t.priority} />
                    {t.dueDate && (
                      <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                        {formatDate(t.dueDate)}
                      </span>
                    )}
                    <Avatar src={t.assignee?.avatarUrl} name={t.assignee?.name || 'User'} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GitHub Code Tab */}
      {activeTab === 'CODE' && (
        <div className="space-y-5">
          {!linkedRepo ? (
            <div className="p-8 rounded-2xl bg-[#0e0f16]/95 border border-white/[0.08] text-center max-w-xl mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mx-auto text-white">
                <GitHubIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">Link GitHub Repository</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Connect a repository to stream commit activity, view open/merged pull requests, and automate delivery.
                </p>
              </div>

              <form onSubmit={handleLinkRepository} className="space-y-4 pt-2 text-left">
                {accessibleRepos.length > 0 ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Select from your accessible repositories
                    </label>
                    <select
                      value={selectedRepoToLink}
                      onChange={(e) => setSelectedRepoToLink(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 text-xs focus:outline-none focus:border-brand-500"
                    >
                      <option value="">-- Choose a repository --</option>
                      {accessibleRepos.map((r) => (
                        <option key={r.id} value={r.fullName}>
                          {r.fullName} {r.private ? '(Private)' : '(Public)'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Owner / Org</label>
                        <input
                          type="text"
                          placeholder="e.g. facebook"
                          value={manualRepoOwner}
                          onChange={(e) => setManualRepoOwner(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-100 text-xs focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Repository Name</label>
                        <input
                          type="text"
                          placeholder="e.g. react"
                          value={manualRepoName}
                          onChange={(e) => setManualRepoName(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-100 text-xs focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" isLoading={isLinking} className="w-full" size="sm">
                  <span>Connect Repository</span>
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connected Repository Banner */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-white ring-1 ring-white/10">
                    <GitHubIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100 font-mono">
                        {linkedRepo.repositoryOwner}/{linkedRepo.repositoryName}
                      </span>
                      <a
                        href={linkedRepo.repositoryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-white"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      Linked to DevSync Project • Webhook synchronization active
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadGitHubData(currentProject.id)}
                    title="Refresh code activity"
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCodeLoading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleUnlinkRepository}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Unlink className="w-3 h-3" />
                    <span>Unlink</span>
                  </button>
                </div>
              </div>

              {/* Subtabs for Commits / PRs / Webhook */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCodeSubTab('COMMITS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      codeSubTab === 'COMMITS'
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <GitCommit className="w-3.5 h-3.5" />
                    <span>Recent Commits ({commits.length})</span>
                  </button>
                  <button
                    onClick={() => setCodeSubTab('PRS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      codeSubTab === 'PRS'
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    <span>Pull Requests ({pullRequests.length})</span>
                  </button>
                  <button
                    onClick={() => setCodeSubTab('WEBHOOK')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      codeSubTab === 'WEBHOOK'
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Webhooks & Automation</span>
                  </button>
                </div>
              </div>

              {/* Commits List */}
              {codeSubTab === 'COMMITS' && (
                <div className="rounded-xl border border-white/[0.08] bg-[#0c0d13] overflow-hidden divide-y divide-white/[0.06]">
                  {commits.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No recent commits found or repository access restricted.
                    </div>
                  ) : (
                    commits.map((c) => (
                      <div key={c.sha} className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar src={c.authorAvatar} name={c.authorName} size="xs" />
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-slate-200 truncate block">
                              {c.message}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {c.authorName} committed {formatTimeAgo(c.date)}
                            </span>
                          </div>
                        </div>

                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08] text-[11px] font-mono shrink-0 transition-colors"
                        >
                          {c.shortSha}
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* PRs List */}
              {codeSubTab === 'PRS' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    {(['all', 'open', 'closed'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => {
                          setPrFilter(filter);
                          loadGitHubData(currentProject.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                          prFilter === filter
                            ? 'bg-brand-600 text-white'
                            : 'text-slate-400 hover:text-slate-200 bg-white/[0.03]'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-[#0c0d13] overflow-hidden divide-y divide-white/[0.06]">
                    {pullRequests.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        No pull requests found matching current filter.
                      </div>
                    ) : (
                      pullRequests.map((pr) => (
                        <div key={pr.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold shrink-0 ${
                                pr.state === 'merged'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/25'
                                  : pr.state === 'open'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              }`}
                            >
                              {pr.state}
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-slate-200 truncate block">
                                {pr.title}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                #{pr.number} opened by {pr.authorName} • {formatTimeAgo(pr.createdAt)}
                              </span>
                            </div>
                          </div>

                          <a
                            href={pr.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 shrink-0 font-medium"
                          >
                            <span>Open PR</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Webhook Configuration View */}
              {codeSubTab === 'WEBHOOK' && (
                <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0c0d13] text-xs text-slate-300 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Automatic Task Completion via GitHub Webhook</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    When a pull request associated with any DevSync task is merged, the backend webhook handler automatically transitions the task to <strong className="text-white">DONE</strong> and writes a persistent audit log entry to PostgreSQL.
                  </p>
                  <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06] font-mono text-[11px] text-zinc-300">
                    <div>Payload URL: <span className="text-brand-400">http://localhost:5000/api/github/webhook</span></div>
                    <div>Content type: <span className="text-zinc-400">application/json</span></div>
                    <div>Secret: <span className="text-zinc-400">Configured via GITHUB_WEBHOOK_SECRET</span></div>
                    <div>Event: <span className="text-amber-400">Pull requests</span></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
