import * as React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { cn, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Download,
  Send,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Award,
  Users,
  File,
  Loader2,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/Dropdown';
import { useAssignment, useSubmitAssignment, useDeleteAssignment, useUpdateAssignment } from '@/hooks/useAssignments';
import { useCurrentUser } from '@/hooks/useAuth';
import { filesApi } from '@/services/api';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { FileUploadZone, SubmissionStatusBadge } from '@/components/assignments';

const AssignmentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assignmentId = parseInt(id || '0');
  
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState({ title: '', description: '', dueDate: '', maxScore: 100 });

  // Fetch data from API
  const { data: assignment, isLoading, error, refetch } = useAssignment(assignmentId);
  const { data: currentUser } = useCurrentUser();
  const submitMutation = useSubmitAssignment();
  const deleteAssignmentMutation = useDeleteAssignment();
  const updateAssignmentMutation = useUpdateAssignment();

  const isTeacher = currentUser?.role?.toUpperCase() === 'TEACHER';
  const mySubmission = assignment?.mySubmission;
  const deadline = assignment?.dueDate;
  const isOverdue = deadline && new Date(deadline) < new Date();

  // Build full URL for file if it's a relative path
  const getFileUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Relative path - prepend API base URL
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${baseUrl.replace('/api', '')}${url}`;
  };

  const handleDeleteAssignment = async () => {
    if (confirm('Bạn có chắc muốn xóa bài tập này? Hành động này không thể hoàn tác.')) {
      try {
        await deleteAssignmentMutation.mutateAsync(assignmentId);
        toast.success('Đã xóa bài tập');
        navigate('/assignments');
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Không thể xóa bài tập');
      }
    }
  };

  const handleOpenEditModal = () => {
    if (!assignment) return;
    setEditForm({
      title: assignment.title,
      description: assignment.description || '',
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : '',
      maxScore: assignment.maxScore || 100,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAssignment = async () => {
    if (!editForm.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề');
      return;
    }
    if (!editForm.dueDate) {
      toast.error('Vui lòng chọn hạn nộp');
      return;
    }
    try {
      await updateAssignmentMutation.mutateAsync({
        id: assignmentId,
        data: {
          title: editForm.title,
          description: editForm.description || undefined,
          dueDate: new Date(editForm.dueDate).toISOString(),
          maxScore: editForm.maxScore,
        },
      });
      toast.success('Cập nhật bài tập thành công!');
      setIsEditModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể cập nhật bài tập');
    }
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Vui lòng chọn file để nộp');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload files first
      let fileUrl = '';
      if (selectedFiles.length === 1) {
        const uploaded = await filesApi.upload(selectedFiles[0], (progress) => {
          setUploadProgress(progress * 0.8); // 80% for upload
        });
        fileUrl = uploaded.url;
      } else {
        const uploaded = await filesApi.uploadMultiple(selectedFiles, (progress) => {
          setUploadProgress(progress * 0.8);
        });
        fileUrl = uploaded.map(f => f.url).join(',');
      }

      setUploadProgress(90);

      // Submit with fileUrl
      await submitMutation.mutateAsync({
        assignmentId,
        data: { 
          fileUrl,
          content: `Đã nộp ${selectedFiles.length} file: ${selectedFiles.map(f => f.name).join(', ')}`,
        },
      });

      setUploadProgress(100);
      toast.success('Nộp bài thành công!');
      setSelectedFiles([]);
      refetch();
    } catch (err: any) {
      console.error('Submit error:', err);
      toast.error(err?.response?.data?.message || 'Không thể nộp bài');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Bài tập" description="Đang tải...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </PageContainer>
    );
  }

  if (error || !assignment) {
    return (
      <PageContainer title="Bài tập" description="Có lỗi xảy ra">
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="h-12 w-12 text-error-500 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Không thể tải bài tập
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            {error instanceof Error ? error.message : 'Bài tập không tồn tại'}
          </p>
          <Button onClick={() => navigate('/assignments')}>Quay lại</Button>
        </div>
      </PageContainer>
    );
  }

  const timeLeft = deadline ? new Date(deadline).getTime() - Date.now() : 0;
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

  return (
    <PageContainer
      title=""
      description=""
      breadcrumbs={[
        { label: 'Bài tập', href: '/assignments' },
        { label: assignment.title },
      ]}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link to="/assignments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {assignment.title}
            </h1>
            {!isTeacher && (
              <SubmissionStatusBadge 
                status={isOverdue && !mySubmission ? 'OVERDUE' : (mySubmission?.status || 'PENDING')}
              />
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <Link 
              to={`/classes/${assignment.classId}`}
              className="hover:text-primary-600 transition-colors"
            >
              {assignment.class?.name || `Lớp #${assignment.classId}`}
            </Link>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span className={cn(daysLeft < 0 && 'text-error-600')}>
                {deadline ? formatDate(new Date(deadline)) : 'Không có hạn'}
                {daysLeft > 0 && ` (còn ${daysLeft} ngày)`}
                {daysLeft < 0 && ` (quá hạn ${Math.abs(daysLeft)} ngày)`}
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Award className="h-4 w-4" />
              {assignment.maxScore} điểm
            </div>
          </div>
        </div>

        {isTeacher && (
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => navigate(`/assignments/${assignmentId}/submissions`)}
            >
              <Users className="h-4 w-4 mr-2" />
              Quản lý bài nộp
              {assignment._count?.submissions ? (
                <Badge variant="secondary" className="ml-2">
                  {assignment._count.submissions}
                </Badge>
              ) : null}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleOpenEditModal}>
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-error-600"
                  onClick={handleDeleteAssignment}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa bài tập
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assignment Description */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Yêu cầu bài tập
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose dark:prose-invert max-w-none">
                {assignment.description ? (
                  <div className="whitespace-pre-wrap">{assignment.description}</div>
                ) : (
                  <p className="text-neutral-500 italic">Không có mô tả</p>
                )}
              </div>

              {/* Attachment */}
              {assignment.attachmentUrl && (
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    File đính kèm
                  </h3>
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    onClick={() => window.open(assignment.attachmentUrl, '_blank')}
                  >
                    <div className="p-2 rounded-lg bg-white dark:bg-neutral-900">
                      <File className="h-5 w-5 text-neutral-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        Tải file đính kèm
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student: My Submission Status */}
          {!isTeacher && mySubmission && (
            <Card variant="elevated" className="border-l-4 border-l-success-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Bài nộp của bạn
                </CardTitle>
                <CardDescription>
                  Nộp lúc {formatDate(new Date(mySubmission.submittedAt))}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Score */}
                {mySubmission.score !== null && mySubmission.score !== undefined && (
                  <div className="p-4 rounded-xl bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800">
                    <div className="flex items-center justify-between">
                      <span className="text-success-700 dark:text-success-400 font-medium">
                        Điểm số
                      </span>
                      <span className="text-3xl font-bold text-success-600">
                        {mySubmission.score}
                        <span className="text-lg text-success-500">/{assignment.maxScore}</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {mySubmission.feedback && (
                  <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                    <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                      Nhận xét của giảng viên
                    </h4>
                    <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                      {mySubmission.feedback}
                    </p>
                  </div>
                )}

                {/* Submitted file */}
                {mySubmission.fileUrl && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                    <File className="h-5 w-5 text-primary-600" />
                    <span className="flex-1 text-sm text-primary-700 dark:text-primary-400">
                      File đã nộp
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(getFileUrl(mySubmission.fileUrl!), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Xem
                    </Button>
                  </div>
                )}

                {/* Status: Returned - allow resubmit */}
                {mySubmission.status === 'RETURNED' && (
                  <div className="p-4 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
                    <p className="text-warning-700 dark:text-warning-400 font-medium mb-2">
                      Bài của bạn đã được trả lại để sửa
                    </p>
                    <p className="text-sm text-warning-600 dark:text-warning-500">
                      Vui lòng xem nhận xét và nộp lại bài
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Student: Submit Form (show if no submission or returned) */}
          {!isTeacher && (!mySubmission || mySubmission.status === 'RETURNED') && (
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  {mySubmission ? 'Nộp lại bài' : 'Nộp bài'}
                </CardTitle>
                <CardDescription>
                  Upload file bài làm của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isOverdue && !mySubmission && (
                  <div className="p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
                    <p className="text-sm text-warning-700 dark:text-warning-400">
                      ⚠️ Bài tập đã quá hạn. Bạn vẫn có thể nộp nhưng sẽ được đánh dấu là nộp muộn.
                    </p>
                  </div>
                )}

                <FileUploadZone
                  files={selectedFiles}
                  onFilesChange={setSelectedFiles}
                  disabled={isUploading}
                  maxFiles={5}
                  maxSize={50 * 1024 * 1024}
                />

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500">Đang tải lên...</span>
                      <span className="font-medium">{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} size="sm" />
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={selectedFiles.length === 0 || isUploading}
                  onClick={handleSubmit}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang nộp...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {mySubmission ? 'Nộp lại' : 'Nộp bài'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Teacher: Quick Stats */}
          {isTeacher && (
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg">Thống kê nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Đã nộp</span>
                  <span className="font-semibold text-primary-600">
                    {assignment._count?.submissions || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Điểm tối đa</span>
                  <span className="font-semibold">{assignment.maxScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Hạn nộp</span>
                  <span className={cn(
                    "font-semibold",
                    isOverdue ? "text-error-600" : "text-neutral-900 dark:text-neutral-100"
                  )}>
                    {deadline ? formatDate(new Date(deadline)) : 'Không có'}
                  </span>
                </div>
                
                <div className="pt-4">
                  <Button 
                    className="w-full"
                    onClick={() => navigate(`/assignments/${assignmentId}/submissions`)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Xem tất cả bài nộp
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Class info */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-lg">Thông tin lớp</CardTitle>
            </CardHeader>
            <CardContent>
              <Link 
                to={`/classes/${assignment.classId}`} 
                className="flex items-center gap-3 group p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 transition-colors">
                    {assignment.class?.name || `Lớp #${assignment.classId}`}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {assignment.class?.teacher?.fullName || assignment.creator?.fullName || 'Giáo viên'}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-neutral-400 group-hover:text-primary-500" />
              </Link>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">Bài tập được tạo</p>
                    <p className="text-sm text-neutral-500">
                      {formatDate(new Date(assignment.createdAt))}
                    </p>
                  </div>
                </div>

                {deadline && (
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      isOverdue 
                        ? "bg-error-100 dark:bg-error-900/30" 
                        : "bg-warning-100 dark:bg-warning-900/30"
                    )}>
                      <Clock className={cn(
                        "h-4 w-4",
                        isOverdue ? "text-error-600" : "text-warning-600"
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {isOverdue ? 'Đã hết hạn' : 'Hạn nộp'}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {formatDate(new Date(deadline))}
                      </p>
                    </div>
                  </div>
                )}

                {mySubmission && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-success-600" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">Bạn đã nộp bài</p>
                      <p className="text-sm text-neutral-500">
                        {formatDate(new Date(mySubmission.submittedAt))}
                      </p>
                    </div>
                  </div>
                )}

                {mySubmission?.gradedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center shrink-0">
                      <Award className="h-4 w-4 text-success-600" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">Đã chấm điểm</p>
                      <p className="text-sm text-neutral-500">
                        {formatDate(new Date(mySubmission.gradedAt))}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Assignment Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsEditModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Chỉnh sửa bài tập
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Tiêu đề *
                </label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Tiêu đề bài tập"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  rows={3}
                  placeholder="Mô tả yêu cầu bài tập..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Hạn nộp *
                  </label>
                  <Input
                    type="datetime-local"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Điểm tối đa
                  </label>
                  <Input
                    type="number"
                    value={editForm.maxScore}
                    onChange={(e) => setEditForm(prev => ({ ...prev, maxScore: parseInt(e.target.value) || 100 }))}
                    min={0}
                    max={1000}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleUpdateAssignment}
                disabled={updateAssignmentMutation.isPending || !editForm.title.trim() || !editForm.dueDate}
              >
                {updateAssignmentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  'Lưu thay đổi'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default AssignmentDetailPage;
