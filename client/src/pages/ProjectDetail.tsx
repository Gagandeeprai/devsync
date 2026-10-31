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
  Users,
  Activity as ActivityIcon,
  RotateCcw,
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
import { TeamTab } from '../components/project/TeamTab';
import { TeamActivityTab } from '../components/project/TeamActivityTab';
import { CodeVisualizerTab } from '../components/project/CodeVisualizerTab';

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

  const [activeTab, setActiveTab] = useState<'KANBAN' | 'LIST' | 'TEAM' | 'ACTIVITY' | 'CODE'>('KANBAN');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<TaskStatus | null>(null);

  // GitHub Code state
  const [linkedRepo, setLinkedRepo] = useState<any>(null);
  const [commits, setCommits] = useState<any[]>([]);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
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
          `/github/projects/${projectId}/pull-requests?state=all`
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
    { status: 'REVIEW', label: 'In Review', color: 'border-purple-500/40' },
    { status: 'CHANGES_REQUESTED', label: 'Changes Req.', color: 'border-orange-500/40' },
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
    setActiveDropCol(status);
  };

  const handleDragLeave = () => {
    setActiveDropCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setActiveDropCol(null);
    const taskId = e.dataTransfer.getData('text/plain');

    if (taskId && currentProject) {
      const updatedTasks = projectTasks.map((t) =>
        t.id === taskId ? { ...t, status: targetStatus } : t
      );

      useProjectStore.setState({
        currentProject: {
          ...currentProject,
          tasks: updatedTasks,
          completedTasks: updatedTasks.filter((t) => t.status === 'DONE').length,
          pendingTasks: updatedTasks.filter((t) => t.status !== 'DONE').length,
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
            {linkedRepo && (
              <button
                onClick={handleUnlinkRepository}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors flex items-center gap-1.5"
                title="Unlink Repository"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Unlink Repo</span>
              </button>
            )}
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
              <span className="text-slate-500">Owner:</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-200">
                <Avatar
                  src={currentProject.owner?.avatarUrl}
                  name={currentProject.owner?.name}
                  size="xs"
                />
                <span>{currentProject.owner?.name}</span>
              </div>
            </div>

            {currentProject.deadline && (
              <div className="flex items-center gap-1.5 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Due {formatDate(currentProject.deadline)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Progress:</span>
              <span className="font-semibold text-slate-200">{currentProject.progress}%</span>
            </div>
            <div className="w-28 h-2 rounded-full bg-surface-200 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-accent-cyan rounded-full transition-all duration-500"
                style={{ width: `${currentProject.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center justify-between border-b border-surface-border pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#0c0d13] rounded-xl border border-white/[0.08] text-xs">
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
            onClick={() => setActiveTab('TEAM')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'TEAM'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team & Roles</span>
          </button>
          <button
            onClick={() => setActiveTab('ACTIVITY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'ACTIVITY'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <ActivityIcon className="w-3.5 h-3.5" />
            <span>Team Activity</span>
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
            <span>Code & Repository {linkedRepo ? '✓' : ''}</span>
          </button>
        </div>
      </div>

      {/* 1. Kanban Tab */}
      {activeTab === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-6 items-start">
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
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.06] transition-colors"
                    title={`Add task to ${col.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {columnTasks.length === 0 ? (
                    <div className="h-28 flex items-center justify-center border border-dashed border-white/[0.05] rounded-xl text-slate-600 text-xs">
                      No tasks
                    </div>
                  ) : (
                    columnTasks.map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onClick={() => openEditTask(t.id)}
                        className="group p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-500/50 hover:bg-white/[0.04] transition-all cursor-grab active:cursor-grabbing shadow-sm hover:shadow-surface-card"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <PriorityBadge priority={t.priority} size="sm" />
                          {t.assignee && (
                            <Avatar
                              src={t.assignee.avatarUrl}
                              name={t.assignee.name}
                              size="xs"
                            />
                          )}
                        </div>

                        <h4 className="text-xs font-medium text-slate-100 group-hover:text-brand-300 transition-colors line-clamp-2">
                          {t.title}
                        </h4>

                        {t.description && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                            {t.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-white/[0.04] text-[10px] text-slate-500">
                          {t.dueDate ? (
                            <span className={isOverdue(t.dueDate) && t.status !== 'DONE' ? 'text-rose-400 font-medium' : ''}>
                              {formatDate(t.dueDate)}
                            </span>
                          ) : (
                            <span>No date</span>
                          )}
                          <span className="font-mono">{t.id.substring(0, 6)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Tasks List Tab */}
      {activeTab === 'LIST' && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d13] overflow-hidden">
          <div className="divide-y divide-white/[0.04]">
            {projectTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No tasks created for this project yet.
              </div>
            ) : (
              projectTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => openEditTask(t.id)}
                  className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusBadge status={t.status} />
                    <span className="font-medium text-slate-200 truncate">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <PriorityBadge priority={t.priority} size="sm" />
                    {t.assignee && (
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Avatar src={t.assignee.avatarUrl} name={t.assignee.name} size="xs" />
                        <span className="text-[11px]">{t.assignee.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. Team & Permissions Tab */}
      {activeTab === 'TEAM' && <TeamTab projectId={currentProject.id} />}

      {/* 4. Team Activity Tab */}
      {activeTab === 'ACTIVITY' && <TeamActivityTab projectId={currentProject.id} />}

      {/* 5. Code & Repository Visualizer Tab */}
      {activeTab === 'CODE' && (
        <div>
          {linkedRepo ? (
            <CodeVisualizerTab
              projectId={currentProject.id}
              repository={linkedRepo}
              commits={commits}
              pullRequests={pullRequests}
              onRefresh={() => loadGitHubData(currentProject.id)}
            />
          ) : (
            <div className="p-8 rounded-2xl bg-[#0e0f16]/95 border border-white/[0.08] text-center max-w-xl mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mx-auto text-white">
                <GitHubIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">Link GitHub Repository</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Connect a repository to inspect the file explorer, commit graph, branches, and stream activity.
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
          )}
        </div>
      )}
    </div>
  );
};
