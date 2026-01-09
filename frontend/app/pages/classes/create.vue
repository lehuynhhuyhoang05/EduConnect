<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const router = useRouter()
const classesStore = useClassesStore()
const { toast } = useToast()

const form = reactive({
  name: '',
  description: '',
  subject: '',
})

const errors = reactive({
  name: '',
  description: '',
})

const isLoading = ref(false)

// Subject suggestions
const subjects = [
  'Lập trình',
  'Toán học',
  'Vật lý',
  'Hóa học',
  'Tiếng Anh',
  'Văn học',
  'Lịch sử',
  'Địa lý',
  'Sinh học',
  'Công nghệ thông tin',
]

const validateForm = () => {
  let isValid = true
  errors.name = ''
  errors.description = ''

  if (!form.name.trim()) {
    errors.name = 'Vui lòng nhập tên lớp học'
    isValid = false
  } else if (form.name.length < 3) {
    errors.name = 'Tên lớp học phải có ít nhất 3 ký tự'
    isValid = false
  }

  return isValid
}

const createdClass = ref<any>(null)
const showSuccessDialog = ref(false)

const handleSubmit = async () => {
  if (!validateForm()) return

  isLoading.value = true

  try {
    const newClass = await classesStore.createClass({
      name: form.name,
      description: form.description,
      subject: form.subject,
    })

    createdClass.value = newClass
    showSuccessDialog.value = true
  } catch (error: any) {
    toast.error('Không thể tạo lớp học', error.message || 'Vui lòng thử lại')
  } finally {
    isLoading.value = false
  }
}

const copyClassCode = async () => {
  if (createdClass.value?.classCode || createdClass.value?.code) {
    const code = createdClass.value.classCode || createdClass.value.code
    await navigator.clipboard.writeText(code)
    toast.success('Đã sao chép mã lớp!')
  }
}

const qrCodeUrl = computed(() => {
  const code = createdClass.value?.classCode || createdClass.value?.code
  if (!code) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`
})

const goToClass = () => {
  router.push(`/classes/${createdClass.value.id}`)
}

const selectSubject = (subject: string) => {
  form.subject = subject
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 py-8">
    <div class="max-w-2xl mx-auto px-4">
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
        <div class="relative bg-gradient-to-r from-primary via-purple-600 to-blue-600 p-8 text-white">
          <div class="absolute inset-0 bg-black/10" />
          <div class="relative">
            <div class="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold mb-2">Tạo lớp học mới</h1>
            <p class="text-white/80">
              Điền thông tin để tạo lớp học. Sau khi tạo, bạn sẽ nhận được mã lớp để chia sẻ cho học sinh.
            </p>
          </div>
        </div>

        <!-- Form -->
        <form class="p-8 space-y-6" @submit.prevent="handleSubmit">
          <!-- Class Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Tên lớp học <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              placeholder="VD: Lập trình Web - K15"
              class="w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              :class="errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-primary'"
            />
            <p v-if="errors.name" class="mt-2 text-sm text-red-500">{{ errors.name }}</p>
            <p v-else class="mt-2 text-xs text-gray-500">Tên lớp học sẽ hiển thị cho tất cả thành viên</p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Mô tả
            </label>
            <textarea
              v-model="form.description"
              rows="4"
              placeholder="Mô tả ngắn về lớp học, nội dung chính, mục tiêu..."
              class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
            />
            <p class="mt-2 text-xs text-gray-500">Không bắt buộc - Giúp học sinh hiểu rõ hơn về lớp học</p>
          </div>

          <!-- Subject -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Môn học
            </label>
            <input
              v-model="form.subject"
              type="text"
              placeholder="VD: Công nghệ thông tin"
              class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            
            <!-- Quick Subject Tags -->
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="subject in subjects"
                :key="subject"
                type="button"
                class="px-3 py-1.5 text-xs font-medium rounded-full border transition-all"
                :class="form.subject === subject 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'"
                @click="selectSubject(subject)"
              >
                {{ subject }}
              </button>
            </div>
          </div>

          <!-- Info Box -->
          <div class="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div class="flex gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="text-sm font-medium text-blue-800">Sau khi tạo lớp</p>
                <p class="text-sm text-blue-700 mt-1">
                  Bạn sẽ nhận được mã lớp duy nhất để chia sẻ cho học sinh. Học sinh có thể dùng mã này để tham gia lớp học của bạn.
                </p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-4">
            <button
              type="button"
              class="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              @click="router.back()"
            >
              Hủy
            </button>
            <button
              type="submit"
              class="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
              :disabled="isLoading"
            >
              <span v-if="isLoading" class="flex items-center justify-center gap-2">
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang tạo...
              </span>
              <span v-else>Tạo lớp học</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Success Dialog -->
  <Teleport to="body">
    <div
      v-if="showSuccessDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      @click.self="showSuccessDialog = false"
    >
      <div class="relative bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in-0 zoom-in-95">
        <!-- Success Icon -->
        <div class="flex justify-center mb-4">
          <div class="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
        </div>

        <!-- Header -->
        <div class="text-center mb-6">
          <h2 class="text-2xl font-bold mb-2">Tạo lớp học thành công! 🎉</h2>
          <p class="text-sm text-muted-foreground">
            Lớp <strong>{{ createdClass?.name }}</strong> đã được tạo
          </p>
        </div>

        <!-- Class Code -->
        <div class="mb-6">
          <label class="block text-sm font-medium mb-2 text-center">Mã lớp học</label>
          <div class="p-6 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl text-center">
            <span class="font-mono text-4xl font-bold tracking-[0.3em] text-primary">
              {{ createdClass?.classCode || createdClass?.code }}
            </span>
          </div>
          <p class="text-xs text-muted-foreground text-center mt-2">
            Chia sẻ mã này để học sinh tham gia lớp
          </p>
        </div>

        <!-- QR Code -->
        <div v-if="qrCodeUrl" class="mb-6 flex justify-center">
          <div class="p-4 bg-white rounded-xl border-2 border-gray-100">
            <img :src="qrCodeUrl" alt="QR Code" class="w-40 h-40" />
            <p class="text-xs text-gray-500 text-center mt-2">Quét QR để tham gia</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            @click="copyClassCode"
            class="flex-1 px-4 py-3 rounded-xl border border-input hover:bg-muted/50 font-medium transition-all flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Sao chép mã
          </button>
          <button
            @click="goToClass"
            class="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all flex items-center justify-center gap-2"
          >
            Vào lớp học
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14m-7-7 7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
