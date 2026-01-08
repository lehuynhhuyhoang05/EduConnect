// ============================================
// USER & AUTH TYPES
// ============================================

export type UserRole = 'STUDENT' | 'TEACHER';

export interface User {
  id: number;
  email: string;
  fullName: string;
  name?: string; // Alias for fullName
  role: UserRole;
  avatarUrl?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  fullName?: string;
  name?: string;
  role?: UserRole;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileDto {
  fullName?: string;
  avatarUrl?: string;
}

// ============================================
// CLASS TYPES
// ============================================

export interface Class {
  id: number;
  name: string;
  description?: string;
  subject?: string;
  classCode: string;
  teacherId: number;
  teacher?: User;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  membersCount?: number;
  _count?: {
    members: number;
    assignments: number;
    liveSessions: number;
  };
}

export interface ClassMember {
  id: number;
  userId: number;
  classId: number;
  role: 'TEACHER' | 'STUDENT';
  joinedAt: string;
  user: User;
}

export interface CreateClassDto {
  name: string;
  description?: string;
  subject?: string;
}

export interface UpdateClassDto extends Partial<CreateClassDto> {
  isActive?: boolean;
}

export interface JoinClassDto {
  classCode: string;
}

export interface QueryClassDto {
  search?: string;
  isActive?: boolean;
  myClasses?: boolean;
  page?: number;
  limit?: number;
}

// ============================================
// ANNOUNCEMENT TYPES
// ============================================

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export interface Announcement {
  id: number;
  classId: number;
  authorId: number;
  author?: User;
  title: string;
  content: string;
  isPinned: boolean;
  priority: AnnouncementPriority;
  allowComments: boolean;
  scheduledAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    comments: number;
    readBy: number;
  };
  isRead?: boolean;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  isPinned?: boolean;
  priority?: AnnouncementPriority;
  allowComments?: boolean;
  scheduledAt?: string;
  expiresAt?: string;
}

// ============================================
// ASSIGNMENT TYPES
// ============================================

export type SubmissionStatus = 'PENDING' | 'SUBMITTED' | 'GRADED' | 'RETURNED';
export type AssignmentStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CLOSED';

export interface Assignment {
  id: number;
  classId: number;
  class?: Class;
  creatorId: number;
  creator?: User;
  title: string;
  description?: string;
  dueDate: string;
  maxScore: number;
  attachmentUrl?: string;
  isActive: boolean;
  status?: AssignmentStatus;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    submissions: number;
  };
  mySubmission?: Submission;
}

export interface Submission {
  id: number;
  assignmentId: number;
  studentId: number;
  student?: User;
  fileUrl?: string;
  content?: string;
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
  submittedAt: string;
  gradedAt?: string;
  gradedBy?: number;
  grader?: User;
  isLate?: boolean;
}

export interface CreateAssignmentDto {
  title: string;
  description?: string;
  dueDate: string;
  maxScore?: number;
  attachmentUrl?: string;
}

export interface UpdateAssignmentDto extends Partial<CreateAssignmentDto> {
  isActive?: boolean;
}

export interface CreateSubmissionDto {
  fileUrl?: string;
  content?: string;
}

export interface GradeSubmissionDto {
  score: number;
  feedback?: string;
}

export interface QueryAssignmentDto {
  classId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ============================================
// LIVE SESSION TYPES
// ============================================

export type SessionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export interface LiveSession {
  id: number;
  classId: number;
  class?: Class;
  hostId: number;
  host?: User;
  title: string;
  description?: string;
  status: SessionStatus;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  maxParticipants: number;
  recordingUrl?: string;
  participantsCount?: number;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    participants: number;
  };
}

export interface SessionParticipant {
  id: number;
  sessionId: number;
  userId: number;
  user: User;
  socketId?: string;
  joinedAt: string;
  leftAt?: string;
  isActive: boolean;
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CreateSessionDto {
  title: string;
  description?: string;
  scheduledAt?: string;
  maxParticipants?: number;
}

export interface UpdateSessionDto extends Partial<CreateSessionDto> {
  recordingUrl?: string;
}

export interface QuerySessionDto {
  classId?: number;
  status?: SessionStatus;
  upcoming?: boolean;
  page?: number;
  limit?: number;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export type NotificationType = 
  | 'CLASS_JOINED'
  | 'ASSIGNMENT_CREATED'
  | 'ASSIGNMENT_DUE'
  | 'SUBMISSION_GRADED'
  | 'SESSION_STARTING'
  | 'SESSION_STARTED'
  | 'ANNOUNCEMENT'
  | 'COMMENT'
  | 'GENERAL';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface QueryNotificationDto {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
}

// ============================================
// CHAT TYPES
// ============================================

export type MessageType = 'TEXT' | 'FILE' | 'IMAGE' | 'SYSTEM';

export interface ChatMessage {
  id: number;
  roomType: 'CLASS' | 'SESSION';
  roomId: number;
  senderId: number;
  sender?: User;
  message: string;
  messageType: MessageType;
  fileUrl?: string;
  replyToId?: number;
  replyTo?: ChatMessage;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SendMessageDto {
  message: string;
  messageType?: MessageType;
  fileUrl?: string;
  replyTo?: number;
}

export interface QueryMessageDto {
  page?: number;
  limit?: number;
  before?: number;
  after?: number;
  search?: string;
}

// ============================================
// FILE TYPES
// ============================================

export type FileType = 'image' | 'document' | 'video' | 'audio' | 'other';

export interface UploadedFile {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  type: FileType;
  uploadedById: number;
  uploadedBy?: User;
  createdAt: string;
}

export interface QueryFileDto {
  type?: FileType;
  uploadedBy?: number;
  page?: number;
  limit?: number;
}

// ============================================
// COMMON TYPES
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

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

// Poll types
export interface Poll {
  id: number;
  sessionId: number;
  question: string;
  options: PollOption[];
  isAnonymous: boolean;
  allowMultiple: boolean;
  status: 'PENDING' | 'ACTIVE' | 'ENDED';
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface PollOption {
  id: number;
  text: string;
  votes: number;
  percentage?: number;
}

export interface CreatePollDto {
  question: string;
  options: string[];
  isAnonymous?: boolean;
  allowMultiple?: boolean;
  duration?: number;
}

// Gradebook types
export interface GradebookEntry {
  studentId: number;
  student: User;
  assignments: {
    assignmentId: number;
    assignment: Assignment;
    score?: number;
    status: SubmissionStatus;
    isExcused: boolean;
  }[];
  totalScore: number;
  averageScore: number;
  letterGrade: string;
}

// WebRTC types
export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface WebRTCConfig {
  iceServers: IceServer[];
}
