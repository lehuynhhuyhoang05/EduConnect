import axios, { AxiosError } from 'axios';
import { errorTracker, ApiError } from './error-tracker';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor to add auth token and start tracking
api.interceptors.request.use(
  (config) => {
    // Start tracking request
    errorTracker.startRequest(config);
    
    // Add auth token
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    errorTracker.trackError(error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and track
api.interceptors.response.use(
  (response) => {
    // Track successful response
    errorTracker.trackSuccess(response);
    return response;
  },
  (error: AxiosError) => {
    // Track error details
    const apiError = errorTracker.trackError(error);
    
    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      // Token expired or invalid - clear tokens and redirect
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Don't redirect if already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Enhance error object with parsed info
    const enhancedError = error as AxiosError & { apiError: ApiError };
    enhancedError.apiError = apiError;
    
    return Promise.reject(enhancedError);
  }
);

// Export error tracker for external use
export { errorTracker } from './error-tracker';
export type { ApiError } from './error-tracker';

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; role: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Classes API
export const classesApi = {
  getAll: () => api.get('/classes'),
  getById: (id: string) => api.get(`/classes/${id}`),
  create: (data: any) => api.post('/classes', data),
  update: (id: string, data: any) => api.put(`/classes/${id}`, data),
  delete: (id: string) => api.delete(`/classes/${id}`),
  join: (code: string) => api.post('/classes/join', { code }),
  getMembers: (id: string) => api.get(`/classes/${id}/members`),
};

// Live Sessions API
export const liveSessionsApi = {
  getAll: () => api.get('/live-sessions'),
  getById: (id: string) => api.get(`/live-sessions/${id}`),
  create: (data: any) => api.post('/live-sessions', data),
  join: (id: string) => api.post(`/live-sessions/${id}/join`),
  leave: (id: string) => api.post(`/live-sessions/${id}/leave`),
  end: (id: string) => api.post(`/live-sessions/${id}/end`),
};

// Assignments API
export const assignmentsApi = {
  getAll: (classId?: string) => 
    api.get('/assignments', { params: { classId } }),
  getById: (id: string) => api.get(`/assignments/${id}`),
  create: (data: any) => api.post('/assignments', data),
  update: (id: string, data: any) => api.put(`/assignments/${id}`, data),
  delete: (id: string) => api.delete(`/assignments/${id}`),
  submit: (id: string, data: FormData) => 
    api.post(`/assignments/${id}/submit`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  grade: (id: string, submissionId: string, data: any) =>
    api.post(`/assignments/${id}/submissions/${submissionId}/grade`, data),
};

// Notifications API
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
};

export default api;
