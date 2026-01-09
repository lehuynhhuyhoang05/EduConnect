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
        body: options.body as any,
        query: options.query,
        headers,
      })
      return response
    } catch (error: unknown) {
      const fetchError = error as { data?: ApiError; statusCode?: number }
      
      // Handle 401 - Unauthorized
      if (fetchError.statusCode === 401 || fetchError.data?.statusCode === 401) {
        console.log('Token expired, attempting refresh...')
        // Try to refresh token
        const refreshed = await authStore.refreshToken()
        if (refreshed && authStore.token) {
          console.log('Token refreshed successfully, retrying request')
          // Retry the request with new token
          headers['Authorization'] = `Bearer ${authStore.token}`
          return await $fetch<T>(url, {
            baseURL,
            method: options.method || 'GET',
            body: options.body as any,
            query: options.query,
            headers,
          })
        } else {
          // Refresh failed, logout
          console.error('Token refresh failed, logging out')
          authStore.clearAuthData()
          navigateTo('/auth/login')
          throw new Error('Session expired. Please login again.')
        }
      }
      
      // Handle 403 - Forbidden (no permission)
      if (fetchError.statusCode === 403 || fetchError.data?.statusCode === 403) {
        console.warn('Access forbidden:', url)
        throw error
      }

      throw error
    }
  }

  async function uploadRequest<T>(
    url: string,
    formData: FormData
  ): Promise<T> {
    const headers: Record<string, string> = {}

    // Add auth token if available
    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`
    }

    try {
      const response = await $fetch<T>(url, {
        baseURL,
        method: 'POST',
        body: formData,
        headers,
      })
      return response
    } catch (error: unknown) {
      const fetchError = error as { data?: ApiError; statusCode?: number }
      
      // Handle 401 - Unauthorized
      if (fetchError.statusCode === 401 || fetchError.data?.statusCode === 401) {
        console.log('Upload auth failed, attempting token refresh...')
        const refreshed = await authStore.refreshToken()
        if (refreshed && authStore.token) {
          console.log('Token refreshed, retrying upload')
          headers['Authorization'] = `Bearer ${authStore.token}`
          return await $fetch<T>(url, {
            baseURL,
            method: 'POST',
            body: formData,
            headers,
          })
        } else {
          console.error('Token refresh failed')
          authStore.clearAuthData()
          navigateTo('/auth/login')
          throw new Error('Session expired. Please login again.')
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
    
    upload: <T>(url: string, formData: FormData) =>
      uploadRequest<T>(url, formData),
  }
}
