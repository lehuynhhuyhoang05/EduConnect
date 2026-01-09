export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()
  
  if (import.meta.client) {
    authStore.initAuth()
  }
  
  if (!authStore.isTeacher) {
    return navigateTo('/dashboard')
  }
})
