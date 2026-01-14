<script setup lang="ts">
import type { CalendarEvent } from '~/stores/calendar'

const props = defineProps<{
  events: CalendarEvent[]
  limit?: number
}>()

const displayEvents = computed(() => {
  const now = new Date()
  return props.events
    .filter(e => new Date(e.startTime) >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, props.limit || 5)
})

const getEventTypeIcon = (type: CalendarEvent['type']) => {
  const icons: Record<string, string> = {
    class: '📚',
    assignment: '📝',
    live_session: '🎥',
    exam: '📋',
    reminder: '⏰',
    other: '📌',
  }
  return icons[type] || '📌'
}

const formatDate = (date: Date | string) => {
  const d = new Date(date)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (d.toDateString() === now.toDateString()) {
    return 'Hôm nay, ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }
  if (d.toDateString() === tomorrow.toDateString()) {
    return 'Ngày mai, ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('vi-VN', { 
    day: '2-digit', 
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="rounded-lg border bg-card p-4 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold">Sự kiện sắp tới</h3>
      <NuxtLink to="/calendar" class="text-sm text-primary hover:underline">
        Xem tất cả
      </NuxtLink>
    </div>
    
    <div v-if="displayEvents.length > 0" class="space-y-3">
      <div
        v-for="event in displayEvents"
        :key="event.id"
        class="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition"
      >
        <span class="text-xl">{{ getEventTypeIcon(event.type) }}</span>
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm truncate">{{ event.title }}</p>
          <p class="text-xs text-muted-foreground">{{ formatDate(event.startTime) }}</p>
        </div>
      </div>
    </div>
    
    <p v-else class="text-sm text-muted-foreground text-center py-4">
      Không có sự kiện sắp tới
    </p>
  </div>
</template>
