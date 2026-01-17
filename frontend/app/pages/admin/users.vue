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
            Quản lý Users
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tổng: {{ adminStore.usersTotal }} users
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
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Tìm kiếm theo tên, email..."
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          @input="debouncedSearch"
        />
        <select
          v-model="filters.role"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          @change="applyFilters"
        >
          <option value="">Tất cả vai trò</option>
          <option value="ADMIN">Admin</option>
          <option value="TEACHER">Giáo viên</option>
          <option value="STUDENT">Học sinh</option>
        </select>
        <select
          v-model="filters.isActive"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          @change="applyFilters"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Bị khóa</option>
        </select>
        <div class="flex gap-2">
          <select
            v-model="filters.sortBy"
            class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            @change="applyFilters"
          >
            <option value="createdAt">Ngày tạo</option>
            <option value="name">Tên</option>
            <option value="email">Email</option>
          </select>
          <button
            @click="toggleSort"
            class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
            :title="filters.sortOrder === 'ASC' ? 'Tăng dần' : 'Giảm dần'"
          >
            <svg
              class="w-5 h-5 transition-transform"
              :class="{ 'rotate-180': filters.sortOrder === 'DESC' }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 11l5-5m0 0l5 5m-5-5v12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div
      v-if="selectedUsers.length > 0"
      class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between"
    >
      <span class="text-sm font-medium text-blue-900 dark:text-blue-100"
        >Đã chọn {{ selectedUsers.length }} users</span
      >
      <div class="flex gap-2">
        <button
          @click="bulkActivate"
          class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm"
        >
          Kích hoạt
        </button>
        <button
          @click="bulkDeactivate"
          class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm"
        >
          Khóa
        </button>
        <button
          @click="selectedUsers = []"
          class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm"
        >
          Hủy
        </button>
      </div>
    </div>

    <!-- Table -->
    <SkeletonTable v-if="adminStore.isLoadingUsers" :rows="10" :columns="7" />
    <div
      v-else
      class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead
            class="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
          >
            <tr>
              <th class="px-6 py-4 text-left">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  @change="toggleSelectAll"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase"
              >
                User
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase"
              >
                Email
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase"
              >
                Vai trò
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase"
              >
                Trạng thái
              </th>
              <th
                class="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase"
              >
                Ngày tạo
              </th>
              <th
                class="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase"
              >
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-if="adminStore.users.length === 0">
              <td colspan="7" class="px-6 py-12 text-center">
                <svg
                  class="w-16 h-16 text-gray-400 mx-auto mb-4"
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
                <h3
                  class="text-lg font-semibold text-gray-900 dark:text-white mb-2"
                >
                  Không tìm thấy users
                </h3>
                <p class="text-gray-500 dark:text-gray-400">
                  Thử thay đổi bộ lọc hoặc tìm kiếm khác
                </p>
              </td>
            </tr>
            <tr
              v-for="user in adminStore.users"
              :key="user.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <td class="px-6 py-4">
                <input
                  type="checkbox"
                  :checked="selectedUsers.includes(user.id)"
                  @change="toggleUser(user.id)"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold"
                  >
                    {{ user.fullName.charAt(0).toUpperCase() }}
                  </div>
                  <span class="font-medium text-gray-900 dark:text-white">{{
                    user.fullName
                  }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                {{ user.email }}
              </td>
              <td class="px-6 py-4">
                <select
                  :value="user.role"
                  @change="
                    updateRole(
                      user.id,
                      ($event.target as HTMLSelectElement).value,
                    )
                  "
                  :class="[
                    'px-3 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer',
                    getRoleBadgeClass(user.role),
                  ]"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="TEACHER">Giáo viên</option>
                  <option value="STUDENT">Học sinh</option>
                </select>
              </td>
              <td class="px-6 py-4">
                <button
                  @click="toggleStatus(user.id, user.isActive)"
                  :class="[
                    'px-3 py-1 text-xs font-semibold rounded-full transition-colors',
                    user.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200',
                  ]"
                >
                  {{ user.isActive ? "Hoạt động" : "Bị khóa" }}
                </button>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  @click="confirmDelete(user)"
                  class="text-red-600 hover:text-red-800 dark:text-red-400 transition-colors"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        class="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between"
      >
        <div class="text-sm text-gray-600 dark:text-gray-300">
          Hiển thị {{ (page - 1) * limit + 1 }} -
          {{ Math.min(page * limit, adminStore.usersTotal) }} /
          {{ adminStore.usersTotal }}
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
            Trang {{ page }} / {{ adminStore.usersTotalPages }}
          </div>
          <button
            @click="nextPage"
            :disabled="page >= adminStore.usersTotalPages"
            class="px-4 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
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
import SkeletonTable from "~/components/admin/SkeletonTable.vue";
import ConfirmDialog from "~/components/admin/ConfirmDialog.vue";
import type { AdminUser } from "~/stores/admin";

