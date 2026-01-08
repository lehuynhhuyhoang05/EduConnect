import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'rounded';
  animation?: 'pulse' | 'shimmer' | 'none';
  width?: string | number;
  height?: string | number;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = 'default',
      animation = 'shimmer',
      width,
      height,
      style,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: 'rounded-lg',
      circular: 'rounded-full',
      rounded: 'rounded-xl',
    };

    const animationClasses = {
      pulse: 'animate-pulse',
      shimmer: 'skeleton',
      none: '',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-neutral-200 dark:bg-neutral-800',
          variantClasses[variant],
          animationClasses[animation],
          className
        )}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...style,
        }}
        {...props}
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';

// Pre-built skeleton components for common use cases
const SkeletonText = ({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height={12}
        className="w-full"
        style={{
          width: i === lines - 1 ? '75%' : '100%',
        }}
      />
    ))}
  </div>
);

const SkeletonAvatar = ({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) => {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  return (
    <Skeleton
      variant="circular"
      width={sizes[size]}
      height={sizes[size]}
      className={className}
    />
  );
};

const SkeletonCard = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-4',
      className
    )}
  >
    <div className="flex items-center gap-3">
      <SkeletonAvatar size="md" />
      <div className="flex-1 space-y-2">
        <Skeleton height={14} className="w-1/2" />
        <Skeleton height={12} className="w-1/3" />
      </div>
    </div>
    <SkeletonText lines={2} />
    <Skeleton height={32} variant="rounded" className="w-1/3" />
  </div>
);

const SkeletonTable = ({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) => (
  <div className={cn('space-y-3', className)}>
    {/* Header */}
    <div className="flex gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} height={14} className="flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} height={12} className="flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// Loading states with motion
const LoadingSpinner = ({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <motion.div
      className={cn(
        'border-2 border-neutral-200 dark:border-neutral-700',
        'border-t-primary-600 rounded-full',
        sizes[size],
        className
      )}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
};

const LoadingDots = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-primary-600"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
};

// Page loading overlay
const LoadingOverlay = ({
  isLoading,
  message = 'Đang tải...',
}: {
  isLoading: boolean;
  message?: string;
}) => {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
      </div>
    </motion.div>
  );
};

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTable,
  LoadingSpinner,
  LoadingDots,
  LoadingOverlay,
};
