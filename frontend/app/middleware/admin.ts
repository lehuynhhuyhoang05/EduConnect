export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on server-side - will re-run on client
  if (!import.meta.client) return;

  const authStore = useAuthStore();

  // Initialize auth
  await authStore.initAuth();

  // Check if user is authenticated
  if (!authStore.isAuthenticated) {
    return navigateTo("/auth/login");
  }

  // Check if user is admin
  if (!authStore.isAdmin) {
    return navigateTo("/dashboard");
  }
});
