// User types
export interface User {
  id: number
  email: string
  fullName: string
  role: UserRole
  avatarUrl?: string
  isActive: boolean
  isVerified: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN'
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
  role?: UserRole
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

// Class types
export interface Class {
  id: number
  name: string
  description?: string
  subject?: string
  classCode: string
  teacherId: number
  teacher?: User
  memberCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ClassMember {
  id: number
  classId: number
  userId: number
  user?: User
  role: 'TEACHER' | 'STUDENT'
  joinedAt: string
}

export interface CreateClassRequest {
  name: string
  description?: string
  subject?: string
}

export interface JoinClassRequest {
  classCode: string
}

// Assignment types
export interface Assignment {
  id: number
  classId: number
  class?: Class
  title: string
  description?: string
  deadline?: string
  attachmentUrl?: string
  maxScore: number
  createdBy: number
  creator?: User
  submissionCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Submission {
  id: number
  assignmentId: number
  assignment?: Assignment
  studentId: number
  student?: User
  fileUrl?: string
  content?: string
  score?: number
  feedback?: string
  status: SubmissionStatus
  gradedAt?: string
  gradedBy?: number
  grader?: User
  submittedAt: string
  isLate: boolean
}

export enum SubmissionStatus {
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  RETURNED = 'returned'
}

export interface CreateAssignmentRequest {
  title: string
  description?: string
  deadline?: string
  maxScore?: number
  attachmentUrl?: string
}

export interface CreateSubmissionRequest {
  content?: string
  fileUrl?: string
}

export interface GradeSubmissionRequest {
  score: number
  feedback?: string
}

// Live Session types
export interface LiveSession {
  id: number
  classId: number
  class?: Class
  roomId: string
  title: string
  description?: string
  hostId: number
  host?: User
  status: SessionStatus
  scheduledAt?: string
  startedAt?: string
  endedAt?: string
  maxParticipants: number
  currentParticipants: number
  recordingUrl?: string
  durationSeconds?: number
  createdAt: string
  updatedAt: string
}

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended'
}

export interface SessionParticipant {
  id: number
  liveSessionId: number
  userId: number
  user?: User
  joinedAt: string
  leftAt?: string
  isActive: boolean
  connectionQuality: ConnectionQuality
}

export enum ConnectionQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  POOR = 'poor',
  UNKNOWN = 'unknown'
}

export interface CreateSessionRequest {
  title: string
  description?: string
  scheduledAt?: string
  maxParticipants?: number
}

// Chat types
export interface ChatMessage {
  id: number
  roomId: string
  roomType: RoomType
  senderId: number
  sender?: User
  message: string
  messageType: MessageType
  fileUrl?: string
  replyTo?: number
  replyToMessage?: ChatMessage
  isEdited: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export enum RoomType {
  CLASS = 'class',
  LIVE_SESSION = 'live_session'
}

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  SYSTEM = 'system'
}

export interface SendMessageRequest {
  message: string
  messageType?: MessageType
  fileUrl?: string
  replyTo?: number
}

// Notification types
export interface Notification {
  id: number
  userId: number
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  data?: Record<string, unknown>
  isRead: boolean
  readAt?: string
  relatedEntityType?: string
  relatedEntityId?: string
  actionUrl?: string
  createdAt: string
  updatedAt: string
}

export type NotificationType =
  | 'class_joined' | 'class_invitation' | 'class_updated' | 'class_deleted'
  | 'member_joined' | 'member_left' | 'member_removed'
  | 'assignment_created' | 'assignment_updated' | 'assignment_due_soon' | 'assignment_overdue'
  | 'submission_received' | 'submission_graded' | 'submission_returned'
  | 'session_scheduled' | 'session_starting_soon' | 'session_started' | 'session_ended' | 'session_cancelled'
  | 'new_message' | 'mentioned'
  | 'system_announcement' | 'account_updated'

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// File types
export interface FileInfo {
  id: number
  originalName: string
  storedName: string
  path: string
  mimeType: string
  size: number
  uploadedBy: number
  uploader?: User
  uploadedAt: string
}

// Material types
export interface Material {
  id: number
  classId: number
  title: string
  description?: string
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: number
  mimeType?: string
  uploadedBy: number
  uploader?: User
  downloadCount: number
  createdAt: string
  updatedAt: string
}

// Pagination types
export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface QueryParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

// API Error
export interface ApiError {
  statusCode: number
  message: string | string[]
  error: string
}

// Gradebook types
export interface GradeRecord {
  assignmentId: number
  assignmentTitle: string
  maxScore: number
  score?: number
  submittedAt?: string
  gradedAt?: string
  isLate: boolean
  status: SubmissionStatus
}

export interface StudentGradebook {
  student: User
  grades: GradeRecord[]
  averageScore: number
  totalSubmitted: number
  totalAssignments: number
}

// Announcement types
export interface Announcement {
  id: string
  classId: number
  authorId: number
  author?: User
  title: string
  content: string
  isPinned: boolean
  priority: 'normal' | 'important' | 'urgent'
  allowComments: boolean
  comments: AnnouncementComment[]
  readBy: number[]
  scheduledAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface AnnouncementComment {
  id: string
  userId: number
  userName: string
  content: string
  createdAt: string
}
