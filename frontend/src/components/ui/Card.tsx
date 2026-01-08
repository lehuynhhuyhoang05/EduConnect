import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const cardVariants = cva(
  'rounded-2xl transition-all duration-300',
  {
    variants: {
      variant: {
        default: `
          bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-800
        `,
        elevated: `
          bg-white dark:bg-neutral-900
          shadow-soft dark:shadow-dark-soft
        `,
        glass: `
          bg-white/70 dark:bg-neutral-900/70
          backdrop-blur-xl
          border border-white/20 dark:border-neutral-700/50
        `,
        gradient: `
          bg-gradient-to-br from-primary-500/10 via-secondary-500/10 to-primary-500/10
          border border-primary-500/20
        `,
        interactive: `
          bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-800
          hover:border-primary-500/50
          hover:shadow-lg hover:shadow-primary-500/5
          cursor-pointer
        `,
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asLink?: boolean;
  animate?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, asLink, animate = false, children, ...props }, ref) => {
    const animationProps = animate
      ? {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: 20 },
          whileHover: variant === 'interactive' ? { y: -4 } : undefined,
        }
      : {};

    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={cn(cardVariants({ variant, padding, className }))}
          {...animationProps}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, className }))}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

// Card Header
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

// Card Title
const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

// Card Description
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-neutral-600 dark:text-neutral-400', className)}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

// Card Content
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

// Card Footer
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants };
