import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  MoreVertical,
  Trash2,
  Edit2,
  Kanban,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { ProjectStatusBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { formatDate, isOverdue } from '../lib/utils';
import { Project, ProjectStatus } from '../types';

export const Projects: React.FC = () => {
  const { projects, fetchProjects, deleteProject, updateProject, isLoading } = useProjectStore();
  const { openCreateProject } = useUiStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete project "${name}" and all its tasks?`)) {
      await deleteProject(id);
    }
  };

  const handleEdit = (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    await updateProject(editingProject.id, {
      name: editingProject.name,
      description: editingProject.description,
      status: editingProject.status,
      deadline: editingProject.deadline,
    });
    setEditingProject(null);
  };

  return (
    <div className="space-y-6">
      {/* Top action & filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#12131a] border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <button
          onClick={openCreateProject}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-surface-border/60">
        {[
          { label: 'All Projects', value: 'ALL' },
          { label: 'In Progress', value: 'IN_PROGRESS' },
          { label: 'Planning', value: 'PLANNING' },
          { label: 'Completed', value: 'COMPLETED' },
          { label: 'On Hold', value: 'ON_HOLD' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#12131a] border border-surface-border/80">
          <FolderGit2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200">No projects found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'ALL'
              ? 'Try adjusting your search criteria or status filter.'
              : 'Get started by creating your first collaboration project.'}
          </p>
          <button
            onClick={openCreateProject}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const overdue = isOverdue(p.deadline) && p.status !== 'COMPLETED';

            return (
              <div
                key={p.id}
                className="rounded-2xl bg-[#12131a] border border-surface-border hover:border-surface-borderHover p-5 shadow-sm transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={`/projects/${p.id}`}
                      className="text-base font-semibold text-slate-100 group-hover:text-brand-300 transition-colors line-clamp-1"
                    >
                      {p.name}
                    </Link>
                    <div className="flex items-center gap-1 shrink-0">
                      <ProjectStatusBadge status={p.status} />
                      <button
                        onClick={(e) => handleEdit(p, e)}
                        title="Edit project"
                        className="p-1 text-slate-500 hover:text-slate-200 rounded hover:bg-surface-100 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(p.id, p.name, e)}
                        title="Delete project"
                        className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-950/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-400 line-clamp-2 min-h-[2rem]">
                    {p.description || 'No description provided.'}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-mono">
                      <span>{p.completedTasks} / {p.totalTasks} tasks</span>
                      <span className="text-slate-200 font-medium">{p.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-200 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${p.progress}%` }}
                        className="h-full bg-brand-500 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-surface-border/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar src={p.owner?.avatarUrl} name={p.owner?.name || 'Owner'} size="sm" />
                    <span className="text-slate-400 text-[11px] truncate max-w-[100px]">
                      {p.owner?.name || 'Lead'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.deadline && (
                      <span
                        className={`text-[11px] flex items-center gap-1 font-mono ${
                          overdue ? 'text-rose-400 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {formatDate(p.deadline)}
                      </span>
                    )}

                    <Link
                      to={`/kanban?projectId=${p.id}`}
                      className="p-1.5 rounded-lg bg-surface-100 hover:bg-brand-600 hover:text-white text-slate-300 transition-colors"
                      title="Open in Kanban Board"
                    >
                      <Kanban className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Project Dialog */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setEditingProject(null)}
          />
          <div className="relative w-full max-w-md bg-[#12131a] border border-surface-border rounded-2xl shadow-surface-card p-6 z-10">
            <h3 className="text-base font-semibold text-slate-100 pb-3 border-b border-surface-border">
              Edit Project
            </h3>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingProject.description || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={editingProject.status}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, status: e.target.value as ProjectStatus })
                    }
                    className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={editingProject.deadline ? editingProject.deadline.substring(0, 10) : ''}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        deadline: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-500 rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
