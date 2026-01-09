import * as React from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useUIStore, Toast as ToastType } from '@/store/uiStore';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  error: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  warning: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
  info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
};

const iconStyles = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
};

interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = icons[toast.type];

  React.useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full max-w-md p-4 rounded-xl border shadow-lg backdrop-blur-sm animate-in slide-in-from-right-full fade-in-0 duration-300',
        toastStyles[toast.type]
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconStyles[toast.type])} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-semibold text-sm">{toast.title}</p>
        )}
        {toast.message && (
          <p className="text-sm opacity-90 mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>,
    document.body
  );
}

// Hook to use toast
function useToast() {
  const { addToast, removeToast } = useUIStore();

  const toast = React.useCallback(
    (options: Omit<ToastType, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      addToast({ ...options, id, duration: options.duration ?? 5000 });
      return id;
    },
    [addToast]
  );

  return {
    toast,
    success: (message: string, title?: string) =>
      toast({ type: 'success', message, title }),
    error: (message: string, title?: string) =>
      toast({ type: 'error', message, title }),
    warning: (message: string, title?: string) =>
      toast({ type: 'warning', message, title }),
    info: (message: string, title?: string) =>
      toast({ type: 'info', message, title }),
    dismiss: removeToast,
  };
}

export { ToastContainer, useToast };
