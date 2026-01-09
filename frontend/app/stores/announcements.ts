import { defineStore } from 'pinia'

export interface Announcement {
  id: string
  classId: number
  teacherId: number
  title: string
  content: string
  isPinned: boolean
  priority: 'normal' | 'important' | 'urgent'
  allowComments: boolean
  scheduledAt?: Date
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
  author?: {
    id: number
    fullName: string
    email: string
  }
  comments?: AnnouncementComment[]
  readBy?: number[]
}

export interface AnnouncementComment {
  id: string
  userId: number
  userName: string
  content: string
  createdAt: Date
}

export interface CreateAnnouncementRequest {
  title: string
  content: string
  isPinned?: boolean
  scheduledAt?: Date
  expiresAt?: Date
  priority?: 'normal' | 'important' | 'urgent'
  allowComments?: boolean
}

interface AnnouncementsState {
  announcements: Announcement[]
  currentAnnouncement: Announcement | null
  isLoading: boolean
}

export const useAnnouncementsStore = defineStore('announcements', {
  state: (): AnnouncementsState => ({
    announcements: [],
    currentAnnouncement: null,
    isLoading: false,
  }),

  getters: {
    pinnedAnnouncements: (state) => state.announcements.filter(a => a.isPinned),
    regularAnnouncements: (state) => state.announcements.filter(a => !a.isPinned),
  },

  actions: {
    async fetchAnnouncements(classId: number, onlyPinned = false) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const params = onlyPinned ? { onlyPinned: 'true' } : {}
        const announcements = await api.get<Announcement[]>(`/classes/${classId}/announcements`, params)
        this.announcements = announcements
        return announcements
      } finally {
        this.isLoading = false
      }
    },

    async createAnnouncement(classId: number, data: CreateAnnouncementRequest) {
      const api = useApi()
      const announcement = await api.post<Announcement>(`/classes/${classId}/announcements`, data)
      this.announcements.unshift(announcement)
      return announcement
    },

    async updateAnnouncement(classId: number, announcementId: string, data: Partial<CreateAnnouncementRequest>) {
      const api = useApi()
      const updated = await api.put<Announcement>(`/classes/${classId}/announcements/${announcementId}`, data)
      
      const index = this.announcements.findIndex(a => a.id === announcementId)
      if (index !== -1) {
        this.announcements[index] = updated
      }
      
      return updated
    },

    async deleteAnnouncement(classId: number, announcementId: string) {
      const api = useApi()
      await api.delete(`/classes/${classId}/announcements/${announcementId}`)
      this.announcements = this.announcements.filter(a => a.id !== announcementId)
    },

    async markAsRead(classId: number, announcementId: string) {
      const api = useApi()
      await api.post(`/classes/${classId}/announcements/${announcementId}/read`)
      
      const announcement = this.announcements.find(a => a.id === announcementId)
      if (announcement) {
        const authStore = useAuthStore()
        if (!announcement.readBy) announcement.readBy = []
        if (!announcement.readBy.includes(authStore.user!.id)) {
          announcement.readBy.push(authStore.user!.id)
        }
      }
    },

    async addComment(classId: number, announcementId: string, content: string) {
      const api = useApi()
      const comment = await api.post<AnnouncementComment>(`/classes/${classId}/announcements/${announcementId}/comments`, { content })
      
      const announcement = this.announcements.find(a => a.id === announcementId)
      if (announcement) {
        if (!announcement.comments) announcement.comments = []
        announcement.comments.push(comment)
      }
      
      return comment
    },

    async togglePin(classId: number, announcementId: string) {
      const api = useApi()
      const result = await api.post<{ isPinned: boolean }>(`/classes/${classId}/announcements/${announcementId}/pin`)
      
      const announcement = this.announcements.find(a => a.id === announcementId)
      if (announcement) {
        announcement.isPinned = result.isPinned
      }
      
      return result.isPinned
    },

    async getUnreadCount(classId: number) {
      const api = useApi()
      const result = await api.get<{ count: number }>(`/classes/${classId}/announcements/unread`)
      return result.count
    },
  },
})
