import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/helpers';

const textareaVariants = cva(
  'flex w-full rounded-xl border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm transition-all duration-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
  {
    variants: {
      variant: {
        default: 'border-neutral-300 dark:border-neutral-700 focus:border-primary-500 focus:ring-primary-500',
        error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
        success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
      },
      size: {
        sm: 'min-h-[80px] px-3 py-2 text-sm',
        md: 'min-h-[120px] px-4 py-3 text-sm',
        lg: 'min-h-[160px] px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  label?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  showCount?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant,
      size,
      label,
      error,
      hint,
      maxLength,
      showCount = false,
      value,
      ...props
    },
    ref
  ) => {
    const currentLength = String(value || '').length;
    const hasError = !!error;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          className={cn(
            textareaVariants({
              variant: hasError ? 'error' : variant,
              size,
              className,
            })
          )}
          ref={ref}
          value={value}
          maxLength={maxLength}
          {...props}
        />
        <div className="flex items-center justify-between gap-2">
          {(error || hint) && (
            <p
              className={cn(
                'text-sm',
                error ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'
              )}
            >
              {error || hint}
            </p>
          )}
          {showCount && maxLength && (
            <span
              className={cn(
                'text-xs ml-auto',
                currentLength >= maxLength
                  ? 'text-red-500'
                  : 'text-neutral-500 dark:text-neutral-400'
              )}
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
