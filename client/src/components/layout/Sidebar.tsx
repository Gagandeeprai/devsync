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
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Avatar } from '../ui/Avatar';

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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0d0e14] border-r border-surface-border flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Workspace Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-surface-border gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-accent-cyan flex items-center justify-center text-white shadow-glow-brand ring-1 ring-white/20">
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-100 tracking-tight text-base flex items-center gap-1.5">
              DevSync
              <span className="text-[10px] px-1.5 py-0.2 font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                v2.0
              </span>
            </span>
            <span className="text-xs text-slate-400">Collaboration Hub</span>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="p-3 grid grid-cols-2 gap-2 border-b border-surface-border/60">
          <button
            onClick={() => {
              openCreateTask();
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600/90 hover:bg-brand-600 text-white text-xs font-medium shadow-sm transition-all hover:shadow-glow-brand"
          >
            <Plus className="w-3.5 h-3.5" />
            New Task
          </button>
          <button
            onClick={() => {
              openCreateProject();
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-100 hover:bg-surface-50 text-slate-200 text-xs font-medium border border-surface-border transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Project
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            Navigation
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-100/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="flex-1">{item.name}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* User Profile Footer */}
        {user && (
          <div className="p-3 border-t border-surface-border bg-surface-200/50">
            <div className="flex items-center justify-between p-2 rounded-xl bg-surface-100/60 border border-surface-border/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar src={user.avatarUrl} name={user.name} size="sm" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-slate-200 truncate">{user.name}</span>
                  <span className="text-[10px] text-slate-400 truncate">{user.email}</span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
