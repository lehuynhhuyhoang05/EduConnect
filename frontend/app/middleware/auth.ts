export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on server-side - will re-run on client
  if (!import.meta.client) return;

  const authStore = useAuthStore();

  // Initialize auth
  await authStore.initAuth();

  // Check if the route requires authentication
  const publicRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/",
  ];

  if (!authStore.isAuthenticated && !publicRoutes.includes(to.path)) {
    return navigateTo("/auth/login");
  }

  // Redirect authenticated users away from auth pages
  if (authStore.isAuthenticated && publicRoutes.includes(to.path)) {
    return navigateTo("/dashboard");
  }
});
