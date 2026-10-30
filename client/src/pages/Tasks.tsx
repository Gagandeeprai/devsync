import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  FolderGit2,
} from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { PriorityBadge, StatusBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate, isOverdue } from '../lib/utils';
import { TaskStatus, TaskPriority } from '../types';

export const Tasks: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ALL';
  const initialProjectId = searchParams.get('projectId') || 'ALL';

  const { tasks, fetchTasks, updateTaskStatus, deleteTask, isLoading } = useTaskStore();
  const { projects, fetchProjects } = useProjectStore();
  const { openCreateTask, openEditTask } = useUiStore();

  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>(initialProjectId);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus);
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  useEffect(() => {
    const urlStatus = searchParams.get('status');
    const urlProject = searchParams.get('projectId');
    if (urlStatus) setSelectedStatus(urlStatus);
    if (urlProject) setSelectedProject(urlProject);
  }, [searchParams]);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    const matchesProject = selectedProject === 'ALL' || t.projectId === selectedProject;
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
    const matchesPriority = selectedPriority === 'ALL' || t.priority === selectedPriority;

    return matchesSearch && matchesProject && matchesStatus && matchesPriority;
  });

  const handleToggleComplete = async (e: React.MouseEvent, taskId: string, currentStatus: TaskStatus) => {
    e.stopPropagation();
    const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
    await updateTaskStatus(taskId, newStatus);
  };

  const handleDelete = async (e: React.MouseEvent, taskId: string, title: string) => {
    e.stopPropagation();
    if (window.confirm(`Delete task "${title}"?`)) {
      await deleteTask(taskId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tasks by name or details..."
              className="w-full pl-9 pr-3.5 py-2.5 bg-[#12131a] border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-all"
            />
          </div>

          {/* Project Filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3.5 py-2.5 bg-[#12131a] border border-surface-border rounded-xl text-slate-300 text-xs font-medium focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2.5 bg-[#12131a] border border-surface-border rounded-xl text-slate-300 text-xs font-medium focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">Todo</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">Review</option>
            <option value="DONE">Done</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3.5 py-2.5 bg-[#12131a] border border-surface-border rounded-xl text-slate-300 text-xs font-medium focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <Button onClick={() => openCreateTask()} size="sm" className="shrink-0">
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </Button>
      </div>

      {/* Task List Table */}
      <div className="rounded-2xl bg-[#12131a] border border-surface-border overflow-hidden shadow-surface-card">
        <div className="p-4 border-b border-surface-border flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>{filteredTasks.length} tasks matching criteria</span>
          <span className="hidden sm:inline">Click any task to inspect & edit</span>
        </div>

        {isLoading && tasks.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks found"
            description={
              search || selectedProject !== 'ALL' || selectedStatus !== 'ALL' || selectedPriority !== 'ALL'
                ? 'There are no engineering tasks matching your selected filters.'
                : 'Create your first task to begin tracking work.'
            }
            actionLabel="Create Task"
            onAction={() => openCreateTask()}
          />
        ) : (
          <div className="divide-y divide-surface-border/60">
            {filteredTasks.map((t) => {
              const isDone = t.status === 'DONE';
              const overdue = isOverdue(t.dueDate) && !isDone;

              return (
                <div
                  key={t.id}
                  onClick={() => openEditTask(t.id)}
                  className={`p-4 flex items-center justify-between gap-4 hover:bg-surface-200/60 cursor-pointer transition-colors group ${
                    isDone ? 'opacity-70 bg-surface-300/40' : ''
                  }`}
                >
                  {/* Left: Checkbox + Title + Project */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <button
                      onClick={(e) => handleToggleComplete(e, t.id, t.status)}
                      title={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                      className="text-slate-500 hover:text-emerald-400 transition-colors shrink-0 p-0.5"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-600 group-hover:text-slate-400" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-medium ${
                            isDone ? 'line-through text-slate-400' : 'text-slate-100 group-hover:text-brand-300'
                          } transition-colors`}
                        >
                          {t.title}
                        </span>
                        {t.project && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-100 border border-surface-border text-slate-400 font-mono">
                            {t.project.name}
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-xs text-slate-500 truncate mt-0.5 max-w-xl">
                          {t.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Badges + Due Date + Assignee + Delete */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />

                    {t.dueDate && (
                      <span
                        className={`text-xs font-mono hidden md:flex items-center gap-1 ${
                          overdue ? 'text-rose-400 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {formatDate(t.dueDate)}
                      </span>
                    )}

                    <div title={t.assignee?.name || 'Unassigned'}>
                      <Avatar src={t.assignee?.avatarUrl} name={t.assignee?.name || 'User'} size="sm" />
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, t.id, t.title)}
                      title="Delete task"
                      className="p-1 text-slate-600 hover:text-rose-400 rounded hover:bg-rose-950/20 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
