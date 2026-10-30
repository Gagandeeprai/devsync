import React, { useState, useEffect } from 'react';
import { X, FolderGit2 } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import { ProjectStatus } from '../../types';
import { Button } from '../ui/Button';

export const CreateProjectModal: React.FC = () => {
  const { isCreateProjectOpen, closeCreateProject } = useUiStore();
  const { createProject } = useProjectStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNING');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreateProjectOpen) {
        closeCreateProject();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateProjectOpen, closeCreateProject]);

  if (!isCreateProjectOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const success = await createProject({
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
    });

    setIsSubmitting(false);
    if (success) {
      setName('');
      setDescription('');
      setStatus('PLANNING');
      setDeadline('');
      closeCreateProject();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={closeCreateProject}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-[#12131a] border border-surface-border rounded-2xl shadow-surface-card p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Create New Project</h3>
              <p className="text-xs text-slate-400">Initialize a collaboration workspace</p>
            </div>
          </div>
          <button
            onClick={closeCreateProject}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
              placeholder="e.g. Distributed Cache & In-Memory Store"
              className="w-full px-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline goals, architecture milestones, and repositories..."
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border mt-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={closeCreateProject}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              disabled={!name.trim()}
            >
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
