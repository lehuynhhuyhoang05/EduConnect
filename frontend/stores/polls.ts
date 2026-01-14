import { defineStore } from 'pinia'

export interface PollOption {
  text: string
  votes?: number
}

export interface Poll {
  id: number
  question: string
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer'
  status: 'draft' | 'active' | 'closed'
  options: string[]
  correctAnswers?: number[]
  isQuiz: boolean
  timeLimit: number
  showResults: boolean
  anonymous: boolean
  classId?: number
  sessionId?: number
  createdById: number
  startedAt?: string
  closedAt?: string
  createdAt: string
}

export interface PollResponse {
  pollId: number
  selectedOptions?: number[]
  textAnswer?: string
}

export interface PollResults {
  pollId: number
  totalResponses: number
  options: {
    index: number
    text: string
    count: number
    percentage: number
  }[]
  responses?: any[]
}

interface PollsState {
  polls: Poll[]
  currentPoll: Poll | null
  currentResults: PollResults | null
  isLoading: boolean
  hasVoted: boolean
}

export const usePollsStore = defineStore('polls', {
  state: (): PollsState => ({
    polls: [],
    currentPoll: null,
    currentResults: null,
    isLoading: false,
    hasVoted: false,
  }),

  getters: {
    activePolls: (state) => state.polls.filter(p => p.status === 'active'),
    draftPolls: (state) => state.polls.filter(p => p.status === 'draft'),
    closedPolls: (state) => state.polls.filter(p => p.status === 'closed'),
  },

  actions: {
    async fetchPolls(params?: { classId?: number; sessionId?: number }) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const response = await api.get<Poll[]>('/polls', params || {})
        this.polls = response
        return response
      } finally {
        this.isLoading = false
      }
    },

    async createPoll(data: Partial<Poll>) {
      const api = useApi()
      const poll = await api.post<Poll>('/polls', data)
      this.polls.unshift(poll)
      return poll
    },

    async startPoll(pollId: number) {
      const api = useApi()
      const poll = await api.post<Poll>(`/polls/${pollId}/start`)
      
      const index = this.polls.findIndex(p => p.id === pollId)
      if (index !== -1) {
        this.polls[index] = poll
      }
      if (this.currentPoll?.id === pollId) {
        this.currentPoll = poll
      }
      
      return poll
    },

    async closePoll(pollId: number) {
      const api = useApi()
      const poll = await api.post<Poll>(`/polls/${pollId}/close`)
      
      const index = this.polls.findIndex(p => p.id === pollId)
      if (index !== -1) {
        this.polls[index] = poll
      }
      if (this.currentPoll?.id === pollId) {
        this.currentPoll = poll
      }
      
      return poll
    },

    async submitResponse(pollId: number, selectedOptions: number[], textAnswer?: string) {
      const api = useApi()
      await api.post(`/polls/${pollId}/respond`, {
        selectedOptions,
        textAnswer,
      })
      this.hasVoted = true
    },

    async fetchResults(pollId: number) {
      const api = useApi()
      const results = await api.get<PollResults>(`/polls/${pollId}/results`)
      this.currentResults = results
      return results
    },

    async deletePoll(pollId: number) {
      const api = useApi()
      await api.delete(`/polls/${pollId}`)
      this.polls = this.polls.filter(p => p.id !== pollId)
    },

    setCurrentPoll(poll: Poll | null) {
      this.currentPoll = poll
      this.hasVoted = false
    },

    // WebSocket connection methods
    connectSocket(classId: number) {
      // This will be handled by the composable if using Socket.IO
      // For now, we'll use polling or leave as a placeholder
      console.log('Connecting to polls socket for class:', classId)
    },

    disconnectSocket() {
      console.log('Disconnecting from polls socket')
    },

    // Update poll from websocket event
    updatePollFromSocket(poll: Poll) {
      const index = this.polls.findIndex(p => p.id === poll.id)
      if (index !== -1) {
        this.polls[index] = poll
      } else {
        this.polls.unshift(poll)
      }
    },

    // Update results from websocket event
    updateResultsFromSocket(results: PollResults) {
      if (this.currentResults?.pollId === results.pollId) {
        this.currentResults = results
      }
    },
  },
})
