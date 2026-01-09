import { useState, useCallback, useRef } from 'react';
import { Upload, X, File, Image, FileText, Film, Music } from 'lucide-react';
import { cn, formatFileSize } from '@/utils/helpers';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // bytes
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
}

interface UploadedFile {
  file: File;
  progress: number;
  error?: string;
}

const fileIcons: Record<string, typeof File> = {
  image: Image,
  video: Film,
  audio: Music,
  document: FileText,
  default: File,
};

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return fileIcons.image;
  if (type.startsWith('video/')) return fileIcons.video;
  if (type.startsWith('audio/')) return fileIcons.audio;
  if (type.includes('pdf') || type.includes('document') || type.includes('text'))
    return fileIcons.document;
  return fileIcons.default;
}

export function FileUpload({
  onUpload,
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  className,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxSize) {
        return `File quá lớn. Tối đa ${formatFileSize(maxSize)}`;
      }
      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim());
        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          if (type.endsWith('/*')) {
            return file.type.startsWith(type.replace('/*', '/'));
          }
          return file.type === type;
        });
        if (!isAccepted) {
          return 'Định dạng file không được hỗ trợ';
        }
      }
      return null;
    },
    [accept, maxSize]
  );

  const handleFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const remainingSlots = maxFiles - files.length;
      const filesToAdd = fileArray.slice(0, remainingSlots);

      const uploadedFiles: UploadedFile[] = filesToAdd.map((file) => ({
        file,
        progress: 0,
        error: validateFile(file) || undefined,
      }));

      setFiles((prev) => [...prev, ...uploadedFiles]);

      const validFiles = uploadedFiles
        .filter((f) => !f.error)
        .map((f) => f.file);
      if (validFiles.length > 0) {
        onUpload(validFiles);
      }
    },
    [files.length, maxFiles, validateFile, onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
            : 'border-neutral-300 dark:border-neutral-700 hover:border-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-800',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Upload className="h-6 w-6 text-neutral-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              Kéo thả file vào đây hoặc{' '}
              <span className="text-primary-500">chọn file</span>
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {accept || 'Tất cả định dạng'} • Tối đa {formatFileSize(maxSize)}
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadedFile, index) => {
            const Icon = getFileIcon(uploadedFile.file.type);
            return (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border',
                  uploadedFile.error
                    ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                )}
              >
                <div className="h-10 w-10 rounded-lg bg-white dark:bg-neutral-700 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-neutral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {uploadedFile.file.name}
                  </p>
                  {uploadedFile.error ? (
                    <p className="text-xs text-red-500">{uploadedFile.error}</p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      {formatFileSize(uploadedFile.file.size)}
                    </p>
                  )}
                  {!uploadedFile.error && uploadedFile.progress > 0 && uploadedFile.progress < 100 && (
                    <Progress value={uploadedFile.progress} size="sm" className="mt-1" />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
