import api from './axios';
import type {
  ChatMessage,
  ChatRoom,
  SendMessageDto,
  EditMessageDto,
  GetMessagesParams,
  OnlineUser,
} from '@/types';
import type { PaginatedResponse } from '@/types/api.types';

// ==================== Chat Rooms ====================

/**
 * Get user's chat rooms
 */
export async function getChatRooms(): Promise<ChatRoom[]> {
  const response = await api.get<ChatRoom[]>('/chat/rooms');
  return response.data;
}

// ==================== Class Chat ====================

/**
 * Get messages in class chat
 */
export async function getClassMessages(
  classId: string | number,
  params?: GetMessagesParams
): Promise<PaginatedResponse<ChatMessage>> {
  const response = await api.get<PaginatedResponse<ChatMessage>>(
    `/chat/class/${classId}/messages`,
    { params }
  );
  return response.data;
}

/**
 * Send message to class chat
 */
export async function sendClassMessage(
  classId: string | number,
  data: SendMessageDto
): Promise<ChatMessage> {
  const response = await api.post<ChatMessage>(`/chat/class/${classId}/messages`, data);
  return response.data;
}

// ==================== Live Session Chat ====================

/**
 * Get messages in live session chat
 */
export async function getSessionMessages(
  sessionId: string | number,
  params?: GetMessagesParams
): Promise<PaginatedResponse<ChatMessage>> {
  const response = await api.get<PaginatedResponse<ChatMessage>>(
    `/chat/session/${sessionId}/messages`,
    { params }
  );
  return response.data;
}

/**
 * Send message to live session chat
 */
export async function sendSessionMessage(
  sessionId: string | number,
  data: SendMessageDto
): Promise<ChatMessage> {
  const response = await api.post<ChatMessage>(`/chat/session/${sessionId}/messages`, data);
  return response.data;
}

// ==================== Message Operations ====================

/**
 * Get a single message
 */
export async function getMessage(messageId: string | number): Promise<ChatMessage> {
  const response = await api.get<ChatMessage>(`/chat/messages/${messageId}`);
  return response.data;
}

/**
 * Edit a message
 */
export async function editMessage(
  messageId: string | number,
  data: EditMessageDto
): Promise<ChatMessage> {
  const response = await api.put<ChatMessage>(`/chat/messages/${messageId}`, data);
  return response.data;
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId: string | number): Promise<void> {
  await api.delete(`/chat/messages/${messageId}`);
}

// ==================== Search & Utilities ====================

/**
 * Search messages
 */
export async function searchMessages(
  query: string,
  limit?: number
): Promise<ChatMessage[]> {
  const response = await api.get<ChatMessage[]>('/chat/search', {
    params: { q: query, limit },
  });
  return response.data;
}

/**
 * Get online users in a room
 */
export async function getOnlineUsers(
  roomId: string,
  type: 'class' | 'live_session'
): Promise<OnlineUser[]> {
  const response = await api.get<OnlineUser[]>(`/chat/rooms/${roomId}/online`, {
    params: { type },
  });
  return response.data;
}
