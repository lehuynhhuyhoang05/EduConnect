import * as React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { cn, formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Loader2,
  Download,
  Eye,
  MessageSquare,
  FileText,
  Award,
  RotateCcw,
  X,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Progress } from '@/components/ui/Progress';
import { 
  useAssignment, 
  useSubmissions, 
  useGradeSubmission, 
  useReturnSubmission,
  useExportGrades,
} from '@/hooks/useAssignments';
import { useCurrentUser } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Submission } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// Build full URL for file
const getFileUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return `${baseUrl.replace('/api', '')}${url}`;
};

const SubmissionsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assignmentId = parseInt(id || '0');

  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'pending' | 'graded'>('all');
  const [selectedSubmission, setSelectedSubmission] = React.useState<Submission | null>(null);
  const [gradeScore, setGradeScore] = React.useState('');
  const [gradeFeedback, setGradeFeedback] = React.useState('');

  // Fetch data
  const { data: assignment, isLoading: loadingAssignment } = useAssignment(assignmentId);
  const { data: submissionsData, isLoading: loadingSubmissions, refetch } = useSubmissions(assignmentId);
  const { data: currentUser } = useCurrentUser();
  
  const gradeMutation = useGradeSubmission();
  const returnMutation = useReturnSubmission();
  const exportMutation = useExportGrades();

  const isTeacher = currentUser?.role?.toUpperCase() === 'TEACHER';

  // Parse submissions from paginated response
  const submissions: Submission[] = React.useMemo(() => {
    if (!submissionsData) return [];
    // Handle paginated response { data: [], meta: {} }
    if ('data' in submissionsData && Array.isArray(submissionsData.data)) {
      return submissionsData.data;
    }
    // Handle array directly
    if (Array.isArray(submissionsData)) {
      return submissionsData;
    }
    return [];
  }, [submissionsData]);

  // Filter submissions
  const filteredSubmissions = React.useMemo(() => {
    return submissions.filter((sub) => {
      const studentName = sub.student?.fullName?.toLowerCase() || '';
      const studentEmail = sub.student?.email?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();
      
      if (query && !studentName.includes(query) && !studentEmail.includes(query)) {
        return false;
      }
      
      // Filter by grading status - use score instead of status
      const isGraded = sub.score !== null && sub.score !== undefined;
      
      if (filterStatus === 'pending') return !isGraded;
      if (filterStatus === 'graded') return isGraded;
      return true;
    });
  }, [submissions, searchQuery, filterStatus]);

  // Stats
  const stats = React.useMemo(() => {
    const total = submissions.length;
    const graded = submissions.filter(s => s.score !== null && s.score !== undefined).length;
    const pending = total - graded;
    const scores = submissions.filter(s => s.score != null).map(s => s.score!);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    return { total, graded, pending, avgScore };
  }, [submissions]);

  // Open grade modal
  const handleOpenGrade = (sub: Submission) => {
    setSelectedSubmission(sub);
    setGradeScore(sub.score != null ? String(sub.score) : '');
    setGradeFeedback(sub.feedback || '');
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedSubmission(null);
    setGradeScore('');
    setGradeFeedback('');
  };

  // Submit grade
  const handleGrade = async () => {
    if (!selectedSubmission) return;
    const maxScore = assignment?.maxScore || 100;
    const scoreNum = parseFloat(gradeScore);
    
    if (isNaN(scoreNum) || gradeScore === '') {
      toast.error('Vui lòng nhập điểm');
      return;
    }
    
    if (scoreNum < 0 || scoreNum > maxScore) {
      toast.error(`Điểm phải từ 0 đến ${maxScore}`);
      return;
    }

    try {
      await gradeMutation.mutateAsync({
        submissionId: selectedSubmission.id,
        data: { score: scoreNum, feedback: gradeFeedback },
      });
      toast.success('Đã chấm điểm thành công!');
      handleCloseModal();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể chấm điểm');
    }
  };

  // Return submission
  const handleReturn = async () => {
    if (!selectedSubmission) return;
    
    if (!gradeFeedback.trim()) {
      toast.error('Vui lòng nhập lý do trả lại');
      return;
    }
    
    try {
      await returnMutation.mutateAsync({
        submissionId: selectedSubmission.id,
        feedback: gradeFeedback,
      });
      toast.success('Đã trả lại bài');
      handleCloseModal();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể trả bài');
    }
  };

  // Export grades
  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync(assignmentId);
      toast.success('Đã tải xuống file điểm');
    } catch {
      toast.error('Không thể xuất file điểm');
    }
  };

  // Redirect if not teacher
  React.useEffect(() => {
    if (currentUser && !isTeacher) {
      navigate(`/assignments/${assignmentId}`);
    }
  }, [currentUser, isTeacher, assignmentId, navigate]);

  if (loadingAssignment || loadingSubmissions) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </PageContainer>
    );
  }

  if (!assignment) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-error-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Không tìm thấy bài tập</h3>
          <Button onClick={() => navigate('/assignments')}>Quay lại</Button>
        </div>
      </PageContainer>
    );
  }

  const maxScore = assignment.maxScore || 100;
  const progressPercent = stats.total > 0 ? (stats.graded / stats.total) * 100 : 0;

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-6">
        <Link to={`/assignments/${assignmentId}`} className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-4">
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại bài tập</span>
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Chấm điểm: {assignment.title}
            </h1>
            <p className="text-neutral-500 mt-1">
              {assignment.class?.name} • {stats.graded}/{stats.total} đã chấm
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exportMutation.isPending}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Xuất Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-neutral-500">Tổng bài nộp</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30">
              <Clock className="h-5 w-5 text-warning-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-neutral-500">Chờ chấm</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
              <CheckCircle2 className="h-5 w-5 text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.graded}</p>
              <p className="text-sm text-neutral-500">Đã chấm</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary-100 dark:bg-secondary-900/30">
              <Award className="h-5 w-5 text-secondary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.avgScore.toFixed(1)}</p>
              <p className="text-sm text-neutral-500">Điểm TB/{maxScore}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">Tiến độ chấm điểm</span>
          <span className="text-sm font-medium">{progressPercent.toFixed(0)}%</span>
        </div>
        <Progress value={progressPercent} size="sm" />
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Tìm học sinh theo tên hoặc email..."
            leftIcon={<Search className="h-4 w-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            Tất cả
          </Button>
          <Button
            variant={filterStatus === 'pending' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('pending')}
            className={filterStatus === 'pending' ? 'bg-warning-500 hover:bg-warning-600 text-white' : ''}
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Chờ chấm
          </Button>
          <Button
            variant={filterStatus === 'graded' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('graded')}
            className={filterStatus === 'graded' ? 'bg-success-500 hover:bg-success-600 text-white' : ''}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Đã chấm
          </Button>
        </div>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Danh sách bài nộp ({filteredSubmissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length > 0 ? (
            <motion.div 
              className="divide-y divide-neutral-200 dark:divide-neutral-700"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredSubmissions.map((sub) => (
                <motion.div
                  key={sub.id}
                  variants={itemVariants}
                  className="py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    {/* Student Info */}
                    <Avatar 
                      src={sub.student?.avatarUrl}
                      name={sub.student?.fullName || 'Student'} 
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {sub.student?.fullName || 'Học sinh'}
                        </span>
                        {sub.isLate && (
                          <Badge variant="warning" size="sm">Nộp muộn</Badge>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500">
                        {sub.student?.email} • Nộp lúc {formatDate(new Date(sub.submittedAt))}
                      </p>
                    </div>

                    {/* File Download */}
                    {sub.fileUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(getFileUrl(sub.fileUrl!), '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Tải file
                      </Button>
                    )}

                    {/* Score/Status */}
                    <div className="text-right min-w-[80px]">
                      {sub.score !== null && sub.score !== undefined ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-xl font-bold text-success-600">{sub.score}</span>
                          <span className="text-sm text-neutral-400">/{maxScore}</span>
                        </div>
                      ) : sub.status === 'RETURNED' ? (
                        <Badge variant="warning">
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Trả lại
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Chờ chấm
                        </Badge>
                      )}
                    </div>

                    {/* Grade Button */}
                    <Button
                      variant={(sub.score !== null && sub.score !== undefined) ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => handleOpenGrade(sub)}
                    >
                      {(sub.score !== null && sub.score !== undefined) ? 'Sửa điểm' : 'Chấm điểm'}
                    </Button>
                  </div>

                  {/* Content preview */}
                  {sub.content && (
                    <div className="mt-3 ml-14 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 text-sm text-neutral-600 dark:text-neutral-400">
                      <MessageSquare className="h-4 w-4 inline mr-2" />
                      {sub.content.length > 200 ? sub.content.slice(0, 200) + '...' : sub.content}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                {searchQuery ? 'Không tìm thấy học sinh' : 'Chưa có bài nộp'}
              </h3>
              <p className="text-sm text-neutral-500">
                {searchQuery ? 'Thử tìm với từ khóa khác' : 'Học sinh chưa nộp bài tập này'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg mx-4 bg-white dark:bg-neutral-800 rounded-xl shadow-xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <Avatar 
                  src={selectedSubmission.student?.avatarUrl}
                  name={selectedSubmission.student?.fullName || 'Student'} 
                  size="sm"
                />
                <div>
                  <h3 className="font-semibold">{selectedSubmission.student?.fullName}</h3>
                  <p className="text-sm text-neutral-500">{selectedSubmission.student?.email}</p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* File */}
              {selectedSubmission.fileUrl && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="flex-1 text-sm">File bài nộp</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(getFileUrl(selectedSubmission.fileUrl!), '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Xem
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = getFileUrl(selectedSubmission.fileUrl!);
                      link.download = '';
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Tải
                  </Button>
                </div>
              )}

              {/* Content */}
              {selectedSubmission.content && (
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm font-medium text-neutral-500 mb-2">Nội dung bài nộp:</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedSubmission.content}</p>
                </div>
              )}

              {/* Score Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Điểm số (tối đa {maxScore})
                </label>
                <div className="flex gap-2 mb-2">
                  {[10, 9, 8, 7, 6, 5].map((score) => (
                    <button
                      key={score}
                      onClick={() => setGradeScore(String(score))}
                      className={cn(
                        "w-10 h-10 rounded-lg font-semibold transition-colors",
                        gradeScore === String(score)
                          ? "bg-primary-500 text-white"
                          : "bg-neutral-100 dark:bg-neutral-700 hover:bg-primary-100 dark:hover:bg-primary-900/30"
                      )}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  placeholder="Hoặc nhập điểm..."
                  value={gradeScore}
                  onChange={(e) => setGradeScore(e.target.value)}
                  min={0}
                  max={maxScore}
                  step={0.5}
                />
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-medium mb-2">Nhận xét</label>
                <textarea
                  placeholder="Viết nhận xét cho học sinh..."
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t border-neutral-200 dark:border-neutral-700">
              {(selectedSubmission.score !== null && selectedSubmission.score !== undefined) && (
                <Button
                  variant="outline"
                  onClick={handleReturn}
                  disabled={returnMutation.isPending}
                  className="text-warning-600"
                >
                  {returnMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Trả lại
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleGrade}
                disabled={gradeMutation.isPending}
                className="flex-1"
              >
                {gradeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {(selectedSubmission.score !== null && selectedSubmission.score !== undefined) ? 'Cập nhật điểm' : 'Chấm điểm'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </PageContainer>
  );
};

export default SubmissionsPage;
