<template>
  <div class="space-y-6">
    <!-- Header & Filters -->
    <div
      class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
    >
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
      >
        <div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
            Quản lý Lớp học
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tổng: {{ adminStore.classesTotal }} lớp học
          </p>
        </div>
        <div class="flex gap-2">
          <button
            @click="exportCSV"
            class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export CSV
          </button>
          <button
            @click="refresh"
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Tìm kiếm theo tên lớp..."
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          @input="debouncedSearch"
        />
        <select
          v-model="filters.isActive"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          @change="applyFilters"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Đã đóng</option>
        </select>
      </div>
    </div>

    <!-- Classes Grid -->
    <div
      v-if="adminStore.isLoadingClasses"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <SkeletonCard v-for="i in 6" :key="i" />
    </div>
    <div
      v-else-if="filteredClasses.length === 0"
      class="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-lg border border-gray-100 dark:border-gray-700"
    >
      <svg
        class="w-16 h-16 mx-auto text-gray-400 mb-4"
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
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Không tìm thấy lớp học nào
      </h3>
      <p class="text-gray-500 dark:text-gray-400">
        Thử thay đổi bộ lọc hoặc tìm kiếm khác
      </p>
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="cls in filteredClasses"
        :key="cls.id"
        class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow"
      >
        <!-- Card Header -->
        <div
          class="h-32 bg-gradient-to-br from-blue-500 to-purple-600 p-6 flex items-center justify-between"
        >
          <div>
            <h3 class="text-xl font-bold text-white mb-2 line-clamp-1">
              {{ cls.name }}
            </h3>
            <p class="text-blue-100 text-sm">
              {{ cls.teacher?.fullName || "Chưa có GV" }}
            </p>
          </div>
          <div
            class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center"
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        </div>

        <!-- Card Body -->
        <div class="p-6 space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {{ cls.description || "Không có mô tả" }}
          </p>

          <!-- Stats -->
          <div
            class="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700"
          >
            <div
              class="flex items-center gap-2 text-gray-600 dark:text-gray-300"
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
              <span class="text-sm font-medium"
                >{{ cls.memberCount }} học viên</span
              >
            </div>
            <span
              :class="[
                'px-3 py-1 text-xs font-semibold rounded-full',
                cls.isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
              ]"
            >
              {{ cls.isActive ? "Hoạt động" : "Đã đóng" }}
            </span>
          </div>

          <!-- Date -->
          <div
            class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Tạo ngày {{ formatDate(cls.createdAt) }}</span>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 pt-2">
            <button
              @click="viewClassDetails(cls)"
              class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Xem
            </button>
            <button
              @click="confirmDelete(cls)"
              class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="filteredClasses.length > 0"
      class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between"
    >
      <div class="text-sm text-gray-600 dark:text-gray-300">
        Hiển thị {{ (page - 1) * limit + 1 }} -
        {{ Math.min(page * limit, adminStore.classesTotal) }} /
        {{ adminStore.classesTotal }}
      </div>
      <div class="flex gap-2">
        <button
          @click="prevPage"
          :disabled="page === 1"
          class="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Trước
        </button>
        <div
          class="flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300"
        >
          Trang {{ page }} / {{ adminStore.classesTotalPages }}
        </div>
        <button
          @click="nextPage"
          :disabled="page >= adminStore.classesTotalPages"
          class="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Sau
        </button>
      </div>
    </div>

    <!-- Class Details Modal -->
    <div
      v-if="detailsModal.show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="detailsModal.show = false"
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <!-- Modal Header -->
        <div
          class="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 p-6 flex items-center justify-between"
        >
          <div class="flex-1">
            <h3 class="text-2xl font-bold text-white mb-2">
              {{ detailsModal.class?.name }}
            </h3>
            <p class="text-blue-100 text-sm">
              Giáo viên:
              {{ detailsModal.class?.teacher?.fullName || "Chưa có" }}
            </p>
          </div>
          <button
            @click="detailsModal.show = false"
            class="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-6">
          <!-- Status Badge -->
          <div class="flex items-center gap-4">
            <span
              :class="[
                'px-4 py-2 text-sm font-semibold rounded-full',
                detailsModal.class?.isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
              ]"
            >
              {{ detailsModal.class?.isActive ? "Đang hoạt động" : "Đã đóng" }}
            </span>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              Tạo ngày {{ formatDate(detailsModal.class?.createdAt || "") }}
            </span>
          </div>

          <!-- Description -->
          <div>
            <h4
              class="text-lg font-semibold text-gray-900 dark:text-white mb-2"
            >
              Mô tả
            </h4>
            <p class="text-gray-600 dark:text-gray-300">
              {{ detailsModal.class?.description || "Không có mô tả" }}
            </p>
          </div>

          <!-- Statistics Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div
              class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-center gap-3"
            >
              <div
                class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center"
              >
                <svg
                  class="w-6 h-6 text-blue-600 dark:text-blue-400"
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
              </div>
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Học viên</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ detailsModal.class?.memberCount || 0 }}
                </p>
              </div>
            </div>

            <div
              class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-center gap-3"
            >
              <div
                class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center"
              >
                <svg
                  class="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Bài tập</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ detailsModal.class?.assignmentCount || 0 }}
                </p>
              </div>
            </div>
          </div>

          <!-- Class Info -->
          <div class="space-y-3">
            <h4 class="text-lg font-semibold text-gray-900 dark:text-white">
              Thông tin chi tiết
            </h4>
            <div
              class="grid grid-cols-1 gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4"
            >
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Mã lớp:</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{
                  detailsModal.class?.classCode || "N/A"
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Email GV:</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{
                  detailsModal.class?.teacher?.email || "N/A"
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Dialog -->
    <ConfirmDialog
      :show="deleteDialog.show"
      :title="deleteDialog.title"
      :message="deleteDialog.message"
      confirm-text="Xóa"
      type="danger"
      @confirm="handleDelete"
      @cancel="deleteDialog.show = false"
    />
  </div>
</template>

<script setup lang="ts">
import SkeletonCard from "~/components/admin/SkeletonCard.vue";
import ConfirmDialog from "~/components/admin/ConfirmDialog.vue";
import type { AdminClass } from "~/stores/admin";

definePageMeta({
  middleware: ["auth", "admin"],
  layout: "admin",
});

const adminStore = useAdminStore();
const toast = useToast();

// State
const page = ref(1);
const limit = ref(9);
const filters = ref({
  search: "",
  isActive: "true",
  sortBy: "createdAt",
  sortOrder: "DESC" as "ASC" | "DESC",
});
const deleteDialog = ref({
  show: false,
  classId: 0,
  title: "",
  message: "",
});
const detailsModal = ref<{
  show: boolean;
  class: AdminClass | null;
}>({
  show: false,
  class: null,
});

// Computed để filter classes theo isActive nếu cần
const filteredClasses = computed(() => {
  if (filters.value.isActive === "") {
    return adminStore.classes;
  }
  const isActiveFilter = filters.value.isActive === "true";
  return adminStore.classes.filter((c) => c.isActive === isActiveFilter);
});

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout>;
const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => applyFilters(), 500);
};

