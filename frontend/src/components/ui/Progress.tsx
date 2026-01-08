import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  max?: number;
  variant?: 'default' | 'gradient' | 'striped';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  label?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

const colorClasses = {
  primary: 'bg-primary-600',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
};

const gradientClasses = {
  primary: 'bg-gradient-to-r from-primary-600 to-secondary-500',
  success: 'bg-gradient-to-r from-success-400 to-success-600',
  warning: 'bg-gradient-to-r from-warning-400 to-warning-600',
  error: 'bg-gradient-to-r from-error-400 to-error-600',
};

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

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
      label,
      color = 'primary',
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div className="w-full space-y-1.5">
        {(label || showValue) && (
          <div className="flex items-center justify-between text-sm">
            {label && (
              <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                {label}
              </span>
            )}
            {showValue && (
              <span className="text-neutral-500 dark:text-neutral-400">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}
        <ProgressPrimitive.Root
          ref={ref}
          className={cn(
            'relative w-full overflow-hidden rounded-full',
            'bg-neutral-200 dark:bg-neutral-800',
            sizeClasses[size],
            className
          )}
          value={value}
          max={max}
          {...props}
        >
          <ProgressPrimitive.Indicator
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              variant === 'gradient' ? gradientClasses[color] : colorClasses[color],
              variant === 'striped' &&
                'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:20px_100%] animate-[shimmer_1s_linear_infinite]'
            )}
            asChild
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </ProgressPrimitive.Indicator>
        </ProgressPrimitive.Root>
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
  showValue?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
  children?: React.ReactNode;
}

const strokeColors = {
  primary: 'stroke-primary-600',
  success: 'stroke-success-500',
  warning: 'stroke-warning-500',
  error: 'stroke-error-500',
};

const CircularProgress = ({
  value = 0,
  max = 100,
  size = 80,
  strokeWidth = 8,
  showValue = true,
  color = 'primary',
  className,
  children,
}: CircularProgressProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          className="stroke-neutral-200 dark:stroke-neutral-700"
          fill="none"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <motion.circle
          className={cn('transition-colors', strokeColors[color])}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showValue && (
          <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {Math.round(percentage)}%
          </span>
        ))}
      </div>
    </div>
  );
};

export { Progress, CircularProgress };
