import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const buttonVariants = cva(
  // Base styles
  `inline-flex items-center justify-center gap-2 whitespace-nowrap
   font-medium transition-all duration-200 ease-out
   focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
   disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
   active:scale-[0.98]`,
  {
    variants: {
      variant: {
        primary: `
          bg-primary-600 text-white
          hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-500/25
          focus-visible:ring-primary-500
          dark:bg-primary-500 dark:hover:bg-primary-600
        `,
        secondary: `
          bg-neutral-100 text-neutral-900
          hover:bg-neutral-200
          focus-visible:ring-neutral-500
          dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700
        `,
        outline: `
          bg-transparent border-2 border-primary-600 text-primary-600
          hover:bg-primary-600 hover:text-white
          focus-visible:ring-primary-500
          dark:border-primary-400 dark:text-primary-400
          dark:hover:bg-primary-500 dark:hover:text-white
        `,
        ghost: `
          bg-transparent text-neutral-700
          hover:bg-neutral-100
          focus-visible:ring-neutral-500
          dark:text-neutral-300 dark:hover:bg-neutral-800
        `,
        danger: `
          bg-error-500 text-white
          hover:bg-error-600 hover:shadow-lg hover:shadow-error-500/25
          focus-visible:ring-error-500
        `,
        success: `
          bg-success-500 text-white
          hover:bg-success-600 hover:shadow-lg hover:shadow-success-500/25
          focus-visible:ring-success-500
        `,
        link: `
          bg-transparent text-primary-600 underline-offset-4
          hover:underline
          dark:text-primary-400
        `,
        glass: `
          bg-white/20 backdrop-blur-lg text-white border border-white/30
          hover:bg-white/30
          focus-visible:ring-white
          dark:bg-neutral-900/40 dark:border-neutral-700/50
        `,
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded-lg',
        sm: 'h-8 px-3 text-sm rounded-lg',
        md: 'h-10 px-4 text-sm rounded-xl',
        lg: 'h-11 px-6 text-base rounded-xl',
        xl: 'h-12 px-8 text-base rounded-2xl',
        icon: 'h-10 w-10 rounded-xl',
        'icon-sm': 'h-8 w-8 rounded-lg',
        'icon-lg': 'h-12 w-12 rounded-xl',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={disabled || isLoading}
        {...(props as React.ComponentProps<typeof motion.button>)}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang xử lý...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
