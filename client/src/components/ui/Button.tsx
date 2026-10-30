import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none';

    const variants = {
      default:
        'bg-brand-600 text-white shadow-sm hover:bg-brand-500 active:scale-[0.98] hover:shadow-glow-brand',
      secondary:
        'bg-surface-100 text-slate-200 border border-surface-border hover:bg-surface-50 hover:text-white hover:border-surface-borderHover active:scale-[0.98]',
      outline:
        'bg-transparent border border-surface-border text-slate-300 hover:bg-surface-100 hover:text-white hover:border-slate-600 active:scale-[0.98]',
      ghost:
        'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-surface-100/70',
      destructive:
        'bg-rose-600/90 text-white hover:bg-rose-600 shadow-sm hover:shadow-rose-600/20 active:scale-[0.98]',
      link: 'text-brand-400 underline-offset-4 hover:underline p-0 h-auto',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 text-xs sm:text-sm gap-2',
      lg: 'h-11 px-5 text-sm gap-2.5',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
