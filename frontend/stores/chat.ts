import { defineStore } from 'pinia'
import type { ChatMessage, User } from '~/types'

interface ChatState {
  messages: Map<number, ChatMessage[]> // classId -> messages
  typingUsers: Map<number, User[]> // classId -> typing users
  isLoading: boolean
  currentClassId: number | null
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    messages: new Map(),
    typingUsers: new Map(),
    isLoading: false,
    currentClassId: null,
  }),

  getters: {
    currentMessages: (state) => {
      if (!state.currentClassId) return []
      return state.messages.get(state.currentClassId) || []
    },
    currentTypingUsers: (state) => {
      if (!state.currentClassId) return []
      return state.typingUsers.get(state.currentClassId) || []
    },
    getMessagesByClass: (state) => (classId: number) => {
      return state.messages.get(classId) || []
    },
  },

  actions: {
    setCurrentClass(classId: number) {
      this.currentClassId = classId
    },

    async fetchMessages(classId: number, params: { before?: string; limit?: number } = {}) {
      this.isLoading = true
      const api = useApi()
      
      try {
        const response = await api.get<{ messages: ChatMessage[]; hasMore: boolean }>(
          `/classes/${classId}/chat/messages`,
          {
            before: params.before,
            limit: params.limit || 50,
          }
        )
        
        const existingMessages = this.messages.get(classId) || []
        
        if (params.before) {
          // Loading older messages - prepend
          this.messages.set(classId, [...response.messages, ...existingMessages])
        } else {
          // Fresh load
          this.messages.set(classId, response.messages)
        }
        
        return response
      } finally {
        this.isLoading = false
      }
    },

    async sendMessage(classId: number, content: string, parentId?: number) {
      const api = useApi()
      const response = await api.post<ChatMessage>(`/classes/${classId}/chat/messages`, {
        content,
        parentId,
      })
      
      this.addMessage(classId, response)
      return response
    },

    async editMessage(classId: number, messageId: number, content: string) {
      const api = useApi()
      const response = await api.patch<ChatMessage>(
        `/classes/${classId}/chat/messages/${messageId}`,
        { content }
      )
      
      this.updateMessage(classId, response)
      return response
    },

    async deleteMessage(classId: number, messageId: number) {
      const api = useApi()
      await api.delete(`/classes/${classId}/chat/messages/${messageId}`)
      
      const messages = this.messages.get(classId) || []
      this.messages.set(classId, messages.filter(m => m.id !== messageId))
    },

    async uploadFile(classId: number, file: File) {
      const api = useApi()
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await api.post<ChatMessage>(
        `/classes/${classId}/chat/upload`,
        formData
      )
      
      this.addMessage(classId, response)
      return response
    },

    // Real-time updates via Socket.io
    addMessage(classId: number, message: ChatMessage) {
      const messages = this.messages.get(classId) || []
      
      // Check if message already exists (prevent duplicates)
      if (!messages.some(m => m.id === message.id)) {
        this.messages.set(classId, [...messages, message])
      }
    },

    updateMessage(classId: number, message: ChatMessage) {
      const messages = this.messages.get(classId) || []
      const index = messages.findIndex(m => m.id === message.id)
      
      if (index !== -1) {
        messages[index] = message
        this.messages.set(classId, [...messages])
      }
    },

    removeMessage(classId: number, messageId: number) {
      const messages = this.messages.get(classId) || []
      this.messages.set(classId, messages.filter(m => m.id !== messageId))
    },

    setTypingUsers(classId: number, users: User[]) {
      this.typingUsers.set(classId, users)
    },

    addTypingUser(classId: number, user: User) {
      const users = this.typingUsers.get(classId) || []
      if (!users.some(u => u.id === user.id)) {
        this.typingUsers.set(classId, [...users, user])
      }
    },

    removeTypingUser(classId: number, userId: number) {
      const users = this.typingUsers.get(classId) || []
      this.typingUsers.set(classId, users.filter(u => u.id !== userId))
    },

    clearMessages(classId: number) {
      this.messages.delete(classId)
      this.typingUsers.delete(classId)
    },

    clearAll() {
      this.messages.clear()
      this.typingUsers.clear()
      this.currentClassId = null
    },
  },
})