const viewClassDetails = (cls: AdminClass) => {
  detailsModal.value.class = cls;
  detailsModal.value.show = true;
};

// Actions
const fetchClasses = async () => {
  try {
    const params: any = {
      page: page.value,
      limit: limit.value,
      sortBy: filters.value.sortBy,
      sortOrder: filters.value.sortOrder,
    };

    // Only add search if not empty
    if (filters.value.search) {
      params.search = filters.value.search;
    }

    // Only add isActive if not "all"
    if (filters.value.isActive !== "") {
      params.isActive = filters.value.isActive === "true";
    }

    await adminStore.fetchClasses(params);
  } catch {
    toast.error("Không thể tải danh sách lớp học");
  }
};

const applyFilters = () => {
  page.value = 1;
  fetchClasses();
};

const refresh = () => fetchClasses();

const confirmDelete = (cls: AdminClass) => {
  deleteDialog.value = {
    show: true,
    classId: cls.id,
    title: "Xóa lớp học",
    message: `Bạn có chắc muốn xóa lớp "${cls.name}"? Hành động này không thể hoàn tác.`,
  };
};

const handleDelete = async () => {
  try {
    const classIdToDelete = deleteDialog.value.classId;
    await adminStore.deleteClass(classIdToDelete);
    deleteDialog.value.show = false;
    toast.success("Xóa lớp học thành công");
  } catch (error) {
    console.error("Delete error:", error);
    toast.error("Không thể xóa lớp học");
  }
};

const prevPage = () => {
  if (page.value > 1) {
    page.value--;
    fetchClasses();
  }
};

const nextPage = () => {
  if (page.value < adminStore.classesTotalPages) {
    page.value++;
    fetchClasses();
  }
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const exportCSV = () => {
  const headers = [
    "ID",
    "Tên lớp",
    "Giáo viên",
    "Số học viên",
    "Trạng thái",
    "Ngày tạo",
  ];
  const rows = adminStore.classes.map((c) => [
    c.id,
    c.name,
    c.teacher?.fullName || "N/A",
    c.memberCount,
    c.isActive ? "Hoạt động" : "Đã đóng",
    formatDate(c.createdAt),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `classes_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  toast.success("Đã xuất file CSV");
};

// Init
onMounted(fetchClasses);
</script>
