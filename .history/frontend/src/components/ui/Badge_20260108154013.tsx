import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/helpers';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
        primary:
          'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400',
        secondary:
          'bg-secondary-100 text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-400',
        success:
          'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
        warning:
          'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
        error:
          'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
        info: 
          'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
        outline:
          'border border-current bg-transparent',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-base',
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
  dot?: boolean;
  dotColor?: string;
}

function Badge({
  className,
  variant,
  size,
  dot,
  dotColor,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'mr-1.5 h-1.5 w-1.5 rounded-full',
            dotColor || 'bg-current'
          )}
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
