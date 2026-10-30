import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'p-12 text-center rounded-2xl bg-[#12131a] border border-surface-border flex flex-col items-center justify-center',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-surface-200 border border-surface-border flex items-center justify-center text-slate-500 mb-3 shadow-inner">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-slate-200">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-sm leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

