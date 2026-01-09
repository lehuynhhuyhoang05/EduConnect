import type { User } from './user.types';

export type MessageType = 'text' | 'file' | 'image' | 'system';
export type RoomType = 'class' | 'live_session';

export interface ChatMessage {
  id: number;
  roomId: string;
  roomType: RoomType;
  senderId: number;
  message: string;
  messageType: MessageType;
  fileUrl: string | null;
  replyTo: number | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: User;
  replyToMessage?: ChatMessage;
}

export interface ChatRoom {
  id: string;
  type: RoomType;
  name: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export interface SendMessageDto {
  message: string;
  messageType?: MessageType;
  fileUrl?: string;
  replyTo?: number;
}

export interface EditMessageDto {
  message: string;
}

export interface OnlineUser {
  userId: number;
  user?: User;
  joinedAt: string;
}

// Query params
export interface GetMessagesParams {
  page?: number;
  limit?: number;
  before?: number;
  after?: number;
  search?: string;
  includeDeleted?: boolean;
}

// Socket events
export interface MessageReceivedEvent {
  message: ChatMessage;
}

export interface MessageEditedEvent {
  messageId: number;
  newContent: string;
  editedAt: string;
}

export interface MessageDeletedEvent {
  messageId: number;
}

export interface TypingEvent {
  roomId: string;
  userId: number;
  isTyping: boolean;
}
