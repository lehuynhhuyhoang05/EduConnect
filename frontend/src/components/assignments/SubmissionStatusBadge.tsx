import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertCircle, Award, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { SubmissionStatus } from '@/types';

interface SubmissionStatusBadgeProps {
  status: SubmissionStatus | 'PENDING' | 'OVERDUE';
  isLate?: boolean;
  className?: string;
}

const statusConfig: Record<string, { 
  label: string; 
  variant: 'success' | 'primary' | 'error' | 'warning' | 'default';
  icon: React.ElementType;
}> = {
  GRADED: { label: 'Đã chấm', variant: 'success', icon: Award },
  SUBMITTED: { label: 'Đã nộp', variant: 'primary', icon: CheckCircle2 },
  RETURNED: { label: 'Trả lại', variant: 'warning', icon: AlertCircle },
  PENDING: { label: 'Chờ nộp', variant: 'default', icon: Clock },
  OVERDUE: { label: 'Quá hạn', variant: 'error', icon: AlertCircle },
  LATE: { label: 'Nộp muộn', variant: 'warning', icon: Clock },
};

const SubmissionStatusBadge = ({ status, isLate, className }: SubmissionStatusBadgeProps) => {
  // If submitted late but not overdue, show late badge
  const displayStatus = isLate && status === 'SUBMITTED' ? 'LATE' : status;
  const config = statusConfig[displayStatus] || statusConfig.PENDING;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export default SubmissionStatusBadge;
