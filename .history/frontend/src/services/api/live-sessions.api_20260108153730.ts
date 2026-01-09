import api from './axios';
import type {
  LiveSession,
  LiveSessionParticipant,
  CreateSessionDto,
  UpdateSessionDto,
  JoinSessionDto,
  IceServersResponse,
  NetworkAnalysis,
  VideoSettings,
  CreateBreakoutRoomsDto,
  BreakoutRoom,
  Poll,
  CreatePollDto,
  VotePollDto,
  SessionQuestion,
  AskQuestionDto,
  AnswerQuestionDto,
  AttendanceRecord,
  StartAttendanceDto,
  ManualCheckInDto,
  HandRaise,
  WaitingRoomUser,
  VirtualBackground,
  Annotation,
  CreateAnnotationDto,
  ReconnectionToken,
  SessionAnalytics,
  GetSessionsParams,
} from '@/types';
import type { PaginatedResponse } from '@/types/api.types';

// ==================== Session CRUD ====================

/**
 * Create a live session
 */
export async function createSession(
  classId: string | number,
  data: CreateSessionDto
): Promise<LiveSession> {
  const response = await api.post<LiveSession>(`/classes/${classId}/sessions`, data);
  return response.data;
}

/**
 * Get all sessions
 */
export async function getSessions(
  params?: GetSessionsParams
): Promise<PaginatedResponse<LiveSession>> {
  const response = await api.get<PaginatedResponse<LiveSession>>('/sessions', { params });
  return response.data;
}

/**
 * Get sessions in specific class
 */
export async function getClassSessions(
  classId: string | number,
  params?: GetSessionsParams
): Promise<PaginatedResponse<LiveSession>> {
  const response = await api.get<PaginatedResponse<LiveSession>>(
    `/classes/${classId}/sessions`,
    { params }
  );
  return response.data;
}

/**
 * Get session by ID or Room ID
 */
export async function getSessionById(id: string | number): Promise<LiveSession> {
  const response = await api.get<LiveSession>(`/sessions/${id}`);
  return response.data;
}

/**
 * Update session
 */
export async function updateSession(
  id: string | number,
  data: UpdateSessionDto
): Promise<LiveSession> {
  const response = await api.put<LiveSession>(`/sessions/${id}`, data);
  return response.data;
}

/**
 * Delete/Cancel session
 */
export async function deleteSession(id: string | number): Promise<void> {
  await api.delete(`/sessions/${id}`);
}

// ==================== Session Lifecycle ====================

/**
 * Start a session (Host only)
 */
export async function startSession(id: string | number): Promise<LiveSession> {
  const response = await api.post<LiveSession>(`/sessions/${id}/start`);
  return response.data;
}

/**
 * End a session (Host only)
 */
export async function endSession(id: string | number): Promise<LiveSession> {
  const response = await api.post<LiveSession>(`/sessions/${id}/end`);
  return response.data;
}

// ==================== Participant Management ====================

/**
 * Join a session
 */
export async function joinSession(
  id: string | number,
  data?: JoinSessionDto
): Promise<LiveSessionParticipant> {
  const response = await api.post<LiveSessionParticipant>(`/sessions/${id}/join`, data);
  return response.data;
}

/**
 * Leave a session
 */
export async function leaveSession(id: string | number): Promise<void> {
  await api.post(`/sessions/${id}/leave`);
}

/**
 * Get session participants
 */
export async function getParticipants(id: string | number): Promise<LiveSessionParticipant[]> {
  const response = await api.get<LiveSessionParticipant[]>(`/sessions/${id}/participants`);
  return response.data;
}

/**
 * Kick a participant (Host only)
 */
export async function kickParticipant(sessionId: string | number, userId: number): Promise<void> {
  await api.post(`/sessions/${sessionId}/kick/${userId}`);
}

/**
 * Update connection quality
 */
export async function updateConnectionQuality(
  sessionId: string | number,
  quality: 'excellent' | 'good' | 'poor' | 'unknown'
): Promise<void> {
  await api.post(`/sessions/${sessionId}/quality`, { quality });
}

