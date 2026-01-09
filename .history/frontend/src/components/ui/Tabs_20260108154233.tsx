import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/utils/helpers';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: 'default' | 'pills' | 'underline';
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1',
      variant === 'default' && 'bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl',
      variant === 'pills' && 'gap-2',
      variant === 'underline' && 'border-b border-neutral-200 dark:border-neutral-700 gap-0',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    variant?: 'default' | 'pills' | 'underline';
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      variant === 'default' &&
        'px-4 py-2 rounded-lg text-neutral-600 dark:text-neutral-400 data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700 data-[state=active]:text-neutral-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm',
      variant === 'pills' &&
        'px-4 py-2 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 data-[state=active]:bg-primary-500 data-[state=active]:text-white',
      variant === 'underline' &&
        'px-4 py-3 rounded-none border-b-2 border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white data-[state=active]:border-primary-500 data-[state=active]:text-primary-600 dark:data-[state=active]:text-primary-400',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 animate-in fade-in-0 slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
