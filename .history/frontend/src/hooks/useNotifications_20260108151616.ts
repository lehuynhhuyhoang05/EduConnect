import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Notification } from '../types';

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: Record<string, unknown>) => [...notificationKeys.all, 'list', params] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
};

// Get all notifications
export function useNotifications(params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: async () => {
      const response = await api.get<{ notifications: Notification[]; total: number; unread: number }>('/notifications', { params });
      return response.data?.notifications || response.data || [];
    },
  });
}

// Get unread notification count
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const response = await api.get<{ total: number; unread: number }>('/notifications/count');
      return response.data.unread || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Mark notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string | number) => {
      await api.post('/notifications/read', { ids: [notificationId] });
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// Delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.delete(`/notifications/${notificationId}`);
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// Delete all notifications
export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete('/notifications/all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