definePageMeta({
  middleware: ["auth", "admin"],
  layout: "admin",
});

const adminStore = useAdminStore();
const toast = useToast();

// State
const page = ref(1);
const limit = ref(10);
const selectedUsers = ref<number[]>([]);
const filters = ref({
  search: "",
  role: "",
  isActive: "",
  sortBy: "createdAt",
  sortOrder: "DESC" as "ASC" | "DESC",
});
const deleteDialog = ref({
  show: false,
  userId: 0,
  title: "",
  message: "",
});

// Computed
const allSelected = computed(
  () =>
    adminStore.users.length > 0 &&
    selectedUsers.value.length === adminStore.users.length,
);

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout>;
const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => applyFilters(), 500);
};

// Actions
const fetchUsers = async () => {
  try {
    await adminStore.fetchUsers({
      page: page.value,
      limit: limit.value,
      search: filters.value.search || undefined,
      role: filters.value.role || undefined,
      isActive:
        filters.value.isActive === ""
          ? true
          : filters.value.isActive === "true",
      sortBy: filters.value.sortBy,
      sortOrder: filters.value.sortOrder,
    });
  } catch {
    toast.error("Không thể tải danh sách users");
  }
};

const applyFilters = () => {
  page.value = 1;
  fetchUsers();
};

const toggleSort = () => {
  filters.value.sortOrder = filters.value.sortOrder === "ASC" ? "DESC" : "ASC";
  applyFilters();
};

const refresh = () => {
  selectedUsers.value = [];
  fetchUsers();
};

const toggleSelectAll = () => {
  selectedUsers.value = allSelected.value
    ? []
    : adminStore.users.map((u) => u.id);
};

const toggleUser = (id: number) => {
  const idx = selectedUsers.value.indexOf(id);
  if (idx > -1) selectedUsers.value.splice(idx, 1);
  else selectedUsers.value.push(id);
};

const getRoleBadgeClass = (role: string) => {
  const classes: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    TEACHER: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    STUDENT:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  };
  return classes[role] || "bg-gray-100 text-gray-800";
};

const updateRole = async (userId: number, role: string) => {
  try {
    await adminStore.updateUserRole(
      userId,
      role as "ADMIN" | "TEACHER" | "STUDENT",
    );
    toast.success("Cập nhật vai trò thành công");
  } catch {
    toast.error("Không thể cập nhật vai trò");
  }
};

const toggleStatus = async (userId: number, isActive: boolean) => {
  try {
    await adminStore.updateUserStatus(userId, !isActive);
    toast.success(`${!isActive ? "Kích hoạt" : "Khóa"} user thành công`);
  } catch {
    toast.error("Không thể cập nhật trạng thái");
  }
};

const confirmDelete = (user: AdminUser) => {
  deleteDialog.value = {
    show: true,
    userId: user.id,
    title: "Xóa người dùng",
    message: `Bạn có chắc muốn xóa user "${user.fullName}"? Hành động này không thể hoàn tác.`,
  };
};

const handleDelete = async () => {
  try {
    await adminStore.deleteUser(deleteDialog.value.userId);
    deleteDialog.value.show = false;
    toast.success("Xóa user thành công");
    await fetchUsers();
  } catch {
    toast.error("Không thể xóa user");
  }
};

const bulkActivate = async () => {
  try {
    await adminStore.bulkUpdateUsers(selectedUsers.value, { isActive: true });
    selectedUsers.value = [];
    toast.success("Kích hoạt users thành công");
  } catch {
    toast.error("Không thể kích hoạt users");
  }
};

const bulkDeactivate = async () => {
  try {
    await adminStore.bulkUpdateUsers(selectedUsers.value, { isActive: false });
    selectedUsers.value = [];
    toast.success("Khóa users thành công");
  } catch {
    toast.error("Không thể khóa users");
  }
};

const prevPage = () => {
  if (page.value > 1) {
    page.value--;
    fetchUsers();
  }
};

const nextPage = () => {
  if (page.value < adminStore.usersTotalPages) {
    page.value++;
    fetchUsers();
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
  const headers = ["ID", "Tên", "Email", "Vai trò", "Trạng thái", "Ngày tạo"];
  const rows = adminStore.users.map((u) => [
    u.id,
    u.fullName,
    u.email,
    u.role,
    u.isActive ? "Hoạt động" : "Bị khóa",
    formatDate(u.createdAt),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `users_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  toast.success("Đã xuất file CSV");
};

// Init
onMounted(fetchUsers);
</script>
