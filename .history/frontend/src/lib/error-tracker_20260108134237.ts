import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

interface RequestInfo {
  url: string;
  method: string;
  startTime: number;
  config: InternalAxiosRequestConfig;
}

interface ErrorLog {
  timestamp: Date;
  url: string;
  method: string;
  status?: number;
  message: string;
  duration: number;
  requestData?: any;
  responseData?: any;
}

class ErrorTracker {
  private pendingRequests: Map<string, RequestInfo> = new Map();
  private errorLogs: ErrorLog[] = [];
  private maxLogs = 100;

  private getRequestKey(config: InternalAxiosRequestConfig): string {
    return `${config.method}-${config.url}-${Date.now()}`;
  }

  startRequest(config: InternalAxiosRequestConfig): void {
    const key = this.getRequestKey(config);
    this.pendingRequests.set(key, {
      url: config.url || '',
      method: config.method?.toUpperCase() || 'GET',
      startTime: Date.now(),
      config,
    });
    
    // Store key in config for later retrieval
    (config as any)._requestKey = key;
  }

  trackSuccess(response: AxiosResponse): void {
    const key = (response.config as any)._requestKey;
    if (key) {
      this.pendingRequests.delete(key);
    }
  }

  trackError(error: AxiosError): void {
    const config = error.config;
    const key = config ? (config as any)._requestKey : null;
    const requestInfo = key ? this.pendingRequests.get(key) : null;
    
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      url: config?.url || 'unknown',
      method: config?.method?.toUpperCase() || 'unknown',
      status: error.response?.status,
      message: error.message,
      duration: requestInfo ? Date.now() - requestInfo.startTime : 0,
      requestData: config?.data,
      responseData: error.response?.data,
    };

    this.errorLogs.unshift(errorLog);
    
    // Keep only recent logs
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs = this.errorLogs.slice(0, this.maxLogs);
    }

    if (key) {
      this.pendingRequests.delete(key);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('[API Error]', {
        url: errorLog.url,
        method: errorLog.method,
        status: errorLog.status,
        message: errorLog.message,
        duration: `${errorLog.duration}ms`,
      });
    }
  }

  getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  clearLogs(): void {
    this.errorLogs = [];
  }

  getRecentErrors(count: number = 10): ErrorLog[] {
    return this.errorLogs.slice(0, count);
  }
}

export const errorTracker = new ErrorTracker();
