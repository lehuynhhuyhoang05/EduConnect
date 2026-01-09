import { cn } from '@/lib/utils';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
}: BadgeProps) {
  const variants = {
    default: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300',
    primary: 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400',
    success: 'bg-success-50 dark:bg-success-500/20 text-success-700 dark:text-success-400',
    warning: 'bg-warning-50 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400',
    error: 'bg-error-50 dark:bg-error-500/20 text-error-700 dark:text-error-400',
    outline:
      'border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