// ==================== WebRTC ====================

/**
 * Get ICE servers configuration
 */
export async function getIceServers(): Promise<IceServersResponse> {
  const response = await api.get<IceServersResponse>('/sessions/ice-servers');
  return response.data;
}

// ==================== Network ====================

/**
 * Analyze network quality
 */
export async function analyzeNetwork(data: NetworkAnalysis): Promise<{
  quality: string;
  recommendation: string;
}> {
  const response = await api.post('/network/analyze', data);
  return response.data;
}

/**
 * Get recommended video settings
 */
export async function getVideoSettings(uploadMbps: number): Promise<VideoSettings> {
  const response = await api.get<VideoSettings>('/network/video-settings', {
    params: { uploadMbps },
  });
  return response.data;
}

// ==================== Breakout Rooms ====================

/**
 * Create breakout rooms
 */
export async function createBreakoutRooms(
  sessionId: string | number,
  data: CreateBreakoutRoomsDto
): Promise<BreakoutRoom[]> {
  const response = await api.post<BreakoutRoom[]>(`/sessions/${sessionId}/breakout-rooms`, data);
  return response.data;
}

/**
 * Start breakout rooms
 */
export async function startBreakoutRooms(sessionId: string | number): Promise<void> {
  await api.post(`/sessions/${sessionId}/breakout-rooms/start`);
}

/**
 * Join a breakout room
 */
export async function joinBreakoutRoom(
  sessionId: string | number,
  roomId: string
): Promise<void> {
  await api.post(`/sessions/${sessionId}/breakout-rooms/${roomId}/join`);
}

/**
 * Leave breakout room
 */
export async function leaveBreakoutRoom(
  sessionId: string | number,
  roomId: string
): Promise<void> {
  await api.post(`/sessions/${sessionId}/breakout-rooms/${roomId}/leave`);
}

/**
 * Get breakout rooms status
 */
export async function getBreakoutRooms(sessionId: string | number): Promise<BreakoutRoom[]> {
  const response = await api.get<BreakoutRoom[]>(`/sessions/${sessionId}/breakout-rooms`);
  return response.data;
}

/**
 * Close all breakout rooms
 */
export async function closeBreakoutRooms(sessionId: string | number): Promise<void> {
  await api.post(`/sessions/${sessionId}/breakout-rooms/close`);
}

/**
 * Broadcast message to breakout rooms
 */
export async function broadcastToBreakoutRooms(
  sessionId: string | number,
  message: string
): Promise<void> {
  await api.post(`/sessions/${sessionId}/breakout-rooms/broadcast`, { message });
}

// ==================== Polls ====================

/**
 * Create a poll
 */
export async function createPoll(
  sessionId: string | number,
  data: CreatePollDto
): Promise<Poll> {
  const response = await api.post<Poll>(`/sessions/${sessionId}/polls`, data);
  return response.data;
}

/**
 * Create and start quick poll
 */
export async function createQuickPoll(
  sessionId: string | number,
  data: { question: string; options: string[]; timeLimitSeconds?: number }
): Promise<Poll> {
  const response = await api.post<Poll>(`/sessions/${sessionId}/polls/quick`, data);
  return response.data;
}

/**
 * Start a poll
 */
export async function startPoll(sessionId: string | number, pollId: string): Promise<void> {
  await api.post(`/sessions/${sessionId}/polls/${pollId}/start`);
}

/**
 * End a poll
 */
export async function endPoll(sessionId: string | number, pollId: string): Promise<void> {
  await api.post(`/sessions/${sessionId}/polls/${pollId}/end`);
}

/**
 * Vote on a poll
 */
export async function votePoll(
  sessionId: string | number,
  pollId: string,
  data: VotePollDto
): Promise<void> {
  await api.post(`/sessions/${sessionId}/polls/${pollId}/vote`, data);
}

/**
 * Get all polls for session
 */
export async function getPolls(sessionId: string | number): Promise<Poll[]> {
  const response = await api.get<Poll[]>(`/sessions/${sessionId}/polls`);
  return response.data;
}

