import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Calendar,
  UserCheck,
  AlertTriangle,
  GitPullRequest,
  ExternalLink,
  Plus,
  Unlink,
} from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { TaskStatus, TaskPriority, User } from '../../types';
import { PriorityBadge, StatusBadge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import { formatDate } from '../../lib/utils';

export const TaskDetailModal: React.FC = () => {
  const { editingTaskId, closeEditTask, addToast } = useUiStore();
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

  // GitHub PR Linking State
  const [linkedPrs, setLinkedPrs] = useState<any[]>([]);
  const [isLinkingPr, setIsLinkingPr] = useState(false);
  const [showAddPr, setShowAddPr] = useState(false);
  const [availableProjectPrs, setAvailableProjectPrs] = useState<any[]>([]);
  const [selectedPrNumber, setSelectedPrNumber] = useState('');
  const [manualPrNumber, setManualPrNumber] = useState('');
  const [manualPrUrl, setManualPrUrl] = useState('');
  const [manualPrTitle, setManualPrTitle] = useState('');

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
      loadLinkedPrs(task.id);
    }
  }, [task]);

  useEffect(() => {
    if (editingTaskId) {
      api.get<{ success: boolean; users: User[] }>('/users')
        .then((res) => setUsers(res.users))
        .catch(console.error);
    }
  }, [editingTaskId]);

  const loadLinkedPrs = async (taskId: string) => {
    try {
      const res = await api.get<{ success: boolean; pullRequests: any[] }>(
        `/github/tasks/${taskId}/pull-requests`
      );
      setLinkedPrs(res.pullRequests || []);
    } catch (err) {
      console.error('Failed to load linked PRs:', err);
    }
  };

  const handleOpenAddPr = async () => {
    setShowAddPr(true);
    if (task && task.projectId) {
      try {
        const res = await api.get<{ success: boolean; pullRequests: any[] }>(
          `/github/projects/${task.projectId}/pull-requests?state=all`
        );
        setAvailableProjectPrs(res.pullRequests || []);
      } catch (err) {
        console.error('Failed to load project PRs:', err);
      }
    }
  };

  const handleLinkPr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    let prNum = 0;
    let prTitle = '';
    let prUrl = '';
    let prState = 'open';

    if (selectedPrNumber && availableProjectPrs.length > 0) {
      const chosen = availableProjectPrs.find((p) => String(p.number) === selectedPrNumber);
      if (chosen) {
        prNum = chosen.number;
        prTitle = chosen.title;
        prUrl = chosen.url;
        prState = chosen.state;
      }
    } else if (manualPrNumber && manualPrUrl) {
      prNum = Number(manualPrNumber);
      prTitle = manualPrTitle.trim() || `Pull Request #${prNum}`;
      prUrl = manualPrUrl.trim();
    } else {
      addToast({ type: 'error', message: 'Please select a PR or enter PR details' });
      return;
    }

    try {
      setIsLinkingPr(true);
      await api.post(`/github/tasks/${task.id}/pull-requests`, {
        pullRequestNumber: prNum,
        pullRequestTitle: prTitle,
        pullRequestUrl: prUrl,
        pullRequestState: prState,
      });

      addToast({ type: 'success', title: 'PR Linked', message: `Linked PR #${prNum} to task` });
      setShowAddPr(false);
      setSelectedPrNumber('');
      setManualPrNumber('');
      setManualPrUrl('');
      setManualPrTitle('');
      loadLinkedPrs(task.id);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Link Failed', message: err.message || 'Could not link PR' });
    } finally {
      setIsLinkingPr(false);
    }
  };

  const handleUnlinkPr = async (prId: string) => {
    if (!task) return;
    try {
      await api.delete(`/github/tasks/${task.id}/pull-requests/${prId}`);
      addToast({ type: 'info', message: 'Pull request unlinked' });
      loadLinkedPrs(task.id);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Could not unlink PR' });
    }
  };

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

      <div className="relative w-full max-w-xl bg-[#0e0f16] border border-white/[0.08] rounded-2xl shadow-surface-card p-6 z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 font-mono rounded bg-white/[0.04] border border-white/[0.08] text-slate-400">
              {task.project?.name || 'Project Task'}
            </span>
            <StatusBadge status={task.status} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete task"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={closeEditTask}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-4 mt-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Task Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 text-sm font-medium focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea
              rows={3}
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
                className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
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
                className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
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
                className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
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

          {/* GitHub Pull Requests Section */}
          <div className="pt-4 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <GitPullRequest className="w-4 h-4 text-brand-400" />
                Linked GitHub Pull Requests ({linkedPrs.length})
              </span>
              <button
                type="button"
                onClick={handleOpenAddPr}
                className="text-[11px] text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Link PR
              </button>
            </div>

            {/* List of currently linked PRs */}
            {linkedPrs.length > 0 && (
              <div className="space-y-2">
                {linkedPrs.map((pr) => (
                  <div
                    key={pr.id}
                    className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-semibold shrink-0 ${
                          pr.pullRequestState === 'merged'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/25'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                        }`}
                      >
                        {pr.pullRequestState}
                      </span>
                      <span className="text-slate-200 truncate">{pr.pullRequestTitle}</span>
                      <span className="text-slate-500 font-mono text-[11px]">#{pr.pullRequestNumber}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={pr.pullRequestUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-white"
                        title="View on GitHub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleUnlinkPr(pr.id)}
                        title="Unlink PR"
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Link PR Form / Modal inline */}
            {showAddPr && (
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-brand-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                  <span>Link a Pull Request</span>
                  <button type="button" onClick={() => setShowAddPr(false)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {availableProjectPrs.length > 0 ? (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Choose from repository pull requests:
                    </label>
                    <select
                      value={selectedPrNumber}
                      onChange={(e) => setSelectedPrNumber(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface-200 border border-surface-border rounded-lg text-slate-100 text-xs focus:outline-none focus:border-brand-500"
                    >
                      <option value="">-- Select Pull Request --</option>
                      {availableProjectPrs.map((p) => (
                        <option key={p.id} value={p.number}>
                          #{p.number} - {p.title} ({p.state})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">PR #</label>
                        <input
                          type="number"
                          placeholder="42"
                          value={manualPrNumber}
                          onChange={(e) => setManualPrNumber(e.target.value)}
                          className="w-full px-2 py-1.5 bg-surface-200 border border-surface-border rounded-lg text-slate-100 text-xs focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">PR Title</label>
                        <input
                          type="text"
                          placeholder="e.g. Implement auth fix"
                          value={manualPrTitle}
                          onChange={(e) => setManualPrTitle(e.target.value)}
                          className="w-full px-2 py-1.5 bg-surface-200 border border-surface-border rounded-lg text-slate-100 text-xs focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">PR URL on GitHub</label>
                      <input
                        type="url"
                        placeholder="https://github.com/org/repo/pull/42"
                        value={manualPrUrl}
                        onChange={(e) => setManualPrUrl(e.target.value)}
                        className="w-full px-2 py-1.5 bg-surface-200 border border-surface-border rounded-lg text-slate-100 text-xs focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddPr(false)}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" isLoading={isLinkingPr} onClick={handleLinkPr}>
                    Link to Task
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] mt-6">
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
