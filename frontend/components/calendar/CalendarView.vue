<script setup lang="ts">
import type { CalendarEvent } from '~/stores/calendar'

const props = defineProps<{
  events: CalendarEvent[]
  currentDate: Date
}>()

const emit = defineEmits<{
  selectDate: [date: Date]
  selectEvent: [event: CalendarEvent]
}>()

const calendarStore = useCalendarStore()

const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const monthName = computed(() => {
  return props.currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
})

const calendarDays = computed(() => {
  const year = props.currentDate.getFullYear()
  const month = props.currentDate.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const days: { date: Date; isCurrentMonth: boolean; events: CalendarEvent[] }[] = []
  
  // Previous month days
  const startDayOfWeek = firstDay.getDay()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    days.push({
      date,
      isCurrentMonth: false,
      events: getEventsForDate(date)
    })
  }
  
  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i)
    days.push({
      date,
      isCurrentMonth: true,
      events: getEventsForDate(date)
    })
  }
  
  // Next month days
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i)
    days.push({
      date,
      isCurrentMonth: false,
      events: getEventsForDate(date)
    })
  }
  
  return days
})

const getEventsForDate = (date: Date): CalendarEvent[] => {
  return props.events.filter(event => {
    const eventDate = new Date(event.startTime)
    return eventDate.toDateString() === date.toDateString()
  })
}

const isToday = (date: Date) => {
  return date.toDateString() === new Date().toDateString()
}

const isSelected = (date: Date) => {
  return date.toDateString() === calendarStore.selectedDate?.toDateString()
}

const getEventColor = (type: CalendarEvent['type']) => {
  const colors: Record<string, string> = {
    class: 'bg-blue-500',
    assignment: 'bg-orange-500',
    live_session: 'bg-green-500',
    exam: 'bg-red-500',
    reminder: 'bg-purple-500',
    other: 'bg-gray-500',
  }
  return colors[type] || 'bg-gray-500'
}
</script>

<template>
  <div class="rounded-lg border bg-card p-4 shadow-sm">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <button 
        @click="calendarStore.previousMonth()"
        class="p-2 hover:bg-muted rounded-lg transition"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <h3 class="text-lg font-semibold capitalize">{{ monthName }}</h3>
      
      <button 
        @click="calendarStore.nextMonth()"
        class="p-2 hover:bg-muted rounded-lg transition"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Week days header -->
    <div class="grid grid-cols-7 gap-1 mb-2">
      <div 
        v-for="day in weekDays" 
        :key="day"
        class="text-center text-sm font-medium text-muted-foreground py-2"
      >
        {{ day }}
      </div>
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7 gap-1">
      <button
        v-for="(day, index) in calendarDays"
        :key="index"
        @click="emit('selectDate', day.date)"
        :class="[
          'relative p-2 h-24 rounded-lg border transition text-left align-top',
          day.isCurrentMonth ? 'bg-background' : 'bg-muted/50',
          isToday(day.date) && 'ring-2 ring-primary',
          isSelected(day.date) && 'border-primary bg-primary/5',
          'hover:border-primary/50'
        ]"
      >
        <span :class="[
          'text-sm',
          !day.isCurrentMonth && 'text-muted-foreground',
          isToday(day.date) && 'font-bold text-primary'
        ]">
          {{ day.date.getDate() }}
        </span>
        
        <!-- Events -->
        <div class="mt-1 space-y-1 overflow-hidden">
          <div
            v-for="event in day.events.slice(0, 2)"
            :key="event.id"
            @click.stop="emit('selectEvent', event)"
            :class="[
              'text-xs px-1 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-80',
              getEventColor(event.type)
            ]"
          >
            {{ event.title }}
          </div>
          <div 
            v-if="day.events.length > 2" 
            class="text-xs text-muted-foreground"
          >
            +{{ day.events.length - 2 }} khác
          </div>
        </div>
      </button>
    </div>

    <!-- Today button -->
    <div class="mt-4 text-center">
      <button
        @click="calendarStore.goToToday()"
        class="text-sm text-primary hover:underline"
      >
        Hôm nay
      </button>
    </div>
  </div>
</template>
