<script setup lang="ts">
import type { CalendarEvent } from '~/stores/calendar'

const emit = defineEmits<{
  submit: [event: Partial<CalendarEvent>]
  cancel: []
}>()

const props = defineProps<{
  event?: CalendarEvent
  classId?: number
  defaultDate?: Date
}>()

const isEditing = computed(() => !!props.event)

const form = reactive({
  title: props.event?.title ?? '',
  description: props.event?.description ?? '',
  type: props.event?.type ?? 'reminder' as CalendarEvent['type'],
  startTime: props.event?.startTime 
    ? new Date(props.event.startTime).toISOString().slice(0, 16)
    : props.defaultDate 
      ? props.defaultDate.toISOString().slice(0, 16)
      : '',
  endTime: props.event?.endTime 
    ? new Date(props.event.endTime).toISOString().slice(0, 16) 
    : '',
  location: props.event?.location ?? '',
  isRecurring: props.event?.isRecurring ?? false,
  recurringPattern: props.event?.recurringPattern ?? 'weekly' as CalendarEvent['recurringPattern'],
  recurringEndDate: props.event?.recurringEndDate 
    ? new Date(props.event.recurringEndDate).toISOString().slice(0, 10)
    : '',
  color: props.event?.color ?? '#3b82f6',
})

const eventTypes = [
  { value: 'class', label: 'Lớp học' },
  { value: 'assignment', label: 'Bài tập' },
  { value: 'live_session', label: 'Live Session' },
  { value: 'exam', label: 'Kiểm tra' },
  { value: 'reminder', label: 'Nhắc nhở' },
  { value: 'other', label: 'Khác' },
]

const recurringPatterns = [
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekly', label: 'Hàng tuần' },
  { value: 'monthly', label: 'Hàng tháng' },
]

const handleSubmit = () => {
  const event: Partial<CalendarEvent> = {
    title: form.title,
    description: form.description || undefined,
    type: form.type,
    startTime: new Date(form.startTime),
    endTime: form.endTime ? new Date(form.endTime) : undefined,
    location: form.location || undefined,
    isRecurring: form.isRecurring,
    recurringPattern: form.isRecurring ? form.recurringPattern : undefined,
    recurringEndDate: form.isRecurring && form.recurringEndDate 
      ? new Date(form.recurringEndDate) 
      : undefined,
    color: form.color,
    classId: props.classId,
  }
  
  emit('submit', event)
}

const isValid = computed(() => {
  return form.title.trim() && form.startTime
})
</script>

<template>
  <div class="space-y-6">
    <h3 class="text-lg font-semibold">
      {{ isEditing ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới' }}
    </h3>

    <!-- Title -->
    <div>
      <label class="block text-sm font-medium mb-2">Tiêu đề *</label>
      <input
        v-model="form.title"
        placeholder="VD: Deadline bài tập, Lịch học..."
        class="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>

    <!-- Type -->
    <div>
      <label class="block text-sm font-medium mb-2">Loại sự kiện</label>
      <select
        v-model="form.type"
        class="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option v-for="type in eventTypes" :key="type.value" :value="type.value">
          {{ type.label }}
        </option>
      </select>
    </div>

    <!-- Time -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium mb-2">Thời gian bắt đầu *</label>
        <input
          v-model="form.startTime"
          type="datetime-local"
          class="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-2">Thời gian kết thúc</label>
        <input
          v-model="form.endTime"
          type="datetime-local"
          class="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>

    <!-- Description -->
    <div>
      <label class="block text-sm font-medium mb-2">Mô tả</label>
      <textarea
        v-model="form.description"
        placeholder="Mô tả chi tiết về sự kiện..."
        rows="3"
        class="w-full p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>

    <!-- Location -->
    <div>
      <label class="block text-sm font-medium mb-2">Địa điểm</label>
      <input
        v-model="form.location"
        placeholder="VD: Phòng họp online, Link Zoom..."
        class="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>

    <!-- Color -->
    <div>
      <label class="block text-sm font-medium mb-2">Màu sắc</label>
      <div class="flex items-center gap-2">
        <input
          v-model="form.color"
          type="color"
          class="w-10 h-10 rounded cursor-pointer border-0"
        />
        <span class="text-sm text-muted-foreground">{{ form.color }}</span>
      </div>
    </div>

    <!-- Recurring -->
    <div class="space-y-4">
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" v-model="form.isRecurring" class="rounded" />
        <span class="text-sm font-medium">Lặp lại sự kiện</span>
      </label>
      
      <div v-if="form.isRecurring" class="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
        <div>
          <label class="block text-sm font-medium mb-2">Tần suất</label>
          <select
            v-model="form.recurringPattern"
            class="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option v-for="pattern in recurringPatterns" :key="pattern.value" :value="pattern.value">
              {{ pattern.label }}
            </option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Kết thúc lặp lại</label>
          <input
            v-model="form.recurringEndDate"
            type="date"
            class="w-full p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
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
        {{ isEditing ? 'Cập nhật' : 'Tạo sự kiện' }}
      </button>
    </div>
  </div>
</template>
