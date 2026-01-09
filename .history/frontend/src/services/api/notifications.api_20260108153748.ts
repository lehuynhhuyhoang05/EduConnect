import api from './axios';
import type {
  Notification,
  NotificationCounts,
  MarkReadDto,
  GetNotificationsParams,
  NotificationsResponse,
} from '@/types';

/**
 * Get notifications
 */
export async function getNotifications(
  params?: GetNotificationsParams
): Promise<NotificationsResponse> {
  const response = await api.get<NotificationsResponse>('/notifications', { params });
  return response.data;
}

/**
 * Get notification counts
 */
export async function getNotificationCounts(): Promise<NotificationCounts> {
  const response = await api.get<NotificationCounts>('/notifications/count');
  return response.data;
}

/**
 * Get single notification
 */
export async function getNotification(id: string | number): Promise<Notification> {
  const response = await api.get<Notification>(`/notifications/${id}`);
  return response.data;
}

/**
 * Mark notifications as read
 */
export async function markAsRead(data: MarkReadDto): Promise<void> {
  await api.post('/notifications/read', data);
}

/**
 * Mark all as read
 */
export async function markAllAsRead(): Promise<void> {
  await api.post('/notifications/read-all');
}

/**
 * Delete notification
 */
export async function deleteNotification(id: string | number): Promise<void> {
  await api.delete(`/notifications/${id}`);
}

/**
 * Delete all notifications
 */
export async function deleteAllNotifications(): Promise<void> {
  await api.delete('/notifications/all');
}
