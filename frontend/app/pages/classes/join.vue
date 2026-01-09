<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const router = useRouter()
const classesStore = useClassesStore()
const { toast } = useToast()

const classCode = ref('')
const isLoading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  if (!classCode.value.trim()) {
    error.value = 'Vui lòng nhập mã lớp học'
    return
  }

  error.value = ''
  isLoading.value = true

  try {
    const joinedClass = await classesStore.joinClass(classCode.value.trim())
    toast.success('Tham gia lớp học thành công!', `Chào mừng bạn đến với ${joinedClass.name}`)
    router.push(`/classes/${joinedClass.id}`)
  } catch (err: any) {
    error.value = err.message || 'Mã lớp không hợp lệ hoặc bạn đã là thành viên'
    toast.error('Không thể tham gia lớp học', error.value)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 py-8 flex items-center justify-center">
    <div class="w-full max-w-md px-4">
      <!-- Breadcrumb -->
      <nav class="mb-6">
        <NuxtLink 
          to="/classes" 
          class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
        >
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Quay lại danh sách lớp
        </NuxtLink>
      </nav>

      <!-- Main Card -->
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <!-- Header -->
        <div class="relative bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-8 text-white text-center">
          <div class="absolute inset-0 bg-black/10" />
          <div class="relative">
            <div class="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold mb-2">Tham gia lớp học</h1>
            <p class="text-white/80">
              Nhập mã lớp do giáo viên cung cấp
            </p>
          </div>
        </div>

        <!-- Form -->
        <form class="p-8 space-y-6" @submit.prevent="handleSubmit">
          <!-- Class Code Input -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-3 text-center">
              Mã lớp học
            </label>
            <input
              v-model="classCode"
              type="text"
              placeholder="VD: ABC123"
              class="w-full h-16 px-6 text-2xl font-mono text-center uppercase tracking-[0.3em] bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
              :class="error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-green-500'"
              maxlength="10"
              @input="classCode = classCode.toUpperCase(); error = ''"
            />
            <p v-if="error" class="mt-3 text-sm text-red-500 text-center">{{ error }}</p>
            <p v-else class="mt-3 text-xs text-gray-500 text-center">
              Mã lớp gồm các chữ cái và số, do giáo viên cung cấp
            </p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-medium rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all disabled:opacity-50"
            :disabled="isLoading || !classCode.trim()"
          >
            <span v-if="isLoading" class="flex items-center justify-center gap-2">
              <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang tham gia...
            </span>
            <span v-else>Tham gia lớp học</span>
          </button>
        </form>
      </div>

      <!-- Info Card -->
      <div class="mt-6 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div class="flex gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="font-semibold text-gray-900">Làm sao để có mã lớp?</p>
            <p class="text-sm text-gray-600 mt-1">
              Hỏi giáo viên của bạn để nhận mã lớp học. Mã này thường được chia sẻ qua email, nhóm chat hoặc thông báo trên lớp.
            </p>
          </div>
        </div>
      </div>

      <!-- Steps Guide -->
      <div class="mt-6 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h3 class="font-semibold text-gray-900 mb-4">Các bước tham gia</h3>
        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-sm flex-shrink-0">
              1
            </div>
            <div>
              <p class="font-medium text-gray-900">Nhận mã lớp</p>
              <p class="text-sm text-gray-500">Giáo viên sẽ chia sẻ mã lớp cho bạn</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-sm flex-shrink-0">
              2
            </div>
            <div>
              <p class="font-medium text-gray-900">Nhập mã</p>
              <p class="text-sm text-gray-500">Điền chính xác mã lớp vào ô trên</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-sm flex-shrink-0">
              3
            </div>
            <div>
              <p class="font-medium text-gray-900">Bắt đầu học</p>
              <p class="text-sm text-gray-500">Truy cập tài liệu và bài tập của lớp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
