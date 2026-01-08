import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { errorTracker } from '@/lib/error-tracker';
import type {
  AuthResponse,
  LoginDto,
  RegisterDto,
  User,
  UpdateProfileDto,
  ChangePasswordDto,
  Class,
  CreateClassDto,
  UpdateClassDto,
  QueryClassDto,
  ClassMember,
  Announcement,
  CreateAnnouncementDto,
  Assignment,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  QueryAssignmentDto,
  Submission,
  CreateSubmissionDto,
  GradeSubmissionDto,
  LiveSession,
  CreateSessionDto,
  UpdateSessionDto,
  QuerySessionDto,
  SessionParticipant,
  Notification,
  QueryNotificationDto,
  ChatMessage,
  SendMessageDto,
  QueryMessageDto,
  UploadedFile,
  QueryFileDto,
  PaginatedResponse,
  WebRTCConfig,
  Poll,
  CreatePollDto,
  GradebookEntry,
} from '@/types';

// ============================================
// API CLIENT SETUP
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Token helpers
export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

export const clearTokens = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - add auth token and start tracking
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Start tracking request
    errorTracker.startRequest(config);
    
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    errorTracker.trackError(error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh and track errors
apiClient.interceptors.response.use(
  (response) => {
    // Track successful response
    errorTracker.trackSuccess(response);
    return response;
  },
  async (error: AxiosError) => {
    // Track error
    errorTracker.trackError(error);
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post<{ accessToken: string; refreshToken: string }>(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken }
          );

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          setTokens(accessToken, newRefreshToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================

export const authApi = {
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  logoutAll: async (): Promise<void> => {
    await apiClient.post('/auth/logout-all');
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },
};

// ============================================
// USERS API
// ============================================

export const usersApi = {
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileDto): Promise<User> => {
    const response = await apiClient.put<User>('/users/profile', data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordDto): Promise<void> => {
    await apiClient.put('/users/change-password', data);
  },

  getUser: async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  getUsers: async (params?: { search?: string; role?: string; page?: number; limit?: number }): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>('/users', { params });
    return response.data;
  },

  getStats: async (): Promise<{ totalUsers: number; teachers: number; students: number; activeToday: number }> => {
    const response = await apiClient.get('/users/stats');
    return response.data;
  },
};

// ============================================
// CLASSES API
// ============================================

export const classesApi = {
  create: async (data: CreateClassDto): Promise<Class> => {
    const response = await apiClient.post<Class>('/classes', data);
    return response.data;
  },

  getAll: async (params?: QueryClassDto): Promise<PaginatedResponse<Class>> => {
    const response = await apiClient.get<PaginatedResponse<Class>>('/classes', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Class> => {
    const response = await apiClient.get<Class>(`/classes/${id}`);
    return response.data;
  },

  update: async (id: number, data: UpdateClassDto): Promise<Class> => {
    const response = await apiClient.put<Class>(`/classes/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/classes/${id}`);
  },

  reactivate: async (id: number): Promise<Class> => {
    const response = await apiClient.post<Class>(`/classes/${id}/reactivate`);
    return response.data;
  },

  join: async (classCode: string): Promise<Class> => {
    const response = await apiClient.post<Class>('/classes/join', { classCode });
    return response.data;
  },

  leave: async (id: number): Promise<void> => {
    await apiClient.post(`/classes/${id}/leave`);
  },

  getMembers: async (id: number): Promise<ClassMember[]> => {
    const response = await apiClient.get<ClassMember[]>(`/classes/${id}/members`);
    return response.data;
  },

  removeMember: async (classId: number, userId: number): Promise<void> => {
    await apiClient.delete(`/classes/${classId}/members/${userId}`);
  },

  // Announcements
  getAnnouncements: async (classId: number): Promise<Announcement[]> => {
    const response = await apiClient.get<Announcement[]>(`/classes/${classId}/announcements`);
    return response.data;
  },

  createAnnouncement: async (classId: number, data: CreateAnnouncementDto): Promise<Announcement> => {
    const response = await apiClient.post<Announcement>(`/classes/${classId}/announcements`, data);
    return response.data;
  },

  updateAnnouncement: async (classId: number, announcementId: number, data: Partial<CreateAnnouncementDto>): Promise<Announcement> => {
    const response = await apiClient.put<Announcement>(`/classes/${classId}/announcements/${announcementId}`, data);
    return response.data;
  },

  deleteAnnouncement: async (classId: number, announcementId: number): Promise<void> => {
    await apiClient.delete(`/classes/${classId}/announcements/${announcementId}`);
  },

  markAnnouncementRead: async (classId: number, announcementId: number): Promise<void> => {
    await apiClient.post(`/classes/${classId}/announcements/${announcementId}/read`);
  },

  // Gradebook
  getGradebook: async (classId: number): Promise<GradebookEntry[]> => {
    const response = await apiClient.get<GradebookEntry[]>(`/classes/${classId}/gradebook/students`);
    return response.data;
  },

  getMyGrades: async (classId: number): Promise<GradebookEntry> => {
    const response = await apiClient.get<GradebookEntry>(`/classes/${classId}/gradebook/my-grades`);
    return response.data;
  },

  exportGradebook: async (classId: number): Promise<Blob> => {
    const response = await apiClient.get(`/classes/${classId}/gradebook/export`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// ============================================
// ASSIGNMENTS API
// ============================================

export const assignmentsApi = {
  create: async (classId: number, data: CreateAssignmentDto): Promise<Assignment> => {
    const response = await apiClient.post<Assignment>(`/classes/${classId}/assignments`, data);
    return response.data;
  },

  getAll: async (params?: QueryAssignmentDto): Promise<PaginatedResponse<Assignment>> => {
    const response = await apiClient.get<PaginatedResponse<Assignment>>('/assignments', { params });
    return response.data;
  },

  getByClass: async (classId: number, params?: QueryAssignmentDto): Promise<PaginatedResponse<Assignment>> => {
    const response = await apiClient.get<PaginatedResponse<Assignment>>(`/classes/${classId}/assignments`, { params });
    return response.data;
  },

  getById: async (id: number): Promise<Assignment> => {
    const response = await apiClient.get<Assignment>(`/assignments/${id}`);
    return response.data;
  },

  update: async (id: number, data: UpdateAssignmentDto): Promise<Assignment> => {
    const response = await apiClient.put<Assignment>(`/assignments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/assignments/${id}`);
  },

  // Submissions
  submit: async (assignmentId: number, data: CreateSubmissionDto): Promise<Submission> => {
    const response = await apiClient.post<Submission>(`/assignments/${assignmentId}/submit`, data);
    return response.data;
  },

  getSubmissions: async (assignmentId: number): Promise<PaginatedResponse<Submission>> => {
    const response = await apiClient.get<PaginatedResponse<Submission>>(`/assignments/${assignmentId}/submissions`, {
      params: { limit: 100 }, // Backend max limit is 100
    });
    return response.data;
  },

  getMySubmission: async (assignmentId: number): Promise<Submission | null> => {
    try {
      const response = await apiClient.get<Submission>(`/assignments/${assignmentId}/my-submission`);
      return response.data;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  grade: async (submissionId: number, data: GradeSubmissionDto): Promise<Submission> => {
    const response = await apiClient.post<Submission>(`/submissions/${submissionId}/grade`, data);
    return response.data;
  },

  returnSubmission: async (submissionId: number, feedback: string): Promise<Submission> => {
    const response = await apiClient.post<Submission>(`/submissions/${submissionId}/return`, { feedback });
    return response.data;
  },

  getStats: async (assignmentId: number): Promise<{
    totalStudents: number;
    submitted: number;
    graded: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  }> => {
    const response = await apiClient.get(`/assignments/${assignmentId}/stats`);
    return response.data;
  },

  exportGrades: async (assignmentId: number): Promise<Blob> => {
    const response = await apiClient.get(`/assignments/${assignmentId}/export-grades`, {
      responseType: 'blob',
    });
    return response.data;
  },

  bulkGrade: async (assignmentId: number, grades: Array<{ submissionId: number; score: number; feedback?: string }>): Promise<{ success: number; failed: number }> => {
    const response = await apiClient.post(`/assignments/${assignmentId}/bulk-grade`, { grades });
    return response.data;
  },
};

// ============================================
// LIVE SESSIONS API
// ============================================

export const liveSessionsApi = {
  create: async (classId: number, data: CreateSessionDto): Promise<LiveSession> => {
    const response = await apiClient.post<LiveSession>(`/classes/${classId}/sessions`, data);
    return response.data;
  },

  getAll: async (params?: QuerySessionDto): Promise<PaginatedResponse<LiveSession>> => {
    const response = await apiClient.get<PaginatedResponse<LiveSession>>('/sessions', { params });
    return response.data;
  },

  getByClass: async (classId: number, params?: QuerySessionDto): Promise<PaginatedResponse<LiveSession>> => {
    const response = await apiClient.get<PaginatedResponse<LiveSession>>(`/classes/${classId}/sessions`, { params });
    return response.data;
  },

  getById: async (id: number): Promise<LiveSession> => {
    const response = await apiClient.get<LiveSession>(`/sessions/${id}`);
    return response.data;
  },

  update: async (id: number, data: UpdateSessionDto): Promise<LiveSession> => {
    const response = await apiClient.put<LiveSession>(`/sessions/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/sessions/${id}`);
  },

  start: async (id: number): Promise<LiveSession> => {
    const response = await apiClient.post<LiveSession>(`/sessions/${id}/start`);
    return response.data;
  },

  end: async (id: number): Promise<LiveSession> => {
    const response = await apiClient.post<LiveSession>(`/sessions/${id}/end`);
    return response.data;
  },

  join: async (id: number, socketId: string): Promise<SessionParticipant> => {
    const response = await apiClient.post<SessionParticipant>(`/sessions/${id}/join`, { socketId });
    return response.data;
  },

  leave: async (id: number): Promise<void> => {
    await apiClient.post(`/sessions/${id}/leave`);
  },

  getParticipants: async (id: number): Promise<SessionParticipant[]> => {
    const response = await apiClient.get<SessionParticipant[]>(`/sessions/${id}/stats`);
    return response.data;
  },

  getWebRTCConfig: async (id: number): Promise<WebRTCConfig> => {
    const response = await apiClient.get<WebRTCConfig>(`/sessions/${id}/ice-servers`);
    return response.data;
  },

  // Polls
  createPoll: async (sessionId: number, data: CreatePollDto): Promise<Poll> => {
    const response = await apiClient.post<Poll>(`/sessions/${sessionId}/polls`, data);
    return response.data;
  },

  startPoll: async (sessionId: number, pollId: number): Promise<Poll> => {
    const response = await apiClient.post<Poll>(`/sessions/${sessionId}/polls/${pollId}/start`);
    return response.data;
  },

  endPoll: async (sessionId: number, pollId: number): Promise<Poll> => {
    const response = await apiClient.post<Poll>(`/sessions/${sessionId}/polls/${pollId}/end`);
    return response.data;
  },

  votePoll: async (sessionId: number, pollId: number, optionIds: number[]): Promise<void> => {
    await apiClient.post(`/sessions/${sessionId}/polls/${pollId}/vote`, { optionIds });
  },

  getPolls: async (sessionId: number): Promise<Poll[]> => {
    const response = await apiClient.get<Poll[]>(`/sessions/${sessionId}/polls`);
    return response.data;
  },

  // Hand Raise
  raiseHand: async (sessionId: number): Promise<void> => {
    await apiClient.post(`/sessions/${sessionId}/hand-raise`);
  },

  lowerHand: async (sessionId: number): Promise<void> => {
    await apiClient.delete(`/sessions/${sessionId}/hand-raise`);
  },

  getHandRaiseQueue: async (sessionId: number): Promise<{ userId: number; user: User; raisedAt: string }[]> => {
    const response = await apiClient.get(`/sessions/${sessionId}/hand-raise`);
    return response.data;
  },

  // Recording
  startRecording: async (sessionId: number): Promise<void> => {
    await apiClient.post(`/sessions/${sessionId}/recording/start`);
  },

  stopRecording: async (sessionId: number): Promise<void> => {
    await apiClient.post(`/sessions/${sessionId}/recording/stop`);
  },

  // Attendance
  startAttendance: async (sessionId: number): Promise<{ code: string }> => {
    const response = await apiClient.post(`/sessions/${sessionId}/attendance/start`);
    return response.data;
  },

  checkIn: async (sessionId: number, code: string): Promise<void> => {
    await apiClient.post(`/sessions/${sessionId}/attendance/check-in`, { code });
  },

  getAttendance: async (sessionId: number): Promise<{ userId: number; user: User; checkedInAt: string }[]> => {
    const response = await apiClient.get(`/sessions/${sessionId}/attendance`);
    return response.data;
  },
};

// ============================================
// NOTIFICATIONS API
// ============================================

export const notificationsApi = {
  getAll: async (params?: QueryNotificationDto): Promise<{ notifications: Notification[]; total: number; unread: number }> => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return response.data.count;
  },

  getById: async (id: number): Promise<Notification> => {
    const response = await apiClient.get<Notification>(`/notifications/${id}`);
    return response.data;
  },

  markAsRead: async (notificationIds: number[]): Promise<void> => {
    await apiClient.post('/notifications/mark-read', { notificationIds });
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/notifications/mark-all-read');
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },

  deleteAll: async (): Promise<void> => {
    await apiClient.delete('/notifications');
  },
};

// ============================================
// CHAT API
// ============================================

export const chatApi = {
  getRooms: async (): Promise<{ type: 'CLASS' | 'SESSION'; id: number; name: string; lastMessage?: ChatMessage }[]> => {
    const response = await apiClient.get('/chat/rooms');
    return response.data;
  },

  getClassMessages: async (classId: number, params?: QueryMessageDto): Promise<PaginatedResponse<ChatMessage>> => {
    const response = await apiClient.get<PaginatedResponse<ChatMessage>>(`/classes/${classId}/messages`, { params });
    return response.data;
  },

  sendClassMessage: async (classId: number, data: SendMessageDto): Promise<ChatMessage> => {
    const response = await apiClient.post<ChatMessage>(`/classes/${classId}/messages`, data);
    return response.data;
  },

  getSessionMessages: async (sessionId: number, params?: QueryMessageDto): Promise<PaginatedResponse<ChatMessage>> => {
    const response = await apiClient.get<PaginatedResponse<ChatMessage>>(`/sessions/${sessionId}/messages`, { params });
    return response.data;
  },

  sendSessionMessage: async (sessionId: number, data: SendMessageDto): Promise<ChatMessage> => {
    const response = await apiClient.post<ChatMessage>(`/sessions/${sessionId}/messages`, data);
    return response.data;
  },

  editMessage: async (messageId: number, message: string): Promise<ChatMessage> => {
    const response = await apiClient.put<ChatMessage>(`/chat/messages/${messageId}`, { message });
    return response.data;
  },

  deleteMessage: async (messageId: number): Promise<void> => {
    await apiClient.delete(`/chat/messages/${messageId}`);
  },

  searchMessages: async (roomType: 'CLASS' | 'SESSION', roomId: number, query: string): Promise<ChatMessage[]> => {
    const response = await apiClient.get<ChatMessage[]>(`/chat/${roomType.toLowerCase()}/${roomId}/search`, {
      params: { q: query },
    });
    return response.data;
  },
};

// ============================================
// FILES API
// ============================================

export const filesApi = {
  upload: async (file: File, onProgress?: (progress: number) => void): Promise<UploadedFile> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<UploadedFile>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  },

  uploadMultiple: async (files: File[], onProgress?: (progress: number) => void): Promise<UploadedFile[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const response = await apiClient.post<UploadedFile[]>('/files/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  },

  getAll: async (params?: QueryFileDto): Promise<PaginatedResponse<UploadedFile>> => {
    const response = await apiClient.get<PaginatedResponse<UploadedFile>>('/files', { params });
    return response.data;
  },

  getById: async (id: number): Promise<UploadedFile> => {
    const response = await apiClient.get<UploadedFile>(`/files/${id}`);
    return response.data;
  },

  download: async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`/files/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/files/${id}`);
  },
};

export default apiClient;
