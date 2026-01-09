import { LucideIcon, Inbox } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="h-16 w-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
}
