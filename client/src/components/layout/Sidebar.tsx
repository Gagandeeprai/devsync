import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  CheckSquare,
  Kanban,
  Settings,
  Plus,
  LogOut,
  Layers,
  ChevronRight,
  FolderPlus,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthStore();
  const { openCreateProject, openCreateTask } = useUiStore();

  const navItems = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'My Projects', to: '/projects', icon: FolderGit2 },
    { name: 'My Tasks', to: '/tasks', icon: CheckSquare },
    { name: 'Kanban Board', to: '/kanban', icon: Kanban },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0a0b10] border-r border-white/[0.08] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Workspace Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-white/[0.08] gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-accent-cyan flex items-center justify-center text-white shadow-glow-brand ring-1 ring-white/20 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-zinc-100 tracking-tight text-sm flex items-center gap-1.5">
              DevSync
              <span className="text-[10px] px-1.5 py-0.2 font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                v2.0
              </span>
            </span>
            <span className="text-[11px] text-zinc-400 truncate">Engineering Workspace</span>
          </div>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="p-3 border-b border-white/[0.06] flex items-center gap-2">
          <button
            onClick={() => {
              openCreateTask();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium shadow-sm hover:shadow-glow-brand transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
          <button
            onClick={() => {
              openCreateProject();
              onClose();
            }}
            title="Create Project"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase text-zinc-400">
            Workspace
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative',
                  isActive
                    ? 'bg-gradient-to-r from-brand-500/15 via-brand-500/10 to-transparent text-white border border-brand-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'w-4 h-4 transition-colors shrink-0',
                      isActive ? 'text-brand-400' : 'text-zinc-400 group-hover:text-zinc-200'
                    )}
                  />
                  <span className="flex-1 truncate">{item.name}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* User Profile Footer */}
        {user && (
          <div className="p-3 border-t border-white/[0.08] bg-[#0c0d13]">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <Avatar src={user.avatarUrl} name={user.name} size="sm" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0c0d13]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-zinc-200 truncate">{user.name}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 truncate">{user.email}</span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
