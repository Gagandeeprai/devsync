export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'CHANGES_REQUESTED' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type UserRole = 'ADMIN' | 'LEAD' | 'DEVELOPER' | 'INTERN' | 'HR';
export type ProjectRole = 'PROJECT_ADMIN' | 'PROJECT_LEAD' | 'SENIOR' | 'DEVELOPER' | 'INTERN';

export interface ProjectMember {
  id: string;
  userId: string;
  role: ProjectRole;
  isOwner?: boolean;
  user: User;
  stats?: {
    assignedTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    pendingReviewTasks: number;
  };
  joinedAt?: string;
}

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
  members?: ProjectMember[];
  currentUserRole?: ProjectRole;
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
  reviewerId?: string | null;
  reviewNotes?: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    status: ProjectStatus;
  };
  assignee?: User | null;
  reviewer?: User | null;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  pullRequests?: Array<{
    id: string;
    pullRequestNumber: number;
    pullRequestTitle: string;
    pullRequestUrl: string;
    pullRequestState: string;
  }>;
}

export interface RepoContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  html_url: string;
  download_url?: string;
}

export interface BranchItem {
  name: string;
  sha?: string;
  isProtected: boolean;
  isDefault: boolean;
  compareUrl?: string;
}

export interface CommitNode {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorAvatar?: string | null;
  date: string;
  parents: string[];
  html_url: string;
  order: number;
}

export interface ContributorItem {
  login: string;
  avatarUrl: string;
  contributions: number;
  html_url: string;
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

