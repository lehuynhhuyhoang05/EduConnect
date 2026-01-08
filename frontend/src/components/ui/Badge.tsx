import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const badgeVariants = cva(
  `inline-flex items-center gap-1.5 font-medium
   transition-all duration-200`,
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
        primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
        secondary: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400',
        success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
        warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
        error: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400',
        outline: 'border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300',
        gradient: 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white',
      },
      size: {
        sm: 'h-5 px-2 text-xs rounded-md',
        md: 'h-6 px-2.5 text-xs rounded-lg',
        lg: 'h-7 px-3 text-sm rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, icon, removable, onRemove, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 ml-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-sm p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

// Status Badge với animation
const StatusBadge = React.forwardRef<
  HTMLSpanElement,
  BadgeProps & { pulse?: boolean }
>(({ className, variant, size, pulse = false, children, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        badgeVariants({ variant, size }),
        'inline-flex items-center gap-1.5',
        className
      )}
      {...props}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              variant === 'success' && 'bg-success-500',
              variant === 'warning' && 'bg-warning-500',
              variant === 'error' && 'bg-error-500',
              variant === 'primary' && 'bg-primary-500',
              (!variant || variant === 'default') && 'bg-neutral-500'
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            variant === 'success' && 'bg-success-500',
            variant === 'warning' && 'bg-warning-500',
            variant === 'error' && 'bg-error-500',
            variant === 'primary' && 'bg-primary-500',
            (!variant || variant === 'default') && 'bg-neutral-500'
          )}
        />
      </span>
      {children}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

export { Badge, StatusBadge, badgeVariants };
