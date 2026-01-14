<script setup lang="ts">
import type { GradeItem } from '~/stores/gradebook'

const emit = defineEmits<{
  submit: [item: Partial<GradeItem>]
  cancel: []
}>()

const props = defineProps<{
  item?: GradeItem
}>()

const isEditing = computed(() => !!props.item)

const form = reactive({
  name: props.item?.name ?? '',
  category: props.item?.category ?? 'assignment' as GradeItem['category'],
  maxPoints: props.item?.maxPoints ?? 100,
  weight: props.item?.weight ?? 1,
  dueDate: props.item?.dueDate ? new Date(props.item.dueDate).toISOString().slice(0, 16) : '',
})

const categories = [
  { value: 'assignment', label: 'Bài tập' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Kiểm tra' },
  { value: 'project', label: 'Dự án' },
  { value: 'participation', label: 'Tham gia' },
  { value: 'other', label: 'Khác' },
]

const handleSubmit = () => {
  const item: Partial<GradeItem> = {
    name: form.name,
    category: form.category,
    maxPoints: form.maxPoints,
    weight: form.weight,
    dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
  }
  
  emit('submit', item)
}

const isValid = computed(() => {
  return form.name.trim() && form.maxPoints > 0
})
</script>

<template>
  <div class="space-y-6">
    <h3 class="text-lg font-semibold">
      {{ isEditing ? 'Chỉnh sửa cột điểm' : 'Thêm cột điểm mới' }}
    </h3>

    <!-- Name -->
    <div>
      <label class="block text-sm font-medium mb-2">Tên *</label>
      <input
        v-model="form.name"
        placeholder="VD: Bài tập 1, Kiểm tra giữa kỳ..."
        class="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>

    <!-- Category -->
    <div>
      <label class="block text-sm font-medium mb-2">Loại</label>
      <select
        v-model="form.category"
        class="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option v-for="cat in categories" :key="cat.value" :value="cat.value">
          {{ cat.label }}
        </option>
      </select>
    </div>

    <!-- Max Points & Weight -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium mb-2">Điểm tối đa *</label>
        <input
          v-model.number="form.maxPoints"
          type="number"
          min="1"
          class="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2">Trọng số</label>
        <input
          v-model.number="form.weight"
          type="number"
          min="0"
          step="0.1"
          class="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>

    <!-- Due Date -->
    <div>
      <label class="block text-sm font-medium mb-2">Hạn nộp</label>
      <input
        v-model="form.dueDate"
        type="datetime-local"
        class="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-4 border-t">
      <button
        @click="emit('cancel')"
        class="px-4 py-2 border border-border rounded-lg hover:bg-muted transition"
      >
        Hủy
      </button>
      <button
        @click="handleSubmit"
        :disabled="!isValid"
        class="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
      >
        {{ isEditing ? 'Cập nhật' : 'Thêm' }}
      </button>
    </div>
  </div>
</template>
