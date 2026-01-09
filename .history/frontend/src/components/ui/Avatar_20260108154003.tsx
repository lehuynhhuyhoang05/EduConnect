import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn, getInitials } from '@/utils/helpers';

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-sm',
        md: 'h-10 w-10 text-base',
        lg: 'h-12 w-12 text-lg',
        xl: 'h-16 w-16 text-xl',
        '2xl': 'h-20 w-20 text-2xl',
        '3xl': 'h-24 w-24 text-3xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, src, alt, fallback, status, ...props }, ref) => {
  const initials = fallback ? getInitials(fallback) : '?';
  
  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        <AvatarPrimitive.Image
          src={src || undefined}
          alt={alt}
          className="aspect-square h-full w-full object-cover"
        />
        <AvatarPrimitive.Fallback
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 font-semibold text-white"
          delayMs={600}
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-neutral-900',
            size === 'xs' && 'h-1.5 w-1.5',
            size === 'sm' && 'h-2 w-2',
            size === 'md' && 'h-2.5 w-2.5',
            size === 'lg' && 'h-3 w-3',
            size === 'xl' && 'h-3.5 w-3.5',
            (size === '2xl' || size === '3xl') && 'h-4 w-4',
            status === 'online' && 'bg-green-500',
            status === 'offline' && 'bg-neutral-400',
            status === 'away' && 'bg-yellow-500',
            status === 'busy' && 'bg-red-500'
          )}
        />
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

// Avatar Group
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: VariantProps<typeof avatarVariants>['size'];
  className?: string;
}

const AvatarGroup = ({ children, max = 4, size = 'md', className }: AvatarGroupProps) => {
  const childArray = React.Children.toArray(children);
  const visibleAvatars = childArray.slice(0, max);
  const remainingCount = childArray.length - max;
  
  return (
    <div className={cn('flex -space-x-3', className)}>
      {visibleAvatars.map((child, index) => (
        <div
          key={index}
          className="ring-2 ring-white dark:ring-neutral-900 rounded-full"
          style={{ zIndex: visibleAvatars.length - index }}
        >
          {React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<AvatarProps>, { size })
            : child}
        </div>
      ))}
      
      {remainingCount > 0 && (
        <div
          className={cn(
            avatarVariants({ size }),
            'flex items-center justify-center bg-neutral-200 dark:bg-neutral-700 font-medium text-neutral-600 dark:text-neutral-300 ring-2 ring-white dark:ring-neutral-900'
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export { Avatar, AvatarGroup, avatarVariants };
