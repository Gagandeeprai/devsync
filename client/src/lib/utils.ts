import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { TaskPriority, TaskStatus, ProjectStatus } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return 'No due date';
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return 'Invalid date';
  }
}

export function formatTimeAgo(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'recently';
  }
}

export function isOverdue(dateString?: string | null): boolean {
  if (!dateString) return false;
  try {
    return isPast(new Date(dateString));
  } catch {
    return false;
  }
}

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  LOW: {
    label: 'Low',
    bg: 'bg-slate-800/60',
    text: 'text-slate-300',
    border: 'border-slate-700/60',
    dot: 'bg-slate-400',
  },
  MEDIUM: {
    label: 'Medium',
    bg: 'bg-blue-950/40',
    text: 'text-blue-300',
    border: 'border-blue-800/40',
    dot: 'bg-blue-400',
  },
  HIGH: {
    label: 'High',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-800/40',
    dot: 'bg-amber-400',
  },
  URGENT: {
    label: 'Urgent',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    border: 'border-rose-800/40',
    dot: 'bg-rose-500 animate-pulse',
  },
};

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  BACKLOG: {
    label: 'Backlog',
    bg: 'bg-slate-900/60',
    text: 'text-slate-400',
    border: 'border-slate-800',
  },
  TODO: {
    label: 'Todo',
    bg: 'bg-sky-950/30',
    text: 'text-sky-400',
    border: 'border-sky-800/30',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-amber-950/30',
    text: 'text-amber-400',
    border: 'border-amber-800/30',
  },
  REVIEW: {
    label: 'Review',
    bg: 'bg-purple-950/30',
    text: 'text-purple-400',
    border: 'border-purple-800/30',
  },
  DONE: {
    label: 'Done',
    bg: 'bg-emerald-950/30',
    text: 'text-emerald-400',
    border: 'border-emerald-800/30',
  },
};

export const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  PLANNING: {
    label: 'Planning',
    bg: 'bg-indigo-950/40',
    text: 'text-indigo-300',
    border: 'border-indigo-800/40',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-cyan-950/40',
    text: 'text-cyan-300',
    border: 'border-cyan-800/40',
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    border: 'border-emerald-800/40',
  },
  ON_HOLD: {
    label: 'On Hold',
    bg: 'bg-zinc-800/60',
    text: 'text-zinc-400',
    border: 'border-zinc-700/50',
  },
};

