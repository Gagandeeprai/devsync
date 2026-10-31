import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Folder,
  FileCode,
  FileText,
  File,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Users,
  UserPlus,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api/client';
import { useUiStore } from '../../store/uiStore';
import { RepoContentItem, BranchItem, CommitNode, ContributorItem } from '../../types';
import { formatTimeAgo, formatDate } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface CodeVisualizerTabProps {
  projectId: string;
  repository: any;
  commits: any[];
  pullRequests: any[];
  onRefresh: () => void;
}

export const CodeVisualizerTab: React.FC<CodeVisualizerTabProps> = ({
  projectId,
  repository,
  commits,
  pullRequests,
  onRefresh,
}) => {
  const { addToast } = useUiStore();
  const [subTab, setSubTab] = useState<
    'EXPLORER' | 'BRANCHES' | 'GRAPH' | 'CONTRIBUTORS' | 'COMMITS' | 'PRS' | 'COLLABORATORS'
  >('EXPLORER');

  // File Explorer State
  const [currentPath, setCurrentPath] = useState('');
  const [contents, setContents] = useState<RepoContentItem[]>([]);
  const [isLoadingContents, setIsLoadingContents] = useState(false);

  // Branch Explorer State
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);

  // Commit Graph State
  const [graphNodes, setGraphNodes] = useState<CommitNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCommit, setSelectedCommit] = useState<CommitNode | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);

  // Contributors State
  const [contributors, setContributors] = useState<ContributorItem[]>([]);
  const [isLoadingContributors, setIsLoadingContributors] = useState(false);

  // Collaborators State
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [inviteUsername, setInviteUsername] = useState('');
  const [invitePermission, setInvitePermission] = useState('push');
  const [isInviting, setIsInviting] = useState(false);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);

  // PR Filters
  const [prFilter, setPrFilter] = useState<'all' | 'open' | 'closed' | 'merged'>('all');

  useEffect(() => {
    if (repository) {
      loadContents('');
      loadBranches();
      loadCommitGraph('');
      loadContributors();
      loadCollaborators();
    }
  }, [projectId, repository]);

  // Load Directory Contents
  const loadContents = async (path: string) => {
    setIsLoadingContents(true);
    try {
      const res = await api.get<{
        success: boolean;
        contents: RepoContentItem[];
        path: string;
      }>(`/github/projects/${projectId}/contents?path=${encodeURIComponent(path)}`);
      setContents(res.contents || []);
      setCurrentPath(res.path || '');
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Could not load directory contents',
      });
    } finally {
      setIsLoadingContents(false);
    }
  };

  // Load Branches
  const loadBranches = async () => {
    setIsLoadingBranches(true);
    try {
      const res = await api.get<{
        success: boolean;
        branches: BranchItem[];
        defaultBranch: string;
      }>(`/github/projects/${projectId}/branches`);
      setBranches(res.branches || []);
      setDefaultBranch(res.defaultBranch || 'main');
      if (!selectedBranch) setSelectedBranch(res.defaultBranch || 'main');
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  // Load Interactive Commit Graph
  const loadCommitGraph = async (branch: string) => {
    setIsLoadingGraph(true);
    try {
      const query = branch ? `?branch=${encodeURIComponent(branch)}` : '';
      const res = await api.get<{
        success: boolean;
        nodes: CommitNode[];
        edges: any[];
      }>(`/github/projects/${projectId}/commit-graph${query}`);
      setGraphNodes(res.nodes || []);
      setGraphEdges(res.edges || []);
      if (res.nodes && res.nodes.length > 0) {
        setSelectedCommit(res.nodes[0]);
      }
    } catch (err) {
      console.error('Failed to load commit graph:', err);
    } finally {
      setIsLoadingGraph(false);
    }
  };

  // Load Contributors
  const loadContributors = async () => {
    setIsLoadingContributors(true);
    try {
      const res = await api.get<{
        success: boolean;
        contributors: ContributorItem[];
      }>(`/github/projects/${projectId}/contributors`);
      setContributors(res.contributors || []);
    } catch (err) {
      console.error('Failed to load contributors:', err);
    } finally {
      setIsLoadingContributors(false);
    }
  };

  // Load Collaborators
  const loadCollaborators = async () => {
    setIsLoadingCollaborators(true);
    try {
      const res = await api.get<{
        success: boolean;
        collaborators: any[];
      }>(`/github/projects/${projectId}/collaborators`);
      setCollaborators(res.collaborators || []);
    } catch (err) {
      console.error('Failed to load collaborators:', err);
    } finally {
      setIsLoadingCollaborators(false);
    }
  };

  // Invite Collaborator
  const handleInviteCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;

    setIsInviting(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        `/github/projects/${projectId}/collaborators`,
        {
          username: inviteUsername.trim(),
          permission: invitePermission,
        }
      );
      addToast({
        type: 'success',
        title: 'Invitation Sent',
        message: res.message || `Invited @${inviteUsername} to GitHub repository`,
      });
      setInviteUsername('');
      loadCollaborators();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Invitation Failed',
        message: err.message || 'Could not send GitHub invitation',
      });
    } finally {
      setIsInviting(false);
    }
  };

  // Navigate folder breadcrumbs
  const navigateBreadcrumb = (index: number) => {
    const parts = currentPath.split('/').filter(Boolean);
    const target = parts.slice(0, index + 1).join('/');
    loadContents(target);
  };

  const navigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    loadContents(parts.join('/'));
  };

  const getFileIcon = (item: RepoContentItem) => {
    if (item.type === 'dir') return <Folder className="w-4 h-4 text-amber-400 shrink-0" />;
    const ext = item.name.split('.').pop()?.toLowerCase();
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'c', 'cpp'].includes(ext || '')) {
      return <FileCode className="w-4 h-4 text-sky-400 shrink-0" />;
    }
    if (['md', 'txt', 'json', 'yaml', 'yml'].includes(ext || '')) {
      return <FileText className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    return <File className="w-4 h-4 text-zinc-400 shrink-0" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter PRs
  const filteredPrs = pullRequests.filter((pr) => {
    if (prFilter === 'all') return true;
    return pr.state === prFilter;
  });

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Pill Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#0c0d13] border border-white/[0.08] text-xs">
        <button
          onClick={() => setSubTab('EXPLORER')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            subTab === 'EXPLORER'
              ? 'bg-brand-600 text-white font-medium shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>File Explorer</span>
        </button>

        <button
          onClick={() => setSubTab('BRANCHES')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            subTab === 'BRANCHES'
              ? 'bg-brand-600 text-white font-medium shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Branches ({branches.length})</span>
        </button>

        <button
          onClick={() => setSubTab('GRAPH')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            subTab === 'GRAPH'
              ? 'bg-brand-600 text-white font-medium shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <GitCommit className="w-3.5 h-3.5" />
          <span>Commit Graph</span>
        </button>

        <button
          onClick={() => setSubTab('CONTRIBUTORS')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            subTab === 'CONTRIBUTORS'
              ? 'bg-brand-600 text-white font-medium shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Contributors ({contributors.length})</span>
        </button>

        <button
          onClick={() => setSubTab('COMMITS')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            subTab === 'COMMITS'
              ? 'bg-brand-600 text-white font-medium shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Commits ({commits.length})</span>
        </button>

        <button
          onClick={() => setSubTab('PRS')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            subTab === 'PRS'
              ? 'bg-brand-600 text-white font-medium shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <GitPullRequest className="w-3.5 h-3.5" />
          <span>Pull Requests ({pullRequests.length})</span>
        </button>

        <button
          onClick={() => setSubTab('COLLABORATORS')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            subTab === 'COLLABORATORS'
              ? 'bg-brand-600 text-white font-medium shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Collaborators ({collaborators.length})</span>
        </button>
      </div>

      {/* 1. FILE EXPLORER */}
      {subTab === 'EXPLORER' && (
        <div className="space-y-3">
          {/* Path Navigation Breadcrumbs */}
          <div className="p-3 rounded-xl bg-[#0c0d13] border border-white/[0.08] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300 font-mono flex-wrap">
              <button
                onClick={() => loadContents('')}
                className="hover:text-brand-400 font-semibold text-white"
              >
                {repository.repositoryName}
              </button>
              {currentPath && (
                <>
                  <span className="text-zinc-600">/</span>
                  {currentPath.split('/').map((part, i, arr) => (
                    <React.Fragment key={i}>
                      <button
                        onClick={() => navigateBreadcrumb(i)}
                        className={`hover:text-brand-400 ${
                          i === arr.length - 1 ? 'text-white font-semibold' : 'text-zinc-400'
                        }`}
                      >
                        {part}
                      </button>
                      {i < arr.length - 1 && <span className="text-zinc-600">/</span>}
                    </React.Fragment>
                  ))}
                </>
              )}
            </div>

            {currentPath && (
              <button
                onClick={navigateUp}
                className="px-2.5 py-1 bg-surface-200/60 hover:bg-surface-200 text-zinc-300 text-xs rounded-lg flex items-center gap-1 shrink-0"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Up</span>
              </button>
            )}
          </div>

          {/* Directory Content List */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d13] overflow-hidden">
            {isLoadingContents ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                Loading repository file tree from GitHub API...
              </div>
            ) : contents.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                No files found in this directory.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {contents.map((item) => (
                  <div
                    key={item.sha || item.path}
                    className="p-3 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getFileIcon(item)}
                      {item.type === 'dir' ? (
                        <button
                          onClick={() => loadContents(item.path)}
                          className="font-medium text-white hover:text-brand-400 truncate text-left"
                        >
                          {item.name}
                        </button>
                      ) : (
                        <span className="font-mono text-zinc-200 truncate">{item.name}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.type === 'file' && (
                        <span className="font-mono text-[11px] text-zinc-500">
                          {formatFileSize(item.size)}
                        </span>
                      )}
                      <a
                        href={item.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="View on GitHub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. BRANCH EXPLORER */}
      {subTab === 'BRANCHES' && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d13] overflow-hidden">
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">Repository Branches</h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Default branch: <span className="font-mono text-brand-400">{defaultBranch}</span>
              </p>
            </div>
            <button
              onClick={loadBranches}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.04]"
              title="Refresh branches"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {isLoadingBranches ? (
              <div className="py-12 text-center text-xs text-zinc-500">Loading branches...</div>
            ) : branches.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">No branches found.</div>
            ) : (
              branches.map((b) => (
                <div
                  key={b.name}
                  className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GitBranch className="w-4 h-4 text-brand-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-white">{b.name}</span>
                        {b.isDefault && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/30">
                            DEFAULT
                          </span>
                        )}
                        {b.isProtected && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" />
                            <span>Protected</span>
                          </span>
                        )}
                      </div>
                      {b.sha && (
                        <span className="text-[11px] font-mono text-zinc-500 mt-0.5 block">
                          Latest commit: {b.sha.substring(0, 7)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!b.isDefault && b.compareUrl && (
                      <a
                        href={b.compareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-surface-200/60 hover:bg-surface-200 text-zinc-300 text-xs rounded-lg flex items-center gap-1"
                      >
                        <span>Compare</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE COMMIT GRAPH */}
      {subTab === 'GRAPH' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#0c0d13] border border-white/[0.08] flex items-center justify-between gap-3 text-xs">
            <div>
              <h4 className="font-semibold text-white flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-emerald-400" />
                Commit History DAG (Direct Acyclic Graph)
              </h4>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Interactive nodes with parent-child commit lineage from GitHub API
              </p>
            </div>

            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                loadCommitGraph(e.target.value);
              }}
              className="px-3 py-1.5 bg-surface-200 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  Branch: {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Graph Node Timeline List */}
            <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-[#0c0d13] p-4 max-h-[600px] overflow-y-auto space-y-2">
              {isLoadingGraph ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  Building commit DAG graph...
                </div>
              ) : graphNodes.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  No commits found for selected branch.
                </div>
              ) : (
                graphNodes.map((node, index) => {
                  const isSelected = selectedCommit?.sha === node.sha;
                  return (
                    <div
                      key={node.sha}
                      onClick={() => setSelectedCommit(node)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-xs ${
                        isSelected
                          ? 'border-brand-500 bg-brand-500/10 shadow-glow-brand/20'
                          : 'border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Graph Node Dot & Vertical Connector */}
                      <div className="flex flex-col items-center shrink-0 mt-1">
                        <div
                          className={`w-3.5 h-3.5 rounded-full border-2 ${
                            isSelected
                              ? 'border-brand-400 bg-brand-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]'
                              : 'border-emerald-400 bg-emerald-950'
                          }`}
                        />
                        {index < graphNodes.length - 1 && (
                          <div className="w-0.5 h-10 bg-white/10 mt-1" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-semibold text-brand-400 bg-brand-500/10 px-1.5 py-0.2 rounded border border-brand-500/20">
                            {node.shortSha}
                          </span>
                          <span className="font-medium text-white truncate">{node.authorName}</span>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {formatTimeAgo(node.date)}
                          </span>
                        </div>
                        <p className="text-zinc-300 mt-1 truncate">{node.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Commit Details Panel */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d13] p-5 text-xs space-y-4">
              <h5 className="font-semibold text-white border-b border-white/[0.08] pb-3 flex items-center justify-between">
                <span>Commit Details</span>
                {selectedCommit && (
                  <span className="font-mono text-zinc-400 text-[11px]">
                    {selectedCommit.shortSha}
                  </span>
                )}
              </h5>

              {selectedCommit ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] text-zinc-500 uppercase font-semibold block mb-1">
                      Message
                    </span>
                    <p className="text-zinc-200 font-medium leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                      {selectedCommit.message}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-500 uppercase font-semibold block mb-1">
                      Author
                    </span>
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={selectedCommit.authorAvatar}
                        name={selectedCommit.authorName}
                        size="sm"
                      />
                      <span className="text-white font-medium">{selectedCommit.authorName}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-500 uppercase font-semibold block mb-1">
                      Committed At
                    </span>
                    <span className="text-zinc-300 font-mono">
                      {formatDate(selectedCommit.date)} ({formatTimeAgo(selectedCommit.date)})
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-500 uppercase font-semibold block mb-1">
                      Parent Commits
                    </span>
                    <div className="space-y-1 font-mono text-[11px]">
                      {selectedCommit.parents.length > 0 ? (
                        selectedCommit.parents.map((pSha) => (
                          <div key={pSha} className="text-zinc-400 bg-white/[0.03] px-2 py-1 rounded">
                            {pSha.substring(0, 10)}
                          </div>
                        ))
                      ) : (
                        <span className="text-zinc-500 italic">Root commit (no parents)</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={selectedCommit.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <span>Open on GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  Click a commit node to inspect details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CONTRIBUTORS */}
      {subTab === 'CONTRIBUTORS' && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d13] p-5 space-y-4">
          <div className="border-b border-white/[0.08] pb-3">
            <h4 className="text-sm font-semibold text-white">Repository Contributors</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Top commit contributors retrieved from GitHub API
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {isLoadingContributors ? (
              <div className="col-span-full py-12 text-center text-xs text-zinc-500">
                Loading contributors...
              </div>
            ) : contributors.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-zinc-500">
                No contributors data returned from GitHub.
              </div>
            ) : (
              contributors.map((c) => (
                <div
                  key={c.login}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={c.avatarUrl} name={c.login} size="sm" />
                    <div className="min-w-0">
                      <a
                        href={c.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-white hover:text-brand-400 truncate block"
                      >
                        @{c.login}
                      </a>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {c.contributions} {c.contributions === 1 ? 'commit' : 'commits'}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. COMMITS LIST */}
      {subTab === 'COMMITS' && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d13] overflow-hidden">
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Recent Commits</h4>
            <span className="text-xs text-zinc-400 font-mono">{commits.length} commits</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {commits.map((c) => (
              <div
                key={c.sha}
                className="p-4 hover:bg-white/[0.02] transition-colors flex items-start justify-between gap-4 text-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar src={c.authorAvatar} name={c.authorName} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{c.authorName}</span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {formatTimeAgo(c.date)}
                      </span>
                    </div>
                    <p className="text-zinc-300 mt-0.5 select-text">{c.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={c.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20 hover:bg-brand-500/20 transition-colors flex items-center gap-1"
                  >
                    <span>{c.shortSha}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. PULL REQUESTS */}
      {subTab === 'PRS' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-1 bg-[#0c0d13] rounded-xl border border-white/[0.08] text-xs w-fit">
            {(['all', 'open', 'merged', 'closed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPrFilter(tab)}
                className={`px-3 py-1 rounded-lg capitalize transition-all ${
                  prFilter === tab
                    ? 'bg-brand-600 text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d13] overflow-hidden divide-y divide-white/[0.04]">
            {filteredPrs.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                No pull requests found matching filter "{prFilter}".
              </div>
            ) : (
              filteredPrs.map((pr) => (
                <div
                  key={pr.id}
                  className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold shrink-0 ${
                        pr.state === 'merged'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : pr.state === 'open'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {pr.state}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-white block truncate">
                        #{pr.number} {pr.title}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">
                        by {pr.authorName} • opened {formatTimeAgo(pr.createdAt)}
                      </span>
                    </div>
                  </div>

                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-zinc-400 hover:text-white transition-colors shrink-0"
                    title="View on GitHub"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 7. COLLABORATORS & INVITES */}
      {subTab === 'COLLABORATORS' && (
        <div className="space-y-6">
          {/* Invite Form */}
          <div className="p-5 rounded-2xl bg-[#0c0d13] border border-white/[0.08]">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-brand-400" />
              Invite GitHub Collaborator
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sends an invitation to a GitHub user. Note: GitHub requires the user to accept the invitation before access is active.
            </p>

            <form onSubmit={handleInviteCollaborator} className="mt-4 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                placeholder="GitHub Username (e.g. torvalds)"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-surface-200 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
              />

              <select
                value={invitePermission}
                onChange={(e) => setInvitePermission(e.target.value)}
                className="px-3 py-2 bg-surface-200 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="push">Write (push)</option>
                <option value="pull">Read (pull)</option>
                <option value="admin">Admin</option>
              </select>

              <Button type="submit" size="sm" isLoading={isInviting}>
                Send GitHub Invite
              </Button>
            </form>
          </div>

          {/* Collaborator List */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d13] overflow-hidden">
            <div className="p-4 border-b border-white/[0.08]">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Active Repository Collaborators
              </h5>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {isLoadingCollaborators ? (
                <div className="py-8 text-center text-xs text-zinc-500">Loading collaborators...</div>
              ) : collaborators.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No collaborators listed or insufficient permissions to read collaborators.
                </div>
              ) : (
                collaborators.map((c) => (
                  <div
                    key={c.login}
                    className="p-3.5 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={c.avatarUrl} name={c.login} size="sm" />
                      <span className="font-semibold text-white">@{c.login}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.permissions && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-zinc-300 border border-white/10">
                          {c.permissions.admin ? 'admin' : c.permissions.push ? 'write' : 'read'}
                        </span>
                      )}
                      <a
                        href={c.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-500 hover:text-white"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
