import React, { useState, useEffect } from 'react';
import { X, Trash2, Calendar, UserCheck, AlertTriangle } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { TaskStatus, TaskPriority, User } from '../../types';
import { PriorityBadge, StatusBadge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import { formatDate } from '../../lib/utils';

export const TaskDetailModal: React.FC = () => {
  const { editingTaskId, closeEditTask } = useUiStore();
  const { tasks, updateTask, deleteTask } = useTaskStore();

  const task = tasks.find((t) => t.id === editingTaskId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingTaskId) {
        closeEditTask();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingTaskId, closeEditTask]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setAssigneeId(task.assigneeId || '');
      setDueDate(task.dueDate ? task.dueDate.substring(0, 10) : '');
    }
  }, [task]);

  useEffect(() => {
    if (editingTaskId) {
      api.get<{ success: boolean; users: User[] }>('/users')
        .then((res) => setUsers(res.users))
        .catch(console.error);
    }
  }, [editingTaskId]);

  if (!editingTaskId || !task) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    const updated = await updateTask(task.id, {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    });
    setIsSaving(false);
    if (updated) {
      closeEditTask();
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      setIsDeleting(true);
      const success = await deleteTask(task.id);
      setIsDeleting(false);
      if (success) {
        closeEditTask();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={closeEditTask}
      />

      <div className="relative w-full max-w-xl bg-[#12131a] border border-surface-border rounded-2xl shadow-surface-card p-6 z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 font-mono rounded bg-surface-100 border border-surface-border text-slate-400">
              {task.project?.name || 'Task'}
            </span>
            <StatusBadge status={status} />
            <PriorityBadge priority={priority} />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete task"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={closeEditTask}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 text-sm font-medium focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task details and instructions..."
              className="w-full px-3.5 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="BACKLOG">Backlog</option>
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
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
              <label className="block text-xs font-medium text-slate-400 mb-1">Assignee</label>
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
              <label className="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-surface-border mt-6">
            <span className="text-[11px] text-slate-500 font-mono">
              Created {formatDate(task.createdAt)}
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeEditTask}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSaving}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
