import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { chatApi } from '@/services/api';
import { socketManager, subscribeToChatRoom, sendChatMessage as socketSendMessage, sendTypingIndicator } from '@/services/socket';
import type { ChatMessage, SendMessageDto, QueryMessageDto } from '@/types';

// Query keys
export const chatKeys = {
  all: ['chat'] as const,
  rooms: () => [...chatKeys.all, 'rooms'] as const,
  messages: (roomType: 'CLASS' | 'SESSION', roomId: number) => [...chatKeys.all, roomType, roomId, 'messages'] as const,
};

// ============================================
// QUERIES
// ============================================

// Get chat rooms
export const useChatRooms = () => {
  return useQuery({
    queryKey: chatKeys.rooms(),
    queryFn: () => chatApi.getRooms(),
    staleTime: 2 * 60 * 1000,
  });
};

// Get class messages
export const useClassMessages = (classId: number, params?: QueryMessageDto) => {
  return useQuery({
    queryKey: chatKeys.messages('CLASS', classId),
    queryFn: () => chatApi.getClassMessages(classId, params),
    enabled: !!classId,
    staleTime: 30 * 1000,
  });
};

// Get session messages
export const useSessionMessages = (sessionId: number, params?: QueryMessageDto) => {
  return useQuery({
    queryKey: chatKeys.messages('SESSION', sessionId),
    queryFn: () => chatApi.getSessionMessages(sessionId, params),
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });
};

// ============================================
// MUTATIONS
// ============================================

// Send class message
export const useSendClassMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classId, data }: { classId: number; data: SendMessageDto }) =>
      chatApi.sendClassMessage(classId, data),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages('CLASS', classId) });
    },
  });
};

// Send session message
export const useSendSessionMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: number; data: SendMessageDto }) =>
      chatApi.sendSessionMessage(sessionId, data),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages('SESSION', sessionId) });
    },
  });
};

// Edit message
export const useEditMessage = () => {
  return useMutation({
    mutationFn: ({ messageId, message }: { messageId: number; message: string }) =>
      chatApi.editMessage(messageId, message),
  });
};

// Delete message
export const useDeleteMessage = () => {
  return useMutation({
    mutationFn: (messageId: number) => chatApi.deleteMessage(messageId),
  });
};

// ============================================
// REAL-TIME HOOK
// ============================================

interface TypingUser {
  userId: number;
  name: string;
}

export const useChatRealtime = (roomType: 'CLASS' | 'SESSION', roomId: number) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const queryClient = useQueryClient();

  // Load initial messages
  const { data: initialData, isLoading } = roomType === 'CLASS'
    ? useClassMessages(roomId)
    : useSessionMessages(roomId);

  useEffect(() => {
    if (initialData?.data) {
      setMessages(initialData.data);
    }
  }, [initialData]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = subscribeToChatRoom(roomType, roomId, {
      onMessage: (message) => {
        console.log('[Chat] Received new message:', message);
        setMessages((prev) => [...prev, message as unknown as ChatMessage]);
        queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
      },
      onTyping: (data) => {
        if (data.isTyping) {
          setTypingUsers((prev) => {
            if (prev.some((u) => u.userId === data.userId)) return prev;
            return [...prev, { userId: data.userId, name: data.userName || 'User' }];
          });
        } else {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        }
      },
      onMessageEdited: (message) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, message: message.message, isEdited: true } : m))
        );
      },
      onMessageDeleted: (data) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, isDeleted: true } : m))
        );
      },
    });

    return unsubscribe;
  }, [roomType, roomId, queryClient]);

  // Clear typing indicator after timeout
  useEffect(() => {
    if (typingUsers.length === 0) return;

    const timeout = setTimeout(() => {
      setTypingUsers([]);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [typingUsers]);

  const sendMessage = useCallback(
    async (message: string, messageType: string = 'TEXT', replyTo?: number) => {
      const result = await socketSendMessage(roomType, roomId, message, messageType, replyTo);
      console.log('[Chat] Send message result:', result);
    },
    [roomType, roomId]
  );

  const sendTyping = useCallback(() => {
    sendTypingIndicator(roomType, roomId, true);
  }, [roomType, roomId]);

  return {
    messages,
    typingUsers,
    isLoading,
    sendMessage,
    sendTyping,
  };
};

// ============================================
// SEARCH
// ============================================

export const useSearchMessages = () => {
  const [results, setResults] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(
    async (roomType: 'CLASS' | 'SESSION', roomId: number, query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const messages = await chatApi.searchMessages(roomType, roomId, query);
        setResults(messages);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const clearSearch = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    isSearching,
    search,
    clearSearch,
  };
};
