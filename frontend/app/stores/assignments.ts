import { defineStore } from 'pinia'
import type { 
  Assignment, 
  Submission, 
  CreateAssignmentRequest, 
  CreateSubmissionRequest,
  GradeSubmissionRequest,
  PaginatedResponse, 
  QueryParams 
} from '~/types'

interface AssignmentsState {
  assignments: Assignment[]
  currentAssignment: Assignment | null
  submissions: Submission[]
  mySubmission: Submission | null
  isLoading: boolean
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export const useAssignmentsStore = defineStore('assignments', {
  state: (): AssignmentsState => ({
    assignments: [],
    currentAssignment: null,
    submissions: [],
    mySubmission: null,
    isLoading: false,
    meta: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    },
  }),

  getters: {
    upcomingAssignments: (state) => {
      const now = new Date()
      return state.assignments
        .filter(a => a.deadline && new Date(a.deadline) > now)
        .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    },
    overdueAssignments: (state) => {
      const now = new Date()
      return state.assignments.filter(a => a.deadline && new Date(a.deadline) < now)
    },
  },

  actions: {
    async fetchAssignments(params: QueryParams & { classId?: number } = {}) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const url = params.classId 
          ? `/classes/${params.classId}/assignments`
          : '/assignments'
        
        const response = await api.get<PaginatedResponse<Assignment>>(url, {
          page: params.page || 1,
          limit: params.limit || 10,
          search: params.search,
        })
        
        this.assignments = response.data
        this.meta = response.meta
        return response
      } finally {
        this.isLoading = false
      }
    },

    async fetchAssignment(id: number) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const assignment = await api.get<Assignment>(`/assignments/${id}`)
        this.currentAssignment = assignment
        return assignment
      } finally {
        this.isLoading = false
      }
    },

    async createAssignment(classId: number, data: CreateAssignmentRequest) {
      const api = useApi()
      const assignment = await api.post<Assignment>(`/classes/${classId}/assignments`, data)
      this.assignments.unshift(assignment)
      return assignment
    },

    async updateAssignment(id: number, data: Partial<CreateAssignmentRequest>) {
      const api = useApi()
      const updated = await api.put<Assignment>(`/assignments/${id}`, data)
      
      const index = this.assignments.findIndex(a => a.id === id)
      if (index !== -1) {
        this.assignments[index] = updated
      }
      if (this.currentAssignment?.id === id) {
        this.currentAssignment = updated
      }
      
      return updated
    },

    async deleteAssignment(id: number) {
      const api = useApi()
      await api.delete(`/assignments/${id}`)
      this.assignments = this.assignments.filter(a => a.id !== id)
    },

    // Submissions
    async fetchSubmissions(assignmentId: number) {
      const api = useApi()
      const response = await api.get<PaginatedResponse<Submission>>(`/assignments/${assignmentId}/submissions`)
      this.submissions = response.data
      return response
    },

    async fetchMySubmission(assignmentId: number) {
      const api = useApi()
      try {
        const submission = await api.get<Submission>(`/assignments/${assignmentId}/my-submission`)
        this.mySubmission = submission
        return submission
      } catch {
        this.mySubmission = null
        return null
      }
    },

    async submitAssignment(assignmentId: number, data: CreateSubmissionRequest) {
      const api = useApi()
      const submission = await api.post<Submission>(`/assignments/${assignmentId}/submit`, data)
      this.mySubmission = submission
      return submission
    },

    async gradeSubmission(submissionId: number, data: GradeSubmissionRequest) {
      const api = useApi()
      const graded = await api.post<Submission>(`/submissions/${submissionId}/grade`, data)
      
      const index = this.submissions.findIndex(s => s.id === submissionId)
      if (index !== -1) {
        this.submissions[index] = graded
      }
      
      return graded
    },

    async returnSubmission(submissionId: number, feedback: string) {
      const api = useApi()
      const returned = await api.post<Submission>(`/submissions/${submissionId}/return`, { feedback })
      
      const index = this.submissions.findIndex(s => s.id === submissionId)
      if (index !== -1) {
        this.submissions[index] = returned
      }
      
      return returned
    },

    // Assignment Statistics
    async fetchAssignmentStats(assignmentId: number) {
      const api = useApi()
      return await api.get<{
        total: number
        submitted: number
        graded: number
        pending: number
        late: number
        averageScore: number
      }>(`/assignments/${assignmentId}/stats`)
    },

    // Export grades as CSV
    async exportGrades(assignmentId: number) {
      const api = useApi()
      return await api.get<string>(`/assignments/${assignmentId}/export-grades`)
    },

    // Bulk grade submissions
    async bulkGrade(assignmentId: number, grades: Array<{ submissionId: number; score: number; feedback?: string }>) {
      const api = useApi()
      return await api.post<{ success: number; failed: number }>(`/assignments/${assignmentId}/bulk-grade`, { grades })
    },
  },
})