/**
 * Get poll details
 */
export async function getPoll(sessionId: string | number, pollId: string): Promise<Poll> {
  const response = await api.get<Poll>(`/sessions/${sessionId}/polls/${pollId}`);
  return response.data;
}

/**
 * Get poll results
 */
export async function getPollResults(
  sessionId: string | number,
  pollId: string
): Promise<Poll> {
  const response = await api.get<Poll>(`/sessions/${sessionId}/polls/${pollId}/results`);
  return response.data;
}

// ==================== Q&A ====================

/**
 * Ask a question
 */
export async function askQuestion(
  sessionId: string | number,
  data: AskQuestionDto
): Promise<SessionQuestion> {
  const response = await api.post<SessionQuestion>(`/sessions/${sessionId}/qa/questions`, data);
  return response.data;
}

/**
 * Upvote a question
 */
export async function upvoteQuestion(
  sessionId: string | number,
  questionId: string
): Promise<void> {
  await api.post(`/sessions/${sessionId}/qa/questions/${questionId}/upvote`);
}

/**
 * Answer a question
 */
export async function answerQuestion(
  sessionId: string | number,
  questionId: string,
  data: AnswerQuestionDto
): Promise<void> {
  await api.post(`/sessions/${sessionId}/qa/questions/${questionId}/answer`, data);
}

/**
 * Dismiss question
 */
export async function dismissQuestion(
  sessionId: string | number,
  questionId: string
): Promise<void> {
  await api.post(`/sessions/${sessionId}/qa/questions/${questionId}/dismiss`);
}

/**
 * Toggle pin question
 */
export async function togglePinQuestion(
  sessionId: string | number,
  questionId: string
): Promise<void> {
  await api.post(`/sessions/${sessionId}/qa/questions/${questionId}/pin`);
}

/**
 * Get all questions
 */
export async function getQuestions(sessionId: string | number): Promise<SessionQuestion[]> {
  const response = await api.get<SessionQuestion[]>(`/sessions/${sessionId}/qa/questions`);
  return response.data;
}

// ==================== Attendance ====================

/**
 * Start attendance tracking
 */
export async function startAttendance(
  sessionId: string | number,
  data?: StartAttendanceDto
): Promise<void> {
  await api.post(`/sessions/${sessionId}/attendance/start`, data);
}

/**
 * Close attendance
 */
export async function closeAttendance(sessionId: string | number): Promise<void> {
  await api.post(`/sessions/${sessionId}/attendance/close`);
}

/**
 * Get check-in code
 */
export async function getCheckInCode(sessionId: string | number): Promise<{ code: string }> {
  const response = await api.get<{ code: string }>(`/sessions/${sessionId}/attendance/code`);
  return response.data;
}

/**
 * Check-in with code
 */
export async function checkInWithCode(
  sessionId: string | number,
  code: string
): Promise<void> {
  await api.post(`/sessions/${sessionId}/attendance/check-in`, { code });
}

/**
 * Manual check-in
 */
export async function manualCheckIn(
  sessionId: string | number,
  data: ManualCheckInDto
): Promise<void> {
  await api.post(`/sessions/${sessionId}/attendance/manual`, data);
}

/**
 * Get attendance records
 */
export async function getAttendance(sessionId: string | number): Promise<AttendanceRecord[]> {
  const response = await api.get<AttendanceRecord[]>(`/sessions/${sessionId}/attendance`);
  return response.data;
}

/**
 * Get attendance summary
 */
export async function getAttendanceSummary(sessionId: string | number): Promise<{
  present: number;
  late: number;
  absent: number;
  excused: number;
}> {
  const response = await api.get(`/sessions/${sessionId}/attendance/summary`);
  return response.data;
}

/**
 * Export attendance CSV
 */
export async function exportAttendance(sessionId: string | number): Promise<Blob> {
  const response = await api.get(`/sessions/${sessionId}/attendance/export`, {
    responseType: 'blob',
  });
  return response.data;
}

// ==================== Hand Raise ====================

/**
 * Raise hand
 */
