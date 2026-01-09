import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, indeterminate, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-5 w-5 shrink-0 rounded-md border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary-500 data-[state=checked]:border-primary-500 data-[state=checked]:text-white',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn('flex items-center justify-center text-current')}
    >
      {indeterminate ? (
        <Minus className="h-3.5 w-3.5" />
      ) : (
        <Check className="h-3.5 w-3.5" />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

// Checkbox with label
interface CheckboxWithLabelProps extends CheckboxProps {
  label: string;
  description?: string;
}

const CheckboxWithLabel = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxWithLabelProps
>(({ label, description, className, id, ...props }, ref) => {
  const checkboxId = id || React.useId();

  return (
    <div className="flex items-start gap-3">
      <Checkbox ref={ref} id={checkboxId} {...props} />
      <div className="grid gap-0.5 leading-none">
        <label
          htmlFor={checkboxId}
          className="text-sm font-medium text-neutral-900 dark:text-neutral-100 cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
        {description && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
});
CheckboxWithLabel.displayName = 'CheckboxWithLabel';

export { Checkbox, CheckboxWithLabel };
