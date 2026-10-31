import React, { useState, useEffect } from 'react';
import { X, CheckSquare } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useProjectStore } from '../../store/projectStore';
import { TaskStatus, TaskPriority, User } from '../../types';
import { Button } from '../ui/Button';
import { api } from '../../api/client';

export const CreateTaskModal: React.FC = () => {
  const { isCreateTaskOpen, defaultTaskStatus, defaultProjectId, closeCreateTask } = useUiStore();
  const { createTask } = useTaskStore();
  const { projects, fetchProjects } = useProjectStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreateTaskOpen) {
        closeCreateTask();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateTaskOpen, closeCreateTask]);

  useEffect(() => {
    if (isCreateTaskOpen) {
      if (projects.length === 0) {
        fetchProjects();
      }
      api.get<{ success: boolean; users: User[] }>('/users')
        .then((res) => setUsers(res.users))
        .catch(console.error);

      if (defaultTaskStatus) setStatus(defaultTaskStatus);
      if (defaultProjectId) {
        setProjectId(defaultProjectId);
      } else if (projects.length > 0) {
        setProjectId(projects[0].id);
      }
    }
  }, [isCreateTaskOpen, defaultTaskStatus, defaultProjectId, projects.length]);

  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(defaultProjectId || projects[0].id);
    }
  }, [projects, defaultProjectId, projectId]);

  useEffect(() => {
    if (projectId) {
      api.get<{ success: boolean; members: any[] }>(`/projects/${projectId}/members`)
        .then((res) => setProjectMembers(res.members || []))
        .catch(() => setProjectMembers([]));
    }
  }, [projectId]);

  const eligibleReviewers = projectMembers.filter(
    (m) => m.role === 'SENIOR' || m.role === 'PROJECT_LEAD' || m.role === 'PROJECT_ADMIN'
  );

  if (!isCreateTaskOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    setIsSubmitting(true);
    const success = await createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      projectId,
      assigneeId: assigneeId || undefined,
      reviewerId: reviewerId || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    });

    setIsSubmitting(false);
    if (success) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setAssigneeId('');
      setReviewerId('');
      closeCreateTask();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={closeCreateTask}
      />

      <div className="relative w-full max-w-lg bg-[#12131a] border border-surface-border rounded-2xl shadow-surface-card p-6 z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Create Task</h3>
              <p className="text-xs text-slate-400">Add an issue or feature to track</p>
            </div>
          </div>
          <button
            onClick={closeCreateTask}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement resilient circuit breaker pattern"
              className="w-full px-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Project <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500"
            >
              {projects.length === 0 ? (
                <option value="">No projects available</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Technical specifications, acceptance criteria, or repro steps..."
              className="w-full px-3.5 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Column Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="BACKLOG">Backlog</option>
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">In Review</option>
                <option value="CHANGES_REQUESTED">Changes Requested</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Senior Reviewer <span className="text-[10px] text-slate-400 font-normal">(Senior/Lead)</span>
              </label>
              <select
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="">No Reviewer Assigned</option>
                {eligibleReviewers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name} ({m.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border mt-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={closeCreateTask}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              disabled={!title.trim() || !projectId}
            >
              Create Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
