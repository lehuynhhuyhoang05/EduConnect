import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1',
      'h-11 p-1 rounded-xl',
      'bg-neutral-100 dark:bg-neutral-800',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'relative inline-flex items-center justify-center whitespace-nowrap',
      'px-4 py-2 rounded-lg',
      'text-sm font-medium',
      'text-neutral-600 dark:text-neutral-400',
      'transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:text-neutral-900 dark:data-[state=active]:text-neutral-100',
      'data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700',
      'data-[state=active]:shadow-sm',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
      className
    )}
    asChild
    {...props}
  >
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  </TabsPrimitive.Content>
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

// Underline Tabs Variant
const TabsListUnderline = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-6',
      'border-b border-neutral-200 dark:border-neutral-800',
      className
    )}
    {...props}
  />
));
TabsListUnderline.displayName = 'TabsListUnderline';

const TabsTriggerUnderline = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'relative pb-3',
      'text-sm font-medium',
      'text-neutral-600 dark:text-neutral-400',
      'transition-colors duration-200',
      'hover:text-neutral-900 dark:hover:text-neutral-100',
      'focus-visible:outline-none',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:text-primary-600 dark:data-[state=active]:text-primary-400',
      // Animated underline via CSS
      'after:absolute after:left-0 after:bottom-0 after:h-0.5',
      'after:w-full after:scale-x-0 after:bg-primary-600',
      'after:transition-transform after:duration-300',
      'data-[state=active]:after:scale-x-100',
      className
    )}
    {...props}
  />
));
TabsTriggerUnderline.displayName = 'TabsTriggerUnderline';

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsListUnderline,
  TabsTriggerUnderline,
};
