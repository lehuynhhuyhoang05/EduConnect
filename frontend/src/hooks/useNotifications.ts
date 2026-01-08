import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { notificationsApi } from '@/services/api';
import { socketManager, subscribeToNotifications } from '@/services/socket';
import type { Notification, QueryNotificationDto } from '@/types';

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params?: QueryNotificationDto) => [...notificationKeys.lists(), params] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  detail: (id: number) => [...notificationKeys.all, 'detail', id] as const,
};

// ============================================
// QUERIES
// ============================================

// Get notifications
export const useNotifications = (params?: QueryNotificationDto) => {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsApi.getAll(params),
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Get unread count
export const useUnreadCount = () => {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

// Get notification by ID
export const useNotification = (id: number) => {
  return useQuery({
    queryKey: notificationKeys.detail(id),
    queryFn: () => notificationsApi.getById(id),
    enabled: !!id,
  });
};

// ============================================
// MUTATIONS
// ============================================

// Mark as read
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationIds: number[]) => notificationsApi.markAsRead(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
};

// Mark all as read
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.setQueryData(notificationKeys.unreadCount(), 0);
    },
  });
};

// Delete notification
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
};

// Delete all notifications
export const useDeleteAllNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.deleteAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.setQueryData(notificationKeys.unreadCount(), 0);
    },
  });
};

// ============================================
// REAL-TIME HOOK
// ============================================

export const useNotificationsRealtime = (
  onNewNotification?: (notification: Notification) => void
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socketManager.isConnected()) return;

    const unsubscribe = subscribeToNotifications(
      (notification) => {
        // Update unread count
        queryClient.setQueryData<number>(notificationKeys.unreadCount(), (prev) => (prev ?? 0) + 1);

        // Invalidate notifications list to refetch
        queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });

        // Call callback if provided
        if (onNewNotification) {
          onNewNotification(notification as unknown as Notification);
        }
      },
      (_notificationIds) => {
        // Update when notifications are marked as read
        queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
        queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      }
    );

    return unsubscribe;
  }, [queryClient, onNewNotification]);
};

// ============================================
// COMBINED HOOK
// ============================================

export const useNotificationsManager = () => {
  const { data, isLoading, error, refetch } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteMutation = useDeleteNotification();
  const deleteAllMutation = useDeleteAllNotifications();

  const markAsRead = useCallback(
    (ids: number[]) => markAsReadMutation.mutateAsync(ids),
    [markAsReadMutation]
  );

  const markAllAsRead = useCallback(
    () => markAllAsReadMutation.mutateAsync(),
    [markAllAsReadMutation]
  );

  const deleteNotification = useCallback(
    (id: number) => deleteMutation.mutateAsync(id),
    [deleteMutation]
  );

  const deleteAll = useCallback(
    () => deleteAllMutation.mutateAsync(),
    [deleteAllMutation]
  );

  return {
    notifications: data?.notifications ?? [],
    total: data?.total ?? 0,
    unreadCount: unreadCount ?? 0,
    isLoading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
    isMarkingAsRead: markAsReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
