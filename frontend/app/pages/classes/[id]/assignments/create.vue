<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'teacher'],
})

const route = useRoute()
const router = useRouter()
const assignmentsStore = useAssignmentsStore()
const { toast } = useToast()

const classId = computed(() => Number(route.params.id))

const form = reactive({
  title: '',
  description: '',
  dueDate: '',
  maxScore: 100,
})

const isLoading = ref(false)

const handleSubmit = async () => {
  if (!form.title.trim()) {
    toast.error('Vui lòng nhập tiêu đề bài tập')
    return
  }

  if (!form.dueDate) {
    toast.error('Vui lòng chọn hạn nộp')
    return
  }

  isLoading.value = true

  try {
    await assignmentsStore.createAssignment(classId.value, {
      title: form.title,
      description: form.description,
      dueDate: new Date(form.dueDate).toISOString(),
      maxScore: form.maxScore,
    })

    toast.success('Tạo bài tập thành công!')
    router.push(`/classes/${classId.value}?tab=assignments`)
  } catch (error: any) {
    toast.error('Không thể tạo bài tập', error.message)
  } finally {
    isLoading.value = false
  }
}

// Set minimum date to today
const today = new Date().toISOString().split('T')[0]
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <div class="mb-6">
      <NuxtLink 
        :to="`/classes/${classId}`" 
        class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
      >
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Quay lại lớp học
      </NuxtLink>
    </div>

    <div class="bg-white rounded-2xl shadow-sm p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Tạo bài tập mới</h1>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Tiêu đề <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.title"
            type="text"
            class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="VD: Bài tập tuần 1"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
          <textarea
            v-model="form.description"
            rows="4"
            class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Mô tả chi tiết về bài tập..."
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Hạn nộp <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.dueDate"
              type="datetime-local"
              :min="today"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Điểm tối đa</label>
            <input
              v-model.number="form.maxScore"
              type="number"
              min="1"
              max="1000"
              class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div class="flex gap-3 pt-4">
          <button
            type="button"
            @click="router.back()"
            class="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Hủy
          </button>
          <button
            type="submit"
            :disabled="isLoading"
            class="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
          >
            {{ isLoading ? 'Đang tạo...' : 'Tạo bài tập' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
