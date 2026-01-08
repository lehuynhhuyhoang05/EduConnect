import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const inputVariants = cva(
  `w-full transition-all duration-200 ease-out
   placeholder:text-neutral-500
   disabled:opacity-50 disabled:cursor-not-allowed`,
  {
    variants: {
      variant: {
        default: `
          px-4 py-3 rounded-xl
          bg-neutral-100 dark:bg-neutral-800
          border border-transparent
          text-neutral-900 dark:text-neutral-100
          focus:bg-white dark:focus:bg-neutral-900
          focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10
        `,
        outline: `
          px-4 py-3 rounded-xl
          bg-transparent
          border border-neutral-300 dark:border-neutral-700
          text-neutral-900 dark:text-neutral-100
          focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10
        `,
        ghost: `
          px-4 py-3 rounded-xl
          bg-transparent
          border border-transparent
          text-neutral-900 dark:text-neutral-100
          hover:bg-neutral-100 dark:hover:bg-neutral-800
          focus:bg-neutral-100 dark:focus:bg-neutral-800
        `,
      },
      inputSize: {
        sm: 'h-9 text-sm px-3',
        md: 'h-11 text-sm',
        lg: 'h-12 text-base',
      },
      state: {
        default: '',
        error: 'border-error-500 focus:border-error-500 focus:ring-error-500/10',
        success: 'border-success-500 focus:border-success-500 focus:ring-success-500/10',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      inputSize,
      state,
      type,
      label,
      helperText,
      error,
      success,
      leftIcon,
      rightIcon,
      showPasswordToggle,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const currentState = error ? 'error' : success ? 'success' : state;
    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <motion.label
            initial={false}
            animate={{
              color: isFocused ? 'rgb(139, 92, 246)' : 'inherit',
            }}
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {label}
          </motion.label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            className={cn(
              inputVariants({ variant, inputSize, state: currentState, className }),
              leftIcon && 'pl-11',
              (rightIcon || showPasswordToggle || error || success) && 'pr-11'
            )}
            disabled={disabled}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {error && <AlertCircle className="h-4 w-4 text-error-500" />}
            {success && !error && <CheckCircle2 className="h-4 w-4 text-success-500" />}
            
            {showPasswordToggle && type === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}

            {rightIcon && !showPasswordToggle && !error && !success && rightIcon}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {(error || success || helperText) && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={cn(
                'text-xs',
                error && 'text-error-500',
                success && !error && 'text-success-500',
                !error && !success && 'text-neutral-500'
              )}
            >
              {error || success || helperText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
