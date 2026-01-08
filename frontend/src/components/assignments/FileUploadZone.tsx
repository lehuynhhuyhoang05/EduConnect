import * as React from 'react';
import { cn } from '@/lib/utils';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface FileUploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in bytes
  disabled?: boolean;
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const FileUploadZone = ({
  files,
  onFilesChange,
  accept = '*',
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB default
  disabled = false,
  className,
}: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
    // Reset input value to allow selecting same file again
    e.target.value = '';
  };

  const processFiles = (newFiles: File[]) => {
    setError(null);

    // Check max files
    if (files.length + newFiles.length > maxFiles) {
      setError(`Chỉ được upload tối đa ${maxFiles} file`);
      return;
    }

    // Check file sizes
    const oversizedFile = newFiles.find(f => f.size > maxSize);
    if (oversizedFile) {
      setError(`File "${oversizedFile.name}" vượt quá ${formatFileSize(maxSize)}`);
      return;
    }

    // Add new files
    onFilesChange([...files, ...newFiles]);
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
    setError(null);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop Zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
          isDragging && 'border-primary-500 bg-primary-50 dark:bg-primary-900/20',
          !isDragging && 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        <Upload className={cn(
          'h-10 w-10 mx-auto mb-3',
          isDragging ? 'text-primary-500' : 'text-neutral-400'
        )} />
        
        <p className="text-neutral-600 dark:text-neutral-400 mb-1">
          <span className="font-medium text-primary-600">Click để chọn file</span>
          {' '}hoặc kéo thả vào đây
        </p>
        <p className="text-sm text-neutral-500">
          Tối đa {maxFiles} file, mỗi file {formatFileSize(maxSize)}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-error-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
            >
              <div className="p-2 rounded-lg bg-white dark:bg-neutral-900">
                <File className="h-5 w-5 text-neutral-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-neutral-500">{formatFileSize(file.size)}</p>
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;
