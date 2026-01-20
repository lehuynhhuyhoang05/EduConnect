<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-8 text-white shadow-lg"
    >
      <h1 class="text-3xl font-bold mb-2">Thống kê & Phân tích 📊</h1>
      <p class="text-purple-100">
        Phân tích chi tiết hiệu suất và xu hướng hệ thống
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div
        class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
      />
      <p class="mt-4 text-gray-600 dark:text-gray-400">Đang tải dữ liệu...</p>
    </div>

    <template v-else>
      <!-- Top Teachers & Classes -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Top Teachers -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              Top 10 Giáo viên
            </h3>
            <span
              class="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold"
              >Theo số lớp</span
            >
          </div>
          <div class="space-y-3">
            <div
              v-for="(teacher, index) in adminStore.topTeachers"
              :key="teacher.id"
              class="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div
                :class="[
                  'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg',
                  getRankColor(index),
                ]"
              >
                {{ index + 1 }}
              </div>
              <div class="flex-1 min-w-0">
                <h4
                  class="text-sm font-semibold text-gray-900 dark:text-white truncate"
                >
                  {{ teacher.fullName }}
                </h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {{ teacher.email }}
                </p>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {{ teacher.classCount }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">lớp</div>
              </div>
            </div>
            <div
              v-if="adminStore.topTeachers.length === 0"
              class="text-center py-8 text-gray-500 dark:text-gray-400"
            >
              Chưa có dữ liệu
            </div>
          </div>
        </div>

        <!-- Top Classes -->
        <div
          class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              Top 10 Lớp học
            </h3>
            <span
              class="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold"
              >Theo học viên</span
            >
          </div>
          <div class="space-y-3">
            <div
              v-for="(cls, index) in adminStore.topClasses"
              :key="cls.id"
              class="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div
                :class="[
                  'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg',
                  getRankColor(index),
                ]"
              >
                {{ index + 1 }}
              </div>
              <div class="flex-1 min-w-0">
                <h4
                  class="text-sm font-semibold text-gray-900 dark:text-white truncate"
                >
                  {{ cls.name }}
                </h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  GV: {{ cls.teacher?.fullName || "N/A" }}
                </p>
              </div>
              <div class="text-right">
                <div
                  class="text-lg font-bold text-green-600 dark:text-green-400"
                >
                  {{ cls.memberCount }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  học viên
                </div>
              </div>
            </div>
            <div
              v-if="adminStore.topClasses.length === 0"
              class="text-center py-8 text-gray-500 dark:text-gray-400"
            >
              Chưa có dữ liệu
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", "admin"],
  layout: "admin",
});

const adminStore = useAdminStore();
const toast = useToast();

const loading = ref(true);
const activityDays = ref(30);

// Computed
const maxUsers = computed(() =>
  Math.max(...adminStore.systemActivity.map((a) => a.newUsers), 1),
);
const maxClasses = computed(() =>
  Math.max(...adminStore.systemActivity.map((a) => a.newClasses), 1),
);
const maxSubmissions = computed(() =>
  Math.max(...adminStore.systemActivity.map((a) => a.submissions), 1),
);

// Helpers
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const getPercentage = (size: number): number => {
  const total = adminStore.storageStats?.totalSize || 1;
  return (size / total) * 100;
};

const getTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    images: "bg-blue-500",
    documents: "bg-green-500",
    videos: "bg-purple-500",
    others: "bg-gray-500",
  };
  return colors[type] || "bg-gray-500";
};

const getTypeBgColor = (type: string): string => {
  const colors: Record<string, string> = {
    images: "bg-blue-500",
    documents: "bg-green-500",
    videos: "bg-purple-500",
    others: "bg-gray-500",
  };
  return colors[type] || "bg-gray-500";
};

const getRankColor = (index: number) => {
  if (index === 0) return "bg-gradient-to-br from-yellow-400 to-yellow-600";
  if (index === 1) return "bg-gradient-to-br from-gray-400 to-gray-600";
  if (index === 2) return "bg-gradient-to-br from-orange-400 to-orange-600";
  return "bg-gradient-to-br from-blue-400 to-blue-600";
};

const formatShortDate = (date: string): string => {
  const d = new Date(date);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const loadActivity = async () => {
  try {
    await adminStore.fetchSystemActivity(activityDays.value);
  } catch {
    toast.error("Không thể tải dữ liệu hoạt động");
  }
};

// Load data
onMounted(async () => {
  try {
    await adminStore.fetchTopTeachers(10);
    await adminStore.fetchTopClasses(10);
    loading.value = false;

    await Promise.all([
      adminStore.fetchStorageStats(),
      adminStore.fetchSystemActivity(activityDays.value),
    ]);
  } catch (error) {
    console.error("Failed to load analytics:", error);
    toast.error("Không thể tải dữ liệu thống kê");
    loading.value = false;
  }
});
</script>
