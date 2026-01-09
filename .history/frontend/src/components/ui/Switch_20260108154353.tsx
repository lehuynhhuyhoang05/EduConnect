import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/utils/helpers';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
    size?: 'sm' | 'md' | 'lg';
  }
>(({ className, size = 'md', ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary-500 data-[state=unchecked]:bg-neutral-200 dark:data-[state=unchecked]:bg-neutral-700',
      size === 'sm' && 'h-5 w-9',
      size === 'md' && 'h-6 w-11',
      size === 'lg' && 'h-7 w-14',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 data-[state=checked]:translate-x-full data-[state=unchecked]:translate-x-0',
        size === 'sm' && 'h-4 w-4 data-[state=checked]:translate-x-4',
        size === 'md' && 'h-5 w-5 data-[state=checked]:translate-x-5',
        size === 'lg' && 'h-6 w-6 data-[state=checked]:translate-x-7'
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

// Switch with label
interface SwitchWithLabelProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SwitchWithLabel = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchWithLabelProps
>(({ label, description, className, id, size = 'md', ...props }, ref) => {
  const switchId = id || React.useId();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="grid gap-0.5">
        <label
          htmlFor={switchId}
          className="text-sm font-medium text-neutral-900 dark:text-neutral-100 cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
      <Switch ref={ref} id={switchId} size={size} {...props} />
    </div>
  );
});
SwitchWithLabel.displayName = 'SwitchWithLabel';

export { Switch, SwitchWithLabel };
