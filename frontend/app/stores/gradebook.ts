import { defineStore } from 'pinia'

export interface GradeItem {
  id: number
  name: string
  description?: string
  category: 'assignment' | 'quiz' | 'exam' | 'attendance' | 'participation' | 'project' | 'other'
  maxPoints: number
  weight: number
  classId: number
  dueDate?: string
  isPublished: boolean
  relatedAssignmentId?: number
  createdAt: string
}

export interface GradeEntry {
  id: number
  gradeItemId: number
  studentId: number
  points: number
  feedback?: string
  gradedById?: number
  gradedAt?: string
}

export interface StudentGrades {
  studentId: number
  classId: number
  items: {
    gradeItemId: number
    name: string
    category: string
    maxPoints: number
    points?: number
    feedback?: string
  }[]
  totalEarned: number
  totalPossible: number
  overallPercentage: number
}

export interface GradeStatistics {
  classAverage: number
  highestScore: number
  lowestScore: number
  submissionRate: number
}

interface GradebookState {
  gradeItems: GradeItem[]
  gradeEntries: GradeEntry[]
  studentGrades: StudentGrades | null
  statistics: GradeStatistics | null
  isLoading: boolean
}

export const useGradebookStore = defineStore('gradebook', {
  state: (): GradebookState => ({
    gradeItems: [],
    gradeEntries: [],
    studentGrades: null,
    statistics: null,
    isLoading: false,
  }),

  getters: {
    publishedItems: (state) => state.gradeItems.filter(item => item.isPublished),
  },

  actions: {
    async fetchGradebook(classId: number) {
      this.isLoading = true
      const api = useApi()
      
      try {
        // Backend trả về { gradeItems, students, summary }
        const data = await api.get<{ gradeItems: GradeItem[], students: any[], summary: any }>(`/gradebook/class/${classId}`)
        this.gradeItems = data.gradeItems || []
        this.statistics = data.summary || null
        
        // Extract entries from students data nếu cần
        const entries: GradeEntry[] = []
        if (data.students) {
          data.students.forEach((student: any) => {
            if (student.grades) {
              Object.entries(student.grades).forEach(([itemId, entry]: [string, any]) => {
                if (entry) {
                  entries.push({
                    ...entry,
                    gradeItemId: Number(itemId),
                    studentId: student.id
                  })
                }
              })
            }
          })
        }
        this.gradeEntries = entries
      } finally {
        this.isLoading = false
      }
    },

    async fetchMyGrades(classId: number) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const data = await api.get<any>(`/gradebook/class/${classId}/student`)
        // Map response to StudentGrades interface
        this.studentGrades = {
          studentId: 0, // will be set from auth
          classId,
          items: data.gradeItems?.map((item: GradeItem) => {
            const entry = data.grades?.[item.id]
            return {
              gradeItemId: item.id,
              name: item.name,
              category: item.category,
              maxPoints: item.maxPoints,
              points: entry?.score,
              feedback: entry?.feedback
            }
          }) || [],
          totalEarned: 0,
          totalPossible: 0,
          overallPercentage: data.finalGrade || 0
        }
        
        // Calculate totals
        if (this.studentGrades?.items) {
          this.studentGrades.totalPossible = this.studentGrades.items.reduce((sum, item) => sum + item.maxPoints, 0)
          this.studentGrades.totalEarned = this.studentGrades.items.reduce((sum, item) => sum + (item.points || 0), 0)
        }
        
        return this.studentGrades
      } finally {
        this.isLoading = false
      }
    },

    async createGradeItem(classId: number, data: Partial<GradeItem>) {
      const api = useApi()
      const item = await api.post<GradeItem>(`/gradebook/items`, { ...data, classId })
      this.gradeItems.push(item)
      return item
    },

    async updateGradeItem(itemId: number, data: Partial<GradeItem>) {
      const api = useApi()
      const item = await api.patch<GradeItem>(`/gradebook/items/${itemId}`, data)
      const index = this.gradeItems.findIndex(i => i.id === itemId)
      if (index !== -1) {
        this.gradeItems[index] = item
      }
      return item
    },

    async deleteGradeItem(itemId: number) {
      const api = useApi()
      await api.delete(`/gradebook/items/${itemId}`)
      this.gradeItems = this.gradeItems.filter(i => i.id !== itemId)
    },

    async createGradeEntry(data: { studentId: number; gradeItemId: number; points: number; feedback?: string }) {
      const api = useApi()
      const entry = await api.post<GradeEntry>('/gradebook/entries', data)
      this.gradeEntries.push(entry)
      return entry
    },

    async updateGradeEntry(entryId: number, data: { points?: number; feedback?: string }) {
      const api = useApi()
      const entry = await api.patch<GradeEntry>(`/gradebook/entries/${entryId}`, data)
      const index = this.gradeEntries.findIndex(e => e.id === entryId)
      if (index !== -1) {
        this.gradeEntries[index] = entry
      }
      return entry
    },

    async exportToCSV(classId: number): Promise<Blob> {
      const config = useRuntimeConfig()
      const authStore = useAuthStore()
      const response = await $fetch<Blob>(`/gradebook/class/${classId}/export`, {
        baseURL: config.public.apiUrl,
        headers: authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {},
        responseType: 'blob',
      })
      return response
    },
  },
})
