import type { ApiError } from '~/types'

export function useApi() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const baseURL = config.public.apiUrl

  async function request<T>(
    url: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
      body?: unknown
      query?: Record<string, unknown>
      headers?: Record<string, string>
    } = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...options.headers,
    }

    // Add auth token if available
    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`
    }

    try {
      const response = await $fetch<T>(url, {
        baseURL,
        method: options.method || 'GET',
        body: options.body,
        query: options.query,
        headers,
      })
      return response
    } catch (error: unknown) {
      const fetchError = error as { data?: ApiError; statusCode?: number }
      
      // Handle 401 - Unauthorized
      if (fetchError.statusCode === 401 || fetchError.data?.statusCode === 401) {
        // Try to refresh token
        const refreshed = await authStore.refreshToken()
        if (refreshed) {
          // Retry the request with new token
          headers['Authorization'] = `Bearer ${authStore.token}`
          return await $fetch<T>(url, {
            baseURL,
            method: options.method || 'GET',
            body: options.body,
            query: options.query,
            headers,
          })
        } else {
          // Refresh failed, logout
          authStore.logout()
          navigateTo('/auth/login')
        }
      }

      throw error
    }
  }

  return {
    get: <T>(url: string, query?: Record<string, unknown>) => 
      request<T>(url, { method: 'GET', query }),
    
    post: <T>(url: string, body?: unknown) => 
      request<T>(url, { method: 'POST', body }),
    
    put: <T>(url: string, body?: unknown) => 
      request<T>(url, { method: 'PUT', body }),
    
    patch: <T>(url: string, body?: unknown) => 
      request<T>(url, { method: 'PATCH', body }),
    
    delete: <T>(url: string) => 
      request<T>(url, { method: 'DELETE' }),
  }
}
