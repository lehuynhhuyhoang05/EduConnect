<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const authStore = useAuthStore()
const router = useRouter()
const { toast } = useToast()

const form = reactive({
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'student' as 'student' | 'teacher',
  agreeTerms: false,
})

const errors = reactive({
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreeTerms: '',
})

const isLoading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const validateForm = () => {
  let isValid = true
  Object.keys(errors).forEach(key => (errors as any)[key] = '')

  if (!form.fullName) {
    errors.fullName = 'Vui lòng nhập họ và tên'
    isValid = false
  } else if (form.fullName.length < 2) {
    errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự'
    isValid = false
  }

  if (!form.email) {
    errors.email = 'Vui lòng nhập email'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Email không hợp lệ'
    isValid = false
  }

  if (!form.password) {
    errors.password = 'Vui lòng nhập mật khẩu'
    isValid = false
  } else if (form.password.length < 6) {
    errors.password = 'Mật khẩu phải có ít nhất 6 ký tự'
    isValid = false
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Vui lòng xác nhận mật khẩu'
    isValid = false
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp'
    isValid = false
  }

  if (!form.agreeTerms) {
    errors.agreeTerms = 'Bạn phải đồng ý với điều khoản sử dụng'
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) return

  isLoading.value = true

  try {
    await authStore.register({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      role: form.role,
    })
    toast.success('Đăng ký thành công!', 'Chào mừng bạn đến với EduLMS')
    router.push('/dashboard')
  } catch (error: any) {
    toast.error('Đăng ký thất bại', error.message || 'Có lỗi xảy ra, vui lòng thử lại')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UiCard>
    <UiCardHeader title="Tạo tài khoản" description="Đăng ký tài khoản để bắt đầu học tập" />
    <UiCardContent>
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <UiInput
          v-model="form.fullName"
          type="text"
          label="Họ và tên"
          placeholder="Nguyễn Văn A"
          :error="errors.fullName"
          autocomplete="name"
        />

        <UiInput
          v-model="form.email"
          type="email"
          label="Email"
          placeholder="name@example.com"
          :error="errors.email"
          autocomplete="email"
        />

        <!-- Role Selection -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Bạn là</label>
          <div class="grid grid-cols-2 gap-4">
            <button
              type="button"
              class="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors"
              :class="form.role === 'student' ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50'"
              @click="form.role = 'student'"
            >
              <svg class="h-8 w-8" :class="form.role === 'student' ? 'text-primary' : 'text-muted-foreground'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5" />
              </svg>
              <span class="text-sm font-medium" :class="form.role === 'student' ? 'text-primary' : ''">Học sinh</span>
            </button>
            <button
              type="button"
              class="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors"
              :class="form.role === 'teacher' ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50'"
              @click="form.role = 'teacher'"
            >
              <svg class="h-8 w-8" :class="form.role === 'teacher' ? 'text-primary' : 'text-muted-foreground'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span class="text-sm font-medium" :class="form.role === 'teacher' ? 'text-primary' : ''">Giáo viên</span>
            </button>
          </div>
        </div>

        <div class="relative">
          <UiInput
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            label="Mật khẩu"
            placeholder="••••••••"
            :error="errors.password"
            autocomplete="new-password"
          />
          <button
            type="button"
            class="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
            @click="showPassword = !showPassword"
          >
            <svg v-if="!showPassword" class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </button>
        </div>

        <div class="relative">
          <UiInput
            v-model="form.confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            label="Xác nhận mật khẩu"
            placeholder="••••••••"
            :error="errors.confirmPassword"
            autocomplete="new-password"
          />
          <button
            type="button"
            class="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
            @click="showConfirmPassword = !showConfirmPassword"
          >
            <svg v-if="!showConfirmPassword" class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </button>
        </div>

        <!-- Terms -->
        <div class="space-y-2">
          <label class="flex items-start gap-2 text-sm">
            <input
              v-model="form.agreeTerms"
              type="checkbox"
              class="mt-1 rounded border-input"
            />
            <span>
              Tôi đồng ý với
              <NuxtLink to="/terms" class="text-primary hover:underline">Điều khoản sử dụng</NuxtLink>
              và
              <NuxtLink to="/privacy" class="text-primary hover:underline">Chính sách bảo mật</NuxtLink>
            </span>
          </label>
          <p v-if="errors.agreeTerms" class="text-sm text-destructive">
            {{ errors.agreeTerms }}
          </p>
        </div>

        <UiButton
          type="submit"
          class="w-full"
          :loading="isLoading"
          :disabled="isLoading"
        >
          Đăng ký
        </UiButton>
      </form>
    </UiCardContent>
    <UiCardFooter>
      <p class="w-full text-center text-sm text-muted-foreground">
        Đã có tài khoản?
        <NuxtLink to="/auth/login" class="text-primary hover:underline">
          Đăng nhập
        </NuxtLink>
      </p>
    </UiCardFooter>
  </UiCard>
</template>
