<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const authStore = useAuthStore()
const router = useRouter()
const { toast } = useToast()

const currentStep = ref(1)
const totalSteps = 3

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

// Password strength
const passwordStrength = computed(() => {
  const password = form.password
  if (!password) return { score: 0, label: '', color: '' }
  
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, label: 'Yếu', color: 'bg-red-500' }
  if (score <= 2) return { score: 2, label: 'Trung bình', color: 'bg-orange-500' }
  if (score <= 3) return { score: 3, label: 'Khá', color: 'bg-yellow-500' }
  if (score <= 4) return { score: 4, label: 'Mạnh', color: 'bg-green-500' }
  return { score: 5, label: 'Rất mạnh', color: 'bg-emerald-500' }
})

const validateStep = (step: number) => {
  Object.keys(errors).forEach(key => (errors as any)[key] = '')
  
  if (step === 1) {
    if (!form.fullName) {
      errors.fullName = 'Vui lòng nhập họ và tên'
      return false
    } else if (form.fullName.length < 2) {
      errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự'
      return false
    }
    if (!form.email) {
      errors.email = 'Vui lòng nhập email'
      return false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Email không hợp lệ'
      return false
    }
    return true
  }
  
  if (step === 2) {
    // Role is always selected, just proceed
    return true
  }
  
  if (step === 3) {
    if (!form.password) {
      errors.password = 'Vui lòng nhập mật khẩu'
      return false
    } else if (form.password.length < 8) {
      errors.password = 'Mật khẩu phải có ít nhất 8 ký tự'
      return false
    } else if (!/(?=.*[a-z])/.test(form.password)) {
      errors.password = 'Mật khẩu phải chứa ít nhất 1 chữ thường'
      return false
    } else if (!/(?=.*[A-Z])/.test(form.password)) {
      errors.password = 'Mật khẩu phải chứa ít nhất 1 chữ hoa'
      return false
    } else if (!/(?=.*\d)/.test(form.password)) {
      errors.password = 'Mật khẩu phải chứa ít nhất 1 chữ số'
      return false
    }
    if (!form.confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu'
      return false
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp'
      return false
    }
    if (!form.agreeTerms) {
      errors.agreeTerms = 'Bạn phải đồng ý với điều khoản sử dụng'
      return false
    }
    return true
  }
  
  return true
}

