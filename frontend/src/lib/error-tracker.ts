/**
 * Error Tracker - Hệ thống tracking và debug lỗi API
 * Giúp dễ dàng theo dõi và debug các lỗi từ backend
 */

import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// ============================================================
// Types
// ============================================================

export interface ApiError {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  status: number | null;
  statusText: string;
  message: string;
  errorCode?: string;
  requestData?: unknown;
  responseData?: unknown;
  duration: number;
  stack?: string;
}

export interface ApiLog {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  status: number;
  duration: number;
  success: boolean;
}

type ErrorHandler = (error: ApiError) => void;

// ============================================================
// Error Tracker Class
// ============================================================

class ErrorTracker {
  private errors: ApiError[] = [];
  private logs: ApiLog[] = [];
  private maxErrors = 100;
  private maxLogs = 500;
  private isEnabled = true;
  private handlers: ErrorHandler[] = [];
  private requestStartTimes = new Map<string, number>();

  constructor() {
    // Chỉ enable trong development
    this.isEnabled = import.meta.env.DEV;
  }

  // Tạo unique ID cho mỗi request
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Bắt đầu tracking một request
  startRequest(config: InternalAxiosRequestConfig): string {
    const requestId = this.generateRequestId();
    this.requestStartTimes.set(requestId, Date.now());
    
    // Attach requestId vào config để dùng sau
    (config as any).__requestId = requestId;
    
    if (this.isEnabled) {
      console.group(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      console.log('Headers:', config.headers);
      if (config.data) {
        console.log('Body:', this.sanitizeData(config.data));
      }
      if (config.params) {
        console.log('Params:', config.params);
      }
      console.groupEnd();
    }
    
    return requestId;
  }

  // Xử lý response thành công
  trackSuccess(response: AxiosResponse): void {
    const config = response.config as any;
    const requestId = config.__requestId;
    const startTime = this.requestStartTimes.get(requestId) || Date.now();
    const duration = Date.now() - startTime;
    
    this.requestStartTimes.delete(requestId);

    const log: ApiLog = {
      id: requestId || this.generateRequestId(),
      timestamp: new Date(),
      method: config.method?.toUpperCase() || 'GET',
      url: config.url || '',
      status: response.status,
      duration,
      success: true,
    };

    this.addLog(log);

    if (this.isEnabled) {
      console.log(
        `✅ API Success: ${log.method} ${log.url} - ${log.status} (${duration}ms)`
      );
    }
  }

  // Xử lý lỗi
  trackError(error: AxiosError): ApiError {
    const config = error.config as any;
    const requestId = config?.__requestId;
    const startTime = this.requestStartTimes.get(requestId) || Date.now();
    const duration = Date.now() - startTime;
    
    this.requestStartTimes.delete(requestId);

    const responseData = error.response?.data as any;
    
    const apiError: ApiError = {
      id: requestId || this.generateRequestId(),
      timestamp: new Date(),
      method: config?.method?.toUpperCase() || 'UNKNOWN',
      url: config?.url || 'unknown',
      status: error.response?.status || null,
      statusText: error.response?.statusText || 'Network Error',
      message: this.extractErrorMessage(error),
      errorCode: responseData?.errorCode || responseData?.code,
      requestData: this.sanitizeData(config?.data),
      responseData: responseData,
      duration,
      stack: error.stack,
    };

    this.addError(apiError);
    this.notifyHandlers(apiError);
    this.logError(apiError);

    return apiError;
  }

  // Trích xuất message lỗi từ response
  private extractErrorMessage(error: AxiosError): string {
    const responseData = error.response?.data as any;
    
    // Backend có thể trả về message trong nhiều format khác nhau
    if (responseData?.message) {
      if (Array.isArray(responseData.message)) {
        return responseData.message.join(', ');
      }
      return responseData.message;
    }
    
    if (responseData?.error) {
      return responseData.error;
    }

    if (error.message) {
      return error.message;
    }

    // Default messages theo status code
    const statusMessages: Record<number, string> = {
      400: 'Yêu cầu không hợp lệ',
      401: 'Chưa đăng nhập hoặc phiên đăng nhập hết hạn',
      403: 'Không có quyền truy cập',
      404: 'Không tìm thấy tài nguyên',
      409: 'Dữ liệu bị xung đột',
      422: 'Dữ liệu không hợp lệ',
      429: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
      500: 'Lỗi máy chủ nội bộ',
      502: 'Không thể kết nối đến máy chủ',
      503: 'Dịch vụ tạm thời không khả dụng',
    };

    return statusMessages[error.response?.status || 0] || 'Đã xảy ra lỗi không xác định';
  }

  // Loại bỏ thông tin nhạy cảm
  private sanitizeData(data: unknown): unknown {
    if (!data) return undefined;
    
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return data;
      }
    }

