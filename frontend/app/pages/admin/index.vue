<template>
  <div class="space-y-6">
    <!-- Welcome Banner -->
    <div
      class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white shadow-lg"
    >
      <h1 class="text-3xl font-bold mb-2">Chào mừng đến Admin Panel! 👋</h1>
      <p class="text-blue-100">
        Quản lý và giám sát toàn bộ hệ thống EduConnect
      </p>
    </div>

    <!-- Stats Cards -->
    <div
      v-if="loading"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      <SkeletonCard v-for="i in 4" :key="i" />
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
      >
        <div class="flex items-center justify-between mb-4">
          <div
            :class="[
              'w-12 h-12 rounded-xl flex items-center justify-center',
              stat.bgColor,
            ]"
          >
            <svg
              :class="['w-6 h-6', stat.iconColor]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              v-html="stat.icon"
            />
          </div>
          <span
            v-if="stat.trend"
            class="text-sm font-semibold text-green-500"
            >{{ stat.trend }}</span
          >
        </div>
        <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {{ stat.value }}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Activity Chart -->
      <div
        class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
      >
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Hoạt động hệ thống (7 ngày)
        </h3>
        <div class="h-64 flex items-end justify-between gap-2">
          <div
            v-for="(activity, index) in adminStore.systemActivity"
            :key="index"
            class="flex-1 flex flex-col items-center"
          >
            <div
              class="w-full h-52 bg-gray-100 dark:bg-gray-700 rounded-t-lg relative"
            >
              <div
                class="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-500"
                :style="{ height: `${(activity.newUsers / maxUsers) * 100}%` }"
                :title="`${activity.newUsers} users mới`"
              />
            </div>
            <span class="text-xs text-gray-500 dark:text-gray-400 mt-2">{{
              formatShortDate(activity.date)
            }}</span>
          </div>
        </div>
      </div>

      <!-- Recent Activities -->
      <div
        class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
      >
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Hoạt động gần đây
        </h3>
        <div class="space-y-3 max-h-64 overflow-y-auto">
          <div
            v-for="(activity, index) in adminStore.recentActivities.slice(0, 8)"
            :key="index"
            class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div
              :class="[
                'w-2 h-2 rounded-full mt-2',
                getActivityColor(activity.type),
              ]"
            />
            <div class="flex-1 min-w-0">
              <p
                class="text-sm text-gray-900 dark:text-white font-medium truncate"
              >
                {{ activity.message }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatRelativeTime(activity.timestamp) }}
              </p>
            </div>
          </div>
          <div
            v-if="adminStore.recentActivities.length === 0"
            class="text-center py-8 text-gray-500 dark:text-gray-400"
          >
            Chưa có hoạt động nào
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions & Top Lists -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Quick Actions -->
      <div
        class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
      >
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Thao tác nhanh
        </h3>
        <div class="space-y-2">
          <NuxtLink
            v-for="action in quickActions"
            :key="action.path"
            :to="action.path"
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg
              class="w-5 h-5 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              v-html="action.icon"
            />
            <span class="text-sm font-medium text-gray-900 dark:text-white">{{
              action.label
            }}</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Top Teachers -->
      <div
        class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
      >
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Top giáo viên
        </h3>
        <div class="space-y-3">
          <div
            v-for="(teacher, index) in adminStore.topTeachers.slice(0, 5)"
            :key="teacher.id"
            class="flex items-center gap-3"
          >
            <div
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold',
                getRankColor(index),
              ]"
            >
              {{ index + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="text-sm font-medium text-gray-900 dark:text-white truncate"
              >
                {{ teacher.fullName }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ teacher.classCount }} lớp
              </p>
            </div>
          </div>
          <div
            v-if="adminStore.topTeachers.length === 0"
            class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm"
          >
            Chưa có dữ liệu
          </div>
        </div>
      </div>

      <!-- Top Classes -->
      <div
        class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
      >
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Top lớp học
        </h3>
        <div class="space-y-3">
          <div
            v-for="(cls, index) in adminStore.topClasses.slice(0, 5)"
            :key="cls.id"
            class="flex items-center gap-3"
          >
            <div
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold',
                getRankColor(index),
              ]"
            >
              {{ index + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="text-sm font-medium text-gray-900 dark:text-white truncate"
              >
                {{ cls.name }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ cls.memberCount }} học viên
              </p>
            </div>
          </div>
          <div
            v-if="adminStore.topClasses.length === 0"
            class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm"
          >
            Chưa có dữ liệu
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SkeletonCard from "~/components/admin/SkeletonCard.vue";

definePageMeta({
  middleware: ["auth", "admin"],
  layout: "admin",
});

const adminStore = useAdminStore();
const loading = ref(true);

// Stats cards
const stats = computed(() => {
  const data = adminStore.dashboardStats;
  return [
    {
      label: "Tổng người dùng",
      value: data?.totalUsers ?? 0,
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />',
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      trend: data?.newUsersThisWeek ? `+${data.newUsersThisWeek}` : "",
    },
    {
      label: "Tổng giáo viên",
      value: data?.totalTeachers ?? 0,
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />',
      bgColor: "bg-green-100 dark:bg-green-900/20",
      iconColor: "text-green-600 dark:text-green-400",
      trend: "",
    },
    {
      label: "Tổng lớp học",
      value: data?.totalClasses ?? 0,
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />',
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      iconColor: "text-purple-600 dark:text-purple-400",
      trend: data?.newClassesThisWeek ? `+${data.newClassesThisWeek}` : "",
    },
    {
      label: "Tổng bài tập",
      value: data?.totalAssignments ?? 0,
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />',
      bgColor: "bg-amber-100 dark:bg-amber-900/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      trend: "",
    },
  ];
});

const maxUsers = computed(() => {
  const values = adminStore.systemActivity.map((a) => a.newUsers);
  return Math.max(...values, 1);
});

const quickActions = [
  {
    label: "Quản lý Users",
    path: "/admin/users",
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />',
  },
  {
    label: "Quản lý Lớp học",
    path: "/admin/classes",
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />',
  },
  {
    label: "Xem Thống kê",
    path: "/admin/analytics",
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />',
  },
];

// Helpers
const formatShortDate = (date: string) => {
  const d = new Date(date);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const formatRelativeTime = (timestamp: string) => {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return `${days} ngày trước`;
};

const getActivityColor = (type: string) => {
  const colors: Record<string, string> = {
    user_created: "bg-blue-500",
    class_created: "bg-green-500",
    submission: "bg-amber-500",
    live_session: "bg-purple-500",
  };
  return colors[type] || "bg-gray-500";
};

const getRankColor = (index: number) => {
  if (index === 0) return "bg-gradient-to-br from-yellow-400 to-yellow-600";
  if (index === 1) return "bg-gradient-to-br from-gray-400 to-gray-600";
  if (index === 2) return "bg-gradient-to-br from-orange-400 to-orange-600";
  return "bg-gradient-to-br from-blue-400 to-blue-600";
};

// Load data
onMounted(async () => {
  try {
    await adminStore.fetchDashboardStats();
    loading.value = false;

    // Load secondary data
    await Promise.all([
      adminStore.fetchSystemActivity(7),
      adminStore.fetchRecentActivities(20),
      adminStore.fetchTopTeachers(5),
      adminStore.fetchTopClasses(5),
    ]);
  } catch (error) {
    console.error("Failed to load dashboard:", error);
    loading.value = false;
  }
});
</script>
