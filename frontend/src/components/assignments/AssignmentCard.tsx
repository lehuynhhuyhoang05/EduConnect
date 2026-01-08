import { useNavigate } from 'react-router-dom';
import { cn, formatDate } from '@/lib/utils';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  TrendingUp,
  ChevronRight,
  Award,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Assignment } from '@/types';

// Color gradient based on class id
const CLASS_COLORS = [
  { gradient: 'from-primary-500 to-primary-600', light: 'bg-primary-100', text: 'text-primary-700' },
  { gradient: 'from-secondary-500 to-secondary-600', light: 'bg-secondary-100', text: 'text-secondary-700' },
  { gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-100', text: 'text-emerald-700' },
  { gradient: 'from-amber-500 to-amber-600', light: 'bg-amber-100', text: 'text-amber-700' },
  { gradient: 'from-rose-500 to-rose-600', light: 'bg-rose-100', text: 'text-rose-700' },
];

const getClassColor = (classId: number | undefined) => {
  if (classId === undefined || classId === null) {
    return CLASS_COLORS[0];
  }
  return CLASS_COLORS[classId % CLASS_COLORS.length];
};

// Determine status based on submission and due date
export const getAssignmentStatus = (assignment: Assignment) => {
  const now = new Date();
  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const submission = assignment.mySubmission;
  
  if (submission) {
    if (submission.status === 'GRADED' || submission.score !== null) {
      return 'graded';
    }
    return 'submitted';
  }
  
  if (dueDate && dueDate < now) {
    return 'overdue';
  }
  
  return 'pending';
};

const statusConfig = {
  graded: { 
    label: 'Đã chấm', 
    variant: 'success' as const, 
    icon: Award,
    borderColor: 'border-l-success-500',
  },
  submitted: { 
    label: 'Đã nộp', 
    variant: 'primary' as const, 
    icon: CheckCircle2,
    borderColor: 'border-l-primary-500',
  },
  overdue: { 
    label: 'Quá hạn', 
    variant: 'error' as const, 
    icon: AlertCircle,
    borderColor: 'border-l-error-500',
  },
  pending: { 
    label: 'Chờ nộp', 
    variant: 'warning' as const, 
    icon: Clock,
    borderColor: 'border-l-warning-500',
  },
};

interface AssignmentCardProps {
  assignment: Assignment;
  isTeacher: boolean;
  onClick?: () => void;
  showClass?: boolean;
}

const AssignmentCard = ({ 
  assignment, 
  isTeacher, 
  onClick,
  showClass = true,
}: AssignmentCardProps) => {
  const navigate = useNavigate();
  const status = getAssignmentStatus(assignment);
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const classColor = getClassColor(assignment.classId);
  const deadline = assignment.dueDate;

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!deadline) return null;
    const now = new Date();
    const due = new Date(deadline);
    const diff = due.getTime() - now.getTime();
    
    if (diff < 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} ngày ${hours}h còn lại`;
    if (hours > 0) return `${hours} giờ còn lại`;
    return 'Sắp hết hạn';
  };

  const timeRemaining = status === 'pending' ? getTimeRemaining() : null;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/assignments/${assignment.id}`);
    }
  };

  return (
    <Card 
      variant="elevated" 
      className={cn(
        "group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]",
        "border-l-4",
        config.borderColor
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Class Icon */}
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            `bg-gradient-to-br ${classColor.gradient}`
          )}>
            <BookOpen className="h-6 w-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 transition-colors truncate">
                {assignment.title}
              </h3>
              <Badge variant={config.variant} size="sm" className="shrink-0">
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            </div>

            {showClass && (
              <p className={cn("text-sm mb-2 truncate", classColor.text)}>
                {assignment.class?.name || `Lớp #${assignment.classId}`}
              </p>
            )}

            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span className={cn(status === 'overdue' && 'text-error-600 font-medium')}>
                  {deadline ? formatDate(new Date(deadline)) : 'Không có hạn'}
                </span>
              </div>
              
              {timeRemaining && (
                <div className="flex items-center gap-1.5 text-warning-600">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{timeRemaining}</span>
                </div>
              )}
              
              {assignment.maxScore && (
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  {assignment.maxScore} điểm
                </div>
              )}
              
              {isTeacher && assignment._count?.submissions !== undefined && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {assignment._count.submissions} đã nộp
                </div>
              )}
            </div>
          </div>

          {/* Submission Info / Score */}
          {assignment.mySubmission && (
            <div className="hidden md:flex flex-col items-end">
              {assignment.mySubmission.score !== null ? (
                <>
                  <p className="text-lg font-bold text-success-600">
                    {assignment.mySubmission.score}/{assignment.maxScore}
                  </p>
                  <p className="text-xs text-neutral-500">Điểm số</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-primary-600">Đã nộp</p>
                  <p className="text-xs text-neutral-500">
                    {formatDate(new Date(assignment.mySubmission.submittedAt))}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Teacher: Show grading progress */}
          {isTeacher && (
            <div className="hidden md:flex flex-col items-end">
              <p className="text-lg font-bold text-primary-600">
                {assignment._count?.submissions || 0}
              </p>
              <p className="text-xs text-neutral-500">bài nộp</p>
            </div>
          )}

          {/* Arrow */}
          <ChevronRight className="h-5 w-5 text-neutral-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignmentCard;
