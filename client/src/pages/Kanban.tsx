import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Kanban as KanbanIcon,
  Plus,
  Search,
  X,
  Filter,
  Calendar,
  Layers,
  Sparkles,
  CircleDashed,
  CircleDot,
  Clock,
  GitPullRequest,
  CheckCircle2,
  FolderGit2,
  GripVertical,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { PriorityBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { formatDueDate, formatDate, isOverdue, cn } from '../lib/utils';
import { Task, TaskPriority, TaskStatus } from '../types';

interface ColumnDef {
  status: TaskStatus;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  topBarColor: string;
  badgeStyle: string;
  dropHighlight: string;
}

export const Kanban: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || 'ALL';

  const { tasks, fetchTasks, updateTaskStatus, isLoading } = useTaskStore();
  const { projects, fetchProjects } = useProjectStore();
  const { openCreateTask, openEditTask } = useUiStore();

  const [selectedProject, setSelectedProject] = useState<string>(initialProjectId);
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
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
      icon: CircleDashed,
      accentColor: 'text-zinc-400',
      topBarColor: 'bg-zinc-600',
      badgeStyle: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60',
      dropHighlight: 'border-zinc-500/70 bg-zinc-800/10 ring-2 ring-zinc-500/20',
    },
    {
      status: 'TODO',
      title: 'Todo',
      icon: CircleDot,
      accentColor: 'text-sky-400',
      topBarColor: 'bg-sky-500',
      badgeStyle: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      dropHighlight: 'border-sky-500/70 bg-sky-500/10 ring-2 ring-sky-500/20',
    },
    {
      status: 'IN_PROGRESS',
      title: 'In Progress',
      icon: Clock,
      accentColor: 'text-amber-400',
      topBarColor: 'bg-amber-500',
      badgeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dropHighlight: 'border-amber-500/70 bg-amber-500/10 ring-2 ring-amber-500/20',
    },
    {
      status: 'REVIEW',
      title: 'Review',
      icon: GitPullRequest,
      accentColor: 'text-purple-400',
      topBarColor: 'bg-purple-500',
      badgeStyle: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      dropHighlight: 'border-purple-500/70 bg-purple-500/10 ring-2 ring-purple-500/20',
    },
    {
      status: 'DONE',
      title: 'Done',
      icon: CheckCircle2,
      accentColor: 'text-emerald-400',
      topBarColor: 'bg-emerald-500',
      badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dropHighlight: 'border-emerald-500/70 bg-emerald-500/10 ring-2 ring-emerald-500/20',
    },
  ];

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesProject = selectedProject === 'ALL' || t.projectId === selectedProject;
      const matchesPriority = selectedPriority === 'ALL' || t.priority === selectedPriority;
      const matchesSearch =
        !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
        (t.project && t.project.name.toLowerCase().includes(search.toLowerCase()));
      return matchesProject && matchesPriority && matchesSearch;
    });
  }, [tasks, selectedProject, selectedPriority, search]);

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

  const hasActiveFilters = selectedProject !== 'ALL' || selectedPriority !== 'ALL' || search !== '';

  const resetFilters = () => {
    handleProjectChange('ALL');
    setSelectedPriority('ALL');
    setSearch('');
  };

  return (
    <div className="space-y-5">
      {/* Sleek Command Toolbar */}
      <div className="p-3 bg-[#0d0e14]/90 backdrop-blur-md rounded-2xl border border-white/[0.08] shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Project Dropdown */}
          <div className="relative flex items-center">
            <FolderGit2 className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
            <select
              value={selectedProject}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="pl-8 pr-8 py-1.5 bg-[#14151f] hover:bg-[#181a28] border border-white/[0.08] hover:border-white/[0.15] rounded-xl text-zinc-200 text-xs font-medium focus:outline-none focus:border-brand-500 transition-colors cursor-pointer appearance-none"
            >
              <option value="ALL">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 pointer-events-none text-zinc-500 text-[10px]">▼</div>
          </div>

          {/* Priority Quick Filter */}
          <div className="hidden sm:flex items-center gap-1 bg-[#14151f] p-0.5 rounded-xl border border-white/[0.08]">
            {['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-medium transition-all',
                  selectedPriority === p
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                )}
              >
                {p === 'ALL' ? 'All Priorities' : p.charAt(0) + p.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search Input with Clear Button */}
          <div className="relative min-w-[180px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tasks by name or tag..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#14151f] border border-white/[0.08] hover:border-white/[0.15] rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-white rounded-md transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Reset Filters Chip */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 underline underline-offset-2 px-1 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Right: Summary & Action */}
        <div className="flex items-center justify-between lg:justify-end gap-3 border-t lg:border-t-0 pt-2 lg:pt-0 border-white/[0.06]">
          <div className="text-xs text-zinc-400 font-mono">
            <span className="text-zinc-200 font-semibold">{filteredTasks.length}</span> of{' '}
            <span>{tasks.length}</span> tasks
          </div>

          <button
            onClick={() =>
              openCreateTask({
                projectId: selectedProject !== 'ALL' ? selectedProject : undefined,
                status: 'TODO',
              })
            }
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow-sm hover:shadow-glow-brand transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 bg-white/20 rounded text-[10px] font-mono">
              N
            </kbd>
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && tasks.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[640px] rounded-2xl bg-[#0e0f16] border border-white/[0.06] p-4 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      ) : (
        /* Kanban Columns Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto pb-6 items-start">
          {columns.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.status);
            const isTarget = activeDropColumn === col.status;
            const Icon = col.icon;

            return (
              <div
                key={col.status}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.status)}
                className={cn(
                  'rounded-2xl bg-[#0c0d13]/90 border flex flex-col min-h-[640px] transition-all duration-200 overflow-hidden',
                  isTarget
                    ? col.dropHighlight
                    : 'border-white/[0.07] hover:border-white/[0.12]'
                )}
              >
                {/* Column Top Accent Indicator Line */}
                <div className={cn('h-1 w-full', col.topBarColor)} />

                {/* Column Header */}
                <div className="p-3.5 pb-2.5 flex items-center justify-between border-b border-white/[0.06] bg-white/[0.01]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={cn('w-4 h-4 shrink-0', col.accentColor)} />
                    <span className="text-xs font-semibold text-zinc-200 tracking-wide uppercase truncate">
                      {col.title}
                    </span>
                    <span
                      className={cn(
                        'text-[11px] font-mono px-2 py-0.2 rounded-full border font-semibold shrink-0',
                        col.badgeStyle
                      )}
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
                    className="p-1 text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Task Cards Container */}
                <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto">
                  {columnTasks.map((t) => {
                    const overdue = isOverdue(t.dueDate) && t.status !== 'DONE';
                    const dueDateFormatted = formatDueDate(t.dueDate);

                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onClick={() => openEditTask(t.id)}
                        className={cn(
                          'group relative p-3 rounded-xl bg-[#11131c] hover:bg-[#161826] border border-white/[0.08] hover:border-brand-500/50 cursor-grab active:cursor-grabbing transition-all duration-150 shadow-sm hover:shadow-lg hover:shadow-black/40 select-none',
                          draggedTaskId === t.id ? 'opacity-30 scale-95 border-dashed border-brand-400' : ''
                        )}
                      >
                        {/* Drag grip indicator on top-right (revealed on hover) */}
                        <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-60 transition-opacity text-zinc-500">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>

                        {/* Project Badge */}
                        {t.project && (
                          <div className="mb-2 flex items-center pr-5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-400 group-hover:text-zinc-300 max-w-full truncate">
                              <FolderGit2 className="w-2.5 h-2.5 shrink-0 text-zinc-400" />
                              <span className="truncate">{t.project.name}</span>
                            </span>
                          </div>
                        )}

                        {/* Title */}
                        <h4 className="text-[13px] font-medium text-zinc-100 group-hover:text-white leading-snug transition-colors line-clamp-2">
                          {t.title}
                        </h4>

                        {/* Description snippet */}
                        {t.description && (
                          <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        )}

                        {/* Card Footer: Priority, Due Date, Assignee */}
                        <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between gap-1.5">
                          {/* Priority Pill */}
                          <PriorityBadge priority={t.priority} size="sm" />

                          {/* Right elements: Due date & Avatar */}
                          <div className="flex items-center gap-2 shrink-0">
                            {dueDateFormatted && (
                              <span
                                className={cn(
                                  'text-[10px] font-mono flex items-center gap-1 whitespace-nowrap px-1.5 py-0.5 rounded transition-colors',
                                  overdue
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold'
                                    : 'text-zinc-400 bg-white/[0.02]'
                                )}
                                title={`Due: ${formatDate(t.dueDate)}`}
                              >
                                <Calendar className="w-3 h-3 shrink-0" />
                                <span>{dueDateFormatted}</span>
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

                  {/* Empty Column Drop Zone */}
                  {columnTasks.length === 0 && (
                    <div
                      className={cn(
                        'h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 text-center transition-all',
                        isTarget
                          ? 'border-brand-400 bg-brand-500/10 text-brand-300 scale-[1.02]'
                          : 'border-white/[0.08] text-zinc-500 hover:border-white/[0.15]'
                      )}
                    >
                      <p className="text-xs font-medium text-zinc-400">No tasks in {col.title}</p>
                      <button
                        onClick={() =>
                          openCreateTask({
                            projectId: selectedProject !== 'ALL' ? selectedProject : undefined,
                            status: col.status,
                          })
                        }
                        className="mt-2 text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add task</span>
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
