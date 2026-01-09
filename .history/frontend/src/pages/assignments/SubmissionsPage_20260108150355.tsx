import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  TrendingUp,
  Search,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Progress } from '@/components/ui/Progress';
import { assignmentsApi } from '@/services/api';
import type { Submission } from '@/types';

type FilterType = 'all' | 'pending' | 'graded';

export function SubmissionsPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSubmission, setSelectedSubmission] = React.useState<Submission | null>(null);
  const [gradeModalOpen, setGradeModalOpen] = React.useState(false);
  const [score, setScore] = React.useState('');
  const [feedback, setFeedback] = React.useState('');

  // Fetch assignment details
  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => assignmentsApi.getById(assignmentId || ''),
    enabled: !!assignmentId,
  });

  // Fetch submissions
  const { data: submissionsData, isLoading: submissionsLoading } = useQuery({
    queryKey: ['submissions', assignmentId],
    queryFn: () => assignmentsApi.getSubmissions(assignmentId || ''),
    enabled: !!assignmentId,
  });

  const submissions: Submission[] = (submissionsData as { data?: Submission[] })?.data || 
    (Array.isArray(submissionsData) ? submissionsData : []);

  // Grade mutation
  const gradeMutation = useMutation({
    mutationFn: ({ submissionId, data }: { submissionId: string; data: { score: number; feedback?: string } }) =>
      assignmentsApi.gradeSubmission(submissionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', assignmentId] });
      setGradeModalOpen(false);
      setSelectedSubmission(null);
      setScore('');
      setFeedback('');
    },
  });

  // Filter submissions
  const filteredSubmissions = React.useMemo(() => {
    let filtered = submissions;

    // Apply filter
    if (filter === 'pending') {
      filtered = filtered.filter((s: Submission) => s.score === null || s.score === undefined);
    } else if (filter === 'graded') {
      filtered = filtered.filter((s: Submission) => s.score !== null && s.score !== undefined);
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter((s: Submission) =>
        (s.student?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.student?.email || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [submissions, filter, searchQuery]);

  // Stats
  const stats = React.useMemo(() => {
    const total = submissions.length;
    const graded = submissions.filter((s: Submission) => s.score !== null && s.score !== undefined).length;
    const pending = total - graded;
    const avgScore = graded > 0
      ? submissions
          .filter((s: Submission) => s.score !== null && s.score !== undefined)
          .reduce((sum: number, s: Submission) => sum + (s.score || 0), 0) / graded
      : 0;

    return { total, graded, pending, avgScore };
  }, [submissions]);

  const handleGrade = (submission: Submission) => {
    setSelectedSubmission(submission);
    setScore(submission.score?.toString() || '');
    setFeedback(submission.feedback || '');
    setGradeModalOpen(true);
  };

  const submitGrade = () => {
    if (!selectedSubmission || !score) return;

    gradeMutation.mutate({
      submissionId: String(selectedSubmission.id),
      data: {
        score: parseFloat(score),
        feedback: feedback || undefined,
      },
    });
  };

  const isLoading = assignmentLoading || submissionsLoading;

  if (isLoading) {
    return (
      <PageContainer title="Bài nộp" description="Đang tải...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={assignment?.title || 'Bài nộp'}
      description="Quản lý và chấm điểm bài nộp"
    >
      <div className="space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                  <Users className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.total}</p>
                  <p className="text-sm text-neutral-500">Tổng bài nộp</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                  <CheckCircle2 className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.graded}</p>
                  <p className="text-sm text-neutral-500">Đã chấm</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30">
                  <Clock className="h-5 w-5 text-warning-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.pending}</p>
                  <p className="text-sm text-neutral-500">Chờ chấm</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary-100 dark:bg-secondary-900/30">
                  <TrendingUp className="h-5 w-5 text-secondary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{stats.avgScore.toFixed(1)}</p>
                  <p className="text-sm text-neutral-500">Điểm TB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Tiến độ chấm điểm</span>
              <span className="text-sm text-neutral-500">{stats.graded}/{stats.total}</span>
            </div>
            <Progress 
              value={stats.total > 0 ? (stats.graded / stats.total) * 100 : 0} 
              size="md" 
            />
          </CardContent>
        </Card>

        {/* Filters */}
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    placeholder="Tìm theo tên học sinh..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {(['all', 'pending', 'graded'] as FilterType[]).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chờ chấm' : 'Đã chấm'}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submissions List */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-500" />
              Danh sách bài nộp ({filteredSubmissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredSubmissions.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                <FileText className="h-12 w-12 mx-auto text-neutral-300 mb-4" />
                <p>Không có bài nộp nào</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {filteredSubmissions.map((submission: Submission) => (
                  <div
                    key={submission.id}
                    className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <span className="font-semibold text-primary-600">
                            {(submission.student?.name || 'U')[0]}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                            {submission.student?.name || 'Không rõ'}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-neutral-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(submission.submittedAt).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(submission.submittedAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {submission.isLate && (
                              <Badge variant="error" size="sm">Nộp muộn</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {submission.score !== null && submission.score !== undefined ? (
                          <div className="text-right">
                            <p className="text-lg font-bold text-success-600">
                              {submission.score}/{assignment?.maxScore || 100}
                            </p>
                            <p className="text-xs text-neutral-500">Đã chấm</p>
                          </div>
                        ) : (
                          <Badge variant="warning" size="sm">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Chờ chấm
                          </Badge>
                        )}

                        <div className="flex gap-2">
                          {submission.attachments && submission.attachments.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(submission.attachments![0], '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleGrade(submission)}
                          >
                            {submission.score !== null ? 'Sửa điểm' : 'Chấm điểm'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {submission.content && (
                      <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                          {submission.content}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grade Modal */}
        <Modal
          isOpen={gradeModalOpen}
          onClose={() => {
            setGradeModalOpen(false);
            setSelectedSubmission(null);
          }}
          title="Chấm điểm bài nộp"
        >
          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Học sinh</p>
                <p className="font-medium">{selectedSubmission.student?.name}</p>
              </div>

              {selectedSubmission.content && (
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Nội dung bài làm</p>
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg max-h-40 overflow-auto">
                    <p className="text-sm whitespace-pre-wrap">{selectedSubmission.content}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Điểm (tối đa {assignment?.maxScore || 100})
                </label>
                <Input
                  type="number"
                  min="0"
                  max={assignment?.maxScore || 100}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="Nhập điểm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nhận xét</label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Nhập nhận xét cho học sinh..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setGradeModalOpen(false)}>
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={submitGrade}
                  disabled={!score || gradeMutation.isPending}
                >
                  {gradeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    'Lưu điểm'
                  )}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageContainer>
  );
}
