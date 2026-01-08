import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  BookOpen, 
  Calendar, 
  Star, 
  FileText, 
  Upload,
  Loader2,
  X,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageContainer } from '@/components/layout/PageContainer';
import { useMyClasses } from '@/hooks/useClasses';
import { useCreateAssignment } from '@/hooks/useAssignments';
import { useCurrentUser } from '@/hooks/useAuth';
import type { CreateAssignmentDto } from '@/types';

export default function CreateAssignmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClassId = searchParams.get('classId');
  
  const { data: currentUser } = useCurrentUser();
  const { data: classesData, isLoading: isLoadingClasses } = useMyClasses();
  const createMutation = useCreateAssignment();
  
  const [formData, setFormData] = useState<CreateAssignmentDto & { classId: string }>({
    classId: preselectedClassId || '',
    title: '',
    description: '',
    dueDate: '',
    maxScore: 100,
    attachmentUrl: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Only teachers can create assignments
  const isTeacher = currentUser?.role?.toUpperCase() === 'TEACHER';
  
  // Filter to only show classes where user is teacher
  const myClasses = classesData?.data?.filter(
    (cls: { teacherId: number }) => cls.teacherId === currentUser?.id
  ) || [];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.classId) {
      newErrors.classId = 'Vui lòng chọn lớp học';
    }
    
    if (!formData.title.trim()) {
      newErrors.title = 'Vui lòng nhập tiêu đề bài tập';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Tiêu đề phải có ít nhất 5 ký tự';
    }
    
    if (!formData.dueDate) {
      newErrors.dueDate = 'Vui lòng chọn hạn nộp bài';
    } else {
      const dueDate = new Date(formData.dueDate);
      if (dueDate <= new Date()) {
        newErrors.dueDate = 'Hạn nộp bài phải sau thời điểm hiện tại';
      }
    }
    
    if (formData.maxScore !== undefined && formData.maxScore < 0) {
      newErrors.maxScore = 'Điểm tối đa không thể âm';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      const classId = parseInt(formData.classId);
      const assignmentData: CreateAssignmentDto = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        dueDate: new Date(formData.dueDate).toISOString(),
        maxScore: formData.maxScore || 100,
        attachmentUrl: formData.attachmentUrl?.trim() || undefined,
      };
      
      await createMutation.mutateAsync({ classId, data: assignmentData });
      toast.success('Tạo bài tập thành công!');
      navigate(`/classes/${classId}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Không thể tạo bài tập';
      toast.error(errorMsg);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Get min date for due date (today)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  if (!isTeacher) {
    return (
      <PageContainer
        title="Không có quyền truy cập"
        description="Bạn không có quyền tạo bài tập"
        breadcrumbs={[
          { label: 'Bài tập', href: '/assignments' },
          { label: 'Tạo bài tập' },
        ]}
      >
        <Card>
          <CardContent className="p-8 text-center">
            <Info className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Chỉ giảng viên mới có thể tạo bài tập</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/assignments')}
            >
              Quay lại danh sách bài tập
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Tạo bài tập mới"
      description="Tạo bài tập cho học sinh trong lớp của bạn"
      breadcrumbs={[
        { label: 'Bài tập', href: '/assignments' },
        { label: 'Tạo bài tập' },
      ]}
    >
      <div className="max-w-3xl mx-auto">
        {/* Back button */}
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Class Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary-500" />
                  Chọn lớp học
                </CardTitle>
                <CardDescription>
                  Bài tập sẽ được giao cho tất cả học sinh trong lớp được chọn
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingClasses ? (
                  <div className="flex items-center gap-2 text-neutral-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tải danh sách lớp...
                  </div>
                ) : myClasses.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-700">
                      Bạn chưa có lớp học nào. Vui lòng tạo lớp trước khi tạo bài tập.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => navigate('/classes/create')}
                    >
                      Tạo lớp mới
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="classId" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Lớp học *
                    </label>
                    <select
                      id="classId"
                      value={formData.classId}
                      onChange={(e) => handleInputChange('classId', e.target.value)}
                      className={`w-full h-10 px-3 rounded-md border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.classId ? 'border-red-500' : 'border-neutral-300'
                      }`}
                    >
                      <option value="">-- Chọn lớp --</option>
                      {myClasses.map((cls: { id: number; name: string; subject?: string }) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} {cls.subject ? `(${cls.subject})` : ''}
                        </option>
                      ))}
                    </select>
                    {errors.classId && (
                      <p className="text-sm text-red-500">{errors.classId}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assignment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary-500" />
                  Thông tin bài tập
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <label htmlFor="title" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Tiêu đề bài tập *
                  </label>
                  <Input
                    id="title"
                    placeholder="Ví dụ: Bài tập chương 3 - Cấu trúc dữ liệu"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500">{errors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label htmlFor="description" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Mô tả / Yêu cầu
                    <span className="text-neutral-400 ml-1 font-normal">(không bắt buộc)</span>
                  </label>
                  <textarea
                    id="description"
                    placeholder="Nhập mô tả chi tiết về bài tập, yêu cầu, format nộp bài..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-neutral-400">
                    Mô tả sẽ được hiển thị cho học sinh khi xem chi tiết bài tập
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Due Date and Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary-500" />
                  Thời hạn và điểm số
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Due Date */}
                  <div className="space-y-2">
                    <label htmlFor="dueDate" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Hạn nộp bài *
                    </label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={formData.dueDate}
                      onChange={(e) => handleInputChange('dueDate', e.target.value)}
                      min={getMinDateTime()}
                      className={errors.dueDate ? 'border-red-500' : ''}
                    />
                    {errors.dueDate && (
                      <p className="text-sm text-red-500">{errors.dueDate}</p>
                    )}
                  </div>

                  {/* Max Score */}
                  <div className="space-y-2">
                    <label htmlFor="maxScore" className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      <Star className="h-4 w-4 text-amber-500" />
                      Điểm tối đa
                    </label>
                    <Input
                      id="maxScore"
                      type="number"
                      min={0}
                      max={1000}
                      value={formData.maxScore}
                      onChange={(e) => handleInputChange('maxScore', parseInt(e.target.value) || 0)}
                      className={errors.maxScore ? 'border-red-500' : ''}
                    />
                    {errors.maxScore && (
                      <p className="text-sm text-red-500">{errors.maxScore}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attachment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary-500" />
                  Tài liệu đính kèm
                  <span className="text-sm font-normal text-neutral-400">(không bắt buộc)</span>
                </CardTitle>
                <CardDescription>
                  Thêm link tới tài liệu hoặc file bài tập (Google Drive, OneDrive, v.v.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label htmlFor="attachmentUrl" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    URL tài liệu
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="attachmentUrl"
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={formData.attachmentUrl}
                      onChange={(e) => handleInputChange('attachmentUrl', e.target.value)}
                      className="flex-1"
                    />
                    {formData.attachmentUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleInputChange('attachmentUrl', '')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400">
                    Hỗ trợ link từ Google Drive, OneDrive, Dropbox hoặc bất kỳ URL công khai nào
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={createMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || myClasses.length === 0}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Tạo bài tập
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