const nextStep = () => {
  if (validateStep(currentStep.value) && currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const handleSubmit = async () => {
  if (!validateStep(3)) return

  isLoading.value = true

  try {
    await authStore.register({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      role: form.role.toUpperCase(),
    })
    toast.success('Đăng ký thành công!', 'Chào mừng bạn đến với EduLMS')
    router.push('/dashboard')
  } catch (error: any) {
    console.error('Register error:', error)
    
    // Extract error message from response
    let errorMessage = 'Có lỗi xảy ra, vui lòng thử lại'
    
    if (error.data?.message) {
      // Backend validation errors
      if (Array.isArray(error.data.message)) {
        errorMessage = error.data.message.join(', ')
      } else {
        errorMessage = error.data.message
      }
    } else if (error.message) {
      errorMessage = error.message
    }
    
    toast.error('Đăng ký thất bại', errorMessage)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-foreground">
        Tạo tài khoản mới ✨
      </h1>
      <p class="mt-2 text-muted-foreground">
        Bắt đầu hành trình học tập của bạn
      </p>
    </div>

    <!-- Progress Steps -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div
          v-for="step in totalSteps"
          :key="step"
          class="flex items-center"
          :class="step < totalSteps ? 'flex-1' : ''"
        >
          <div
            class="flex items-center justify-center w-10 h-10 rounded-full font-medium text-sm transition-all duration-300"
            :class="
              currentStep >= step
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'bg-muted text-muted-foreground'
            "
          >
            <svg v-if="currentStep > step" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span v-else>{{ step }}</span>
          </div>
          <div
            v-if="step < totalSteps"
            class="flex-1 h-1 mx-2 rounded-full transition-colors duration-300"
            :class="currentStep > step ? 'bg-primary' : 'bg-muted'"
          />
        </div>
      </div>
      <div class="flex justify-between mt-2">
        <span class="text-xs text-muted-foreground">Thông tin</span>
        <span class="text-xs text-muted-foreground">Vai trò</span>
        <span class="text-xs text-muted-foreground">Bảo mật</span>
      </div>
    </div>

    <!-- Form Steps -->
    <form @submit.prevent="handleSubmit">
      <!-- Step 1: Basic Info -->
      <div v-show="currentStep === 1" class="space-y-5">
        <!-- Full Name -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">Họ và tên</label>
          <div class="relative">
            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="8" r="4"/>
                <path d="M20 21a8 8 0 0 0-16 0"/>
              </svg>
            </div>
            <input
              v-model="form.fullName"
              type="text"
              placeholder="Nguyễn Văn A"
              autocomplete="name"
              class="w-full h-12 pl-11 pr-4 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              :class="errors.fullName ? 'border-destructive' : 'border-input'"
            />
          </div>
          <p v-if="errors.fullName" class="text-sm text-destructive">{{ errors.fullName }}</p>
        </div>

        <!-- Email -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">Email</label>
          <div class="relative">
            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="20" height="16" x="2" y="4" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
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
          <p v-if="errors.email" class="text-sm text-destructive">{{ errors.email }}</p>
        </div>
      </div>

      <!-- Step 2: Role Selection -->
      <div v-show="currentStep === 2" class="space-y-5">
        <p class="text-sm text-muted-foreground text-center mb-6">
          Chọn vai trò phù hợp với bạn
        </p>

        <div class="grid grid-cols-1 gap-4">
          <!-- Student -->
          <button
            type="button"
            class="relative flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all hover:shadow-lg"
            :class="
              form.role === 'student'
                ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                : 'border-input hover:border-primary/50'
            "
            @click="form.role = 'student'"
          >
            <div
              class="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
              :class="form.role === 'student' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'"
            >
              <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-lg" :class="form.role === 'student' ? 'text-primary' : 'text-foreground'">
                Học sinh / Sinh viên
              </h3>
              <p class="text-sm text-muted-foreground mt-1">
                Tham gia các lớp học, xem bài giảng, làm bài tập và tương tác với giáo viên
              </p>
            </div>
            <div
              v-if="form.role === 'student'"
              class="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </button>

          <!-- Teacher -->
          <button
            type="button"
            class="relative flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all hover:shadow-lg"
            :class="
              form.role === 'teacher'
                ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                : 'border-input hover:border-primary/50'
            "
            @click="form.role = 'teacher'"
          >
            <div
              class="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
              :class="form.role === 'teacher' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'"
            >
              <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-lg" :class="form.role === 'teacher' ? 'text-primary' : 'text-foreground'">
                Giáo viên / Giảng viên
              </h3>
              <p class="text-sm text-muted-foreground mt-1">
                Tạo và quản lý lớp học, đăng bài giảng, giao bài tập và chấm điểm học sinh
              </p>
            </div>
            <div
              v-if="form.role === 'teacher'"
              class="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </button>
        </div>
      </div>

      <!-- Step 3: Password & Terms -->
      <div v-show="currentStep === 3" class="space-y-5">
        <!-- Password -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">Mật khẩu</label>
          <div class="relative">
            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Nhập mật khẩu"
              autocomplete="new-password"
              class="w-full h-12 pl-11 pr-12 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              :class="errors.password ? 'border-destructive' : 'border-input'"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              @click="showPassword = !showPassword"
            >
              <svg v-if="!showPassword" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m6.18 6.18 11.64 11.64"/>
                <path d="M10.584 10.587a2 2 0 0 0 2.828 2.83"/>
                <path d="M16.06 16.06A10.94 10.94 0 0 1 12 17c-5.93 0-8.93-4.03-9.938-5.652a1 1 0 0 1 0-1.096 14.62 14.62 0 0 1 3.402-4.038"/>
              </svg>
            </button>
          </div>
          
          <!-- Password Strength -->
          <div v-if="form.password" class="space-y-2">
            <div class="flex gap-1">
              <div
                v-for="i in 5"
                :key="i"
                class="h-1.5 flex-1 rounded-full transition-colors"
                :class="i <= passwordStrength.score ? passwordStrength.color : 'bg-muted'"
              />
            </div>
            <p class="text-xs" :class="passwordStrength.color.replace('bg-', 'text-')">
              Độ mạnh: {{ passwordStrength.label }}
            </p>
          </div>
          
          <!-- Password Requirements -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
            <p class="text-xs font-medium text-blue-900">Yêu cầu mật khẩu:</p>
            <ul class="text-xs text-blue-700 space-y-0.5">
              <li class="flex items-center gap-1.5">
                <svg :class="form.password.length >= 8 ? 'text-green-600' : 'text-gray-400'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
                Ít nhất 8 ký tự
              </li>
              <li class="flex items-center gap-1.5">
                <svg :class="/[a-z]/.test(form.password) ? 'text-green-600' : 'text-gray-400'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
                Chứa chữ thường (a-z)
              </li>
              <li class="flex items-center gap-1.5">
                <svg :class="/[A-Z]/.test(form.password) ? 'text-green-600' : 'text-gray-400'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
                Chứa chữ hoa (A-Z)
              </li>
              <li class="flex items-center gap-1.5">
                <svg :class="/\d/.test(form.password) ? 'text-green-600' : 'text-gray-400'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
                Chứa chữ số (0-9)
              </li>
            </ul>
          </div>
          
          <p v-if="errors.password" class="text-sm text-destructive">{{ errors.password }}</p>
        </div>

        <!-- Confirm Password -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">Xác nhận mật khẩu</label>
          <div class="relative">
            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <input
              v-model="form.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              placeholder="Nhập lại mật khẩu"
              autocomplete="new-password"
              class="w-full h-12 pl-11 pr-12 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              :class="errors.confirmPassword ? 'border-destructive' : 'border-input'"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <svg v-if="!showConfirmPassword" class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m6.18 6.18 11.64 11.64"/>
                <path d="M10.584 10.587a2 2 0 0 0 2.828 2.83"/>
                <path d="M16.06 16.06A10.94 10.94 0 0 1 12 17c-5.93 0-8.93-4.03-9.938-5.652a1 1 0 0 1 0-1.096 14.62 14.62 0 0 1 3.402-4.038"/>
              </svg>
            </button>
          </div>
          <p v-if="errors.confirmPassword" class="text-sm text-destructive">{{ errors.confirmPassword }}</p>
        </div>

        <!-- Terms -->
        <div class="space-y-2">
          <label class="flex items-start gap-3 cursor-pointer group p-4 rounded-xl border border-input hover:border-primary/50 transition-colors">
            <div class="relative mt-0.5">
              <input
                v-model="form.agreeTerms"
                type="checkbox"
                class="peer sr-only"
              />
              <div class="w-5 h-5 rounded-md border border-input bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors">
                <svg
                  class="w-5 h-5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                  :class="{ 'opacity-100': form.agreeTerms }"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
            <span class="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Tôi đồng ý với
              <NuxtLink to="/terms" class="text-primary hover:underline" @click.stop>Điều khoản sử dụng</NuxtLink>
              và
              <NuxtLink to="/privacy" class="text-primary hover:underline" @click.stop>Chính sách bảo mật</NuxtLink>
              của EduLMS
            </span>
          </label>
          <p v-if="errors.agreeTerms" class="text-sm text-destructive">{{ errors.agreeTerms }}</p>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex gap-4 mt-8">
        <button
          v-if="currentStep > 1"
          type="button"
          class="flex-1 h-12 rounded-xl border border-input bg-background text-foreground font-medium hover:bg-muted/50 transition-colors"
          @click="prevStep"
        >
          Quay lại
        </button>
        <button
          v-if="currentStep < totalSteps"
          type="button"
          class="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          @click="nextStep"
        >
          Tiếp tục
        </button>
        <button
          v-if="currentStep === totalSteps"
          type="submit"
          :disabled="isLoading"
          class="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="!isLoading" class="flex items-center justify-center gap-2">
            Hoàn tất đăng ký
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
          <span v-else class="flex items-center justify-center gap-2">
            <svg class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Đang xử lý...
          </span>
        </button>
      </div>
    </form>

    <!-- Login Link -->
    <p class="mt-8 text-center text-sm text-muted-foreground">
      Đã có tài khoản?
      <NuxtLink
        to="/auth/login"
        class="font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Đăng nhập
      </NuxtLink>
    </p>
  </div>
</template>
