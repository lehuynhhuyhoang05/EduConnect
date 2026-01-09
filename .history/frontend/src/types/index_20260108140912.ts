// ============================================
// USER & AUTH TYPES
// ============================================

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface UpdateProfileDto {
  name?: string;
  avatar?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

// ============================================
// CLASS TYPES
// ============================================

export interface Class {
  id: string;
  name: string;
  description?: string;
  code: string;
  coverImage?: string;
  teacherId: string;
  teacher?: User;
  isActive: boolean;
  studentCount?: number;
  membersCount?: number;
  _count?: {
    members?: number;
    assignments?: number;
    sessions?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassDto {
  name: string;
  description?: string;
  coverImage?: string;
}

export interface CreateClassData {
  name: string;
  description?: string;
  coverImage?: string;
}

export interface UpdateClassDto {
  name?: string;
  description?: string;
  coverImage?: string;
  isActive?: boolean;
}

export interface QueryClassDto {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ClassMember {
  id: string;
  userId: string;
  classId: string;
  user: User;
  role: 'TEACHER' | 'STUDENT';
  joinedAt: string;
}

export interface JoinClassData {
  code: string;
}

// ============================================
// ANNOUNCEMENT TYPES
// ============================================

export interface Announcement {
  id: string;
  classId: string;
  authorId: string;
  author?: User;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementDto {
  classId: string;
  title: string;
  content: string;
  isPinned?: boolean;
}

// ============================================
// ASSIGNMENT TYPES
// ============================================

export interface Assignment {
  id: string;
  classId: string;
  class?: Class;
  title: string;
  description?: string;
  dueDate: string;
  maxScore: number;
  attachments?: string[];
  submissionCount?: number;
  gradedCount?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentDto {
  classId: string;
  title: string;
  description?: string;
  dueDate: string;
  maxScore?: number;
  attachments?: string[];
}

export interface CreateAssignmentData {
  classId: string;
  title: string;
  description?: string;
  dueDate: string;
  maxScore?: number;
  attachments?: string[];
}

export interface UpdateAssignmentDto {
  title?: string;
  description?: string;
  dueDate?: string;
  maxScore?: number;
  attachments?: string[];
}

export interface QueryAssignmentDto {
  page?: number;
  limit?: number;
  classId?: string;
  status?: 'all' | 'active' | 'past' | 'upcoming';
}

// ============================================
// SUBMISSION TYPES
// ============================================

export interface Submission {
  id: string;
  assignmentId: string;
  assignment?: Assignment;
  studentId: string;
  student?: User;
  content?: string;
  attachments?: string[];
  score?: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string;
  grader?: User;
  isLate: boolean;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubmissionDto {
  assignmentId: string;
  content?: string;
  attachments?: string[];
}

export interface GradeSubmissionDto {
  score: number;
  feedback?: string;
}

export interface BulkGradeDto {
  submissions: {
    submissionId: string;
    score: number;
    feedback?: string;
  }[];
}

// ============================================
// LIVE SESSION TYPES
// ============================================

export type LiveSessionStatus = 'scheduled' | 'active' | 'ended';

export interface LiveSession {
  id: string;
  classId: string;
  class?: Class;
  hostId: string;
  host?: User;
  title: string;
  description?: string;
  startTime: string;
  scheduledAt?: string;
  endTime?: string;
  duration?: number;
  status: LiveSessionStatus;
  participantCount?: number;
  participantsCount?: number;
  _count?: {
    participants?: number;
  };
  maxParticipants?: number;
  isRecording?: boolean;
  recordingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionDto {
  classId: string;
  title: string;
  description?: string;
  startTime: string;
  duration?: number;
  maxParticipants?: number;
}

export interface CreateLiveSessionData {
  classId: string;
  title: string;
  description?: string;
  startTime: string;
  duration?: number;
  maxParticipants?: number;
}

export interface UpdateSessionDto {
  title?: string;
  description?: string;
  startTime?: string;
  duration?: number;
  maxParticipants?: number;
}

export interface QuerySessionDto {
  page?: number;
  limit?: number;
  classId?: string;
  status?: LiveSessionStatus;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  user?: User;
  joinedAt: string;
  leftAt?: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export type NotificationType = 
  | 'ASSIGNMENT_CREATED'
  | 'ASSIGNMENT_DUE'
  | 'SUBMISSION_GRADED'
  | 'SESSION_STARTING'
  | 'SESSION_STARTED'
  | 'CLASS_ANNOUNCEMENT'
  | 'NEW_MESSAGE'
  | 'SYSTEM';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface QueryNotificationDto {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

// ============================================
// CHAT TYPES
// ============================================

export interface ChatMessage {
  id: string;
  conversationId?: string;
  classId?: string;
  senderId: string;
  sender?: User;
  content: string;
  attachments?: string[];
  isRead?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageDto {
  conversationId?: string;
  classId?: string;
  content: string;
  attachments?: string[];
}

export interface QueryMessageDto {
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
}

// ============================================
// FILE TYPES
// ============================================

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploaderId: string;
  createdAt: string;
}

export interface QueryFileDto {
  page?: number;
  limit?: number;
  type?: string;
}

// ============================================
// WEBRTC TYPES
// ============================================

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  sessionId: string;
  userId: string;
  token: string;
}

// ============================================
// POLL TYPES
// ============================================

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  sessionId: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  createdAt: string;
  endedAt?: string;
}

export interface CreatePollDto {
  sessionId: string;
  question: string;
  options: string[];
}

// ============================================
// GRADEBOOK TYPES
// ============================================

export interface GradebookEntry {
  assignment: Assignment;
  submission?: Submission;
  score?: number;
  maxScore: number;
  percentage?: number;
  isSubmitted: boolean;
  isGraded: boolean;
  isLate: boolean;
}

export interface StudentGradebook {
  student: User;
  entries: GradebookEntry[];
  totalScore: number;
  maxTotalScore: number;
  averagePercentage: number;
}

// ============================================
// PAGINATION & RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============================================
// UTILITY TYPES
// ============================================

export interface SelectOption {
  value: string;
  label: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}
