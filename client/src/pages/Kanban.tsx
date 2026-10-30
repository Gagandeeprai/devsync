import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Kanban as KanbanIcon,
  Plus,
  Search,
  Filter,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { PriorityBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { formatDate, isOverdue } from '../lib/utils';
import { Task, TaskStatus } from '../types';

interface ColumnDef {
  status: TaskStatus;
  title: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
}

export const Kanban: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || 'ALL';

  const { tasks, fetchTasks, updateTaskStatus, isLoading } = useTaskStore();
  const { projects, fetchProjects } = useProjectStore();
  const { openCreateTask, openEditTask } = useUiStore();

  const [selectedProject, setSelectedProject] = useState<string>(initialProjectId);
  const [search, setSearch] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<TaskStatus | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  useEffect(() => {
    const p = searchParams.get('projectId');
    if (p) setSelectedProject(p);
  }, [searchParams]);

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    if (projectId === 'ALL') {
      searchParams.delete('projectId');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ projectId });
    }
  };

  const columns: ColumnDef[] = [
    {
      status: 'BACKLOG',
      title: 'Backlog',
      badgeBg: 'bg-slate-800/80',
      badgeText: 'text-slate-400',
      dotColor: 'bg-slate-500',
    },
    {
      status: 'TODO',
      title: 'Todo',
      badgeBg: 'bg-sky-950/60',
      badgeText: 'text-sky-400',
      dotColor: 'bg-sky-400',
    },
    {
      status: 'IN_PROGRESS',
      title: 'In Progress',
      badgeBg: 'bg-amber-950/60',
      badgeText: 'text-amber-400',
      dotColor: 'bg-amber-400',
    },
    {
      status: 'REVIEW',
      title: 'Review',
      badgeBg: 'bg-purple-950/60',
      badgeText: 'text-purple-400',
      dotColor: 'bg-purple-400',
    },
    {
      status: 'DONE',
      title: 'Done',
      badgeBg: 'bg-emerald-950/60',
      badgeText: 'text-emerald-400',
      dotColor: 'bg-emerald-400',
    },
  ];

  const filteredTasks = tasks.filter((t) => {
    const matchesProject = selectedProject === 'ALL' || t.projectId === selectedProject;
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    return matchesProject && matchesSearch;
  });

  // Native HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== status) {
      setActiveDropColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setActiveDropColumn(null);
    setDraggedTaskId(null);

    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    // Calculate new order (append to end of column)
    const columnTasks = tasks.filter((t) => t.status === targetStatus);
    const maxOrder = columnTasks.length > 0 ? Math.max(...columnTasks.map((t) => t.order || 0)) : 0;
    const newOrder = maxOrder + 1000;

    await updateTaskStatus(taskId, targetStatus, newOrder);
  };

  return (
    <div className="space-y-6">
      {/* Filters & Project switcher header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Project Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Board:</span>
            <select
              value={selectedProject}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="px-3.5 py-2 bg-[#12131a] border border-surface-border rounded-xl text-slate-200 text-xs font-medium focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Keyword Search */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter board..."
              className="w-full pl-8 pr-3 py-2 bg-[#12131a] border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <Button
          onClick={() =>
            openCreateTask({
              projectId: selectedProject !== 'ALL' ? selectedProject : undefined,
              status: 'TODO',
            })
          }
          size="sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </Button>
      </div>

      {/* Loading Skeletons */}
      {isLoading && tasks.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[600px]" />
          ))}
        </div>
      ) : (
        /* Kanban Columns Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-6 items-start">
          {columns.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.status);
            const isTarget = activeDropColumn === col.status;

            return (
              <div
                key={col.status}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
                className={`rounded-2xl bg-[#0e0f16] border p-3.5 flex flex-col min-h-[620px] transition-all duration-200 ${
                  isTarget
                    ? 'border-brand-500 bg-brand-950/25 shadow-glow-brand ring-2 ring-brand-500/40'
                    : 'border-surface-border'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-surface-border/60 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <span className="text-xs font-semibold text-slate-200">{col.title}</span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${col.badgeBg} ${col.badgeText} border border-surface-border/40 font-medium`}
                    >
                      {columnTasks.length}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      openCreateTask({
                        projectId: selectedProject !== 'ALL' ? selectedProject : undefined,
                        status: col.status,
                      })
                    }
                    title={`Add task to ${col.title}`}
                    className="p-1 text-slate-500 hover:text-slate-200 hover:bg-surface-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Task Cards in Column */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnTasks.map((t) => {
                    const overdue = isOverdue(t.dueDate) && t.status !== 'DONE';

                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onClick={() => openEditTask(t.id)}
                        className={`p-4 rounded-xl bg-[#14151f] border border-surface-border/80 hover:border-brand-500/60 hover:bg-[#181a28] cursor-grab active:cursor-grabbing transition-all hover:shadow-md group relative select-none ${
                          draggedTaskId === t.id ? 'opacity-40 scale-95' : ''
                        }`}
                      >
                        {/* Project Tag */}
                        {t.project && (
                          <div className="mb-2">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-surface-100 border border-surface-border text-slate-400 font-mono">
                              {t.project.name}
                            </span>
                          </div>
                        )}

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-slate-100 group-hover:text-brand-300 transition-colors leading-snug">
                          {t.title}
                        </h4>

                        {/* Description snippet */}
                        {t.description && (
                          <p className="mt-1.5 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        )}

                        {/* Footer: Priority + Due Date + Assignee */}
                        <div className="mt-3.5 pt-2.5 border-t border-surface-border/50 flex items-center justify-between">
                          <PriorityBadge priority={t.priority} />

                          <div className="flex items-center gap-2">
                            {t.dueDate && (
                              <span
                                className={`text-[10px] font-mono flex items-center gap-1 ${
                                  overdue ? 'text-rose-400 font-semibold' : 'text-slate-400'
                                }`}
                                title={`Due: ${formatDate(t.dueDate)}`}
                              >
                                <Calendar className="w-3 h-3" />
                                {formatDate(t.dueDate)}
                              </span>
                            )}

                            <Avatar
                              src={t.assignee?.avatarUrl}
                              name={t.assignee?.name || 'Unassigned'}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div
                      className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-3 text-center transition-colors ${
                        isTarget
                          ? 'border-brand-400 bg-brand-500/10 text-brand-300'
                          : 'border-surface-border/50 text-slate-600'
                      }`}
                    >
                      <p className="text-xs font-medium">Drop tasks here</p>
                      <button
                        onClick={() =>
                          openCreateTask({
                            projectId: selectedProject !== 'ALL' ? selectedProject : undefined,
                            status: col.status,
                          })
                        }
                        className="mt-2 text-[11px] text-brand-400 hover:text-brand-300 font-medium"
                      >
                        + Add a task
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
