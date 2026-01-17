import { defineStore } from "pinia";

// ===================== TYPES =====================

export interface DashboardStats {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  totalAssignments: number;
  totalSubmissions: number;
  totalLiveSessions: number;
  activeUsersToday: number;
  newUsersThisWeek: number;
  newClassesThisWeek: number;
}

export interface SystemActivity {
  date: string;
  newUsers: number;
  newClasses: number;
  submissions: number;
  liveSessions: number;
}

export interface RecentActivity {
  type: "user_created" | "class_created" | "submission" | "live_session";
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  avatarUrl?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface AdminClass {
  id: number;
  name: string;
  description: string;
  classCode: string;
  subject: string;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
  teacher: {
    id: number;
    fullName: string;
    email: string;
  } | null;
}

export interface TopTeacher {
  id: number;
  fullName: string;
  email: string;
  avatarUrl?: string;
  classCount: number;
}

export interface TopClass {
  id: number;
  name: string;
  memberCount: number;
  teacher: {
    id: number;
    fullName: string;
  } | null;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, number>;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AdminState {
  // Dashboard
  dashboardStats: DashboardStats | null;
  systemActivity: SystemActivity[];
  recentActivities: RecentActivity[];

  // Users
  users: AdminUser[];
  usersMeta: PaginationMeta | null;

  // Classes
  classes: AdminClass[];
  classesMeta: PaginationMeta | null;

  // Analytics
  topTeachers: TopTeacher[];
  topClasses: TopClass[];
  storageStats: StorageStats | null;

  // UI State
  loading: {
    dashboard: boolean;
    users: boolean;
    classes: boolean;
    analytics: boolean;
  };
  error: string | null;
}

// ===================== STORE =====================

export const useAdminStore = defineStore("admin", {
  state: (): AdminState => ({
    dashboardStats: null,
    systemActivity: [],
    recentActivities: [],
    users: [],
    usersMeta: null,
    classes: [],
    classesMeta: null,
    topTeachers: [],
    topClasses: [],
    storageStats: null,
    loading: {
      dashboard: false,
      users: false,
      classes: false,
      analytics: false,
    },
    error: null,
  }),

  getters: {
    // Users
    usersTotal: (state) => state.usersMeta?.total ?? 0,
    usersTotalPages: (state) => state.usersMeta?.totalPages ?? 1,

    // Classes
    classesTotal: (state) => state.classesMeta?.total ?? 0,
    classesTotalPages: (state) => state.classesMeta?.totalPages ?? 1,

    // Loading shortcuts
    isLoadingDashboard: (state) => state.loading.dashboard,
    isLoadingUsers: (state) => state.loading.users,
    isLoadingClasses: (state) => state.loading.classes,
    isLoadingAnalytics: (state) => state.loading.analytics,
  },

  actions: {
    // ==================== DASHBOARD ====================

    async fetchDashboardStats() {
      this.loading.dashboard = true;
      this.error = null;
      try {
        const api = useApi();
        this.dashboardStats = await api.get<DashboardStats>("/admin/dashboard");
      } catch (e: unknown) {
        this.error =
          e instanceof Error ? e.message : "Không thể tải thống kê dashboard";
        throw e;
      } finally {
        this.loading.dashboard = false;
      }
    },

    async fetchSystemActivity(days = 7) {
      try {
        const api = useApi();
        this.systemActivity = await api.get<SystemActivity[]>(
          "/admin/dashboard/activity",
          { days },
        );
      } catch (e: unknown) {
        console.error("Failed to fetch system activity:", e);
      }
    },

    async fetchRecentActivities(limit = 50) {
      try {
        const api = useApi();
        this.recentActivities = await api.get<RecentActivity[]>(
          "/admin/dashboard/recent",
          { limit },
        );
      } catch (e: unknown) {
        console.error("Failed to fetch recent activities:", e);
      }
    },

    // ==================== USERS ====================

    async fetchUsers(
      params: {
        page?: number;
        limit?: number;
        search?: string;
        role?: string;
        isActive?: boolean;
        sortBy?: string;
        sortOrder?: "ASC" | "DESC";
      } = {},
    ) {
      this.loading.users = true;
      this.error = null;
      try {
        const api = useApi();
        const res = await api.get<{ data: AdminUser[]; meta: PaginationMeta }>(
          "/admin/users",
          params,
        );
        this.users = res.data;
        this.usersMeta = res.meta;
      } catch (e: unknown) {
        this.error =
          e instanceof Error ? e.message : "Không thể tải danh sách users";
        throw e;
      } finally {
        this.loading.users = false;
      }
    },

    async updateUserStatus(userId: number, isActive: boolean) {
      try {
        const api = useApi();
        await api.put(`/admin/users/${userId}/status`, { isActive });
        const user = this.users.find((u) => u.id === userId);
        if (user) user.isActive = isActive;
      } catch (e: unknown) {
        this.error =
          e instanceof Error ? e.message : "Không thể cập nhật trạng thái";
        throw e;
      }
    },

    async updateUserRole(
      userId: number,
      role: "ADMIN" | "TEACHER" | "STUDENT",
    ) {
      try {
        const api = useApi();
        await api.put(`/admin/users/${userId}/role`, { role });
        const user = this.users.find((u) => u.id === userId);
        if (user) user.role = role;
      } catch (e: unknown) {
        this.error =
          e instanceof Error ? e.message : "Không thể cập nhật vai trò";
        throw e;
      }
    },

    async deleteUser(userId: number) {
      try {
        const api = useApi();
        await api.delete(`/admin/users/${userId}`);
        this.users = this.users.filter((u) => u.id !== userId);
        if (this.usersMeta) this.usersMeta.total--;
        if (this.dashboardStats) {
          this.dashboardStats.totalUsers--;
        }
      } catch (e: unknown) {
        this.error =
          e instanceof Error ? e.message : "Không thể xóa người dùng";
        throw e;
      }
    },

    async bulkUpdateUsers(
      userIds: number[],
      updates: { isActive?: boolean; role?: string },
    ) {
      try {
        const api = useApi();
        await api.put("/admin/users/bulk", { userIds, ...updates });
        this.users.forEach((user) => {
          if (userIds.includes(user.id)) {
            if (updates.isActive !== undefined)
              user.isActive = updates.isActive;
            if (updates.role)
              user.role = updates.role as "ADMIN" | "TEACHER" | "STUDENT";
          }
        });
      } catch (e: unknown) {
        this.error =
          e instanceof Error ? e.message : "Không thể cập nhật hàng loạt";
        throw e;
      }
    },

    // ==================== CLASSES ====================

    async fetchClasses(
      params: {
        page?: number;
        limit?: number;
        search?: string;
        isActive?: boolean;
        sortBy?: string;
        sortOrder?: "ASC" | "DESC";
      } = {},
    ) {
      this.loading.classes = true;
      this.error = null;
      try {
        const api = useApi();
        const res = await api.get<{ data: AdminClass[]; meta: PaginationMeta }>(
          "/admin/classes",
          params,
        );
        this.classes = res.data;
        this.classesMeta = res.meta;
      } catch (e: unknown) {
        this.error =
          e instanceof Error ? e.message : "Không thể tải danh sách lớp học";
        throw e;
      } finally {
        this.loading.classes = false;
      }
    },

    async deleteClass(classId: number) {
      try {
        const api = useApi();
        await api.delete(`/admin/classes/${classId}`);
        this.classes = this.classes.filter((c) => c.id !== classId);
        if (this.classesMeta) this.classesMeta.total--;
        if (this.dashboardStats) {
          this.dashboardStats.totalClasses--;
        }
      } catch (e: unknown) {
        this.error = e instanceof Error ? e.message : "Không thể xóa lớp học";
        throw e;
      }
    },

    // ==================== ANALYTICS ====================

    async fetchTopTeachers(limit = 10) {
      this.loading.analytics = true;
      try {
        const api = useApi();
        this.topTeachers = await api.get<TopTeacher[]>(
          "/admin/analytics/top-teachers",
          { limit },
        );
      } catch (e: unknown) {
        console.error("Failed to fetch top teachers:", e);
      } finally {
        this.loading.analytics = false;
      }
    },

    async fetchTopClasses(limit = 10) {
      try {
        const api = useApi();
        this.topClasses = await api.get<TopClass[]>(
          "/admin/analytics/top-classes",
          { limit },
        );
      } catch (e: unknown) {
        console.error("Failed to fetch top classes:", e);
      }
    },

    async fetchStorageStats() {
      try {
        const api = useApi();
        this.storageStats = await api.get<StorageStats>(
          "/admin/analytics/storage",
        );
      } catch (e: unknown) {
        console.error("Failed to fetch storage stats:", e);
      }
    },

    // ==================== RESET ====================

    reset() {
      this.dashboardStats = null;
      this.systemActivity = [];
      this.recentActivities = [];
      this.users = [];
      this.usersMeta = null;
      this.classes = [];
      this.classesMeta = null;
      this.topTeachers = [];
      this.topClasses = [];
      this.storageStats = null;
      this.error = null;
    },
  },
});
