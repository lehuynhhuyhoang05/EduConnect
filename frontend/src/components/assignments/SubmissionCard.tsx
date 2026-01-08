import * as React from 'react';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import {
  Download,
  File,
  ChevronDown,
  ChevronUp,
  Eye,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import SubmissionStatusBadge from './SubmissionStatusBadge';
import type { Submission } from '@/types';

interface SubmissionCardProps {
  submission: Submission;
  maxScore: number;
  expanded?: boolean;
  onToggle?: () => void;
  onGrade: (submission: Submission) => void;
  onReturn?: (submission: Submission) => void;
  onDownload?: (url: string) => void;
}

const SubmissionCard = ({
  submission,
  maxScore,
  expanded = false,
  onToggle,
  onGrade,
  onReturn,
  onDownload,
}: SubmissionCardProps) => {
  const hasFile = !!submission.fileUrl;
  const isGraded = submission.status === 'GRADED' || submission.score !== null;

  // Build full URL for file if it's a relative path
  const getFileUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Relative path - prepend API base URL
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${baseUrl.replace('/api', '')}${url}`;
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (submission.fileUrl) {
      const fullUrl = getFileUrl(submission.fileUrl);
      if (onDownload) {
        onDownload(fullUrl);
      } else {
        window.open(fullUrl, '_blank');
      }
    }
  };

  return (
    <Card 
      variant="elevated" 
      className={cn(
        'overflow-hidden transition-all',
        expanded && 'ring-2 ring-primary-500/20'
      )}
    >
      {/* Header - Always visible */}
      <CardContent 
        className={cn(
          'p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors',
          onToggle && 'cursor-pointer'
        )}
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Avatar 
            src={submission.student?.avatarUrl}
            name={submission.student?.fullName || 'Student'} 
            size="md"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {submission.student?.fullName || 'Học sinh'}
              </h4>
              <SubmissionStatusBadge 
                status={submission.status}
                isLate={submission.submittedAt && submission.gradedAt ? 
                  new Date(submission.submittedAt) > new Date(submission.gradedAt) : false
                }
              />
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <span>{submission.student?.email}</span>
              <span>•</span>
              <span>Nộp {formatRelativeTime(new Date(submission.submittedAt))}</span>
            </div>
          </div>

          {/* Score */}
          <div className="text-right">
            {isGraded ? (
              <div>
                <p className="text-2xl font-bold text-success-600">
                  {submission.score}
                  <span className="text-base font-normal text-neutral-400">/{maxScore}</span>
                </p>
                <p className="text-xs text-neutral-500">
                  {formatDate(new Date(submission.gradedAt || submission.submittedAt))}
                </p>
              </div>
            ) : (
              <p className="text-sm text-warning-600 font-medium">Chưa chấm</p>
            )}
          </div>

          {/* Toggle */}
          {onToggle && (
            <div className="text-neutral-400">
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          )}
        </div>
      </CardContent>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/30">
          <div className="p-4 space-y-4">
            {/* File attachment */}
            {hasFile && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30">
                  <File className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    Bài nộp
                  </p>
                  <p className="text-xs text-neutral-500">Click để tải xuống</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Tải xuống
                </Button>
              </div>
            )}

            {/* Text content */}
            {submission.content && (
              <div className="p-3 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                <p className="text-sm text-neutral-500 mb-2 flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Nội dung nộp
                </p>
                <p className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">
                  {submission.content}
                </p>
              </div>
            )}

            {/* Feedback */}
            {submission.feedback && (
              <div className="p-3 rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800">
                <p className="text-sm text-success-700 dark:text-success-400 mb-2 font-medium">
                  Nhận xét của giảng viên
                </p>
                <p className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">
                  {submission.feedback}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              {hasFile && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Eye className="h-4 w-4 mr-1" />
                  Xem bài
                </Button>
              )}
              
              <Button variant="primary" size="sm" onClick={() => onGrade(submission)}>
                {isGraded ? 'Sửa điểm' : 'Chấm điểm'}
              </Button>

              {isGraded && onReturn && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onReturn(submission)}
                  className="text-warning-600 hover:text-warning-700"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Trả lại
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default SubmissionCard;
