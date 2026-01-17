export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore();

  // Wait for auth to initialize
  if (!authStore.user && authStore.token) {
    // User data might not be loaded yet, let it through for now
    return;
  }

  // Check if user is admin
  if (!authStore.isAdmin) {
    return navigateTo("/dashboard");
  }
});
