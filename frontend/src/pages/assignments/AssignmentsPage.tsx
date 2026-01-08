import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  ChevronRight,
  Loader2,
  Filter,
  BookOpen,
  Award,
  TrendingUp,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAssignments } from '@/hooks/useAssignments';
import { useCurrentUser } from '@/hooks/useAuth';
import type { Assignment } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Determine status based on submission and due date
const getAssignmentStatus = (assignment: Assignment) => {
  const now = new Date();
  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const submission = assignment.mySubmission;
  
  if (submission) {
    // Check if graded (has score OR status is GRADED)
    if (
      submission.score !== null && 
      submission.score !== undefined
    ) {
      return 'graded';
    }
    
    // Check if returned for revision
    if (submission.status === 'RETURNED') {
      return 'pending'; // Treat returned as pending
    }
    
    // Otherwise submitted but not graded yet
    return 'submitted';
  }
  
  if (dueDate && dueDate < now) {
    return 'overdue';
  }
  
  return 'pending';
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'graded':
      return { 
        label: 'Đã chấm', 
        variant: 'success' as const, 
        icon: Award,
        bgColor: 'bg-success-50 dark:bg-success-900/20',
        borderColor: 'border-success-200 dark:border-success-800',
      };
    case 'submitted':
      return { 
        label: 'Đã nộp', 
        variant: 'primary' as const, 
        icon: CheckCircle2,
        bgColor: 'bg-primary-50 dark:bg-primary-900/20',
        borderColor: 'border-primary-200 dark:border-primary-800',
      };
    case 'overdue':
      return { 
        label: 'Quá hạn', 
        variant: 'error' as const, 
        icon: AlertCircle,
        bgColor: 'bg-error-50 dark:bg-error-900/20',
        borderColor: 'border-error-200 dark:border-error-800',
      };
    default:
      return { 
        label: 'Chờ nộp', 
        variant: 'warning' as const, 
        icon: Clock,
        bgColor: 'bg-warning-50 dark:bg-warning-900/20',
        borderColor: 'border-warning-200 dark:border-warning-800',
      };
  }
};

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
    return CLASS_COLORS[0]; // Default color
  }
  return CLASS_COLORS[classId % CLASS_COLORS.length];
};

type FilterType = 'all' | 'pending' | 'submitted' | 'graded' | 'overdue';

const AssignmentsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filter, setFilter] = React.useState<FilterType>('all');

  // Fetch data
  const { data: assignmentsData, isLoading, error, refetch } = useAssignments();
  const { data: currentUser } = useCurrentUser();
  
  const isTeacher = currentUser?.role?.toUpperCase() === 'TEACHER';
  const assignments = React.useMemo(() => {
    const rawData = assignmentsData?.data || assignmentsData || [];
    return Array.isArray(rawData) ? rawData : [];
  }, [assignmentsData]);

  // Filter assignments
  const filteredAssignments = React.useMemo(() => {
    return assignments.filter((assignment) => {
      // Search filter
      const matchesSearch = 
        assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (assignment.class?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Status filter
      if (filter === 'all') return true;
      
      const status = getAssignmentStatus(assignment);
      return status === filter;
    });
  }, [assignments, searchQuery, filter]);

  // Stats
  const stats = React.useMemo(() => {
    const total = assignments.length;
    const pending = assignments.filter(a => getAssignmentStatus(a) === 'pending').length;
    const submitted = assignments.filter(a => getAssignmentStatus(a) === 'submitted').length;
    const graded = assignments.filter(a => getAssignmentStatus(a) === 'graded').length;
    const overdue = assignments.filter(a => getAssignmentStatus(a) === 'overdue').length;
    
    return { total, pending, submitted, graded, overdue };
  }, [assignments]);

  // Group assignments by urgency for students
  const urgentAssignments = React.useMemo(() => {
    if (isTeacher) return [];
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return filteredAssignments.filter(a => {
      const status = getAssignmentStatus(a);
      if (status !== 'pending') return false;
      const dueDate = a.dueDate ? new Date(a.dueDate) : null;
      return dueDate && dueDate <= threeDaysLater;
    });
  }, [filteredAssignments, isTeacher]);

  if (isLoading) {
    return (
      <PageContainer title="Bài tập" description="Đang tải...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Bài tập" description="Có lỗi xảy ra">
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="h-12 w-12 text-error-500 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Không thể tải danh sách bài tập
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            {error instanceof Error ? error.message : 'Đã xảy ra lỗi'}
          </p>
          <Button onClick={() => refetch()}>Thử lại</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Bài tập"
      description={isTeacher ? "Quản lý bài tập các lớp học" : "Theo dõi và nộp bài tập của bạn"}
      actions={
        isTeacher ? (
          <Button 
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/assignments/create')}
          >
            Tạo bài tập
          </Button>
        ) : null
      }
    >
      {/* Urgent Warning for Students */}
      {!isTeacher && urgentAssignments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-gradient-to-r from-warning-50 to-amber-50 dark:from-warning-900/20 dark:to-amber-900/20 border border-warning-200 dark:border-warning-800 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-warning-100 dark:bg-warning-900/40 rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-warning-800 dark:text-warning-200">
                {urgentAssignments.length} bài tập sắp đến hạn!
              </h3>
              <p className="text-sm text-warning-600 dark:text-warning-400 mt-1">
                Bạn có {urgentAssignments.length} bài tập cần nộp trong 3 ngày tới
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-warning-300 text-warning-700 hover:bg-warning-100"
              onClick={() => setFilter('pending')}
            >
              Xem ngay
            </Button>
          </div>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {[
          { key: 'all', label: 'Tất cả', value: stats.total, icon: FileText, color: 'text-neutral-600', bg: 'bg-neutral-100' },
          { key: 'pending', label: 'Chờ nộp', value: stats.pending, icon: Clock, color: 'text-warning-600', bg: 'bg-warning-100' },
          { key: 'submitted', label: 'Đã nộp', value: stats.submitted, icon: CheckCircle2, color: 'text-primary-600', bg: 'bg-primary-100' },
          { key: 'graded', label: 'Đã chấm', value: stats.graded, icon: Award, color: 'text-success-600', bg: 'bg-success-100' },
          { key: 'overdue', label: 'Quá hạn', value: stats.overdue, icon: AlertCircle, color: 'text-error-600', bg: 'bg-error-100' },
        ].map((stat) => {
          const Icon = stat.icon;
          const isActive = filter === stat.key;
          return (
            <button
              key={stat.key}
              onClick={() => setFilter(stat.key as FilterType)}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left",
                isActive 
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm" 
                  : "border-transparent bg-white dark:bg-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', stat.bg)}>
                  <Icon className={cn('h-4 w-4', stat.color)} />
                </div>
                <div>
                  <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {stat.value}
                  </p>
                  <p className="text-xs text-neutral-500">{stat.label}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Tìm kiếm theo tên bài tập hoặc lớp..."
            leftIcon={<Search className="h-4 w-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white dark:bg-neutral-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <span className="text-sm text-neutral-500">
            {filteredAssignments.length} / {assignments.length} bài tập
          </span>
        </div>
      </div>

      {/* Assignments List */}
      {filteredAssignments.length > 0 ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {filteredAssignments.map((assignment) => (
            <motion.div key={assignment.id} variants={itemVariants}>
              <AssignmentCard 
                assignment={assignment} 
                isTeacher={isTeacher} 
                onClick={() => navigate(`/assignments/${assignment.id}`)}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <EmptyState 
          searchQuery={searchQuery} 
          filter={filter}
          isTeacher={isTeacher}
          onClearFilter={() => { setFilter('all'); setSearchQuery(''); }}
        />
      )}
    </PageContainer>
  );
};

// Assignment Card Component
interface AssignmentCardProps {
  assignment: Assignment;
  isTeacher: boolean;
  onClick: () => void;
}

const AssignmentCard = ({ assignment, isTeacher, onClick }: AssignmentCardProps) => {
  const status = getAssignmentStatus(assignment);
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;
  const classColor = getClassColor(assignment.classId);
  const deadline = assignment.dueDate;

  // Debug log để kiểm tra data
  React.useEffect(() => {
    if (assignment.mySubmission) {
      console.log('Assignment:', assignment.title, {
        mySubmission: assignment.mySubmission,
        status,
        score: assignment.mySubmission.score,
        submissionStatus: assignment.mySubmission.status,
      });
    }
  }, [assignment, status]);

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

  return (
    <Card 
      variant="elevated" 
      className={cn(
        "group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]",
        "border-l-4",
        status === 'overdue' && "border-l-error-500",
        status === 'pending' && "border-l-warning-500",
        status === 'submitted' && "border-l-primary-500",
        status === 'graded' && "border-l-success-500",
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Class Icon */}
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            `bg-gradient-to-br ${classColor.gradient}`
          )}>
            <BookOpen className="h-6 w-6 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 transition-colors truncate">
                  {assignment.title}
                </h3>
                <p className={cn("text-sm mt-0.5 truncate", classColor.text)}>
                  {assignment.class?.name || `Lớp #${assignment.classId}`}
                </p>
              </div>
              
              {/* Status Badge - Always visible */}
              <Badge 
                variant={statusConfig.variant} 
                size="sm" 
                className={cn(
                  "shrink-0",
                  status === 'graded' && "bg-success-500 text-white border-success-600",
                  status === 'submitted' && "bg-primary-500 text-white border-primary-600",
                  status === 'overdue' && "bg-error-500 text-white border-error-600",
                )}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>

            {/* Submission Score/Info - Mobile visible */}
            {!isTeacher && assignment.mySubmission && (
              <div className="mb-2 p-2 rounded-lg bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-700 border border-neutral-200 dark:border-neutral-600">
                {assignment.mySubmission.score !== null && assignment.mySubmission.score !== undefined ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Điểm số:</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-success-600">{assignment.mySubmission.score}</span>
                      <span className="text-sm text-neutral-400">/ {assignment.maxScore}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Đã nộp lúc:</span>
                    <span className="text-sm font-medium text-primary-600">
                      {formatDate(new Date(assignment.mySubmission.submittedAt))}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Details */}
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
              
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">{assignment.maxScore} điểm</span>
              </div>
              
              {isTeacher && assignment._count?.submissions !== undefined && (
                <div className="flex items-center gap-1.5 text-primary-600 font-medium">
                  <Users className="h-4 w-4" />
                  {assignment._count.submissions} đã nộp
                </div>
              )}
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="h-5 w-5 text-neutral-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all shrink-0 mt-2" />
        </div>
      </CardContent>
    </Card>
  );
};

// Empty State Component
interface EmptyStateProps {
  searchQuery: string;
  filter: FilterType;
  isTeacher: boolean;
  onClearFilter: () => void;
}

const EmptyState = ({ searchQuery, filter, isTeacher, onClearFilter }: EmptyStateProps) => {
  const navigate = useNavigate();
  
  if (searchQuery || filter !== 'all') {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <Search className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Không tìm thấy bài tập
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
          {searchQuery 
            ? `Không có kết quả cho "${searchQuery}"`
            : `Không có bài tập nào với trạng thái này`
          }
        </p>
        <Button variant="outline" onClick={onClearFilter}>
          Xóa bộ lọc
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
        <FileText className="h-10 w-10 text-primary-500" />
      </div>
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
        {isTeacher ? 'Bạn chưa tạo bài tập nào' : 'Bạn chưa có bài tập nào'}
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
        {isTeacher 
          ? 'Tạo bài tập đầu tiên để giao cho học sinh trong lớp của bạn'
          : 'Khi giảng viên tạo bài tập mới, bạn sẽ thấy chúng ở đây'
        }
      </p>
      {isTeacher && (
        <Button onClick={() => navigate('/assignments/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo bài tập đầu tiên
        </Button>
      )}
    </div>
  );
};

export default AssignmentsPage;