    if (typeof data !== 'object') return data;

    const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey'];
    const sanitized = { ...data as Record<string, unknown> };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  // Log lỗi ra console với format đẹp
  private logError(error: ApiError): void {
    if (!this.isEnabled) return;

    console.group(`❌ API Error: ${error.method} ${error.url}`);
    console.error('Status:', error.status, error.statusText);
    console.error('Message:', error.message);
    if (error.errorCode) {
      console.error('Error Code:', error.errorCode);
    }
    if (error.requestData) {
      console.error('Request Data:', error.requestData);
    }
    if (error.responseData) {
      console.error('Response Data:', error.responseData);
    }
    console.error('Duration:', error.duration, 'ms');
    console.error('Timestamp:', error.timestamp.toISOString());
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    console.groupEnd();
  }

  // Thêm error vào danh sách
  private addError(error: ApiError): void {
    this.errors.unshift(error);
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }
  }

  // Thêm log vào danh sách
  private addLog(log: ApiLog): void {
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  // Đăng ký handler để xử lý lỗi
  onError(handler: ErrorHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  // Thông báo cho tất cả handlers
  private notifyHandlers(error: ApiError): void {
    this.handlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('Error in error handler:', e);
      }
    });
  }

  // Lấy danh sách errors
  getErrors(): ApiError[] {
    return [...this.errors];
  }

  // Lấy danh sách logs
  getLogs(): ApiLog[] {
    return [...this.logs];
  }

  // Lấy error gần nhất
  getLastError(): ApiError | null {
    return this.errors[0] || null;
  }

  // Clear tất cả errors
  clearErrors(): void {
    this.errors = [];
  }

  // Clear tất cả logs
  clearLogs(): void {
    this.logs = [];
  }

  // Xuất errors ra JSON để debug
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  // Xuất thống kê
  getStats(): {
    totalErrors: number;
    totalRequests: number;
    successRate: number;
    errorsByStatus: Record<number, number>;
    averageDuration: number;
  } {
    const totalErrors = this.errors.length;
    const totalRequests = this.logs.length;
    const successRate = totalRequests > 0 
      ? ((totalRequests - totalErrors) / totalRequests) * 100 
      : 100;

    const errorsByStatus: Record<number, number> = {};
    this.errors.forEach(e => {
      if (e.status) {
        errorsByStatus[e.status] = (errorsByStatus[e.status] || 0) + 1;
      }
    });

    const totalDuration = this.logs.reduce((sum, log) => sum + log.duration, 0);
    const averageDuration = totalRequests > 0 ? totalDuration / totalRequests : 0;

    return {
      totalErrors,
      totalRequests,
      successRate: Math.round(successRate * 100) / 100,
      errorsByStatus,
      averageDuration: Math.round(averageDuration),
    };
  }

  // Enable/Disable tracking
  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

// ============================================================
// Helper functions
// ============================================================

/**
 * Tạo user-friendly error message từ ApiError
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Nếu là AxiosError đã được track
    const lastError = errorTracker.getLastError();
    if (lastError) {
      return lastError.message;
    }
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }

  return 'Đã xảy ra lỗi không xác định';
}

/**
 * Log errors vào console (development only)
 */
export function debugError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
}

// Export type cho sử dụng bên ngoài
export type { ErrorHandler };
