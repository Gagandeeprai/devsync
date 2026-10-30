import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/ToastContainer';
import { CreateProjectModal } from '../modals/CreateProjectModal';
import { CreateTaskModal } from '../modals/CreateTaskModal';
import { TaskDetailModal } from '../modals/TaskDetailModal';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageMeta = (pathname: string) => {
    if (pathname === '/') return { title: 'Dashboard', subtitle: 'Platform overview and engineering metrics' };
    if (pathname.startsWith('/projects/')) return { title: 'Project Details', subtitle: 'Manage tasks and milestones' };
    if (pathname === '/projects') return { title: 'My Projects', subtitle: 'Organize repositories and deliverables' };
    if (pathname === '/tasks') return { title: 'My Tasks', subtitle: 'Filter and track assigned engineering issues' };
    if (pathname === '/kanban') return { title: 'Kanban Board', subtitle: 'Interactive drag-and-drop workflow delivery' };
    if (pathname === '/settings') return { title: 'Settings', subtitle: 'User profile and developer environment' };
    return { title: 'DevSync', subtitle: 'Developer Collaboration Platform' };
  };

  const meta = getPageMeta(location.pathname);

  return (
    <div className="min-h-screen bg-background text-slate-100 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          title={meta.title}
          subtitle={meta.subtitle}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <CreateProjectModal />
      <CreateTaskModal />
      <TaskDetailModal />
      <ToastContainer />
    </div>
  );
};
