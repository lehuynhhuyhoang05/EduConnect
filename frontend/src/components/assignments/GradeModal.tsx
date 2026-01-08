import * as React from 'react';
import { X, Loader2, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import type { Submission } from '@/types';

interface GradeModalProps {
  submission: Submission;
  maxScore: number;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (score: number, feedback: string) => void;
}

const GradeModal = ({
  submission,
  maxScore,
  isLoading = false,
  onClose,
  onSubmit,
}: GradeModalProps) => {
  const [score, setScore] = React.useState<string>(
    submission.score !== null ? String(submission.score) : ''
  );
  const [feedback, setFeedback] = React.useState(submission.feedback || '');
  const [error, setError] = React.useState<string | null>(null);

  // Build full URL for file if it's a relative path
  const getFileUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Relative path - prepend API base URL
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${baseUrl.replace('/api', '')}${url}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const scoreNum = parseFloat(score);
    
    if (isNaN(scoreNum) || score === '') {
      setError('Vui lòng nhập điểm');
      return;
    }
    
    if (scoreNum < 0 || scoreNum > maxScore) {
      setError(`Điểm phải từ 0 đến ${maxScore}`);
      return;
    }

    onSubmit(scoreNum, feedback);
  };

  // Close on escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Chấm điểm bài nộp
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Student info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
              <Avatar 
                src={submission.student?.avatarUrl}
                name={submission.student?.fullName || 'Student'} 
                size="md"
              />
              <div>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {submission.student?.fullName || 'Học sinh'}
                </p>
                <p className="text-sm text-neutral-500">
                  {submission.student?.email}
                </p>
              </div>
            </div>

            {/* File preview */}
            {submission.fileUrl && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                <FileText className="h-5 w-5 text-primary-600" />
                <span className="flex-1 text-sm text-primary-700 dark:text-primary-400">
                  Có file bài nộp
                </span>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(getFileUrl(submission.fileUrl!), '_blank')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Tải xuống
                </Button>
              </div>
            )}

            {/* Content preview */}
            {submission.content && (
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                <p className="text-sm text-neutral-500 mb-2">Nội dung nộp:</p>
                <p className="text-sm text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap max-h-32 overflow-auto">
                  {submission.content}
                </p>
              </div>
            )}

            {/* Score input */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Điểm số <span className="text-error-500">*</span>
                <span className="font-normal text-neutral-500"> (0 - {maxScore})</span>
              </label>
              <Input
                type="number"
                min={0}
                max={maxScore}
                step={0.5}
                value={score}
                onChange={(e) => {
                  setScore(e.target.value);
                  setError(null);
                }}
                placeholder={`Nhập điểm (0 - ${maxScore})`}
                autoFocus
                className={error ? 'border-error-500' : ''}
              />
              {error && (
                <p className="mt-1 text-sm text-error-600">{error}</p>
              )}
            </div>

            {/* Feedback */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Nhận xét
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                rows={4}
                placeholder="Nhận xét về bài làm của học sinh..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Lưu điểm'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GradeModal;