export async function raiseHand(sessionId: string | number): Promise<void> {
  await api.post(`/sessions/${sessionId}/hand-raise`);
}

/**
 * Lower hand
 */
export async function lowerHand(sessionId: string | number): Promise<void> {
  await api.delete(`/sessions/${sessionId}/hand-raise`);
}

/**
 * Acknowledge raised hand
 */
export async function acknowledgeHand(
  sessionId: string | number,
  userId: number
): Promise<void> {
  await api.post(`/sessions/${sessionId}/hand-raise/${userId}/acknowledge`);
}

/**
 * Lower all hands
 */
export async function lowerAllHands(sessionId: string | number): Promise<void> {
  await api.delete(`/sessions/${sessionId}/hand-raise/all`);
}

/**
 * Get hand raise queue
 */
export async function getHandRaiseQueue(sessionId: string | number): Promise<HandRaise[]> {
  const response = await api.get<HandRaise[]>(`/sessions/${sessionId}/hand-raise`);
  return response.data;
}

// ==================== Waiting Room ====================

/**
 * Request to join session
 */
export async function requestToJoin(sessionId: string | number): Promise<void> {
  await api.post(`/sessions/${sessionId}/waiting-room/request`);
}

/**
 * Admit user
 */
export async function admitUser(sessionId: string | number, userId: number): Promise<void> {
  await api.post(`/sessions/${sessionId}/waiting-room/${userId}/admit`);
}

/**
 * Admit all users
 */
export async function admitAllUsers(sessionId: string | number): Promise<void> {
  await api.post(`/sessions/${sessionId}/waiting-room/admit-all`);
}

/**
 * Deny user
 */
export async function denyUser(
  sessionId: string | number,
  userId: number,
  reason?: string
): Promise<void> {
  await api.post(`/sessions/${sessionId}/waiting-room/${userId}/deny`, { reason });
}

/**
 * Get waiting room users
 */
export async function getWaitingRoom(sessionId: string | number): Promise<WaitingRoomUser[]> {
  const response = await api.get<WaitingRoomUser[]>(`/sessions/${sessionId}/waiting-room`);
  return response.data;
}

/**
 * Get own waiting status
 */
export async function getWaitingStatus(sessionId: string | number): Promise<{
  status: 'waiting' | 'admitted' | 'denied';
}> {
  const response = await api.get(`/sessions/${sessionId}/waiting-room/status`);
  return response.data;
}

// ==================== Virtual Background ====================

/**
 * Get predefined backgrounds
 */
export async function getPredefinedBackgrounds(): Promise<VirtualBackground[]> {
  const response = await api.get<VirtualBackground[]>('/backgrounds/predefined');
  return response.data;
}

/**
 * Get background categories
 */
export async function getBackgroundCategories(): Promise<string[]> {
  const response = await api.get<string[]>('/backgrounds/categories');
  return response.data;
}

/**
 * Get all available backgrounds
 */
export async function getAvailableBackgrounds(): Promise<VirtualBackground[]> {
  const response = await api.get<VirtualBackground[]>('/backgrounds/available');
  return response.data;
}

/**
 * Upload custom background
 */
export async function uploadCustomBackground(data: {
  name: string;
  imageUrl: string;
  thumbnailUrl?: string;
}): Promise<VirtualBackground> {
  const response = await api.post<VirtualBackground>('/backgrounds/custom', data);
  return response.data;
}

/**
 * Delete custom background
 */
export async function deleteCustomBackground(backgroundId: string): Promise<void> {
  await api.delete(`/backgrounds/custom/${backgroundId}`);
}

/**
 * Set current background
 */
export async function setCurrentBackground(backgroundId: string | null): Promise<void> {
  await api.put('/backgrounds/current', { backgroundId });
}

/**
 * Get current background
 */
export async function getCurrentBackground(): Promise<VirtualBackground | null> {
  const response = await api.get<VirtualBackground | null>('/backgrounds/current');
  return response.data;
}

// ==================== Screen Annotation ====================

/**
 * Enable annotation
 */
