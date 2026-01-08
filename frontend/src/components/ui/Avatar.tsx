import * as React from 'react';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const avatarVariants = cva(
  'relative inline-flex items-center justify-center rounded-full overflow-hidden font-semibold select-none',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-lg',
        '2xl': 'h-20 w-20 text-xl',
        '3xl': 'h-24 w-24 text-2xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string | null;
  alt?: string;
  name?: string;
  showStatus?: boolean;
  status?: 'online' | 'offline' | 'busy' | 'away';
  showRing?: boolean;
}

const statusColors = {
  online: 'bg-success-500',
  offline: 'bg-neutral-400',
  busy: 'bg-error-500',
  away: 'bg-warning-500',
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      size,
      src,
      alt,
      name = '',
      showStatus = false,
      status = 'offline',
      showRing = false,
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false);
    const initials = getInitials(name);
    const gradientColor = getAvatarColor(name);

    const statusSize = {
      xs: 'h-1.5 w-1.5',
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3 w-3',
      xl: 'h-3.5 w-3.5',
      '2xl': 'h-4 w-4',
      '3xl': 'h-5 w-5',
    };

    return (
      <div
        ref={ref}
        className={cn(
          avatarVariants({ size }),
          showRing && 'ring-2 ring-white dark:ring-neutral-900 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900',
          className
        )}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || name}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className={cn(
              'h-full w-full flex items-center justify-center text-white bg-gradient-to-br',
              gradientColor
            )}
          >
            {initials || '?'}
          </div>
        )}

        {showStatus && (
          <span
            className={cn(
              'absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-neutral-900',
              statusColors[status],
              statusSize[size || 'md']
            )}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

// Avatar Group
interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  max?: number;
  size?: VariantProps<typeof avatarVariants>['size'];
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, children, max = 4, size = 'md', ...props }, ref) => {
    const childArray = React.Children.toArray(children);
    const visibleAvatars = childArray.slice(0, max);
    const remainingCount = childArray.length - max;

    return (
      <div ref={ref} className={cn('flex -space-x-3', className)} {...props}>
        {visibleAvatars.map((child, index) => (
          <div key={index} className="relative" style={{ zIndex: max - index }}>
            {React.isValidElement(child)
              ? React.cloneElement(child, { size, showRing: true } as AvatarProps)
              : child}
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div
            className={cn(
              avatarVariants({ size }),
              'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200',
              'ring-2 ring-white dark:ring-neutral-900'
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }
);
AvatarGroup.displayName = 'AvatarGroup';

export { Avatar, AvatarGroup, avatarVariants };
