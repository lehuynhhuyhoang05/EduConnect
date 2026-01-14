import { defineStore } from 'pinia'

export interface LearningActivity {
  id: number
  userId: number
  classId?: number
  activityType: 'login' | 'view_material' | 'download_material' | 'submit_assignment' | 'attend_live_session' | 'complete_quiz' | 'post_chat' | 'view_video'
  resourceId?: number
  resourceTitle?: string
  duration: number
  metadata?: Record<string, any>
  createdAt: string
}

export interface StudentProgress {
  userId: number
  classId: number
  totalActivities: number
  totalTimeMinutes: number
  assignmentsCompleted: number
  sessionsAttended: number
  materialsViewed: number
  quizzesCompleted: number
  engagementScore: number
  lastActivityAt?: string
}

export interface DailyActivity {
  date: string
  count: number
  minutes: number
}

export interface LeaderboardEntry {
  rank: number
  userId: number
  fullName: string
  avatarUrl?: string
  engagementScore: number
  totalActivities: number
  totalTimeMinutes: number
}

export interface EngagementMetrics {
  totalTimeSpent: number
  averageDailyTime: number
  mostActiveDay: string
  mostActiveHour: number
  activityBreakdown: {
    type: string
    count: number
    percentage: number
  }[]
}

interface ProgressState {
  currentProgress: StudentProgress | null
  activityChart: DailyActivity[]
  leaderboard: LeaderboardEntry[]
  isLoading: boolean
}

export const useProgressStore = defineStore('progress', {
  state: (): ProgressState => ({
    currentProgress: null,
    activityChart: [],
    leaderboard: [],
    isLoading: false,
  }),

  getters: {},

  actions: {
    async fetchMyProgress(classId: number) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const progress = await api.get<StudentProgress>(`/progress/my/${classId}`)
        this.currentProgress = progress
        return progress
      } finally {
        this.isLoading = false
      }
    },

    async fetchStudentProgress(studentId: number, classId: number) {
      this.isLoading = true
      const api = useApi()
      
      try {
        // Backend có GET /progress/class/:classId trả về tất cả students
        const data = await api.get<{ students: StudentProgress[] }>(`/progress/class/${classId}`)
        const progress = data.students?.find((s: StudentProgress) => s.userId === studentId) || null
        this.currentProgress = progress
        return progress
      } finally {
        this.isLoading = false
      }
    },

    async fetchActivityChart(classId: number, studentId?: number) {
      const api = useApi()
      const params: Record<string, any> = { classId }
      
      const data = await api.get<DailyActivity[]>(`/progress/chart`, params)
      this.activityChart = data
      return data
    },

    async fetchLeaderboard(classId: number, limit = 10) {
      const api = useApi()
      const leaderboard = await api.get<LeaderboardEntry[]>(`/progress/leaderboard/${classId}`, { limit })
      this.leaderboard = leaderboard
      return leaderboard
    },

    async logActivity(data: { activityType: string; classId?: number; resourceId?: number; duration?: number }) {
      const api = useApi()
      await api.post('/progress/activity', data)
    },
  },
})
