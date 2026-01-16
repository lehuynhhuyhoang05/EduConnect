<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Sidebar -->
    <aside
      :class="[
        'fixed top-0 left-0 z-40 h-screen w-64 transition-transform duration-300 flex flex-col overflow-hidden',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        'bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700',
      ]"
    >
      <!-- Logo -->
      <div
        class="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700"
      >
        <NuxtLink to="/admin" class="flex items-center gap-3">
          <div
            class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center"
          >
            <svg
              class="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <span class="text-lg font-bold text-gray-900 dark:text-white"
            >Admin</span
          >
        </NuxtLink>
        <button
          @click="sidebarOpen = false"
          class="md:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <!-- Dashboard -->
        <NuxtLink
          to="/admin"
          :class="[
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
            route.path === '/admin'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
          ]"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span class="font-medium">Dashboard</span>
        </NuxtLink>

        <!-- Users -->
        <NuxtLink
          to="/admin/users"
          :class="[
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
            route.path.startsWith('/admin/users')
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
          ]"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <span class="font-medium">Quản lý Users</span>
        </NuxtLink>

        <!-- Classes -->
        <NuxtLink
          to="/admin/classes"
          :class="[
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
            route.path.startsWith('/admin/classes')
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
          ]"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <span class="font-medium">Quản lý Lớp học</span>
        </NuxtLink>

        <!-- Analytics -->
        <NuxtLink
          to="/admin/analytics"
          :class="[
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
            route.path.startsWith('/admin/analytics')
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
          ]"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span class="font-medium">Thống kê</span>
        </NuxtLink>
      </nav>

      <!-- User Info -->
      <div
        class="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700"
      >
        <div
          class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50"
        >
          <div
            class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold"
          >
            {{ userInitial }}
          </div>
          <div class="flex-1 min-w-0">
            <p
              class="text-sm font-medium text-gray-900 dark:text-white truncate"
            >
              {{ authStore.user?.fullName || "Admin" }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Administrator
            </p>
          </div>
        </div>
        <button
          @click="handleLogout"
          class="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Đăng xuất
        </button>
      </div>
    </aside>

    <!-- Mobile Overlay -->
    <div
      v-if="sidebarOpen"
      @click="sidebarOpen = false"
      class="fixed inset-0 z-30 bg-black/50 md:hidden"
    />

    <!-- Main Content -->
    <div class="md:ml-64 min-h-screen flex flex-col">
      <!-- Header -->
      <header
        class="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700"
      >
        <div class="flex items-center justify-between h-16 px-6">
          <div class="flex items-center gap-4">
            <button
              @click="sidebarOpen = true"
              class="md:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div>
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ pageTitle }}
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ pageDescription }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Back to App -->
            <NuxtLink
              to="/dashboard"
              class="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Về App
            </NuxtLink>

            <!-- Dark Mode Toggle -->
            <button
              @click="toggleDarkMode"
              class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                v-if="!isDark"
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
              <svg
                v-else
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const sidebarOpen = ref(false);
const isDark = ref(false);

const pageTitle = computed(() => {
  if (route.path === "/admin") return "Dashboard";
  if (route.path.startsWith("/admin/users")) return "Quản lý Users";
  if (route.path.startsWith("/admin/classes")) return "Quản lý Lớp học";
  if (route.path.startsWith("/admin/analytics")) return "Thống kê";
  return "Admin Panel";
});

const pageDescription = computed(() => {
  if (route.path === "/admin") return "Tổng quan hệ thống";
  if (route.path.startsWith("/admin/users")) return "Quản lý tất cả người dùng";
  if (route.path.startsWith("/admin/classes")) return "Quản lý tất cả lớp học";
  if (route.path.startsWith("/admin/analytics")) return "Phân tích và báo cáo";
  return "Quản trị hệ thống";
});

const userInitial = computed(() => {
  const name = authStore.user?.fullName || authStore.user?.email || "A";
  return name.charAt(0).toUpperCase();
});

const toggleDarkMode = () => {
  isDark.value = !isDark.value;
  document.documentElement.classList.toggle("dark");
};

const handleLogout = async () => {
  await authStore.logout();
  router.push("/auth/login");
};

// Close sidebar when route changes (mobile)
watch(
  () => route.path,
  () => {
    sidebarOpen.value = false;
  }
);

onMounted(() => {
  isDark.value = document.documentElement.classList.contains("dark");
});
</script>
