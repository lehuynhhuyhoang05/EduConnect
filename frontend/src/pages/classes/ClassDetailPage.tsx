import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  Users,
  Video,
  FileText,
  Settings,
  MoreVertical,
  Copy,
  Check,
  Plus,
  Bell,
  UserPlus,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  Calendar,
  GraduationCap,
  Megaphone,
  X,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/Dropdown';
import { useClass, useClassMembers, useAnnouncements, useRemoveMember, useUpdateClass, useDeleteClass, useLeaveClass } from '@/hooks/useClasses';
import { useClassAssignments, useCreateAssignment } from '@/hooks/useAssignments';
import { useClassSessions } from '@/hooks/useLiveSessions';
import { useCurrentUser } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import type { ClassMember, Assignment, LiveSession, Announcement } from '@/types';
import { CreateLiveSessionModal } from '@/components/live-session/CreateLiveSessionModal';

// Gradient colors for class covers
const COVER_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
];

const getClassCover = (id: number) => {
  return COVER_GRADIENTS[id % COVER_GRADIENTS.length];
};

const ClassDetailPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const classIdNum = parseInt(classId || '0', 10);
  
  const [activeTab, setActiveTab] = React.useState('stream');
  const [codeCopied, setCodeCopied] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState({ name: '', description: '', subject: '' });
  const [isCreateAssignmentModalOpen, setIsCreateAssignmentModalOpen] = React.useState(false);
  const [assignmentForm, setAssignmentForm] = React.useState({ 
    title: '', 
    description: '', 
    dueDate: '',
    maxScore: 100,
    attachmentUrl: '',
  });
  const [assignmentErrors, setAssignmentErrors] = React.useState<Record<string, string>>({});
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = React.useState(false);

  // Fetch data
  const { data: classData, isLoading, error } = useClass(classIdNum);
  const updateClassMutation = useUpdateClass();
  const deleteClassMutation = useDeleteClass();
  const leaveClassMutation = useLeaveClass();
  const createAssignmentMutation = useCreateAssignment();
  const { data: currentUser } = useCurrentUser();
  const { data: membersData } = useClassMembers(classIdNum);
  const { data: assignmentsData } = useClassAssignments(classIdNum);
  const { data: sessionsData } = useClassSessions(classIdNum);
  const { data: announcementsData } = useAnnouncements(classIdNum);
  const removeMemberMutation = useRemoveMember();

  const members: ClassMember[] = membersData || [];
  const assignments: Assignment[] = assignmentsData?.data || [];
  const sessions: LiveSession[] = sessionsData?.data || [];
  const announcements: Announcement[] = announcementsData || [];

  const isTeacher = currentUser?.role === 'TEACHER' && classData?.teacherId === currentUser?.id;
  const teacherMember = members.find(m => m.role === 'TEACHER');
  const studentMembers = members.filter(m => m.role === 'STUDENT');

  const handleCopyCode = () => {
    if (classData?.classCode) {
      navigator.clipboard.writeText(classData.classCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleRemoveMember = (userId: number) => {
    if (confirm('Bạn có chắc muốn xóa thành viên này khỏi lớp?')) {
      removeMemberMutation.mutate({ classId: classIdNum, userId });
    }
  };

  const handleOpenEditModal = () => {
    if (classData) {
      setEditForm({
        name: classData.name || '',
        description: classData.description || '',
        subject: classData.subject || '',
      });
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateClass = async () => {
    try {
      await updateClassMutation.mutateAsync({ id: classIdNum, data: editForm });
      toast.success('Cập nhật lớp học thành công!');
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể cập nhật lớp học');
    }
  };

  const handleDeleteClass = async () => {
    if (confirm('Bạn có chắc muốn xóa lớp học này? Hành động này không thể hoàn tác.')) {
      try {
        await deleteClassMutation.mutateAsync(classIdNum);
        toast.success('Đã xóa lớp học');
        navigate('/classes');
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Không thể xóa lớp học');
      }
    }
  };

  const handleLeaveClass = async () => {
    if (confirm('Bạn có chắc muốn rời khỏi lớp học này?')) {
      try {
        await leaveClassMutation.mutateAsync(classIdNum);
        toast.success('Đã rời khỏi lớp học');
        navigate('/classes');
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Không thể rời khỏi lớp học');
      }
    }
  };

  const validateAssignmentForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!assignmentForm.title.trim()) {
      errors.title = 'Vui lòng nhập tiêu đề bài tập';
    } else if (assignmentForm.title.length < 5) {
      errors.title = 'Tiêu đề phải có ít nhất 5 ký tự';
    }
    
    if (!assignmentForm.dueDate) {
      errors.dueDate = 'Vui lòng chọn hạn nộp bài';
    } else {
      const dueDate = new Date(assignmentForm.dueDate);
      if (dueDate <= new Date()) {
        errors.dueDate = 'Hạn nộp bài phải sau thời điểm hiện tại';
      }
    }
    
    if (assignmentForm.maxScore < 0) {
      errors.maxScore = 'Điểm tối đa không thể âm';
    }
    
    setAssignmentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAssignment = async () => {
    if (!validateAssignmentForm()) return;
    
    try {
      await createAssignmentMutation.mutateAsync({
        classId: classIdNum,
        data: {
          title: assignmentForm.title.trim(),
          description: assignmentForm.description?.trim() || undefined,
          dueDate: new Date(assignmentForm.dueDate).toISOString(),
          maxScore: assignmentForm.maxScore,
          attachmentUrl: assignmentForm.attachmentUrl?.trim() || undefined,
        },
      });
      toast.success('Tạo bài tập thành công!');
      setIsCreateAssignmentModalOpen(false);
      setAssignmentForm({ title: '', description: '', dueDate: '', maxScore: 100, attachmentUrl: '' });
      setAssignmentErrors({});
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || 'Không thể tạo bài tập');
    }
  };

  const handleSessionCreated = (sessionId: number, shareUrl: string) => {
    // Navigate to the session page
    navigate(`/live-sessions/${sessionId}`);
  };

  if (isLoading) {
    return (
      <PageContainer title="Lớp học" description="Đang tải...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      </PageContainer>
    );
  }

  if (error || !classData) {
    return (
      <PageContainer title="Lớp học" description="Có lỗi xảy ra">
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="h-12 w-12 text-error-500 mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Không thể tải thông tin lớp học
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            {error instanceof Error ? error.message : 'Lớp học không tồn tại'}
          </p>
          <Button onClick={() => navigate('/classes')}>Quay lại</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Class Header/Banner */}
      <div 
        className="h-48 md:h-56 relative"
        style={{ background: getClassCover(classData.id) }}
      >
        {/* Back button */}
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/20 hover:bg-white/30 text-white"
            onClick={() => navigate('/classes')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isTeacher ? (
                <>
                  <DropdownMenuItem onClick={handleOpenEditModal}>
                    <Edit className="h-4 w-4 mr-2" />
                    Chỉnh sửa lớp
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-error-600" onClick={handleDeleteClass}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa lớp học
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem className="text-error-600" onClick={handleLeaveClass}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Rời lớp học
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Class info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent text-white">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{classData.name}</h1>
          <p className="text-white/80 text-sm md:text-base">{classData.subject || classData.description}</p>
        </div>
      </div>

      {/* Class Code Banner */}
      <div className="bg-white dark:bg-neutral-800 border-b dark:border-neutral-700 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-500">Mã lớp:</span>
              <code className="px-3 py-1 bg-neutral-100 dark:bg-neutral-700 rounded-lg font-mono font-semibold text-primary-600 dark:text-primary-400">
                {classData.classCode}
              </code>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCopyCode}
                title="Sao chép mã lớp"
              >
                {codeCopied ? (
                  <Check className="h-4 w-4 text-success-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Badge variant="default">
              <Users className="h-3 w-3 mr-1" />
              {members.length} thành viên
            </Badge>
          </div>

          {isTeacher && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                Mời học viên
              </Button>
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsCreateAssignmentModalOpen(true)}
              >
                Tạo bài tập
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Class Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Teacher Card */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-sm">Giảng viên</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar
                    name={classData.teacher?.fullName || classData.teacher?.name || 'Teacher'}
                    size="md"
                  />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {classData.teacher?.fullName || classData.teacher?.name || 'Giảng viên'}
                    </p>
                    <p className="text-sm text-neutral-500">{classData.teacher?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-sm">Thống kê</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Học viên</span>
                  </div>
                  <span className="font-semibold">{studentMembers.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Bài tập</span>
                  </div>
                  <span className="font-semibold">{assignments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <Video className="h-4 w-4" />
                    <span className="text-sm">Phiên live</span>
                  </div>
                  <span className="font-semibold">{sessions.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-sm">Sắp diễn ra</CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.filter(s => s.status === 'scheduled').length === 0 ? (
                  <p className="text-sm text-neutral-500">Không có sự kiện sắp tới</p>
                ) : (
                  <div className="space-y-2">
                    {sessions.filter(s => s.status === 'scheduled').slice(0, 3).map(session => (
                      <div
                        key={session.id}
                        className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        onClick={() => navigate(`/live-sessions/${session.id}`)}
                      >
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-xs text-neutral-500">
                          {session.scheduledAt ? formatDate(new Date(session.scheduledAt)) : 'Chưa xác định'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="stream">
                  <Megaphone className="h-4 w-4 mr-2" />
                  Bảng tin
                </TabsTrigger>
                <TabsTrigger value="assignments">
                  <FileText className="h-4 w-4 mr-2" />
                  Bài tập
                </TabsTrigger>
                <TabsTrigger value="members">
                  <Users className="h-4 w-4 mr-2" />
                  Thành viên
                </TabsTrigger>
                <TabsTrigger value="sessions">
                  <Video className="h-4 w-4 mr-2" />
                  Phiên học
                </TabsTrigger>
              </TabsList>

              {/* Stream/Announcements Tab */}
              <TabsContent value="stream" className="space-y-4">
                {isTeacher && (
                  <Card variant="elevated" className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={currentUser?.fullName || currentUser?.name || 'User'} size="sm" />
                      <Button
                        variant="outline"
                        className="flex-1 justify-start text-neutral-500"
                        onClick={() => {/* Open announcement modal */}}
                      >
                        Thông báo nội dung nào đó cho lớp học...
                      </Button>
                    </div>
                  </Card>
                )}

                {announcements.length === 0 ? (
                  <Card variant="elevated" className="p-8 text-center">
                    <Bell className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                      Chưa có thông báo nào
                    </h3>
                    <p className="text-neutral-500">
                      {isTeacher ? 'Tạo thông báo đầu tiên cho lớp học' : 'Thông báo từ giảng viên sẽ xuất hiện ở đây'}
                    </p>
                  </Card>
                ) : (
                  announcements.map(announcement => (
                    <Card key={announcement.id} variant="elevated" className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar name={announcement.author?.fullName || 'Author'} size="sm" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{announcement.author?.fullName}</span>
                            <span className="text-sm text-neutral-500">
                              {formatDate(new Date(announcement.createdAt))}
                            </span>
                            {announcement.isPinned && (
                              <Badge variant="warning" size="sm">Ghim</Badge>
                            )}
                          </div>
                          <h4 className="font-semibold mb-2">{announcement.title}</h4>
                          <p className="text-neutral-600 dark:text-neutral-400">{announcement.content}</p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Assignments Tab */}
              <TabsContent value="assignments" className="space-y-4">
                {isTeacher && (
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-neutral-500">
                      {assignments.length} bài tập
                    </p>
                    <Button
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => setIsCreateAssignmentModalOpen(true)}
                    >
                      Tạo bài tập
                    </Button>
                  </div>
                )}

                {assignments.length === 0 ? (
                  <Card variant="elevated" className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                      Chưa có bài tập nào
                    </h3>
                    <p className="text-neutral-500">
                      {isTeacher ? 'Tạo bài tập đầu tiên cho lớp' : 'Bài tập từ giảng viên sẽ xuất hiện ở đây'}
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {assignments.map(assignment => {
                      const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
                      const now = new Date();
                      const isOverdue = dueDate && dueDate < now;
                      const isUrgent = dueDate && !isOverdue && (dueDate.getTime() - now.getTime()) < 3 * 24 * 60 * 60 * 1000;
                      const hasSubmitted = assignment.mySubmission !== null && assignment.mySubmission !== undefined;
                      const isGraded = assignment.mySubmission?.score !== null && assignment.mySubmission?.score !== undefined;
                      const submissionCount = assignment._count?.submissions || 0;
                      
                      return (
                        <Card
                          key={assignment.id}
                          variant="elevated"
                          className={cn(
                            "p-4 cursor-pointer hover:shadow-lg transition-all border-l-4 group",
                            isGraded && "border-l-success-500",
                            hasSubmitted && !isGraded && "border-l-primary-500",
                            isOverdue && !hasSubmitted && "border-l-error-500",
                            isUrgent && !hasSubmitted && "border-l-warning-500",
                            !isOverdue && !isUrgent && !hasSubmitted && "border-l-neutral-300"
                          )}
                          onClick={() => navigate(`/assignments/${assignment.id}`)}
                        >
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "p-3 rounded-lg",
                              isGraded && "bg-success-100 dark:bg-success-900/30",
                              hasSubmitted && !isGraded && "bg-primary-100 dark:bg-primary-900/30",
                              isOverdue && !hasSubmitted && "bg-error-100 dark:bg-error-900/30",
                              !isOverdue && !hasSubmitted && "bg-primary-100 dark:bg-primary-900/30"
                            )}>
                              <FileText className={cn(
                                "h-6 w-6",
                                isGraded && "text-success-600",
                                hasSubmitted && !isGraded && "text-primary-600",
                                isOverdue && !hasSubmitted && "text-error-600",
                                !isOverdue && !hasSubmitted && "text-primary-600"
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 transition-colors truncate">
                                  {assignment.title}
                                </h4>
                                {/* Status badges */}
                                {isGraded && (
                                  <Badge variant="success" size="sm">Đã chấm</Badge>
                                )}
                                {hasSubmitted && !isGraded && (
                                  <Badge variant="primary" size="sm">Đã nộp</Badge>
                                )}
                                {isOverdue && !hasSubmitted && (
                                  <Badge variant="error" size="sm">Quá hạn</Badge>
                                )}
                                {isUrgent && !hasSubmitted && !isOverdue && (
                                  <Badge variant="warning" size="sm">Sắp hết hạn</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-neutral-500 mt-1">
                                <span className={cn(
                                  "flex items-center gap-1",
                                  isOverdue && !hasSubmitted && "text-error-600 font-medium"
                                )}>
                                  <Calendar className="h-3.5 w-3.5" />
                                  {dueDate ? formatDate(dueDate) : 'Không có hạn'}
                                </span>
                                {isTeacher && (
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5" />
                                    {submissionCount} đã nộp
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {assignment.maxScore && (
                                <Badge variant="default">{assignment.maxScore} điểm</Badge>
                              )}
                              {isGraded && (
                                <span className="text-lg font-bold text-success-600">
                                  {assignment.mySubmission?.score}/{assignment.maxScore}
                                </span>
                              )}
                              {isTeacher && submissionCount > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/assignments/${assignment.id}/submissions`);
                                  }}
                                >
                                  <Users className="h-3.5 w-3.5 mr-1" />
                                  Chấm điểm
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members" className="space-y-4">
                {/* Teacher Section */}
                <Card variant="elevated">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Giảng viên
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {teacherMember && (
                      <div className="flex items-center gap-3">
                        <Avatar name={teacherMember.user?.fullName || 'Teacher'} size="md" />
                        <div>
                          <p className="font-medium">{teacherMember.user?.fullName || teacherMember.user?.name}</p>
                          <p className="text-sm text-neutral-500">{teacherMember.user?.email}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Students Section */}
                <Card variant="elevated">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Học viên ({studentMembers.length})
                      </CardTitle>
                      {isTeacher && (
                        <Button size="sm" variant="outline" leftIcon={<UserPlus className="h-4 w-4" />}>
                          Mời
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {studentMembers.length === 0 ? (
                      <p className="text-neutral-500 text-center py-4">Chưa có học viên nào</p>
                    ) : (
                      <div className="space-y-3">
                        {studentMembers.map(member => (
                          <div key={member.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar name={member.user?.fullName || 'Student'} size="sm" />
                              <div>
                                <p className="font-medium text-sm">{member.user?.fullName || member.user?.name}</p>
                                <p className="text-xs text-neutral-500">{member.user?.email}</p>
                              </div>
                            </div>
                            {isTeacher && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon-sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-error-600"
                                    onClick={() => handleRemoveMember(member.userId)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Xóa khỏi lớp
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sessions Tab */}
              <TabsContent value="sessions" className="space-y-4">
                {isTeacher && (
                  <div className="flex justify-end mb-4">
                    <Button
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => setIsCreateSessionModalOpen(true)}
                    >
                      Tạo phiên học
                    </Button>
                  </div>
                )}

                {sessions.length === 0 ? (
                  <Card variant="elevated" className="p-8 text-center">
                    <Video className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                      Chưa có phiên học nào
                    </h3>
                    <p className="text-neutral-500">
                      {isTeacher ? 'Tạo phiên học trực tuyến đầu tiên' : 'Phiên học sẽ xuất hiện ở đây'}
                    </p>
                  </Card>
                ) : (
                  sessions.map(session => (
                    <Card
                      key={session.id}
                      variant="elevated"
                      className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => navigate(`/live-sessions/${session.id}`)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          'p-3 rounded-lg',
                          session.status === 'live'
                            ? 'bg-success-100 dark:bg-success-900/30'
                            : 'bg-neutral-100 dark:bg-neutral-800'
                        )}>
                          <Video className={cn(
                            'h-6 w-6',
                            session.status === 'live' ? 'text-success-600' : 'text-neutral-500'
                          )} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {session.title}
                            </h4>
                            {session.status === 'live' && (
                              <Badge variant="success" className="animate-pulse">LIVE</Badge>
                            )}
                            {session.status === 'scheduled' && (
                              <Badge variant="warning">Đã lên lịch</Badge>
                            )}
                            {session.status === 'ended' && (
                              <Badge variant="default">Đã kết thúc</Badge>
                            )}
                          </div>
                          <p className="text-sm text-neutral-500 mt-1">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {session.scheduledAt ? formatDate(new Date(session.scheduledAt)) : 'Chưa xác định'}
                          </p>
                        </div>
                        {session.status === 'live' && (
                          <Button size="sm" variant="primary">
                            Tham gia
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Edit Class Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsEditModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Chỉnh sửa lớp học
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
                  Tên lớp học *
                </label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ví dụ: Lập trình Web - K20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Môn học
                </label>
                <Input
                  value={editForm.subject}
                  onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Ví dụ: Lập trình Web"
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
                  placeholder="Mô tả về lớp học..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleUpdateClass}
                disabled={updateClassMutation.isPending || !editForm.name.trim()}
              >
                {updateClassMutation.isPending ? (
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

      {/* Create Assignment Modal */}
      {isCreateAssignmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setIsCreateAssignmentModalOpen(false); setAssignmentErrors({}); }}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-primary-500 to-primary-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  Tạo bài tập mới
                </h2>
              </div>
              <button
                onClick={() => { setIsCreateAssignmentModalOpen(false); setAssignmentErrors({}); }}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Tiêu đề bài tập <span className="text-error-500">*</span>
                </label>
                <Input
                  value={assignmentForm.title}
                  onChange={(e) => {
                    setAssignmentForm(prev => ({ ...prev, title: e.target.value }));
                    if (assignmentErrors.title) setAssignmentErrors(prev => ({ ...prev, title: '' }));
                  }}
                  placeholder="Ví dụ: Bài tập chương 1 - Cấu trúc dữ liệu"
                  className={assignmentErrors.title ? 'border-error-500' : ''}
                />
                {assignmentErrors.title && (
                  <p className="text-sm text-error-500 mt-1">{assignmentErrors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Mô tả / Hướng dẫn <span className="text-neutral-400 font-normal">(không bắt buộc)</span>
                </label>
                <textarea
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Nhập yêu cầu chi tiết, hướng dẫn làm bài, định dạng nộp bài..."
                />
              </div>

              {/* Due Date & Max Score */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Hạn nộp <span className="text-error-500">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={assignmentForm.dueDate}
                    onChange={(e) => {
                      setAssignmentForm(prev => ({ ...prev, dueDate: e.target.value }));
                      if (assignmentErrors.dueDate) setAssignmentErrors(prev => ({ ...prev, dueDate: '' }));
                    }}
                    min={new Date().toISOString().slice(0, 16)}
                    className={assignmentErrors.dueDate ? 'border-error-500' : ''}
                  />
                  {assignmentErrors.dueDate && (
                    <p className="text-sm text-error-500 mt-1">{assignmentErrors.dueDate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Điểm tối đa
                  </label>
                  <Input
                    type="number"
                    value={assignmentForm.maxScore}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, maxScore: parseInt(e.target.value) || 100 }))}
                    min={0}
                    max={1000}
                  />
                </div>
              </div>

              {/* Attachment URL */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Link tài liệu đính kèm <span className="text-neutral-400 font-normal">(không bắt buộc)</span>
                </label>
                <Input
                  type="url"
                  value={assignmentForm.attachmentUrl}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, attachmentUrl: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                />
                <p className="text-xs text-neutral-400 mt-1">
                  Hỗ trợ Google Drive, OneDrive, Dropbox hoặc bất kỳ URL công khai
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              <Button variant="outline" onClick={() => { setIsCreateAssignmentModalOpen(false); setAssignmentErrors({}); }}>
                Hủy
              </Button>
              <Button
                onClick={handleCreateAssignment}
                disabled={createAssignmentMutation.isPending}
              >
                {createAssignmentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo bài tập
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Session Modal - New component with instant/scheduled options */}
      <CreateLiveSessionModal
        isOpen={isCreateSessionModalOpen}
        onClose={() => setIsCreateSessionModalOpen(false)}
        classId={classIdNum}
        onSessionCreated={handleSessionCreated}
      />
    </div>
  );
};

export default ClassDetailPage;
