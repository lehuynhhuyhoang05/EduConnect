<script setup lang="ts">
type GradeCategory = 'assignment' | 'quiz' | 'exam' | 'attendance' | 'participation' | 'project' | 'other'

const emit = defineEmits<{
  submit: [data: {
    name: string
    description?: string
    category: GradeCategory
    maxPoints: number
    weight: number
    dueDate?: string
    isPublished: boolean
  }]
  cancel: []
}>()

const form = reactive({
  name: '',
  description: '',
  category: 'assignment' as GradeCategory,
  maxPoints: 100,
  weight: 1,
  dueDate: '',
  isPublished: true,
})

const categories: { value: GradeCategory, label: string }[] = [
  { value: 'assignment', label: 'Bài tập' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Kiểm tra' },
  { value: 'attendance', label: 'Điểm danh' },
  { value: 'participation', label: 'Tham gia' },
  { value: 'project', label: 'Dự án' },
  { value: 'other', label: 'Khác' },
]

const handleSubmit = () => {
  if (!form.name.trim()) return
  if (form.maxPoints <= 0) return
  
  emit('submit', {
    name: form.name,
    description: form.description || undefined,
    category: form.category,
    maxPoints: form.maxPoints,
    weight: form.weight,
    dueDate: form.dueDate || undefined,
    isPublished: form.isPublished,
  })
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Name -->
    <div>
      <label class="block text-sm font-medium mb-2">Tên cột điểm *</label>
      <input
        v-model="form.name"
        type="text"
        class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
        placeholder="VD: Bài tập 1, Kiểm tra giữa kỳ..."
        required
      />
    </div>

    <!-- Description -->
    <div>
      <label class="block text-sm font-medium mb-2">Mô tả</label>
      <textarea
        v-model="form.description"
        rows="2"
        class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        placeholder="Mô tả về cột điểm..."
      />
    </div>

    <!-- Category -->
    <div>
      <label class="block text-sm font-medium mb-2">Loại</label>
      <select 
        v-model="form.category"
        class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
      >
        <option v-for="cat in categories" :key="cat.value" :value="cat.value">
          {{ cat.label }}
        </option>
      </select>
    </div>

    <!-- Points and Weight -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium mb-2">Điểm tối đa *</label>
        <input
          v-model.number="form.maxPoints"
          type="number"
          min="1"
          class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
          required
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-2">Trọng số</label>
        <input
          v-model.number="form.weight"
          type="number"
          min="0"
          step="0.1"
          class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>
    </div>

    <!-- Due Date -->
    <div>
      <label class="block text-sm font-medium mb-2">Ngày hết hạn</label>
      <input
        v-model="form.dueDate"
        type="datetime-local"
        class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </div>

    <!-- Published toggle -->
    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div>
        <p class="font-medium">Công khai điểm</p>
        <p class="text-sm text-gray-500">Học sinh có thể xem điểm</p>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" v-model="form.isPublished" class="sr-only peer">
        <div class="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </label>
    </div>

    <!-- Actions -->
    <div class="flex gap-3 pt-2">
      <button
        type="button"
        @click="emit('cancel')"
        class="flex-1 py-3 rounded-xl border border-gray-300 font-medium hover:bg-gray-50 transition"
      >
        Hủy
      </button>
      <button
        type="submit"
        class="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition"
      >
        Thêm cột điểm
      </button>
    </div>
  </form>
</template>
