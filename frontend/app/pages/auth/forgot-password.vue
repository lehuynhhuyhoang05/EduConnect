<script setup lang="ts">
definePageMeta({
  layout: 'auth',
})

const { toast } = useToast()
const router = useRouter()

const email = ref('')
const isLoading = ref(false)
const isSubmitted = ref(false)

const handleSubmit = async () => {
  if (!email.value) {
    toast.error('Vui lòng nhập email')
    return
  }

  isLoading.value = true
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    isSubmitted.value = true
    toast.success('Đã gửi email khôi phục mật khẩu')
  } catch (error) {
    toast.error('Không thể gửi email. Vui lòng thử lại.')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md mx-auto">
    <!-- Back to Login -->
    <NuxtLink
      to="/auth/login"
      class="inline-flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-8"
    >
      <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m15 18-6-6 6-6"/>
      </svg>
      <span>Quay lại đăng nhập</span>
    </NuxtLink>

    <!-- Success State -->
    <div v-if="isSubmitted" class="text-center">
      <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
        <svg class="w-10 h-10 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Kiểm tra email của bạn</h1>
      <p class="text-gray-600 mb-6">
        Chúng tôi đã gửi hướng dẫn khôi phục mật khẩu đến<br>
        <span class="font-medium text-gray-900">{{ email }}</span>
      </p>
      <p class="text-sm text-gray-500 mb-8">
        Không nhận được email? Kiểm tra thư mục spam hoặc
        <button class="text-primary hover:underline" @click="isSubmitted = false">thử lại</button>
      </p>
      <NuxtLink
        to="/auth/login"
        class="inline-flex items-center justify-center w-full h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors"
      >
        Quay lại đăng nhập
      </NuxtLink>
    </div>

    <!-- Form State -->
    <div v-else>
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Quên mật khẩu?</h1>
        <p class="text-gray-600">Không sao, chúng tôi sẽ gửi hướng dẫn khôi phục cho bạn.</p>
      </div>

      <!-- Form -->
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg class="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="name@example.com"
              class="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg v-if="isLoading" class="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span v-if="isLoading">Đang gửi...</span>
          <span v-else>Gửi hướng dẫn khôi phục</span>
        </button>
      </form>

      <!-- Info -->
      <div class="mt-8 p-4 rounded-xl bg-blue-50 border border-blue-100">
        <div class="flex gap-3">
          <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div class="text-sm text-blue-800">
            <p class="font-medium mb-1">Mẹo bảo mật</p>
            <p class="text-blue-700">
              Đảm bảo bạn đang sử dụng email đã đăng ký tài khoản. 
              Link khôi phục sẽ hết hạn sau 24 giờ.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
