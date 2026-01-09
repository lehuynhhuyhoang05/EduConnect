import type { User } from './user.types';

export type SessionStatus = 'scheduled' | 'live' | 'ended';
export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'unknown';
export type PollType = 'single-choice' | 'multiple-choice' | 'word-cloud' | 'rating' | 'open-ended';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';
export type AttendanceMethod = 'auto' | 'code' | 'manual';

export interface LiveSession {
  id: number;
  classId: number;
  roomId: string;
  title: string;
  description: string | null;
  hostId: number;
  status: SessionStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  maxParticipants: number;
  currentParticipants: number;
  recordingUrl: string | null;
  durationSeconds: number | null;
  host?: User;
  class?: {
    id: number;
    name: string;
  };
}

export interface LiveSessionParticipant {
  id: number;
  liveSessionId: number;
  userId: number;
  joinedAt: string;
  leftAt: string | null;
  isActive: boolean;
  connectionQuality: ConnectionQuality;
  user?: User;
}

// Session CRUD DTOs
export interface CreateSessionDto {
  title: string;
  description?: string;
  scheduledAt?: string;
  maxParticipants?: number;
}

export interface UpdateSessionDto {
  title?: string;
  description?: string;
  scheduledAt?: string;
  maxParticipants?: number;
}

export interface JoinSessionDto {
  socketId?: string;
}

// WebRTC
export interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}

export interface IceServersResponse {
  iceServers: IceServer[];
  ttl: number | null;
  timestamp: string;
}

// Network Quality
export interface NetworkAnalysis {
  latencyMs: number;
  jitterMs: number;
  packetLossPercent: number;
  downloadMbps: number;
  uploadMbps: number;
  stunSuccess: boolean;
  turnSuccess: boolean;
}

export interface VideoSettings {
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
}

// Breakout Rooms
export interface BreakoutRoom {
  id: string;
  name: string;
  participantIds: number[];
}

export interface CreateBreakoutRoomsDto {
  rooms: { name: string; participantIds?: number[] }[];
  allowParticipantsToChoose?: boolean;
  allowReturnToMain?: boolean;
  autoCloseAfterMinutes?: number;
}

// Polls
export interface Poll {
  id: string;
  sessionId: number;
  question: string;
  type: PollType;
  options: PollOption[];
  showResultsToParticipants: boolean;
  anonymousVoting: boolean;
  allowChangeVote: boolean;
  timeLimit: number | null;
  status: 'draft' | 'active' | 'ended';
  createdAt: string;
  endedAt: string | null;
}

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
}

export interface CreatePollDto {
  question: string;
  type: PollType;
  options?: string[];
  showResultsToParticipants?: boolean;
  anonymousVoting?: boolean;
  allowChangeVote?: boolean;
  timeLimit?: number;
}

export interface VotePollDto {
  optionIds?: string[];
  text?: string;
  rating?: number;
}

// Q&A
export interface SessionQuestion {
  id: string;
  sessionId: number;
  userId: number;
  text: string;
  isAnonymous: boolean;
  upvotes: number;
  upvotedBy: number[];
  isPinned: boolean;
  isAnswered: boolean;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  user?: User;
}

export interface AskQuestionDto {
  text: string;
  isAnonymous?: boolean;
}

export interface AnswerQuestionDto {
  text: string;
  markAsAnswered?: boolean;
}

// Attendance
export interface AttendanceRecord {
  id: number;
  sessionId: number;
  userId: number;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkInMethod: AttendanceMethod;
  notes: string | null;
  user?: User;
}

export interface StartAttendanceDto {
  method?: AttendanceMethod;
  lateThresholdMinutes?: number;
  allowLateCheckIn?: boolean;
}

export interface ManualCheckInDto {
  userId: number;
  status: AttendanceStatus;
  notes?: string;
}

// Hand Raise
export interface HandRaise {
  userId: number;
  raisedAt: string;
  isAcknowledged: boolean;
  user?: User;
}

// Waiting Room
export interface WaitingRoomUser {
  userId: number;
  requestedAt: string;
  user?: User;
}

// Virtual Background
export interface VirtualBackground {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  thumbnailUrl: string;
  isCustom: boolean;
}

// Screen Annotation
export type AnnotationType = 'pen' | 'highlighter' | 'arrow' | 'rectangle' | 'ellipse' | 'text' | 'pointer';

export interface Annotation {
  id: string;
  type: AnnotationType;
  userId: number;
  points?: { x: number; y: number }[];
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  text?: string;
  color: string;
  strokeWidth: number;
  createdAt: string;
}

export interface CreateAnnotationDto {
  type: AnnotationType;
  points?: { x: number; y: number }[];
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  text?: string;
  color?: string;
  strokeWidth?: number;
}

// Reconnection
export interface ReconnectionToken {
  token: string;
  expiresAt: string;
  mediaState: {
    audio: boolean;
    video: boolean;
    screen: boolean;
  };
}

// Session Analytics
export interface SessionAnalytics {
  peakParticipants: number;
  averageParticipants: number;
  totalMessages: number;
  pollsCreated: number;
  questionsAsked: number;
  handRaisesCount: number;
  attendanceRate: number;
}

// Query params
export interface GetSessionsParams {
  classId?: number;
  status?: SessionStatus;
  upcoming?: boolean;
  page?: number;
  limit?: number;
}
