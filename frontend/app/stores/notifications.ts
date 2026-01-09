import { defineStore } from 'pinia'
import type { Notification, NotificationPriority } from '~/types'

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
}

export const useNotificationsStore = defineStore('notifications', {
  state: (): NotificationsState => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
  }),

  getters: {
    unreadNotifications: (state) => state.notifications.filter(n => !n.isRead),
    readNotifications: (state) => state.notifications.filter(n => n.isRead),
    urgentNotifications: (state) => state.notifications.filter(n => n.priority === 'urgent' && !n.isRead),
  },

  actions: {
    async fetchNotifications(params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const response = await api.get<{ notifications: Notification[]; total: number; unread: number }>('/notifications', {
          page: params.page || 1,
          limit: params.limit || 20,
          unreadOnly: params.unreadOnly,
        })
        
        this.notifications = response.notifications
        this.unreadCount = response.unread
        return response
      } finally {
        this.isLoading = false
      }
    },

    async fetchUnreadCount() {
      const api = useApi()
      const response = await api.get<{ total: number; unread: number }>('/notifications/count')
      this.unreadCount = response.unread
      return response
    },

    async markAsRead(ids: number[]) {
      const api = useApi()
      await api.post('/notifications/read', { notificationIds: ids })
      
      this.notifications = this.notifications.map(n => {
        if (ids.includes(n.id)) {
          return { ...n, isRead: true, readAt: new Date().toISOString() }
        }
        return n
      })
      
      this.unreadCount = Math.max(0, this.unreadCount - ids.length)
    },

    async markAllAsRead() {
      const api = useApi()
      await api.post('/notifications/read-all')
      
      this.notifications = this.notifications.map(n => ({
        ...n,
        isRead: true,
        readAt: new Date().toISOString(),
      }))
      
      this.unreadCount = 0
    },

    async deleteNotification(id: number) {
      const api = useApi()
      await api.delete(`/notifications/${id}`)
      
      const notification = this.notifications.find(n => n.id === id)
      if (notification && !notification.isRead) {
        this.unreadCount = Math.max(0, this.unreadCount - 1)
      }
      
      this.notifications = this.notifications.filter(n => n.id !== id)
    },

    async deleteAllNotifications() {
      const api = useApi()
      await api.delete('/notifications')
      this.notifications = []
      this.unreadCount = 0
    },

    // Real-time updates
    addNotification(notification: Notification) {
      this.notifications.unshift(notification)
      if (!notification.isRead) {
        this.unreadCount++
      }
    },

    updateNotification(notification: Notification) {
      const index = this.notifications.findIndex(n => n.id === notification.id)
      if (index !== -1) {
        const wasUnread = !this.notifications[index].isRead
        const isNowRead = notification.isRead
        
        this.notifications[index] = notification
        
        if (wasUnread && isNowRead) {
          this.unreadCount = Math.max(0, this.unreadCount - 1)
        }
      }
    },
  },
})
