// ============================================
// USER & AUTH TYPES
// ============================================

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface User {
  id: number | string;
  email: string;
  fullName: string;
  name?: string; // alias for fullName
  avatarUrl?: string | null;
  avatar?: string; // alias
  role: UserRole;
  isVerified?: boolean;
  isActive?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
}

// ============================================
// CLASS TYPES
// ============================================

export interface Class {
  id: number | string;
  name: string;
  description?: string | null;
  classCode: string;
  code?: string; // alias
  subject?: string | null;
  teacherId: number | string;
  teacher?: User;
  isActive: boolean;
  memberCount?: number;
  membersCount?: number; // alias
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
  subject?: string;
}

export interface UpdateClassDto {
  name?: string;
  description?: string;
  subject?: string;
  isActive?: boolean;
}

export interface JoinClassDto {
  code: string;
}

export interface QueryClassDto {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  myClasses?: boolean;
}

export interface ClassMember {
  id: number | string;
  userId: number | string;
  classId: number | string;
  user: User;
  role: 'TEACHER' | 'STUDENT';
  joinedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================
// ANNOUNCEMENT TYPES
// ============================================

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export interface Announcement {
  id: string;
  classId: number | string;
  authorId: number | string;
  authorName: string;
  title: string;
  content: string;
  isPinned: boolean;
  priority: AnnouncementPriority;
  allowComments: boolean;
  readBy: number[];
  comments: AnnouncementComment[];
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementComment {
  id: string;
  userId: number | string;
  userName: string;
  content: string;
  createdAt: string;
}

// ============================================
// ASSIGNMENT TYPES
// ============================================

export interface Assignment {
  id: number | string;
  classId: number | string;
  class?: Class;
  title: string;
  description?: string | null;
  dueDate: string;
  maxScore: number;
  attachments?: string[];
  isActive: boolean;
  submissionCount?: number;
  gradedCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentDto {
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

// ============================================
// SUBMISSION TYPES
// ============================================

export type SubmissionStatus = 'PENDING' | 'SUBMITTED' | 'GRADED' | 'LATE';

export interface Submission {
  id: number | string;
  assignmentId: number | string;
  assignment?: Assignment;
  userId: number | string;
  studentId?: number | string; // alias
  user?: User;
  student?: User; // alias
  content?: string | null;
  attachments?: string[];
  submittedAt: string;
  score?: number | null;
  feedback?: string | null;
  gradedAt?: string | null;
  gradedBy?: number | string | null;
  grader?: User;
  status: SubmissionStatus;
  isLate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GradeSubmissionDto {
  score: number;
  feedback?: string;
}

// ============================================
// LIVE SESSION TYPES
// ============================================

export type SessionStatus = 'scheduled' | 'live' | 'active' | 'ended' | 'cancelled';

export interface LiveSession {
  id: number | string;
  classId: number | string;
  class?: Class;
  title: string;
  description?: string | null;
  hostId: number | string;
  host?: User;
  scheduledAt: string;
  startTime?: string; // alias
  startedAt?: string | null;
  endedAt?: string | null;
  endTime?: string; // alias
  duration?: number;
  status: SessionStatus;
  participantCount?: number;
  participantsCount?: number; // alias
  _count?: {
    participants?: number;
  };
  maxParticipants?: number;
  isRecording?: boolean;
  recordingUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLiveSessionDto {
  title: string;
  description?: string;
  scheduledAt: string;
  duration?: number;
  maxParticipants?: number;
}

export interface SessionParticipant {
  id: number | string;
  sessionId: number | string;
  userId: number | string;
  user?: User;
  joinedAt: string;
  leftAt?: string | null;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
  isScreenSharing?: boolean;
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
  id: number | string;
  userId: number | string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

// ============================================
// CHAT TYPES
// ============================================

export interface Conversation {
  id: number | string;
  name?: string;
  isGroup: boolean;
  participants: User[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number | string;
  conversationId?: number | string;
  classId?: number | string;
  sessionId?: number | string;
  senderId: number | string;
  userId?: number | string; // alias
  sender?: User;
  userName?: string;
  content: string;
  attachments?: string[];
  isEdited?: boolean;
  timestamp?: Date | string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================
// GRADEBOOK TYPES
// ============================================

export interface GradeEntry {
  assignment: Assignment;
  submission?: Submission;
  score?: number | null;
  maxScore: number;
  status: 'PENDING' | 'SUBMITTED' | 'GRADED';
}

export interface StudentGradebook {
  userId: number | string;
  userFullName: string;
  grades: GradeEntry[];
  totalScore: number;
  maxTotalScore: number;
  percentage: number;
  letterGrade?: string;
}

// ============================================
// FILE TYPES
// ============================================

export interface FileInfo {
  id: number | string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: number | string;
  createdAt: string;
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
// API RESPONSE TYPES
// ============================================

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface ApiSuccess<T = any> {
  data: T;
  message?: string;
}
