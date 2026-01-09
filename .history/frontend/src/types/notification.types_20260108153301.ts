export type NotificationType =
  // Class notifications
  | 'class_joined'
  | 'class_invitation'
  | 'class_updated'
  | 'class_deleted'
  | 'member_joined'
  | 'member_left'
  | 'member_removed'
  // Assignment notifications
  | 'assignment_created'
  | 'assignment_updated'
  | 'assignment_due_soon'
  | 'assignment_overdue'
  | 'submission_received'
  | 'submission_graded'
  | 'submission_returned'
  // Session notifications
  | 'session_scheduled'
  | 'session_starting_soon'
  | 'session_started'
  | 'session_ended'
  | 'session_cancelled'
  // Chat notifications
  | 'new_message'
  | 'mentioned'
  // System notifications
  | 'system_announcement'
  | 'account_updated';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionUrl: string | null;
  createdAt: string;
}

export interface NotificationCounts {
  total: number;
  unread: number;
}

export interface MarkReadDto {
  notificationIds: number[];
}

// Query params
export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
}

// Response
export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread: number;
}
