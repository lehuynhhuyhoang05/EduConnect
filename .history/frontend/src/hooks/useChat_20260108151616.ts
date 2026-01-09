import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { ChatMessage, Conversation } from '../types';

// Helper to convert id to string
const toStr = (id: string | number): string => String(id);

// Query keys
export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversation: (id: string | number) => [...chatKeys.all, 'conversation', toStr(id)] as const,
  messages: (conversationId: string | number) => [...chatKeys.all, 'messages', toStr(conversationId)] as const,
  classMessages: (classId: string | number) => [...chatKeys.all, 'classMessages', toStr(classId)] as const,
};

// Get all conversations
export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: async () => {
      const response = await api.get<Conversation[]>('/chat/conversations');
      return response.data;
    },
  });
}

// Get conversation by ID
export function useConversation(id: string | number) {
  return useQuery({
    queryKey: chatKeys.conversation(id),
    queryFn: async () => {
      const response = await api.get<Conversation>(`/chat/conversations/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Get messages for a conversation
export function useMessages(conversationId: string | number, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...chatKeys.messages(conversationId), params],
    queryFn: async () => {
      const response = await api.get<ChatMessage[]>(
        `/chat/conversations/${conversationId}/messages`,
        { params }
      );
      return response.data;
    },
    enabled: !!conversationId,
  });
}

// Get class chat messages
export function useClassMessages(classId: string | number, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...chatKeys.classMessages(classId), params],
    queryFn: async () => {
      const response = await api.get<ChatMessage[]>(`/chat/class/${classId}/messages`, { params });
      return response.data;
    },
    enabled: !!classId,
  });
}

// Send message mutation
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      attachments,
    }: {
      conversationId: string | number;
      content: string;
      attachments?: string[];
    }) => {
      const response = await api.post<ChatMessage>(
        `/chat/conversations/${conversationId}/messages`,
        { content, attachments }
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(variables.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversations(),
      });
    },
  });
}

// Send class message mutation
export function useSendClassMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      classId,
      content,
      attachments,
    }: {
      classId: string | number;
      content: string;
      attachments?: string[];
    }) => {
      const response = await api.post<ChatMessage>(`/chat/class/${classId}/messages`, {
        content,
        attachments,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatKeys.classMessages(variables.classId),
      });
    },
  });
}

// Create conversation mutation
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participantIds: (string | number)[]) => {
      const response = await api.post<Conversation>('/chat/conversations', { participantIds });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

// Mark conversation as read mutation
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string | number) => {
      await api.post(`/chat/conversations/${conversationId}/read`);
      return conversationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

// Delete message mutation
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      messageId,
    }: {
      conversationId: string | number;
      messageId: string | number;
    }) => {
      await api.delete(`/chat/conversations/${conversationId}/messages/${messageId}`);
      return { conversationId, messageId };
    },
    onSuccess: ({ conversationId }) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
    },
  });
}