export async function enableAnnotation(sessionId: string | number): Promise<void> {
  await api.post(`/sessions/${sessionId}/annotation/enable`);
}

/**
 * Disable annotation
 */
export async function disableAnnotation(sessionId: string | number): Promise<void> {
  await api.post(`/sessions/${sessionId}/annotation/disable`);
}

/**
 * Add annotation
 */
export async function addAnnotation(
  sessionId: string | number,
  data: CreateAnnotationDto
): Promise<Annotation> {
  const response = await api.post<Annotation>(`/sessions/${sessionId}/annotation`, data);
  return response.data;
}

/**
 * Remove annotation
 */
export async function removeAnnotation(
  sessionId: string | number,
  annotationId: string
): Promise<void> {
  await api.delete(`/sessions/${sessionId}/annotation/${annotationId}`);
}

/**
 * Clear all annotations
 */
export async function clearAnnotations(sessionId: string | number): Promise<void> {
  await api.delete(`/sessions/${sessionId}/annotation`);
}

/**
 * Undo last annotation
 */
export async function undoAnnotation(sessionId: string | number): Promise<void> {
  await api.post(`/sessions/${sessionId}/annotation/undo`);
}

/**
 * Get all annotations
 */
export async function getAnnotations(sessionId: string | number): Promise<Annotation[]> {
  const response = await api.get<Annotation[]>(`/sessions/${sessionId}/annotation`);
  return response.data;
}

// ==================== Reconnection ====================

/**
 * Generate reconnection token
 */
export async function generateReconnectionToken(
  sessionId: string | number,
  mediaState: { audio: boolean; video: boolean; screen: boolean }
): Promise<ReconnectionToken> {
  const response = await api.post<ReconnectionToken>(
    `/sessions/${sessionId}/reconnect/token`,
    mediaState
  );
  return response.data;
}

/**
 * Reconnect to session
 */
export async function reconnect(token: string): Promise<{ success: boolean }> {
  const response = await api.post('/sessions/reconnect', { token });
  return response.data;
}

/**
 * Get disconnected users
 */
export async function getDisconnectedUsers(
  sessionId: string | number
): Promise<LiveSessionParticipant[]> {
  const response = await api.get<LiveSessionParticipant[]>(`/sessions/${sessionId}/disconnected`);
  return response.data;
}

// ==================== Analytics ====================

/**
 * Get real-time analytics
 */
export async function getRealtimeAnalytics(sessionId: string | number): Promise<SessionAnalytics> {
  const response = await api.get<SessionAnalytics>(`/sessions/${sessionId}/analytics/realtime`);
  return response.data;
}

/**
 * Get session summary
 */
export async function getSessionSummary(sessionId: string | number): Promise<SessionAnalytics> {
  const response = await api.get<SessionAnalytics>(`/sessions/${sessionId}/analytics/summary`);
  return response.data;
}

/**
 * Export analytics
 */
export async function exportAnalytics(sessionId: string | number): Promise<Blob> {
  const response = await api.get(`/sessions/${sessionId}/analytics/export`, {
    responseType: 'blob',
  });
  return response.data;
}

// ==================== Recording ====================

/**
 * Start recording
 */
export async function startRecording(
  sessionId: string | number,
  options?: { includeAudio?: boolean; includeVideo?: boolean }
): Promise<void> {
  await api.post(`/sessions/${sessionId}/recording/start`, options);
}

/**
 * Stop recording
 */
export async function stopRecording(sessionId: string | number): Promise<void> {
  await api.post(`/sessions/${sessionId}/recording/stop`);
}

/**
 * Get recording status
 */
export async function getRecordingStatus(sessionId: string | number): Promise<{
  isRecording: boolean;
  startedAt?: string;
}> {
  const response = await api.get(`/sessions/${sessionId}/recording/status`);
  return response.data;
}

/**
 * Get all recordings
 */
export async function getRecordings(sessionId: string | number): Promise<{
  id: string;
  url: string;
  duration: number;
  createdAt: string;
}[]> {
  const response = await api.get(`/sessions/${sessionId}/recordings`);
  return response.data;
}
