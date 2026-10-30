import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
  Activity as ActivityIcon,
  ArrowRight,
  Plus,
  AlertCircle,
  Kanban as KanbanIcon,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';
import { DashboardStats } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { PriorityBadge, ProjectStatusBadge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatTimeAgo, formatDate, cn } from '../lib/utils';
import { useUiStore } from '../store/uiStore';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { openCreateTask, openCreateProject } = useUiStore();

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<{ success: boolean; stats: DashboardStats }>('/dashboard/stats');
      setStats(res.stats);
    } catch (err: any) {
      console.error('Failed to load dashboard metrics:', err);
      setError(err.message || 'Unable to fetch dashboard statistics from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-72" />
          <Skeleton className="h-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 rounded-2xl bg-[#12131a] border border-rose-500/30 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-100">Failed to Load Dashboard</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">{error || 'Server error occurred'}</p>
        <Button onClick={fetchStats} variant="secondary" size="sm">
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Request
        </Button>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Projects',
      value: stats.totalProjects,
      icon: FolderGit2,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      to: '/projects',
      description: 'Active engineering repositories',
    },
    {
      label: 'Total Tasks',
      value: stats.totalTasks,
      icon: ListTodo,
      color: 'text-brand-400',
      bg: 'bg-brand-500/10',
      border: 'border-brand-500/20',
      to: '/tasks',
      description: 'Backlog and active issues',
    },
    {
      label: 'Completed Tasks',
      value: stats.completedTasks,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      to: '/tasks?status=DONE',
      description: 'Shipped to production',
    },
    {
      label: 'Pending Tasks',
      value: stats.pendingTasks,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      to: '/kanban',
      description: 'In development or review',
    },
  ];

  const statusCols = [
    { key: 'BACKLOG', label: 'Backlog', count: stats.statusDistribution.BACKLOG || 0, color: 'bg-slate-600' },
    { key: 'TODO', label: 'Todo', count: stats.statusDistribution.TODO || 0, color: 'bg-sky-500' },
    { key: 'IN_PROGRESS', label: 'In Progress', count: stats.statusDistribution.IN_PROGRESS || 0, color: 'bg-amber-500' },
    { key: 'REVIEW', label: 'Review', count: stats.statusDistribution.REVIEW || 0, color: 'bg-purple-500' },
    { key: 'DONE', label: 'Done', count: stats.statusDistribution.DONE || 0, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            bg={kpi.bg}
            border={kpi.border}
            to={kpi.to}
            description={kpi.description}
          />
        ))}
      </div>

      {/* Progress Overview & Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Breakdown */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#12131a] border border-surface-border flex flex-col justify-between shadow-surface-card">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-surface-border/60">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-semibold text-slate-200">Progress Overview</h3>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 font-medium">
                {stats.completionRate}% Completed
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="mt-5">
              <div className="h-3 w-full bg-surface-200 rounded-full overflow-hidden flex shadow-inner">
                {statusCols.map((col) => {
                  const percent = stats.totalTasks > 0 ? (col.count / stats.totalTasks) * 100 : 0;
                  if (percent === 0) return null;
                  return (
                    <div
                      key={col.key}
                      style={{ width: `${percent}%` }}
                      className={cn('h-full transition-all duration-500', col.color)}
                      title={`${col.label}: ${col.count} (${Math.round(percent)}%)`}
                    />
                  );
                })}
              </div>

              {/* Status Chips */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                {statusCols.map((col) => {
                  const percent = stats.totalTasks > 0 ? Math.round((col.count / stats.totalTasks) * 100) : 0;
                  return (
                    <div key={col.key} className="p-2.5 rounded-xl bg-surface-200/60 border border-surface-border/50">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className={cn('w-2 h-2 rounded-full', col.color)} />
                        <span>{col.label}</span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between font-mono">
                        <span className="text-base font-semibold text-slate-200">{col.count}</span>
                        <span className="text-[10px] text-slate-500">{percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-border/60 flex items-center justify-between text-xs text-slate-400">
            <span>Overall completion rate calculated across all active projects</span>
            <Link to="/kanban" className="text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1">
              Open Kanban Board <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="p-6 rounded-2xl bg-[#12131a] border border-surface-border flex flex-col justify-between shadow-surface-card">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-surface-border/60">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-200">Tasks by Priority</h3>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                { label: 'Urgent', count: stats.priorityDistribution.URGENT || 0, color: 'bg-rose-500', text: 'text-rose-400' },
                { label: 'High', count: stats.priorityDistribution.HIGH || 0, color: 'bg-amber-500', text: 'text-amber-400' },
                { label: 'Medium', count: stats.priorityDistribution.MEDIUM || 0, color: 'bg-blue-500', text: 'text-blue-400' },
                { label: 'Low', count: stats.priorityDistribution.LOW || 0, color: 'bg-slate-500', text: 'text-slate-400' },
              ].map((p) => {
                const percent = stats.totalTasks > 0 ? Math.round((p.count / stats.totalTasks) * 100) : 0;
                return (
                  <div key={p.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn('font-medium', p.text)}>{p.label}</span>
                      <span className="text-slate-400 font-mono">
                        {p.count} <span className="text-slate-600">({percent}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-200 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className={cn('h-full rounded-full transition-all duration-500', p.color)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Button
            onClick={() => openCreateTask()}
            variant="secondary"
            size="sm"
            className="mt-6 w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Quick Add Task
          </Button>
        </div>
      </div>

      {/* Two-Column Details: Recent Activity & Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Audit Feed */}
        <div className="p-6 rounded-2xl bg-[#12131a] border border-surface-border shadow-surface-card">
          <div className="flex items-center justify-between pb-4 border-b border-surface-border/60">
            <div className="flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-slate-200">Recent Activity</h3>
            </div>
            <span className="text-[11px] text-slate-500">Real-time audit log</span>
          </div>

          <div className="mt-4 space-y-3.5">
            {stats.recentActivities.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No recent activity recorded.</p>
            ) : (
              stats.recentActivities.slice(0, 6).map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <Avatar src={act.user.avatarUrl} name={act.user.name} size="sm" className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 leading-snug">
                      <span className="font-semibold text-slate-100">{act.user.name}</span>{' '}
                      <span className="text-slate-400">{act.details}</span>
                    </p>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {formatTimeAgo(act.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Projects Snapshot */}
        <div className="p-6 rounded-2xl bg-[#12131a] border border-surface-border flex flex-col justify-between shadow-surface-card">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-surface-border/60">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-200">Active Projects</h3>
              </div>
              <Link to="/projects" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                View all
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {stats.recentProjects.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No projects created yet.</p>
              ) : (
                stats.recentProjects.slice(0, 4).map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="p-3.5 rounded-xl bg-surface-200/50 hover:bg-surface-200 border border-surface-border/60 hover:border-surface-border transition-all block group"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-200 group-hover:text-brand-300 transition-colors truncate">
                        {project.name}
                      </h4>
                      <ProjectStatusBadge status={project.status} />
                    </div>

                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>{project.completedTasks} / {project.totalTasks} tasks completed</span>
                        <span className="font-mono text-slate-300">{project.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${project.progress}%` }}
                          className="h-full bg-brand-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <Button
            onClick={() => openCreateProject()}
            variant="secondary"
            size="sm"
            className="mt-4 w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </Button>
        </div>
      </div>
    </div>
  );
};
