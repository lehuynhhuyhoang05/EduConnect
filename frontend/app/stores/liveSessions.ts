import { defineStore } from 'pinia'
import type { 
  LiveSession, 
  SessionParticipant, 
  CreateSessionRequest,
  PaginatedResponse, 
  QueryParams,
  SessionStatus 
} from '~/types'

interface LiveSessionsState {
  sessions: LiveSession[]
  currentSession: LiveSession | null
  participants: SessionParticipant[]
  isLoading: boolean
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export const useLiveSessionsStore = defineStore('liveSessions', {
  state: (): LiveSessionsState => ({
    sessions: [],
    currentSession: null,
    participants: [],
    isLoading: false,
    meta: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    },
  }),

  getters: {
    liveSessions: (state) => state.sessions.filter(s => s.status === 'live'),
    scheduledSessions: (state) => state.sessions.filter(s => s.status === 'scheduled'),
    endedSessions: (state) => state.sessions.filter(s => s.status === 'ended'),
    isHost: (state) => {
      const authStore = useAuthStore()
      return state.currentSession?.hostId === authStore.user?.id
    },
  },

  actions: {
    async fetchSessions(params: QueryParams & { classId?: number; status?: SessionStatus } = {}) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const url = params.classId 
          ? `/classes/${params.classId}/sessions`
          : '/sessions'
        
        const response = await api.get<PaginatedResponse<LiveSession>>(url, {
          page: params.page || 1,
          limit: params.limit || 10,
          status: params.status,
        })
        
        this.sessions = response.data
        this.meta = response.meta
        return response
      } finally {
        this.isLoading = false
      }
    },

    async fetchSession(idOrRoomId: string | number) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const session = await api.get<LiveSession>(`/sessions/${idOrRoomId}`)
        this.currentSession = session
        return session
      } finally {
        this.isLoading = false
      }
    },

    async createSession(classId: number, data: CreateSessionRequest) {
      const api = useApi()
      const session = await api.post<LiveSession>(`/classes/${classId}/sessions`, data)
      this.sessions.unshift(session)
      return session
    },

    async updateSession(id: number, data: Partial<CreateSessionRequest>) {
      const api = useApi()
      const updated = await api.put<LiveSession>(`/sessions/${id}`, data)
      
      const index = this.sessions.findIndex(s => s.id === id)
      if (index !== -1) {
        this.sessions[index] = updated
      }
      if (this.currentSession?.id === id) {
        this.currentSession = updated
      }
      
      return updated
    },

    async deleteSession(id: number) {
      const api = useApi()
      await api.delete(`/sessions/${id}`)
      this.sessions = this.sessions.filter(s => s.id !== id)
    },

    // Session lifecycle
    async startSession(id: number) {
      const api = useApi()
      const session = await api.post<LiveSession>(`/sessions/${id}/start`)
      
      const index = this.sessions.findIndex(s => s.id === id)
      if (index !== -1) {
        this.sessions[index] = session
      }
      if (this.currentSession?.id === id) {
        this.currentSession = session
      }
      
      return session
    },

    async endSession(id: number) {
      const api = useApi()
      const session = await api.post<LiveSession>(`/sessions/${id}/end`)
      
      const index = this.sessions.findIndex(s => s.id === id)
      if (index !== -1) {
        this.sessions[index] = session
      }
      if (this.currentSession?.id === id) {
        this.currentSession = session
      }
      
      return session
    },

    async joinSession(id: number, socketId?: string) {
      const api = useApi()
      const result = await api.post<{ participant: SessionParticipant; webrtcConfig: unknown }>(`/sessions/${id}/join`, { socketId })
      return result
    },

    async leaveSession(id: number) {
      const api = useApi()
      await api.post(`/sessions/${id}/leave`)
    },

    async kickParticipant(sessionId: number, userId: number) {
      const api = useApi()
      await api.post(`/sessions/${sessionId}/kick/${userId}`)
      this.participants = this.participants.filter(p => p.userId !== userId)
    },

    // Utility
    setCurrentSession(session: LiveSession | null) {
      this.currentSession = session
    },

    updateParticipants(participants: SessionParticipant[]) {
      this.participants = participants
    },

    addParticipant(participant: SessionParticipant) {
      if (!this.participants.find(p => p.userId === participant.userId)) {
        this.participants.push(participant)
      }
    },

    removeParticipant(userId: number) {
      this.participants = this.participants.filter(p => p.userId !== userId)
    },
  },
})
