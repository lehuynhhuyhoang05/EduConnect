import { defineStore } from 'pinia'
import type { Class, ClassMember, CreateClassRequest, JoinClassRequest, PaginatedResponse, QueryParams } from '~/types'

interface ClassesState {
  classes: Class[]
  currentClass: Class | null
  members: ClassMember[]
  isLoading: boolean
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export const useClassesStore = defineStore('classes', {
  state: (): ClassesState => ({
    classes: [],
    currentClass: null,
    members: [],
    isLoading: false,
    meta: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    },
  }),

  getters: {
    myClasses: (state) => state.classes,
    teachingClasses: (state) => {
      const authStore = useAuthStore()
      return state.classes.filter(c => c.teacherId === authStore.user?.id)
    },
    enrolledClasses: (state) => {
      const authStore = useAuthStore()
      return state.classes.filter(c => c.teacherId !== authStore.user?.id)
    },
  },

  actions: {
    async fetchClasses(params: QueryParams = {}) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const response = await api.get<PaginatedResponse<Class>>('/classes', {
          page: params.page || 1,
          limit: params.limit || 10,
          search: params.search,
        })
        
        this.classes = response.data
        this.meta = response.meta
        return response
      } finally {
        this.isLoading = false
      }
    },

    async fetchClass(id: number) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const classData = await api.get<Class>(`/classes/${id}`)
        this.currentClass = classData
        return classData
      } finally {
        this.isLoading = false
      }
    },

    async createClass(data: CreateClassRequest) {
      const api = useApi()
      const newClass = await api.post<Class>('/classes', data)
      this.classes.unshift(newClass)
      return newClass
    },

    async updateClass(id: number, data: Partial<CreateClassRequest>) {
      const api = useApi()
      const updatedClass = await api.put<Class>(`/classes/${id}`, data)
      
      const index = this.classes.findIndex(c => c.id === id)
      if (index !== -1) {
        this.classes[index] = updatedClass
      }
      if (this.currentClass?.id === id) {
        this.currentClass = updatedClass
      }
      
      return updatedClass
    },

    async deleteClass(id: number) {
      const api = useApi()
      await api.delete(`/classes/${id}`)
      this.classes = this.classes.filter(c => c.id !== id)
      if (this.currentClass?.id === id) {
        this.currentClass = null
      }
    },

    async joinClass(data: JoinClassRequest) {
      const api = useApi()
      const membership = await api.post<ClassMember>('/classes/join', data)
      
      // Refresh classes list
      await this.fetchClasses()
      
      return membership
    },

    async leaveClass(id: number) {
      const api = useApi()
      await api.post(`/classes/${id}/leave`)
      this.classes = this.classes.filter(c => c.id !== id)
    },

    async fetchMembers(classId: number) {
      const api = useApi()
      const members = await api.get<ClassMember[]>(`/classes/${classId}/members`)
      this.members = members
      return members
    },

    async removeMember(classId: number, studentId: number) {
      const api = useApi()
      await api.delete(`/classes/${classId}/members/${studentId}`)
      this.members = this.members.filter(m => m.userId !== studentId)
    },
  },
})
