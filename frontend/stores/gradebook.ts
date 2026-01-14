import { defineStore } from 'pinia'

export interface GradeItem {
  id: number
  name: string
  description?: string
  category: 'assignment' | 'quiz' | 'exam' | 'attendance' | 'participation' | 'project' | 'other'
  maxPoints: number
  weight: number
  classId: number
  dueDate?: Date
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
        const [items, entries, stats] = await Promise.all([
          api.get<GradeItem[]>(`/gradebook/class/${classId}/items`),
          api.get<GradeEntry[]>(`/gradebook/class/${classId}/entries`),
          api.get<GradeStatistics>(`/gradebook/class/${classId}/statistics`),
        ])
        this.gradeItems = items
        this.gradeEntries = entries
        this.statistics = stats
      } finally {
        this.isLoading = false
      }
    },

    async fetchMyGrades(classId: number) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const data = await api.get<StudentGrades>(`/gradebook/class/${classId}/my-grades`)
        this.studentGrades = data
        return data
      } finally {
        this.isLoading = false
      }
    },

    async createGradeItem(classId: number, data: Partial<GradeItem>) {
      const api = useApi()
      const item = await api.post<GradeItem>(`/gradebook/class/${classId}/items`, data)
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
      const api = useApi()
      const response = await api.get<Blob>(`/gradebook/class/${classId}/export`, { responseType: 'blob' } as any)
      return response
    },
  },
})
    },
  },
})
