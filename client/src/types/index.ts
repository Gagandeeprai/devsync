export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type UserRole = 'ADMIN' | 'LEAD' | 'DEVELOPER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  deadline?: string | null;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  progress: number;
  tasks?: Task[];
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  order: number;
  projectId: string;
  assigneeId?: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    status: ProjectStatus;
  };
  assignee?: User | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Activity {
  id: string;
  action: string;
  details: string;
  userId: string;
  projectId?: string | null;
  taskId?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    role: UserRole;
  };
  project?: {
    id: string;
    name: string;
  } | null;
  task?: {
    id: string;
    title: string;
    status: TaskStatus;
  } | null;
}

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
  statusDistribution: Record<TaskStatus, number>;
  priorityDistribution: Record<TaskPriority, number>;
  recentActivities: Activity[];
  recentProjects: Project[];
  upcomingTasks: Task[];
}

