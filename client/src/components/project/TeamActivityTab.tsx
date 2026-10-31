import React, { useState, useEffect } from 'react';
import {
  Activity as ActivityIcon,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  Clock,
  RotateCcw,
  Send,
  Layers,
  Calendar,
  Filter,
  User,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { api } from '../../api/client';
import { formatTimeAgo, formatDate } from '../../lib/utils';
import { ProjectMember } from '../../types';

interface TeamActivityTabProps {
  projectId: string;
}

export const TeamActivityTab: React.FC<TeamActivityTabProps> = ({ projectId }) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [githubCommits, setGithubCommits] = useState<any[]>([]);
  const [githubPrs, setGithubPrs] = useState<any[]>([]);
  const [linkedRepo, setLinkedRepo] = useState<any>(null);

  // Filters
  const [selectedMember, setSelectedMember] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'DEVSYNC' | 'GITHUB'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivityData();
  }, [projectId]);

  const loadActivityData = async () => {
    setIsLoading(true);
    try {
      // 1. Members
      const membersRes = await api.get<{ success: boolean; members: ProjectMember[] }>(
        `/projects/${projectId}/members`
      );
      setMembers(membersRes.members || []);

      // 2. DevSync Activity Timeline
      const timelineRes = await api.get<{ success: boolean; timeline: any[] }>(
        `/projects/${projectId}/team-activity`
      );
      setTimeline(timelineRes.timeline || []);

      // 3. GitHub Commits & PRs
      const commitsRes = await api.get<{
        success: boolean;
        commits: any[];
        repository?: any;
        linked?: boolean;
      }>(`/github/projects/${projectId}/commits`);

      if (commitsRes.linked && commitsRes.repository) {
        setLinkedRepo(commitsRes.repository);
        setGithubCommits(commitsRes.commits || []);

        const prsRes = await api.get<{ success: boolean; pullRequests: any[] }>(
          `/github/projects/${projectId}/pull-requests?state=all`
        );
        setGithubPrs(prsRes.pullRequests || []);
      }
    } catch (err) {
      console.error('Failed to load team activity:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Compile Unified Event Stream
  const unifiedEvents: any[] = [];

  // Add DevSync events
  timeline.forEach((item) => {
    unifiedEvents.push({
      id: `devsync-${item.id}`,
      type: 'devsync',
      action: item.action,
      details: item.details,
      timestamp: new Date(item.timestamp),
      authorName: item.user?.name || 'DevSync User',
      authorAvatar: item.user?.avatarUrl,
      authorEmail: item.user?.email,
      authorId: item.user?.id,
      task: item.task,
    });
  });

  // Add GitHub Commits
  githubCommits.forEach((commit) => {
    unifiedEvents.push({
      id: `gh-commit-${commit.sha}`,
      type: 'github',
      category: 'commit',
      action: 'GITHUB_COMMIT',
      details: commit.message,
      hash: commit.shortSha,
      timestamp: new Date(commit.date),
      authorName: commit.authorName,
      authorAvatar: commit.authorAvatar,
      url: commit.html_url,
    });
  });

  // Add GitHub PRs
  githubPrs.forEach((pr) => {
    unifiedEvents.push({
      id: `gh-pr-${pr.id}`,
      type: 'github',
      category: 'pull_request',
      action: pr.state === 'merged' ? 'GITHUB_PR_MERGED' : pr.state === 'closed' ? 'GITHUB_PR_CLOSED' : 'GITHUB_PR_OPENED',
      details: `#${pr.number} ${pr.title}`,
      prNumber: pr.number,
      prState: pr.state,
      timestamp: new Date(pr.createdAt),
      authorName: pr.authorName,
      authorAvatar: pr.authorAvatar,
      url: pr.url,
    });
  });

  // Sort unified events descending by date
  unifiedEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Apply filters
  const filteredEvents = unifiedEvents.filter((event) => {
    if (filterType === 'DEVSYNC' && event.type !== 'devsync') return false;
    if (filterType === 'GITHUB' && event.type !== 'github') return false;

    if (selectedMember !== 'ALL') {
      const matchName = event.authorName?.toLowerCase() === selectedMember.toLowerCase();
      const matchId = event.authorId === selectedMember;
      if (!matchName && !matchId) return false;
    }

    if (startDate && event.timestamp < new Date(startDate)) return false;
    if (endDate && event.timestamp > new Date(endDate)) return false;

    return true;
  });

  // Overall workload stats
  const totalAssigned = members.reduce((acc, m) => acc + (m.stats?.assignedTasks || 0), 0);
  const totalInProgress = members.reduce((acc, m) => acc + (m.stats?.inProgressTasks || 0), 0);
  const totalPendingReview = members.reduce((acc, m) => acc + (m.stats?.pendingReviewTasks || 0), 0);
  const totalCompleted = members.reduce((acc, m) => acc + (m.stats?.completedTasks || 0), 0);

  const renderEventIcon = (event: any) => {
    if (event.type === 'github') {
      if (event.category === 'commit') {
        return <GitCommit className="w-4 h-4 text-emerald-400" />;
      }
      return <GitPullRequest className="w-4 h-4 text-purple-400" />;
    }

    switch (event.action) {
      case 'TASK_SUBMITTED_FOR_REVIEW':
        return <Send className="w-4 h-4 text-indigo-400" />;
      case 'TASK_REVIEW_APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'TASK_CHANGES_REQUESTED':
        return <RotateCcw className="w-4 h-4 text-amber-400" />;
      case 'TASK_COMPLETED':
      case 'TASK_AUTO_COMPLETED_VIA_PR':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <Clock className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Workload Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#0c0d13] border border-white/[0.06]">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
            Assigned Work
          </span>
          <span className="text-xl font-bold text-white mt-1 block font-mono">
            {totalAssigned}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0c0d13] border border-white/[0.06]">
          <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider block">
            In Progress
          </span>
          <span className="text-xl font-bold text-amber-300 mt-1 block font-mono">
            {totalInProgress}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0c0d13] border border-white/[0.06]">
          <span className="text-[11px] font-medium text-purple-400 uppercase tracking-wider block">
            Under Review
          </span>
          <span className="text-xl font-bold text-purple-300 mt-1 block font-mono">
            {totalPendingReview}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0c0d13] border border-white/[0.06]">
          <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider block">
            Completed Tasks
          </span>
          <span className="text-xl font-bold text-emerald-300 mt-1 block font-mono">
            {totalCompleted}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-[#0c0d13] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Origin filter buttons */}
          <div className="flex items-center p-1 bg-surface-200/50 rounded-xl border border-white/10">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterType === 'ALL'
                  ? 'bg-brand-600 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Events ({unifiedEvents.length})
            </button>
            <button
              onClick={() => setFilterType('DEVSYNC')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterType === 'DEVSYNC'
                  ? 'bg-brand-600 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              DevSync Only
            </button>
            <button
              onClick={() => setFilterType('GITHUB')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterType === 'GITHUB'
                  ? 'bg-brand-600 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              GitHub Only
            </button>
          </div>

          {/* Member Filter */}
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="px-3 py-1.5 bg-surface-200 border border-white/10 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Team Members</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name} ({m.role})
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filters */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 bg-surface-200 border border-white/10 rounded-lg text-xs text-zinc-300"
            title="Start date"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 bg-surface-200 border border-white/10 rounded-lg text-xs text-zinc-300"
            title="End date"
          />
        </div>
      </div>

      {/* Unified Timeline List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            Compiling unified team activity timeline...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 rounded-2xl border border-white/[0.06] bg-[#0c0d13]">
            No activity matches the selected filters.
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="p-3.5 rounded-xl bg-[#0c0d13] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex items-start justify-between gap-4 text-xs"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] shrink-0 mt-0.5">
                  {renderEventIcon(event)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Origin Badge */}
                    {event.type === 'github' ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        GITHUB
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/30">
                        DEVSYNC
                      </span>
                    )}

                    <span className="font-semibold text-white truncate">
                      {event.authorName}
                    </span>

                    {event.hash && (
                      <span className="font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.2 rounded text-[11px]">
                        {event.hash}
                      </span>
                    )}
                  </div>

                  <p className="text-zinc-300 mt-1 text-xs select-text">
                    {event.details}
                  </p>

                  {event.task && (
                    <span className="inline-block mt-1 text-[11px] text-zinc-400">
                      Task: <span className="text-zinc-200">{event.task.title}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 gap-1.5">
                <span className="text-[11px] text-zinc-400 font-mono">
                  {formatTimeAgo(event.timestamp.toISOString())}
                </span>
                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                  >
                    <span>View</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

