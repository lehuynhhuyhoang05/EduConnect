import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  TrendingUp,
  Award,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart2,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { useMyClasses } from '@/hooks';
import { assignmentsApi } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import type { Class, Assignment, Submission } from '@/types';

// Color gradient based on class index
const CLASS_COLORS = [
  { gradient: 'from-primary-500 to-primary-600', light: 'bg-primary-100', text: 'text-primary-700' },
  { gradient: 'from-secondary-500 to-secondary-600', light: 'bg-secondary-100', text: 'text-secondary-700' },
  { gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-100', text: 'text-emerald-700' },
  { gradient: 'from-amber-500 to-amber-600', light: 'bg-amber-100', text: 'text-amber-700' },
  { gradient: 'from-rose-500 to-rose-600', light: 'bg-rose-100', text: 'text-rose-700' },
];

const getClassColor = (index: number) => CLASS_COLORS[index % CLASS_COLORS.length];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface GradeEntry {
  assignment: Assignment;
  submission?: Submission;
  score?: number | null;
  maxScore: number;
  status: 'PENDING' | 'SUBMITTED' | 'GRADED';
}

export function GradesPage() {
  const navigate = useNavigate();
  const [selectedClassId, setSelectedClassId] = React.useState<string | null>(null);

  // Fetch user's classes
  const { data: classesData, isLoading: loadingClasses } = useMyClasses();
  const classes = (classesData as { data?: Class[] })?.data || (classesData as Class[]) || [];

  // Fetch grades for selected class
  const { data: gradesData, isLoading: loadingGrades } = useQuery({
    queryKey: ['classGrades', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      try {
        const assignmentsResponse = await assignmentsApi.getByClass(selectedClassId);
        const assignments = assignmentsResponse?.data || assignmentsResponse || [];
        
        // Get submissions for each assignment
        const entries: GradeEntry[] = await Promise.all(
          assignments.map(async (assignment: Assignment) => {
            try {
              const submission = await assignmentsApi.getMySubmission(assignment.id);
              return {
                assignment,
                submission: submission || undefined,
                score: submission?.score ?? null,
                maxScore: assignment.maxScore || 100,
                status: submission?.score != null ? 'GRADED' : submission ? 'SUBMITTED' : 'PENDING',
              };
            } catch {
              return {
                assignment,
                submission: undefined,
                score: null,
                maxScore: assignment.maxScore || 100,
                status: 'PENDING' as const,
              };
            }
          })
        );
        
        return entries;
      } catch {
        return [];
      }
    },
    enabled: !!selectedClassId,
  });

  // Auto-select first class
  React.useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const selectedClass = classes.find((c: Class) => c.id === selectedClassId);
  const selectedClassIndex = classes.findIndex((c: Class) => c.id === selectedClassId);

  if (loadingClasses) {
    return (
      <PageContainer title="Bảng điểm" description="Đang tải...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Bảng điểm"
      description="Xem điểm tất cả bài tập của bạn"
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Class selector sidebar */}
        <div className="lg:col-span-1">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary-500" />
                Lớp học của bạn
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {classes.length === 0 ? (
                <div className="p-4 text-center text-neutral-500">
                  Bạn chưa tham gia lớp nào
                </div>
              ) : (
                <div className="space-y-1">
                  {classes.map((classItem: Class, index: number) => {
                    const color = getClassColor(index);
                    const isSelected = selectedClassId === classItem.id;
                    return (
                      <button
                        key={classItem.id}
                        onClick={() => setSelectedClassId(classItem.id)}
                        className={cn(
                          "w-full p-3 rounded-lg text-left transition-all flex items-center gap-3",
                          isSelected
                            ? "bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-800 border-2 border-transparent"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          `bg-gradient-to-br ${color.gradient}`
                        )}>
                          <GraduationCap className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {classItem.name}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            {classItem.description || classItem.subject || 'Không có mô tả'}
                          </p>
                        </div>
                        {isSelected && (
                          <ChevronRight className="h-4 w-4 text-primary-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grades content */}
        <div className="lg:col-span-3">
          {!selectedClass ? (
            <Card variant="elevated">
              <CardContent className="py-16 text-center">
                <GraduationCap className="h-16 w-16 mx-auto text-neutral-300 mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  Chọn một lớp để xem điểm
                </h3>
                <p className="text-neutral-500">
                  Chọn lớp từ danh sách bên trái để xem bảng điểm
                </p>
              </CardContent>
            </Card>
          ) : loadingGrades ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <GradesContent 
              classItem={selectedClass} 
              classIndex={selectedClassIndex}
              grades={gradesData || []} 
              navigate={navigate}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}

// Grades content component
interface GradesContentProps {
  classItem: Class;
  classIndex: number;
  grades: GradeEntry[];
  navigate: (path: string) => void;
}

const GradesContent = ({ classItem, classIndex, grades, navigate }: GradesContentProps) => {
  const color = getClassColor(classIndex);

  // Calculate stats
  const stats = React.useMemo(() => {
    const total = grades.length;
    const submitted = grades.filter(g => g.status !== 'PENDING').length;
    const graded = grades.filter(g => g.status === 'GRADED').length;
    
    // Calculate weighted average
    let totalScore = 0;
    let maxPossible = 0;
    grades.forEach(g => {
      if (g.score != null) {
        totalScore += g.score;
        maxPossible += g.maxScore;
      }
    });
    
    const average = graded > 0 ? totalScore / graded : 0;
    const percentage = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;

    return { total, submitted, graded, average, percentage };
  }, [grades]);

  // Get letter grade
  const getLetterGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A', color: 'text-success-600 bg-success-100' };
    if (percentage >= 80) return { grade: 'B', color: 'text-primary-600 bg-primary-100' };
    if (percentage >= 70) return { grade: 'C', color: 'text-warning-600 bg-warning-100' };
    if (percentage >= 60) return { grade: 'D', color: 'text-orange-600 bg-orange-100' };
    return { grade: 'F', color: 'text-error-600 bg-error-100' };
  };

  const letterGrade = getLetterGrade(stats.percentage);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Class Header */}
      <motion.div variants={itemVariants}>
        <Card variant="elevated" className="overflow-hidden">
          <div className={cn("h-2", `bg-gradient-to-r ${color.gradient}`)} />
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-xl flex items-center justify-center",
                  `bg-gradient-to-br ${color.gradient}`
                )}>
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {classItem.name}
                  </h2>
                  <p className="text-neutral-500 mt-1">
                    {classItem.description || classItem.subject || 'Không có mô tả'}
                  </p>
                </div>
              </div>

              {/* Overall Grade */}
              <div className="text-right">
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xl",
                  letterGrade.color
                )}>
                  <Award className="h-6 w-6" />
                  {letterGrade.grade}
                </div>
                <p className="text-sm text-neutral-500 mt-1">
                  {stats.percentage.toFixed(1)}% tổng điểm
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 w-fit mx-auto mb-2">
              <BookOpen className="h-6 w-6 text-neutral-600" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {stats.total}
            </p>
            <p className="text-sm text-neutral-500">Tổng bài tập</p>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/30 w-fit mx-auto mb-2">
              <CheckCircle2 className="h-6 w-6 text-primary-600" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {stats.submitted}
            </p>
            <p className="text-sm text-neutral-500">Đã nộp</p>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <div className="p-3 rounded-full bg-success-100 dark:bg-success-900/30 w-fit mx-auto mb-2">
              <Award className="h-6 w-6 text-success-600" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {stats.graded}
            </p>
            <p className="text-sm text-neutral-500">Đã chấm</p>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent className="p-4 text-center">
            <div className="p-3 rounded-full bg-secondary-100 dark:bg-secondary-900/30 w-fit mx-auto mb-2">
              <TrendingUp className="h-6 w-6 text-secondary-600" />
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {stats.average.toFixed(1)}
            </p>
            <p className="text-sm text-neutral-500">Điểm TB</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Progress Bar */}
      <motion.div variants={itemVariants}>
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Tiến độ hoàn thành
              </span>
              <span className="text-sm text-neutral-500">
                {stats.submitted} / {stats.total} bài tập
              </span>
            </div>
            <Progress 
              value={stats.total > 0 ? (stats.submitted / stats.total) * 100 : 0} 
              size="md"
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Assignments List */}
      <motion.div variants={itemVariants}>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary-500" />
              Chi tiết điểm bài tập
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {grades.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                <Clock className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
                <p>Chưa có bài tập nào trong lớp này</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {grades.map((entry) => (
                  <div
                    key={entry.assignment.id}
                    className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/assignments/${entry.assignment.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                          {entry.assignment.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500">
                          {entry.assignment.dueDate && (
                            <span>Hạn: {new Date(entry.assignment.dueDate).toLocaleDateString('vi-VN')}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Status */}
                        {entry.status === 'GRADED' ? (
                          <div className="text-right">
                            <p className="text-lg font-bold text-success-600">
                              {entry.score}/{entry.maxScore}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {((entry.score || 0) / entry.maxScore * 100).toFixed(0)}%
                            </p>
                          </div>
                        ) : entry.status === 'SUBMITTED' ? (
                          <Badge variant="primary" size="sm">
                            <Clock className="h-3 w-3 mr-1" />
                            Chờ chấm
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Chưa nộp
                          </Badge>
                        )}

                        <ChevronRight className="h-5 w-5 text-neutral-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default GradesPage;
