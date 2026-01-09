import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/utils/helpers';

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  animated?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(
  (
    {
      className,
      value = 0,
      max = 100,
      variant = 'default',
      size = 'md',
      showValue = false,
      animated = true,
      ...props
    },
    ref
  ) => {
    const percentage = Math.round((value / max) * 100);

    return (
      <div className="w-full">
        <ProgressPrimitive.Root
          ref={ref}
          className={cn(
            'relative w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700',
            size === 'sm' && 'h-1.5',
            size === 'md' && 'h-2.5',
            size === 'lg' && 'h-4',
            className
          )}
          value={value}
          max={max}
          {...props}
        >
          <ProgressPrimitive.Indicator
            className={cn(
              'h-full w-full flex-1 rounded-full transition-all duration-500 ease-out',
              variant === 'default' && 'bg-primary-500',
              variant === 'success' && 'bg-green-500',
              variant === 'warning' && 'bg-amber-500',
              variant === 'error' && 'bg-red-500',
              animated && 'animate-pulse'
            )}
            style={{ transform: `translateX(-${100 - percentage}%)` }}
          />
        </ProgressPrimitive.Root>
        {showValue && (
          <span className="mt-1 block text-right text-xs text-neutral-500 dark:text-neutral-400">
            {percentage}%
          </span>
        )}
      </div>
    );
  }
);
Progress.displayName = ProgressPrimitive.Root.displayName;

// Circular Progress
interface CircularProgressProps {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  showValue?: boolean;
  className?: string;
}

function CircularProgress({
  value = 0,
  max = 100,
  size = 64,
  strokeWidth = 6,
  variant = 'default',
  showValue = true,
  className,
}: CircularProgressProps) {
  const percentage = Math.round((value / max) * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex', className)} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-neutral-200 dark:text-neutral-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={cn(
            'transition-all duration-500 ease-out',
            variant === 'default' && 'text-primary-500',
            variant === 'success' && 'text-green-500',
            variant === 'warning' && 'text-amber-500',
            variant === 'error' && 'text-red-500'
          )}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showValue && (
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {percentage}%
        </span>
      )}
    </div>
  );
}

export { Progress, CircularProgress };
