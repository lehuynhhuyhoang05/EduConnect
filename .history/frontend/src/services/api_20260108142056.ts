import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ============================================
// API CONFIGURATION
// ============================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// REQUEST INTERCEPTOR
// ============================================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // No refresh token, logout
        handleLogout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    return Promise.reject(error);
  }
);

// ============================================
// LOGOUT HELPER
// ============================================

function handleLogout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  // Redirect to login if not already there
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// ============================================
// API HELPERS
// ============================================

export const apiHelpers = {
  // Generic GET request
  get: async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
    const response = await api.get<T>(url, { params });
    return response.data;
  },

  // Generic POST request
  post: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await api.post<T>(url, data);
    return response.data;
  },

  // Generic PUT request
  put: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await api.put<T>(url, data);
    return response.data;
  },

  // Generic PATCH request
  patch: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await api.patch<T>(url, data);
    return response.data;
  },

  // Generic DELETE request
  delete: async <T>(url: string): Promise<T> => {
    const response = await api.delete<T>(url);
    return response.data;
  },

  // Upload file
  uploadFile: async <T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  // Upload multiple files
  uploadFiles: async <T>(
    url: string,
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<T> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await api.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  },

  // Download file
  downloadFile: async (url: string, filename: string): Promise<void> => {
    const response = await api.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

// ============================================
// AUTH API
// ============================================

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: { email: string; password: string; name: string; role?: string }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
    handleLogout();
  },

  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: { name?: string; avatar?: string }) => {
    const response = await api.patch('/auth/profile', data);
    return response.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },
};

// ============================================
// CLASSES API
// ============================================

export const classesApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await api.get('/classes', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  create: async (data: { name: string; description?: string }) => {
    const response = await api.post('/classes', data);
    return response.data;
  },

  update: async (id: string, data: { name?: string; description?: string }) => {
    const response = await api.put(`/classes/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/classes/${id}`);
    return response.data;
  },

  join: async (code: string) => {
    const response = await api.post('/classes/join', { code });
    return response.data;
  },

  leave: async (id: string) => {
    const response = await api.post(`/classes/${id}/leave`);
    return response.data;
  },

  getMembers: async (id: string) => {
    const response = await api.get(`/classes/${id}/members`);
    return response.data;
  },

  removeMember: async (classId: string, memberId: string) => {
    const response = await api.delete(`/classes/${classId}/members/${memberId}`);
    return response.data;
  },

  getMyGrades: async (classId: number) => {
    const response = await api.get(`/classes/${classId}/gradebook/my-grades`);
    return response.data;
  },

  getGradebook: async (classId: number) => {
    const response = await api.get(`/classes/${classId}/gradebook`);
    return response.data;
  },
};

// ============================================
// ASSIGNMENTS API
// ============================================

