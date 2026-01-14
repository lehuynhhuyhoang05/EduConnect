<script setup lang="ts">
import type { CalendarEvent } from '~/stores/calendar'

const props = defineProps<{
  event: CalendarEvent
  showActions?: boolean
}>()

const emit = defineEmits<{
  edit: []
  delete: []
}>()

const typeLabels: Record<string, string> = {
  class: 'Lớp học',
  assignment: 'Bài tập',
  live_session: 'Live Session',
  exam: 'Kiểm tra',
  reminder: 'Nhắc nhở',
  other: 'Khác',
}

const typeColors: Record<string, string> = {
  class: 'bg-blue-500',
  assignment: 'bg-orange-500',
  live_session: 'bg-green-500',
  exam: 'bg-red-500',
  reminder: 'bg-purple-500',
  other: 'bg-gray-500',
}

const formatDateTime = (date: Date | string) => {
  return new Date(date).toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const isUpcoming = computed(() => {
  return new Date(props.event.startTime) > new Date()
})
</script>

<template>
  <div class="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition">
    <div class="flex items-start gap-3">
      <!-- Type indicator -->
      <div :class="['w-1 h-full min-h-[60px] rounded-full', typeColors[event.type]]" />
      
      <div class="flex-1 min-w-0">
        <!-- Header -->
        <div class="flex items-start justify-between gap-2">
          <div>
            <h4 class="font-semibold truncate">{{ event.title }}</h4>
            <span :class="['text-xs px-2 py-0.5 rounded-full text-white', typeColors[event.type]]">
              {{ typeLabels[event.type] }}
            </span>
          </div>
          
          <div v-if="showActions" class="flex gap-1">
            <button
              @click="emit('edit')"
              class="p-1.5 hover:bg-muted rounded transition"
              title="Chỉnh sửa"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="emit('delete')"
              class="p-1.5 hover:bg-red-500/10 text-red-500 rounded transition"
              title="Xóa"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Time -->
        <div class="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ formatDateTime(event.startTime) }}</span>
          <span v-if="event.endTime">- {{ formatDateTime(event.endTime) }}</span>
        </div>

        <!-- Description -->
        <p v-if="event.description" class="mt-2 text-sm text-muted-foreground line-clamp-2">
          {{ event.description }}
        </p>

        <!-- Location -->
        <div v-if="event.location" class="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{{ event.location }}</span>
        </div>

        <!-- Recurring indicator -->
        <div v-if="event.isRecurring" class="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Lặp lại {{ event.recurringPattern }}</span>
        </div>

        <!-- Status badge -->
        <div v-if="!isUpcoming" class="mt-2">
          <span class="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
            Đã qua
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
