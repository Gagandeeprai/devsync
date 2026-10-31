import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  UserPlus,
  Crown,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  MoreVertical,
  X,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import { useUiStore } from '../../store/uiStore';
import { ProjectMember, ProjectRole, User } from '../../types';

interface TeamTabProps {
  projectId: string;
}

const ROLE_BADGE_CONFIG: Record<
  ProjectRole,
  { label: string; bg: string; text: string; border: string }
> = {
  PROJECT_ADMIN: {
    label: 'Project Admin',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
  },
  PROJECT_LEAD: {
    label: 'Project Lead',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  SENIOR: {
    label: 'Senior Engineer',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  DEVELOPER: {
    label: 'Developer',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  INTERN: {
    label: 'Intern',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
};

export const TeamTab: React.FC<TeamTabProps> = ({ projectId }) => {
  const { addToast } = useUiStore();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<ProjectRole>('DEVELOPER');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('DEVELOPER');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [projectId]);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        members: ProjectMember[];
        currentUserRole?: ProjectRole;
      }>(`/projects/${projectId}/members`);
      setMembers(res.members || []);
      if (res.currentUserRole) setCurrentUserRole(res.currentUserRole);
    } catch (err) {
      console.error('Failed to load project members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = async () => {
    setIsAddModalOpen(true);
    try {
      const res = await api.get<{ success: boolean; users: User[] }>('/users');
      setAllUsers(res.users || []);
      if (res.users && res.users.length > 0) {
        setSelectedUserId(res.users[0].id);
      }
    } catch (err) {
      console.error('Failed to load all users:', err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setIsAdding(true);
    try {
      await api.post(`/projects/${projectId}/members`, {
        userId: selectedUserId,
        role: selectedRole,
      });
      addToast({
        type: 'success',
        title: 'Team Member Added',
        message: 'Project role configured successfully',
      });
      setIsAddModalOpen(false);
      loadMembers();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Add Member',
        message: err.message || 'Permission denied',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: ProjectRole) => {
    try {
      await api.put(`/projects/${projectId}/members/${userId}`, {
        role: newRole,
      });
      addToast({
        type: 'success',
        message: 'Member project role updated',
      });
      loadMembers();
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.message || 'Failed to update member role',
      });
    }
  };

  const canManageTeam = ['PROJECT_ADMIN', 'PROJECT_LEAD'].includes(currentUserRole);

  const filteredMembers = members.filter(
    (m) =>
      m.user.name.toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with Search and Add Member Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0c0d13] border border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-400" />
            Project Hierarchy & Engineering Permissions
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Role assignments are project-scoped. A user can be Senior in this project and Developer in another.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-surface-200/50 border border-white/10 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand-500 w-44"
            />
          </div>

          {canManageTeam && (
            <Button size="sm" onClick={openAddModal} className="flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </Button>
          )}
        </div>
      </div>

      {/* Permissions Matrix Reference Card */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs space-y-2">
        <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          Active Project Role Permissions Matrix
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] pt-1">
          <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/20">
            <span className="font-semibold text-rose-400 block">Project Admin</span>
            <span className="text-zinc-400">Manage repo, assign, review, approve, delete</span>
          </div>
          <div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <span className="font-semibold text-purple-400 block">Project Lead</span>
            <span className="text-zinc-400">Manage repo, assign, review, approve</span>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <span className="font-semibold text-blue-400 block">Senior</span>
            <span className="text-zinc-400">Assign tasks, review & approve work</span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <span className="font-semibold text-emerald-400 block">Developer</span>
            <span className="text-zinc-400">Submit tasks, implement code</span>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <span className="font-semibold text-amber-400 block">Intern</span>
            <span className="text-zinc-400">View tasks & submit work for senior review</span>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d13] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Project Role</th>
                <th className="py-3 px-4">Assigned</th>
                <th className="py-3 px-4">In Progress</th>
                <th className="py-3 px-4">Pending Review</th>
                <th className="py-3 px-4">Completed</th>
                {canManageTeam && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    Loading team members...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    No members match search criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const roleConfig = ROLE_BADGE_CONFIG[member.role] || ROLE_BADGE_CONFIG.DEVELOPER;
                  return (
                    <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={member.user.avatarUrl}
                            name={member.user.name}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-white flex items-center gap-1.5">
                              <span>{member.user.name}</span>
                              {member.isOwner && (
                                <span title="Project Owner">
                                  <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">
                              {member.user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border}`}
                        >
                          {roleConfig.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-zinc-300">
                        {member.stats?.assignedTasks ?? 0}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-amber-400">
                        {member.stats?.inProgressTasks ?? 0}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-purple-400">
                        {member.stats?.pendingReviewTasks ?? 0}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-emerald-400">
                        {member.stats?.completedTasks ?? 0}
                      </td>

                      {canManageTeam && (
                        <td className="py-3.5 px-4 text-right">
                          {member.isOwner ? (
                            <span className="text-[11px] text-zinc-500 italic">Owner</span>
                          ) : (
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleRoleChange(member.userId, e.target.value as ProjectRole)
                              }
                              className="px-2 py-1 bg-surface-200 border border-white/10 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-brand-500 cursor-pointer"
                            >
                              <option value="PROJECT_ADMIN">Project Admin</option>
                              <option value="PROJECT_LEAD">Project Lead</option>
                              <option value="SENIOR">Senior</option>
                              <option value="DEVELOPER">Developer</option>
                              <option value="INTERN">Intern</option>
                            </select>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MEMBER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-[#12131a] border border-surface-border rounded-2xl shadow-surface-card p-6 z-10 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-400" />
                Add Member to Project
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select User
                </label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-200 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Project Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                  className="w-full px-3 py-2 bg-surface-200 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="PROJECT_ADMIN">Project Admin</option>
                  <option value="PROJECT_LEAD">Project Lead</option>
                  <option value="SENIOR">Senior Engineer</option>
                  <option value="DEVELOPER">Developer</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isAdding}>
                  Confirm Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
