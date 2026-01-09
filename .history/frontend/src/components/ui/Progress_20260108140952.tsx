import { cn } from '@/lib/utils';

export interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient';
  color?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  color = 'primary',
  showLabel = false,
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const colors = {
    primary: variant === 'gradient' 
      ? 'bg-gradient-to-r from-primary-400 to-primary-600' 
      : 'bg-primary-500',
    success: variant === 'gradient' 
      ? 'bg-gradient-to-r from-success-400 to-success-600' 
      : 'bg-success-500',
    warning: variant === 'gradient' 
      ? 'bg-gradient-to-r from-warning-400 to-warning-600' 
      : 'bg-warning-500',
    error: variant === 'gradient' 
      ? 'bg-gradient-to-r from-error-400 to-error-600' 
      : 'bg-error-500',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function CircularProgress({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  color = 'primary',
  showLabel = true,
  className,
  children,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const colors = {
    primary: 'stroke-primary-500',
    success: 'stroke-success-500',
    warning: 'stroke-warning-500',
    error: 'stroke-error-500',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-neutral-200 dark:text-neutral-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-300', colors[color])}
        />
      </svg>
      <div className="absolute">
        {children ? children : (
          showLabel && (
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {Math.round(percentage)}%
            </span>
          )
        )}
      </div>
    </div>
  );
}
