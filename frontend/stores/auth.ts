import { defineStore } from 'pinia'
import type { User, AuthResponse, LoginRequest, RegisterRequest, AuthTokens } from '~/types'

interface AuthState {
  user: User | null
  token: string | null
  refreshTokenValue: string | null
  isLoading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
    refreshTokenValue: null,
    isLoading: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    isTeacher: (state) => state.user?.role === 'TEACHER',
    isStudent: (state) => state.user?.role === 'STUDENT',
    currentUser: (state) => state.user,
  },

  actions: {
    async login(credentials: LoginRequest) {
      this.isLoading = true
      const config = useRuntimeConfig()
      
      try {
        const response = await $fetch<AuthResponse>('/auth/login', {
          baseURL: config.public.apiUrl,
          method: 'POST',
          body: credentials,
        })

        this.setAuthData(response)
        return response
      } finally {
        this.isLoading = false
      }
    },

    async register(data: RegisterRequest) {
      this.isLoading = true
      const config = useRuntimeConfig()
      
      try {
        const response = await $fetch<AuthResponse>('/auth/register', {
          baseURL: config.public.apiUrl,
          method: 'POST',
          body: data,
        })

        this.setAuthData(response)
        return response
      } finally {
        this.isLoading = false
      }
    },

    async refreshToken(): Promise<boolean> {
      if (!this.refreshTokenValue) return false
      
      const config = useRuntimeConfig()
      
      try {
        const response = await $fetch<AuthTokens>('/auth/refresh', {
          baseURL: config.public.apiUrl,
          method: 'POST',
          body: { refreshToken: this.refreshTokenValue },
        })

        this.token = response.accessToken
        this.refreshTokenValue = response.refreshToken
        
        // Persist to localStorage
        if (import.meta.client) {
          localStorage.setItem('accessToken', response.accessToken)
          localStorage.setItem('refreshToken', response.refreshToken)
        }
        
        return true
      } catch {
        this.clearAuthData()
        return false
      }
    },

    async fetchCurrentUser() {
      if (!this.token) return null
      
      const config = useRuntimeConfig()
      
      try {
        const user = await $fetch<User>('/auth/me', {
          baseURL: config.public.apiUrl,
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        })
        
        this.user = user
        return user
      } catch {
        this.clearAuthData()
        return null
      }
    },

    async logout() {
      const config = useRuntimeConfig()
      
      if (this.token && this.refreshTokenValue) {
        try {
          await $fetch('/auth/logout', {
            baseURL: config.public.apiUrl,
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
            body: { refreshToken: this.refreshTokenValue },
          })
        } catch {
          // Ignore logout errors
        }
      }
      
      this.clearAuthData()
    },

    setAuthData(response: AuthResponse) {
      this.user = response.user
      this.token = response.tokens.accessToken
      this.refreshTokenValue = response.tokens.refreshToken
      
      // Persist to localStorage
      if (import.meta.client) {
        localStorage.setItem('accessToken', response.tokens.accessToken)
        localStorage.setItem('refreshToken', response.tokens.refreshToken)
      }
    },

    clearAuthData() {
      this.user = null
      this.token = null
      this.refreshTokenValue = null
      
      // Clear localStorage
      if (import.meta.client) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      }
    },

    // Initialize from localStorage on client
    async initAuth() {
      if (!import.meta.client) return
      
      const accessToken = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')
      
      if (accessToken && refreshToken) {
        this.token = accessToken
        this.refreshTokenValue = refreshToken
        
        // Fetch current user
        await this.fetchCurrentUser()
      }
    },
  },
})
