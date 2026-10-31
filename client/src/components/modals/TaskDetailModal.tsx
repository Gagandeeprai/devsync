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
  CheckCircle2,
  RotateCcw,
  Send,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { TaskStatus, TaskPriority, User } from '../../types';
import { PriorityBadge, StatusBadge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import { formatDate } from '../../lib/utils';

export const TaskDetailModal: React.FC = () => {
  const { editingTaskId, closeEditTask, addToast } = useUiStore();
  const { tasks, updateTask, deleteTask, submitForReview, requestChanges, approveTask } = useTaskStore();
  const { user: currentUser } = useAuthStore();

  const task = tasks.find((t) => t.id === editingTaskId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [currentUserProjectRole, setCurrentUserProjectRole] = useState<string>('DEVELOPER');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Review Dialog State
  const [isReviewActionLoading, setIsReviewActionLoading] = useState(false);
  const [showRequestChangesInput, setShowRequestChangesInput] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);

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
      setReviewerId(task.reviewerId || '');
      setReviewNotes(task.reviewNotes || '');
      setDueDate(task.dueDate ? task.dueDate.substring(0, 10) : '');
      loadLinkedPrs(task.id);

      if (task.projectId) {
        api.get<{ success: boolean; members: any[]; currentUserRole?: string }>(
          `/projects/${task.projectId}/members`
        )
          .then((res) => {
            setProjectMembers(res.members || []);
            if (res.currentUserRole) setCurrentUserProjectRole(res.currentUserRole);
          })
          .catch(console.error);
      }
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

    let prNumber = 0;
    let prTitle = '';
    let prUrl = '';
    let prState = 'open';

    if (selectedPrNumber) {
      const found = availableProjectPrs.find((p) => String(p.number) === selectedPrNumber);
      if (found) {
        prNumber = found.number;
        prTitle = found.title;
        prUrl = found.url;
        prState = found.state;
      }
    } else if (manualPrNumber && manualPrUrl) {
      prNumber = parseInt(manualPrNumber, 10);
      prUrl = manualPrUrl.trim();
      prTitle = manualPrTitle.trim() || `Pull Request #${prNumber}`;
    }

    if (!prNumber || !prUrl) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a PR or enter PR Number and URL',
      });
      return;
    }

    setIsLinkingPr(true);
    try {
      const res = await api.post<{ success: boolean; pullRequest: any; message?: string }>(
        `/github/tasks/${task.id}/pull-requests`,
        {
          pullRequestNumber: prNumber,
          pullRequestTitle: prTitle,
          pullRequestUrl: prUrl,
          pullRequestState: prState,
        }
      );

      if (res.success) {
        addToast({
          type: 'success',
          title: 'PR Linked',
          message: `Linked PR #${prNumber} to this task`,
        });
        loadLinkedPrs(task.id);
        setShowAddPr(false);
        setSelectedPrNumber('');
        setManualPrNumber('');
        setManualPrUrl('');
        setManualPrTitle('');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Linking Failed',
        message: err.message || 'Could not link PR to task',
      });
    } finally {
      setIsLinkingPr(false);
    }
  };

  const handleUnlinkPr = async (linkId: string) => {
    if (!task) return;
    try {
      await api.delete(`/github/tasks/${task.id}/pull-requests/${linkId}`);
      addToast({
        type: 'info',
        message: 'Pull request unlinked',
      });
      setLinkedPrs((prev) => prev.filter((p) => p.id !== linkId));
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Could not unlink PR',
      });
    }
  };

  // Senior Review Handlers
  const handleSubmitForReview = async () => {
    if (!task) return;
    setIsReviewActionLoading(true);
    const ok = await submitForReview(task.id, submissionNotes);
    setIsReviewActionLoading(false);
    if (ok) {
      setShowSubmitModal(false);
      setSubmissionNotes('');
    }
  };

  const handleRequestChanges = async () => {
    if (!task) return;
    if (!feedbackNotes.trim()) {
      addToast({ type: 'error', message: 'Please provide feedback notes explaining what needs to change.' });
      return;
    }
    setIsReviewActionLoading(true);
    const ok = await requestChanges(task.id, feedbackNotes.trim());
    setIsReviewActionLoading(false);
    if (ok) {
      setShowRequestChangesInput(false);
      setFeedbackNotes('');
    }
  };

  const handleApprove = async () => {
    if (!task) return;
    setIsReviewActionLoading(true);
    await approveTask(task.id, 'Code and deliverables reviewed and verified');
    setIsReviewActionLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim()) return;

    setIsSaving(true);
    const updated = await updateTask(task.id, {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      assigneeId: assigneeId || null,
      reviewerId: reviewerId || null,
      reviewNotes: reviewNotes.trim() || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    });

    setIsSaving(false);
    if (updated) {
      closeEditTask();
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    setIsDeleting(true);
    const success = await deleteTask(task.id);
    setIsDeleting(false);
    if (success) {
      closeEditTask();
    }
  };

  if (!task) return null;

  const eligibleReviewers = projectMembers.filter(
    (m) => m.role === 'SENIOR' || m.role === 'PROJECT_LEAD' || m.role === 'PROJECT_ADMIN'
  );

  const canReview = ['PROJECT_ADMIN', 'PROJECT_LEAD', 'SENIOR'].includes(currentUserProjectRole);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={closeEditTask}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#12131a] border border-surface-border rounded-2xl shadow-surface-card p-6 z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-slate-400">
              {task.project?.name || 'Project'} • ID: {task.id.substring(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
              title="Delete task"
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

        {/* WORKFLOW STATUS BANNER & ACTION BAR */}
        {task.status === 'REVIEW' && (
          <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-indigo-200">
                  Task In Senior Review
                </p>
                <p className="text-[11px] text-indigo-300/80">
                  {task.reviewer ? `Assigned Reviewer: ${task.reviewer.name}` : 'Awaiting review from Senior/Lead'}
                </p>
                {task.reviewNotes && (
                  <p className="text-[11px] text-zinc-300 mt-1 italic">
                    Note: "{task.reviewNotes}"
                  </p>
                )}
              </div>
            </div>

            {canReview && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRequestChangesInput(!showRequestChangesInput)}
                  className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-medium rounded-lg flex items-center gap-1 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Request Changes</span>
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isReviewActionLoading}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg flex items-center gap-1 shadow-sm transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve & Done</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* REQUEST CHANGES INPUT EXPANSION */}
        {showRequestChangesInput && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#0c0d13] border border-amber-500/30 space-y-2.5 animate-in fade-in">
            <span className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Reviewer Feedback & Required Changes:
            </span>
            <textarea
              rows={2}
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              placeholder="Explain why changes are needed before this task can be approved..."
              className="w-full px-3 py-2 bg-surface-200 border border-white/10 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRequestChangesInput(false)}
                className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestChanges}
                disabled={isReviewActionLoading || !feedbackNotes.trim()}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-lg"
              >
                Send Feedback
              </button>
            </div>
          </div>
        )}

        {/* CHANGES REQUESTED BANNER */}
        {task.status === 'CHANGES_REQUESTED' && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-200">
                  Changes Requested by Reviewer
                </p>
                <p className="text-[11px] text-amber-300/90 mt-0.5">
                  Feedback: <span className="font-medium text-white">{task.reviewNotes || 'See reviewer comments'}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium rounded-lg flex items-center gap-1 shadow-sm shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Re-submit for Review</span>
            </button>
          </div>
        )}

        {/* SUBMIT FOR REVIEW DIALOG */}
        {showSubmitModal && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#0c0d13] border border-brand-500/30 space-y-2.5 animate-in fade-in">
            <span className="text-xs font-medium text-brand-300 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Submit Task to Senior Review:
            </span>
            <input
              type="text"
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              placeholder="Optional notes for reviewer (e.g. PR #42 ready, passed CI)..."
              className="w-full px-3 py-2 bg-surface-200 border border-white/10 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={isReviewActionLoading}
                className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white text-xs rounded-lg"
              >
                Submit Now
              </button>
            </div>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface-200 border border-surface-border rounded-xl text-slate-100 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task details and technical specifications..."
              className="w-full px-3.5 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-none"
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
                <option value="REVIEW">In Review</option>
                <option value="CHANGES_REQUESTED">Changes Requested</option>
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
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Senior Reviewer <span className="text-[10px] text-brand-400">(Required for Approval)</span>
              </label>
              <select
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500 cursor-pointer"
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
            <label className="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface-200 border border-surface-border rounded-xl text-slate-200 text-sm focus:outline-none focus:border-brand-500"
            />
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
                      <a
                        href={pr.pullRequestUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-200 hover:text-brand-400 truncate flex items-center gap-1"
                      >
                        <span>#{pr.pullRequestNumber} {pr.pullRequestTitle}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlinkPr(pr.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors shrink-0"
                      title="Unlink PR"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add PR Form */}
            {showAddPr && (
              <div className="p-3.5 rounded-xl bg-surface-200/50 border border-brand-500/30 space-y-3">
                <div className="text-xs font-semibold text-slate-200">Associate GitHub Pull Request</div>
                
                {availableProjectPrs.length > 0 && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Select from Repository PRs</label>
                    <select
                      value={selectedPrNumber}
                      onChange={(e) => {
                        setSelectedPrNumber(e.target.value);
                        setManualPrNumber('');
                        setManualPrUrl('');
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#0a0b10] border border-white/10 rounded-lg text-xs text-slate-200"
                    >
                      <option value="">-- Choose open/closed PR --</option>
                      {availableProjectPrs.map((p) => (
                        <option key={p.number} value={p.number}>
                          #{p.number} - {p.title} ({p.state})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="text-center text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Or enter manually
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <input
                      type="number"
                      placeholder="PR #"
                      value={manualPrNumber}
                      onChange={(e) => {
                        setManualPrNumber(e.target.value);
                        setSelectedPrNumber('');
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#0a0b10] border border-white/10 rounded-lg text-xs text-slate-200"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="url"
                      placeholder="https://github.com/owner/repo/pull/123"
                      value={manualPrUrl}
                      onChange={(e) => {
                        setManualPrUrl(e.target.value);
                        setSelectedPrNumber('');
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#0a0b10] border border-white/10 rounded-lg text-xs text-slate-200"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddPr(false)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLinkPr}
                    disabled={isLinkingPr}
                    className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white text-xs rounded-lg flex items-center gap-1"
                  >
                    {isLinkingPr ? 'Linking...' : 'Link PR to Task'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-surface-border mt-6">
            <div>
              {task.status !== 'REVIEW' && task.status !== 'DONE' && (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="px-3 py-1.5 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit for Senior Review</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
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
