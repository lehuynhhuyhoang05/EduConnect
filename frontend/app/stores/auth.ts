import { defineStore } from "pinia";
import type {
  AuthResponse,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  User,
} from "~/types";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshTokenValue: string | null;
  isLoading: boolean;
  initialized: boolean;
  initPromise: Promise<void> | null;
}

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    user: null,
    token: null,
    refreshTokenValue: null,
    isLoading: false,
    initialized: false,
    initPromise: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    isTeacher: (state) => state.user?.role === "TEACHER",
    isStudent: (state) => state.user?.role === "STUDENT",
    isAdmin: (state) => state.user?.role === "ADMIN",
    currentUser: (state) => state.user,
  },

  actions: {
    async login(credentials: LoginRequest) {
      this.isLoading = true;
      const config = useRuntimeConfig();

      try {
        const response = await $fetch<AuthResponse>("/auth/login", {
          baseURL: config.public.apiUrl,
          method: "POST",
          body: credentials,
        });

        this.setAuthData(response);
        return response;
      } finally {
        this.isLoading = false;
      }
    },

    async register(data: RegisterRequest) {
      this.isLoading = true;
      const config = useRuntimeConfig();

      try {
        const response = await $fetch<AuthResponse>("/auth/register", {
          baseURL: config.public.apiUrl,
          method: "POST",
          body: data,
        });

        this.setAuthData(response);
        return response;
      } finally {
        this.isLoading = false;
      }
    },

    async refreshToken(): Promise<boolean> {
      if (!this.refreshTokenValue) return false;

      const config = useRuntimeConfig();

      try {
        const response = await $fetch<AuthTokens>("/auth/refresh", {
          baseURL: config.public.apiUrl,
          method: "POST",
          body: { refreshToken: this.refreshTokenValue },
        });

        this.token = response.accessToken;
        this.refreshTokenValue = response.refreshToken;

        // Persist to localStorage
        if (import.meta.client) {
          localStorage.setItem("accessToken", response.accessToken);
          localStorage.setItem("refreshToken", response.refreshToken);
        }

        return true;
      } catch (error) {
        console.error("Token refresh failed:", error);
        // Don't automatically clear auth data here
        // Let the calling code decide what to do
        return false;
      }
    },

    async fetchCurrentUser() {
      if (!this.token) return null;

      const config = useRuntimeConfig();

      try {
        const user = await $fetch<User>("/auth/me", {
          baseURL: config.public.apiUrl,
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        });

        this.user = user;
        return user;
      } catch (error: any) {
        console.error("Failed to fetch current user:", error);
        // Only clear auth on 401/403, not on network errors
        if (error.statusCode === 401 || error.statusCode === 403) {
          this.clearAuthData();
        }
        return null;
      }
    },

    async logout() {
      const config = useRuntimeConfig();

      if (this.token && this.refreshTokenValue) {
        try {
          await $fetch("/auth/logout", {
            baseURL: config.public.apiUrl,
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
            body: { refreshToken: this.refreshTokenValue },
          });
        } catch {
          // Ignore logout errors
        }
      }

      this.clearAuthData();
    },

    setAuthData(response: AuthResponse) {
      this.user = response.user;
      this.token = response.tokens.accessToken;
      this.refreshTokenValue = response.tokens.refreshToken;

      // Persist to localStorage with expiry check
      if (import.meta.client) {
        localStorage.setItem("accessToken", response.tokens.accessToken);
        localStorage.setItem("refreshToken", response.tokens.refreshToken);
        localStorage.setItem(
          "tokenExpiry",
          String(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ); // 7 days
      }
    },

    clearAuthData() {
      this.user = null;
      this.token = null;
      this.refreshTokenValue = null;

      // Clear localStorage
      if (import.meta.client) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("tokenExpiry");
      }
    },

    // Initialize from localStorage on client
    async initAuth() {
      if (!import.meta.client) return;

      // If already initialized, return immediately
      if (this.initialized) return;

      // If init is in progress, wait for it
      if (this.initPromise) {
        await this.initPromise;
        return;
      }

      // Start init process
      this.initPromise = this._doInitAuth();
      await this.initPromise;
    },

    async _doInitAuth() {
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");
      const tokenExpiry = localStorage.getItem("tokenExpiry");

      // Check if token expired
      if (tokenExpiry && Date.now() > Number(tokenExpiry)) {
        this.clearAuthData();
        this.initialized = true;
        return;
      }

      if (accessToken && refreshToken) {
        this.token = accessToken;
        this.refreshTokenValue = refreshToken;

        // Fetch current user
        const user = await this.fetchCurrentUser();

        // If user fetch failed, try to refresh token
        if (!user && refreshToken) {
          const success = await this.refreshToken();
          if (success) {
            await this.fetchCurrentUser();
          }
        }
      }

      this.initialized = true;
    },
  },
});
