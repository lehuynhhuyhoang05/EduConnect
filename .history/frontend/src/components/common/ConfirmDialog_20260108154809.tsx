import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/helpers';

type ConfirmVariant = 'info' | 'warning' | 'danger' | 'success';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const icons = {
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
  success: CheckCircle,
};

const iconStyles = {
  info: 'bg-blue-100 dark:bg-blue-950 text-blue-500',
  warning: 'bg-amber-100 dark:bg-amber-950 text-amber-500',
  danger: 'bg-red-100 dark:bg-red-950 text-red-500',
  success: 'bg-green-100 dark:bg-green-950 text-green-500',
};

const buttonVariants = {
  info: 'primary' as const,
  warning: 'primary' as const,
  danger: 'danger' as const,
  success: 'success' as const,
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = 'info',
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const Icon = icons[variant];

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
                iconStyles[variant]
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={buttonVariants[variant]}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
