/**
 * useApiError Hook
 * Hook để xử lý và hiển thị lỗi API trong React components
 */

import { useEffect, useCallback, useState } from 'react';
import { errorTracker, ApiError, getErrorMessage } from '@/lib/error-tracker';
import { toast } from 'sonner';

interface UseApiErrorOptions {
  /** Tự động hiển thị toast khi có lỗi */
  showToast?: boolean;
  /** Các status codes muốn ignore (không hiển thị toast) */
  ignoreStatus?: number[];
  /** Custom handler khi có lỗi */
  onError?: (error: ApiError) => void;
}

/**
 * Hook để theo dõi và xử lý lỗi API
 */
export function useApiError(options: UseApiErrorOptions = {}) {
  const { showToast = true, ignoreStatus = [], onError } = options;
  const [lastError, setLastError] = useState<ApiError | null>(null);

  useEffect(() => {
    // Đăng ký handler với error tracker
    const unsubscribe = errorTracker.onError((error) => {
      setLastError(error);

      // Gọi custom handler nếu có
      if (onError) {
        onError(error);
      }

      // Hiển thị toast nếu enabled và status không bị ignore
      if (showToast && error.status && !ignoreStatus.includes(error.status)) {
        const toastType = getToastType(error.status);
        
        if (toastType === 'error') {
          toast.error(error.message, {
            description: getErrorDescription(error),
            duration: 5000,
          });
        } else if (toastType === 'warning') {
          toast.warning(error.message, {
            description: getErrorDescription(error),
            duration: 4000,
          });
        }
      }
    });

    return unsubscribe;
  }, [showToast, ignoreStatus, onError]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    lastError,
    clearError,
    getErrors: errorTracker.getErrors.bind(errorTracker),
    getStats: errorTracker.getStats.bind(errorTracker),
  };
}

/**
 * Determine toast type based on status code
 */
function getToastType(status: number): 'error' | 'warning' | 'info' {
  if (status >= 500) return 'error';
  if (status === 401 || status === 403) return 'warning';
  if (status >= 400) return 'error';
  return 'info';
}

/**
 * Generate description for toast
 */
function getErrorDescription(error: ApiError): string | undefined {
  if (error.errorCode) {
    return `Mã lỗi: ${error.errorCode}`;
  }
  
  // Chỉ hiển thị thêm info trong development
  if (import.meta.env.DEV) {
    return `${error.method} ${error.url} (${error.duration}ms)`;
  }
  
  return undefined;
}

/**
 * Hook đơn giản để lấy error message từ mutation/query error
 */
export function useErrorMessage() {
  return useCallback((error: unknown): string => {
    return getErrorMessage(error);
  }, []);
}

export default useApiError;
