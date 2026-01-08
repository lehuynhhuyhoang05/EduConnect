import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateClass } from '@/hooks/useClasses';
import { toast } from 'sonner';

const CreateClassPage = () => {
  const navigate = useNavigate();
  const createClassMutation = useCreateClass();

  const [formData, setFormData] = React.useState({
    name: '',
    subject: '',
    description: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên lớp học là bắt buộc';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Tên lớp học phải có ít nhất 3 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    createClassMutation.mutate(
      {
        name: formData.name.trim(),
        subject: formData.subject.trim() || undefined,
        description: formData.description.trim() || undefined,
      },
      {
        onSuccess: (newClass) => {
          toast.success('Tạo lớp học thành công!');
          navigate(`/classes/${newClass.id}`);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'Không thể tạo lớp học');
        },
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <PageContainer
      title="Tạo lớp học mới"
      description="Thiết lập lớp học trực tuyến của bạn"
      breadcrumbs={[
        { label: 'Lớp học', href: '/classes' },
        { label: 'Tạo lớp mới' },
      ]}
    >
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate('/classes')}
        >
          Quay lại
        </Button>

        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                <BookOpen className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <CardTitle>Thông tin lớp học</CardTitle>
                <CardDescription>Điền thông tin cơ bản cho lớp học của bạn</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Class Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Tên lớp học <span className="text-error-500">*</span>
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="VD: Lập Trình Web - K65"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? 'border-error-500' : ''}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-error-500">{errors.name}</p>
                )}
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Môn học / Chủ đề
                </label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder="VD: Lập Trình Web"
                  value={formData.subject}
                  onChange={handleChange}
                />
                <p className="mt-1 text-sm text-neutral-500">
                  Tên môn học hoặc chủ đề của lớp
                </p>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Mô tả
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Mô tả ngắn về lớp học, nội dung sẽ học..."
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                <h4 className="font-medium text-primary-900 dark:text-primary-100 mb-2">
                  💡 Mẹo
                </h4>
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  Sau khi tạo lớp, bạn sẽ nhận được mã lớp để chia sẻ cho học viên. 
                  Học viên có thể dùng mã này để tham gia lớp học của bạn.
                </p>
              </div>

              {/* Submit buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/classes')}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createClassMutation.isPending}
                >
                  {createClassMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    'Tạo lớp học'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default CreateClassPage;
