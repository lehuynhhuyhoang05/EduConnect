import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/helpers';

const inputVariants = cva(
  'flex w-full rounded-xl border bg-white px-4 py-2.5 text-base transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-900',
  {
    variants: {
      variant: {
        default:
          'border-neutral-200 focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/20 dark:border-neutral-700 dark:focus-visible:border-primary-400',
        error:
          'border-red-500 focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/20',
        success:
          'border-green-500 focus-visible:border-green-500 focus-visible:ring-2 focus-visible:ring-green-500/20',
      },
      inputSize: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-base',
        lg: 'h-12 px-5 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, inputSize, error, leftIcon, rightIcon, ...props }, ref) => {
    const hasError = !!error || variant === 'error';
    
    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {leftIcon}
          </div>
        )}
        <input
          className={cn(
            inputVariants({ variant: hasError ? 'error' : variant, inputSize }),
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
