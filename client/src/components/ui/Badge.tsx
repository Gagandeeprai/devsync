import React from 'react';
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, PROJECT_STATUS_CONFIG } from '../../lib/utils';
import { TaskPriority, TaskStatus, ProjectStatus } from '../../types';

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  const conf = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIUM;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        conf.bg,
        conf.text,
        conf.border,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', conf.dot)} />
      {conf.label}
    </span>
  );
};

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const conf = STATUS_CONFIG[status] || STATUS_CONFIG.TODO;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        conf.bg,
        conf.text,
        conf.border,
        className
      )}
    >
      {conf.label}
    </span>
  );
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export const ProjectStatusBadge: React.FC<ProjectStatusBadgeProps> = ({ status, className }) => {
  const conf = PROJECT_STATUS_CONFIG[status] || PROJECT_STATUS_CONFIG.PLANNING;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        conf.bg,
        conf.text,
        conf.border,
        className
      )}
    >
      {conf.label}
    </span>
  );
};