export const assignmentsApi = {
  getAll: async (params?: { classId?: string; page?: number; limit?: number }) => {
    const response = await api.get('/assignments', { params });
    return response.data;
  },

  getByClass: async (classId: string) => {
    const response = await api.get(`/classes/${classId}/assignments`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/assignments/${id}`);
    return response.data;
  },

  create: async (classId: string, data: { title: string; description?: string; dueDate: string; maxScore?: number }) => {
    const response = await api.post(`/classes/${classId}/assignments`, data);
    return response.data;
  },

  update: async (id: string, data: { title?: string; description?: string; dueDate?: string; maxScore?: number }) => {
    const response = await api.put(`/assignments/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/assignments/${id}`);
    return response.data;
  },

  getSubmissions: async (assignmentId: string) => {
    const response = await api.get(`/assignments/${assignmentId}/submissions`);
    return response.data;
  },

  submit: async (assignmentId: string, data: { content?: string; attachments?: string[] }) => {
    const response = await api.post(`/assignments/${assignmentId}/submit`, data);
    return response.data;
  },

  grade: async (submissionId: string, data: { score: number; feedback?: string }) => {
    const response = await api.post(`/submissions/${submissionId}/grade`, data);
    return response.data;
  },

  // Alias for grade
  gradeSubmission: async (submissionId: string, data: { score: number; feedback?: string }) => {
    const response = await api.post(`/submissions/${submissionId}/grade`, data);
    return response.data;
  },

  getMySubmission: async (assignmentId: string) => {
    const response = await api.get(`/assignments/${assignmentId}/my-submission`);
    return response.data;
  },
};

// ============================================
// LIVE SESSIONS API
// ============================================

export const liveSessionsApi = {
  getAll: async (params?: { classId?: string; status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/sessions', { params });
    return response.data;
  },

  getByClass: async (classId: string) => {
    const response = await api.get(`/classes/${classId}/sessions`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/sessions/${id}`);
    return response.data;
  },

  create: async (classId: string, data: { title: string; description?: string; scheduledAt: string; duration?: number }) => {
    const response = await api.post(`/classes/${classId}/sessions`, data);
    return response.data;
  },

  update: async (id: string, data: { title?: string; description?: string; scheduledAt?: string; duration?: number }) => {
    const response = await api.put(`/sessions/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/sessions/${id}`);
    return response.data;
  },

  start: async (id: string) => {
    const response = await api.post(`/sessions/${id}/start`);
    return response.data;
  },

  end: async (id: string) => {
    const response = await api.post(`/sessions/${id}/end`);
    return response.data;
  },

  join: async (id: string) => {
    const response = await api.post(`/sessions/${id}/join`);
    return response.data;
  },

  leave: async (id: string) => {
    const response = await api.post(`/sessions/${id}/leave`);
    return response.data;
  },

  getParticipants: async (id: string) => {
    const response = await api.get(`/sessions/${id}/participants`);
    return response.data;
  },

  getWebRTCConfig: async () => {
    const response = await api.get('/sessions/webrtc-config');
    return response.data;
  },
};

// ============================================
// NOTIFICATIONS API
// ============================================

export const notificationsApi = {
  getAll: async (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/count');
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  deleteAll: async () => {
    const response = await api.delete('/notifications');
    return response.data;
  },
};

// ============================================
// CHAT API
// ============================================

export const chatApi = {
  getRooms: async () => {
    const response = await api.get('/chat/rooms');
    return response.data;
  },

  getClassMessages: async (classId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/classes/${classId}/messages`, { params });
    return response.data;
  },

  sendClassMessage: async (classId: string, data: { content: string; attachments?: string[] }) => {
    const response = await api.post(`/classes/${classId}/messages`, data);
    return response.data;
  },

  getSessionMessages: async (sessionId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/sessions/${sessionId}/messages`, { params });
    return response.data;
  },

  sendSessionMessage: async (sessionId: string, data: { content: string; attachments?: string[] }) => {
    const response = await api.post(`/sessions/${sessionId}/messages`, data);
    return response.data;
  },

  updateMessage: async (messageId: string, data: { content: string }) => {
    const response = await api.put(`/messages/${messageId}`, data);
    return response.data;
  },

  deleteMessage: async (messageId: string) => {
    const response = await api.delete(`/messages/${messageId}`);
    return response.data;
  },
};

// ============================================
// FILES API
// ============================================

export const filesApi = {
  upload: async (file: File, onProgress?: (progress: number) => void) => {
    return apiHelpers.uploadFile('/files/upload', file, onProgress);
  },

  uploadMultiple: async (files: File[], onProgress?: (progress: number) => void) => {
    return apiHelpers.uploadFiles('/files/upload-multiple', files, onProgress);
  },

  getAll: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get('/files', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/files/${id}`);
    return response.data;
  },

  download: async (id: string, filename: string) => {
    return apiHelpers.downloadFile(`/files/${id}/download`, filename);
  },

  delete: async (id: string) => {
    const response = await api.delete(`/files/${id}`);
    return response.data;
  },
};

// ============================================
// USERS API
// ============================================

export const usersApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string; role?: string }) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  update: async (id: string, data: { name?: string; role?: string; isActive?: boolean }) => {
    const response = await api.patch(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

export default api;
