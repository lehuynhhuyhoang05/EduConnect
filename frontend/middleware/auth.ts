export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()
  
  // Initialize auth if not done yet
  if (import.meta.client) {
    authStore.initAuth()
  }
  
  // Check if the route requires authentication
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password']
  
  if (!authStore.isAuthenticated && !publicRoutes.includes(to.path)) {
    return navigateTo('/auth/login')
  }
  
  // Redirect authenticated users away from auth pages
  if (authStore.isAuthenticated && publicRoutes.includes(to.path)) {
    return navigateTo('/dashboard')
  }
})
