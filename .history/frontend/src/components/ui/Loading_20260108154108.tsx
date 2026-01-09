import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2
      className={cn(
        'animate-spin text-primary-500',
        size === 'sm' && 'h-4 w-4',
        size === 'md' && 'h-6 w-6',
        size === 'lg' && 'h-8 w-8',
        size === 'xl' && 'h-12 w-12',
        className
      )}
    />
  );
}

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

function LoadingScreen({ message, fullScreen = true }: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        fullScreen && 'fixed inset-0 bg-white dark:bg-neutral-900 z-50'
      )}
    >
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-primary-100 dark:border-primary-900" />
        <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
      </div>
      {message && (
        <p className="text-neutral-600 dark:text-neutral-400 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

function LoadingOverlay({ isLoading, message, children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10 rounded-2xl">
          <Spinner size="lg" />
          {message && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export { Spinner, LoadingScreen, LoadingOverlay };
