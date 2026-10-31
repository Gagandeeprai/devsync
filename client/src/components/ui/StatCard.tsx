import React from 'react';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  bg?: string;
  border?: string;
  to?: string;
  description?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  color = 'text-brand-400',
  bg = 'bg-brand-500/10',
  border = 'border-brand-500/20',
  to,
  description,
  className,
}) => {
  const content = (
    <div
      className={cn(
        'p-5 rounded-2xl bg-[#0e0f16]/95 border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between group h-full relative overflow-hidden',
        to && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <div className={cn('p-2 rounded-xl border', bg, border, color)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight font-mono">
          {value}
        </span>
        {to && (
          <span className="text-[11px] text-slate-500 group-hover:text-slate-300 flex items-center gap-1 transition-colors">
            View <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        )}
      </div>

      {description && (
        <p className="mt-2 text-[11px] text-slate-500 line-clamp-1">{description}</p>
      )}
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  return content;
};

