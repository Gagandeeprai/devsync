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
} from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useTaskStore } from '../store/taskStore';
import { useUiStore } from '../store/uiStore';
import { ProjectStatusBadge, PriorityBadge, StatusBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { formatDate, isOverdue } from '../lib/utils';
import { Task, TaskStatus } from '../types';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentProject, fetchProjectById, isLoading } = useProjectStore();
  const { updateTaskStatus } = useTaskStore();
  const { openCreateTask, openEditTask } = useUiStore();

  const [activeTab, setActiveTab] = useState<'KANBAN' | 'LIST'>('KANBAN');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<TaskStatus | null>(null);

  useEffect(() => {
    if (id) {
      fetchProjectById(id);
    }
  }, [id, fetchProjectById]);

  if (isLoading || !currentProject) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-surface-200 rounded-2xl" />
        <div className="h-96 bg-surface-200 rounded-2xl" />
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
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
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
      // Optimistically update currentProject tasks
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
      {/* Back button & Project Header */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Projects
        </Link>

        <div className="p-6 rounded-2xl bg-[#12131a] border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100">{currentProject.name}</h2>
              <ProjectStatusBadge status={currentProject.status} />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {currentProject.description || 'No detailed description.'}
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Avatar src={currentProject.owner?.avatarUrl} name={currentProject.owner?.name} size="sm" />
                <span>Lead: {currentProject.owner?.name}</span>
              </div>
              {currentProject.deadline && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Target: {formatDate(currentProject.deadline)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <div className="text-left md:text-right">
              <div className="text-2xl font-bold font-mono text-slate-100">
                {currentProject.progress}%
              </div>
              <div className="text-xs text-slate-400">
                {currentProject.completedTasks} of {currentProject.totalTasks} tasks completed
              </div>
            </div>
            <button
              onClick={() => openCreateTask({ projectId: currentProject.id })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-surface-border pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('KANBAN')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'KANBAN'
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KanbanIcon className="w-4 h-4" />
            Kanban Board
          </button>
          <button
            onClick={() => setActiveTab('LIST')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'LIST'
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            Task List ({projectTasks.length})
          </button>
        </div>
      </div>

      {/* Kanban Tab */}
      {activeTab === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-6">
          {columns.map((col) => {
            const columnTasks = projectTasks.filter((t) => t.status === col.status);
            const isTarget = activeDropCol === col.status;

            return (
              <div
                key={col.status}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
                className={`rounded-2xl bg-[#0f1017] border p-3 flex flex-col min-h-[500px] transition-all ${
                  isTarget
                    ? 'border-brand-500 bg-brand-950/20 shadow-glow-brand ring-1 ring-brand-500/40'
                    : 'border-surface-border'
                }`}
              >
                {/* Column header */}
                <div className="flex items-center justify-between pb-3 border-b border-surface-border/60 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">{col.label}</span>
                    <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-surface-100 text-slate-400 font-mono">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openCreateTask({ projectId: currentProject.id, status: col.status })}
                    className="p-1 text-slate-500 hover:text-slate-200 hover:bg-surface-100 rounded"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cards */}
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {columnTasks.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      onClick={() => openEditTask(t.id)}
                      className={`p-3.5 rounded-xl bg-[#161722] border border-surface-border/80 hover:border-brand-500/50 cursor-grab active:cursor-grabbing transition-all hover:shadow-md group ${
                        draggedTaskId === t.id ? 'opacity-40 scale-95' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-slate-200 group-hover:text-brand-300 transition-colors leading-snug">
                          {t.title}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-surface-border/40">
                        <PriorityBadge priority={t.priority} />
                        <Avatar src={t.assignee?.avatarUrl} name={t.assignee?.name || 'Unassigned'} size="sm" />
                      </div>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="h-28 border border-dashed border-surface-border/60 rounded-xl flex items-center justify-center text-xs text-slate-600">
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
        <div className="rounded-2xl bg-[#12131a] border border-surface-border overflow-hidden">
          <div className="divide-y divide-surface-border/60">
            {projectTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => openEditTask(t.id)}
                className="p-4 flex items-center justify-between gap-4 hover:bg-surface-200/50 cursor-pointer transition-colors"
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
        </div>
      )}
    </div>
  );
};
