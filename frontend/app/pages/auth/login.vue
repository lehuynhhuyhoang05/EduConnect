<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

const authStore = useAuthStore();
const router = useRouter();
const { toast } = useToast();

const form = reactive({
  email: "",
  password: "",
  rememberMe: false,
});

const errors = reactive({
  email: "",
  password: "",
});

const isLoading = ref(false);
const showPassword = ref(false);

const validateForm = () => {
  let isValid = true;
  errors.email = "";
  errors.password = "";

  if (!form.email) {
    errors.email = "Vui lòng nhập email";
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Email không hợp lệ";
    isValid = false;
  }

  if (!form.password) {
    errors.password = "Vui lòng nhập mật khẩu";
    isValid = false;
  } else if (form.password.length < 6) {
    errors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    isValid = false;
  }

  return isValid;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  isLoading.value = true;

  try {
    await authStore.login({
      email: form.email,
      password: form.password,
    });
    toast.success("Đăng nhập thành công! Chào mừng bạn quay trở lại");

    // Redirect based on role
    if (authStore.user?.role === "ADMIN") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  } catch (error: any) {
    console.error("Login error:", error);

    let errorMessage = "Email hoặc mật khẩu không đúng";
    if (error.data?.message) {
      errorMessage = Array.isArray(error.data.message)
        ? error.data.message.join(", ")
        : error.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    toast.error(errorMessage);
  } finally {
    isLoading.value = false;
  }
};

// Demo accounts
const demoAccounts = [
  { email: "teacher@demo.com", password: "password123", role: "Giáo viên" },
  { email: "student@demo.com", password: "password123", role: "Học sinh" },
];

const fillDemoAccount = (email: string, password: string) => {
  form.email = email;
  form.password = password;
};
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-foreground">
        Chào mừng trở lại! 👋
      </h1>
      <p class="mt-2 text-muted-foreground">
        Đăng nhập vào tài khoản để tiếp tục học tập
      </p>
    </div>

    <!-- Demo Accounts Notice -->
    <div class="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
      <div class="flex items-start gap-3">
        <div
          class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <svg
            class="w-4 h-4 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium text-foreground">Tài khoản demo</p>
          <div class="mt-2 space-y-1">
            <button
              v-for="account in demoAccounts"
              :key="account.email"
              type="button"
              class="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
              @click="fillDemoAccount(account.email, account.password)"
            >
              <span class="font-mono bg-muted px-1.5 py-0.5 rounded">{{
                account.email
              }}</span>
              <span class="text-muted-foreground/60">•</span>
              <span>{{ account.role }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Form -->
    <form class="space-y-5" @submit.prevent="handleSubmit">
      <!-- Email Input -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-foreground">Email</label>
        <div class="relative">
          <div
            class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <svg
              class="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <input
            v-model="form.email"
            type="email"
            placeholder="name@example.com"
            autocomplete="email"
            class="w-full h-12 pl-11 pr-4 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            :class="errors.email ? 'border-destructive' : 'border-input'"
          />
        </div>
        <p v-if="errors.email" class="text-sm text-destructive">
          {{ errors.email }}
        </p>
      </div>

      <!-- Password Input -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-foreground">Mật khẩu</label>
        <div class="relative">
          <div
            class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <svg
              class="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            autocomplete="current-password"
            class="w-full h-12 pl-11 pr-12 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            :class="errors.password ? 'border-destructive' : 'border-input'"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            @click="showPassword = !showPassword"
          >
            <svg
              v-if="!showPassword"
              class="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg
              v-else
              class="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="m6.18 6.18 11.64 11.64" />
              <path d="M10.584 10.587a2 2 0 0 0 2.828 2.83" />
              <path
                d="M16.06 16.06A10.94 10.94 0 0 1 12 17c-5.93 0-8.93-4.03-9.938-5.652a1 1 0 0 1 0-1.096 14.62 14.62 0 0 1 3.402-4.038"
              />
              <path d="m17.212 12.756 3.288-3.288" />
              <path d="m7.287 10.787.503-.503" />
              <path
                d="M7.5 7.5a10.94 10.94 0 0 1 4.5-1c5.93 0 8.93 4.03 9.938 5.652a1 1 0 0 1 0 1.096 14.62 14.62 0 0 1-1.3 1.857"
              />
            </svg>
          </button>
        </div>
        <p v-if="errors.password" class="text-sm text-destructive">
          {{ errors.password }}
        </p>
      </div>

      <!-- Remember & Forgot -->
      <div class="flex items-center justify-between">
        <label class="flex items-center gap-2 cursor-pointer group">
          <div class="relative">
            <input
              v-model="form.rememberMe"
              type="checkbox"
              class="peer sr-only"
            />
            <div
              class="w-5 h-5 rounded-md border border-input bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors"
            >
              <svg
                class="w-5 h-5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                :class="{ 'opacity-100': form.rememberMe }"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <span
            class="text-sm text-muted-foreground group-hover:text-foreground transition-colors"
          >
            Ghi nhớ đăng nhập
          </span>
        </label>
        <NuxtLink
          to="/auth/forgot-password"
          class="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Quên mật khẩu?
        </NuxtLink>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="isLoading"
        class="relative w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all overflow-hidden group"
      >
        <span v-if="!isLoading" class="flex items-center justify-center gap-2">
          Đăng nhập
          <svg
            class="w-4 h-4 group-hover:translate-x-1 transition-transform"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
        <span v-else class="flex items-center justify-center gap-2">
          <svg
            class="w-5 h-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Đang đăng nhập...
        </span>
      </button>
    </form>

    <!-- Divider -->
    <div class="relative my-8">
      <div class="absolute inset-0 flex items-center">
        <span class="w-full border-t border-border" />
      </div>
      <div class="relative flex justify-center text-xs uppercase">
        <span class="bg-background px-4 text-muted-foreground"
          >Hoặc tiếp tục với</span
        >
      </div>
    </div>

    <!-- Social Login -->
    <div class="grid grid-cols-2 gap-4">
      <button
        type="button"
        class="flex items-center justify-center gap-2 h-12 rounded-xl border border-input bg-background hover:bg-muted/50 transition-colors"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span class="text-sm font-medium">Google</span>
      </button>
      <button
        type="button"
        class="flex items-center justify-center gap-2 h-12 rounded-xl border border-input bg-background hover:bg-muted/50 transition-colors"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
          />
        </svg>
        <span class="text-sm font-medium">GitHub</span>
      </button>
    </div>

    <!-- Register Link -->
    <p class="mt-8 text-center text-sm text-muted-foreground">
      Chưa có tài khoản?
      <NuxtLink
        to="/auth/register"
        class="font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Đăng ký ngay
      </NuxtLink>
    </p>
  </div>
</template>
