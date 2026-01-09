import { cn } from '@/utils/helpers';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'text' | 'button';
  width?: string | number;
  height?: string | number;
}

function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-neutral-200 dark:bg-neutral-700',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'h-4 w-full rounded',
        variant === 'button' && 'h-10 w-24 rounded-xl',
        variant === 'default' && 'rounded-xl',
        className
      )}
      style={{
        width: width,
        height: height,
        ...style,
      }}
      {...props}
    />
  );
}

// Preset skeletons for common use cases
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 p-6 bg-white dark:bg-neutral-800 rounded-2xl shadow-soft', className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="w-1/3" />
          <Skeleton variant="text" className="w-1/4 h-3" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" className="w-4/5" />
        <Skeleton variant="text" className="w-3/5" />
      </div>
    </div>
  );
}

function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" className="w-1/3" />
            <Skeleton variant="text" className="w-1/4 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-neutral-200 dark:border-neutral-700">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" className="flex-1 h-5" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonList, SkeletonTable };
