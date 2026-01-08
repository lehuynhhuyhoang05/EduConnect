import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { filesApi } from '@/services/api';
import type { UploadedFile } from '@/types';

// Query keys
export const fileKeys = {
  all: ['files'] as const,
  list: () => [...fileKeys.all, 'list'] as const,
};

// ============================================
// QUERIES
// ============================================

// Get all files
export const useFiles = () => {
  return useQuery({
    queryKey: fileKeys.list(),
    queryFn: () => filesApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================
// MUTATIONS
// ============================================

// Delete file
export const useDeleteFile = () => {
  return useMutation({
    mutationFn: (id: number) => filesApi.delete(id),
  });
};

// ============================================
// FILE UPLOAD HOOK
// ============================================

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseFileUploadOptions {
  onSuccess?: (file: UploadedFile) => void;
  onError?: (error: Error) => void;
}

export const useFileUpload = (options?: UseFileUploadOptions) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      setIsUploading(true);
      setError(null);
      setProgress({ loaded: 0, total: file.size, percentage: 0 });

      try {
        const result = await filesApi.upload(file, (progressPercentage) => {
          const loaded = Math.round((progressPercentage / 100) * file.size);
          setProgress({ loaded, total: file.size, percentage: progressPercentage });
        });

        setIsUploading(false);
        setProgress(null);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Upload failed');
        setError(error);
        setIsUploading(false);
        setProgress(null);
        options?.onError?.(error);
        return null;
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    upload,
    isUploading,
    progress,
    error,
    reset,
  };
};

// ============================================
// MULTIPLE FILE UPLOAD
// ============================================

interface FileUploadItem {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  result?: UploadedFile;
  error?: string;
}

export const useMultipleFileUpload = () => {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const items: FileUploadItem[] = fileArray.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: 'pending',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...items]);
    return items.map((i) => i.id);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadAll = useCallback(async (): Promise<UploadedFile[]> => {
    setIsUploading(true);
    const results: UploadedFile[] = [];

    const pendingFiles = files.filter((f) => f.status === 'pending');

    for (const item of pendingFiles) {
      try {
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' as const } : f))
        );

        const result = await filesApi.upload(item.file, (progressPercentage) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, progress: progressPercentage } : f))
          );
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: 'success' as const, progress: 100, result } : f
          )
        );
        results.push(result);
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' }
              : f
          )
        );
      }
    }

    setIsUploading(false);
    return results;
  }, [files]);

  const clearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status !== 'success'));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    uploadAll,
    clearCompleted,
    clearAll,
    pendingCount: files.filter((f) => f.status === 'pending').length,
    successCount: files.filter((f) => f.status === 'success').length,
    errorCount: files.filter((f) => f.status === 'error').length,
  };
};

// ============================================
// DOWNLOAD FILE
// ============================================

export const useFileDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const download = useCallback(async (fileId: number, filename?: string) => {
    setIsDownloading(true);
    setError(null);

    try {
      const blob = await filesApi.download(fileId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `file-${fileId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsDownloading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Download failed');
      setError(error);
      setIsDownloading(false);
      throw error;
    }
  }, []);

  return {
    download,
    isDownloading,
    error,
  };
};
