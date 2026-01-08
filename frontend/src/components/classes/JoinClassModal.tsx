import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useJoinClass } from '@/hooks/useClasses';
import { toast } from 'sonner';

interface JoinClassModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinClassModal: React.FC<JoinClassModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [classCode, setClassCode] = React.useState('');
  const [error, setError] = React.useState('');
  
  const joinClassMutation = useJoinClass();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedCode = classCode.trim().toUpperCase();
    
    if (!trimmedCode) {
      setError('Vui lòng nhập mã lớp học');
      return;
    }

    if (trimmedCode.length < 6) {
      setError('Mã lớp học phải có ít nhất 6 ký tự');
      return;
    }

    try {
      const result = await joinClassMutation.mutateAsync(trimmedCode);
      toast.success('Tham gia lớp học thành công!');
      onClose();
      setClassCode('');
      // Navigate to the joined class
      navigate(`/classes/${result.id}`);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Không thể tham gia lớp học';
      if (message.includes('already a member') || message.includes('đã là thành viên')) {
        setError('Bạn đã là thành viên của lớp học này');
      } else if (message.includes('not found') || message.includes('không tìm thấy')) {
        setError('Không tìm thấy lớp học với mã này');
      } else {
        setError(message);
      }
      toast.error('Tham gia lớp học thất bại');
    }
  };

  const handleClose = () => {
    setClassCode('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Tham gia lớp học
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Nhập mã lớp học do giảng viên cung cấp để tham gia lớp học.
            </p>
            
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Mã lớp học
            </label>
            <Input
              value={classCode}
              onChange={(e) => {
                setClassCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="VD: ABC123"
              leftIcon={<KeyRound className="h-4 w-4" />}
              className={error ? 'border-error-500 focus:ring-error-500' : ''}
              autoFocus
              disabled={joinClassMutation.isPending}
            />
            {error && (
              <p className="mt-2 text-sm text-error-500">
                {error}
              </p>
            )}
          </div>

          {/* Info box */}
          <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <p className="text-sm text-primary-700 dark:text-primary-300">
              <strong>Lưu ý:</strong> Mã lớp học thường có 6-8 ký tự, bao gồm chữ cái và số.
              Hãy hỏi giảng viên nếu bạn không có mã.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={joinClassMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!classCode.trim() || joinClassMutation.isPending}
            >
              {joinClassMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Đang tham gia...
                </>
              ) : (
                'Tham gia'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinClassModal;
