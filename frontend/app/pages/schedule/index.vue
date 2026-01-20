<script setup lang="ts">
import type { LiveSession } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const liveSessionsStore = useLiveSessionsStore()
const classesStore = useClassesStore()
const isLoading = ref(true)

// Current view mode
const viewMode = ref<'list' | 'calendar'>('list')

// Import modal state
const showImportModal = ref(false)

// Selected week offset (0 = current week)
const weekOffset = ref(0)

// Get current week dates
const currentWeekDates = computed(() => {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + 1 + (weekOffset.value * 7)) // Start from Monday
  
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    dates.push(date)
  }
  return dates
})

const weekLabel = computed(() => {
  const start = currentWeekDates.value[0]
  const end = currentWeekDates.value[6]
  return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`
})

// Group sessions by date
const groupedSessions = computed(() => {
  const sessions = liveSessionsStore.scheduledSessions ?? []
  const groups: Record<string, LiveSession[]> = {}
  
  sessions.forEach((session: LiveSession) => {
    if (session.scheduledAt) {
      const date = new Date(session.scheduledAt).toLocaleDateString('vi-VN')
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(session)
    }
  })
  
  // Sort by date
  return Object.entries(groups)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, sessions]) => ({
      date,
      sessions: sessions.sort((a: LiveSession, b: LiveSession) => 
        new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime()
      )
    }))
})

// Sessions for calendar view (grouped by day of week)
const calendarSessions = computed(() => {
  const sessions = liveSessionsStore.scheduledSessions ?? []
  return currentWeekDates.value.map(date => {
    const dateStr = date.toLocaleDateString('vi-VN')
    return {
      date,
      isToday: date.toDateString() === new Date().toDateString(),
      sessions: sessions.filter((s: LiveSession) => {
        if (!s.scheduledAt) return false
        return new Date(s.scheduledAt).toDateString() === date.toDateString()
      })
    }
  })
})

const formatDate = (date: string) => {
  const d = new Date(date)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (d.toDateString() === today.toDateString()) {
    return 'Hôm nay'
  }
  if (d.toDateString() === tomorrow.toDateString()) {
    return 'Ngày mai'
  }
  
  return d.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getTimeUntil = (date: string) => {
  const now = new Date()
  const target = new Date(date)
  const diff = target.getTime() - now.getTime()
  
  if (diff < 0) return { text: 'Đã qua', past: true }
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return { text: `${days} ngày nữa`, past: false }
  }
  if (hours > 0) {
    return { text: `${hours} giờ ${minutes} phút nữa`, past: false }
  }
  return { text: `${minutes} phút nữa`, past: false, urgent: true }
}

const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

onMounted(async () => {
  try {
    await Promise.all([
      liveSessionsStore.fetchSessions(),
      classesStore.fetchClasses()
    ])
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-br from-primary via-primary/90 to-purple-600 text-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold">Lịch học</h1>
            <p class="text-white/80 mt-1">Các buổi học trực tiếp sắp tới</p>
          </div>
          
          <!-- Import button -->
          <button 
            class="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors mr-4"
            @click="showImportModal = true"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import lịch
          </button>
          
          <!-- View mode toggle -->
          <div class="flex gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur">
            <button
              class="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              :class="viewMode === 'list' ? 'bg-white text-primary' : 'text-white/80 hover:text-white'"
              @click="viewMode = 'list'"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <span class="hidden sm:inline">Danh sách</span>
            </button>
            <button
              class="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
              :class="viewMode === 'calendar' ? 'bg-white text-primary' : 'text-white/80 hover:text-white'"
              @click="viewMode = 'calendar'"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span class="hidden sm:inline">Lịch</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Loading -->
      <div v-if="isLoading" class="space-y-6">
        <div v-for="i in 3" :key="i" class="bg-white rounded-2xl p-6 animate-pulse">
          <div class="h-6 w-32 bg-gray-200 rounded mb-4" />
          <div class="h-24 w-full bg-gray-200 rounded" />
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="groupedSessions.length === 0 && viewMode === 'list'" class="bg-white rounded-2xl shadow-sm py-16 text-center">
        <div class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
          <svg class="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 class="mt-6 text-lg font-semibold text-gray-900">Chưa có lịch học</h3>
        <p class="mt-2 text-gray-500 max-w-sm mx-auto">
          Hiện tại không có buổi học trực tiếp nào được lên lịch. Các buổi học mới sẽ xuất hiện ở đây.
        </p>
      </div>

      <!-- Calendar View -->
      <div v-else-if="viewMode === 'calendar'" class="space-y-4">
        <!-- Week navigation -->
        <div class="bg-white rounded-2xl shadow-sm p-4">
          <div class="flex items-center justify-between">
            <button
              class="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
              @click="weekOffset--"
            >
              <svg class="w-5 h-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div class="text-center">
              <p class="font-semibold text-gray-900">{{ weekLabel }}</p>
              <button 
                v-if="weekOffset !== 0"
                class="text-sm text-primary hover:underline mt-1"
                @click="weekOffset = 0"
              >
                Về tuần này
              </button>
            </div>
            <button
              class="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
              @click="weekOffset++"
            >
              <svg class="w-5 h-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Calendar grid -->
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div class="grid grid-cols-7 border-b">
            <div 
              v-for="(date, i) in calendarSessions" 
              :key="i"
              class="p-3 text-center border-r last:border-r-0"
              :class="date.isToday ? 'bg-primary/5' : ''"
            >
              <p class="text-xs text-gray-500 font-medium">{{ dayNames[i] }}</p>
              <p 
                class="text-lg font-bold mt-1"
                :class="date.isToday ? 'text-primary' : 'text-gray-900'"
              >
                {{ date.date.getDate() }}
              </p>
            </div>
          </div>
          <div class="grid grid-cols-7 min-h-[300px]">
            <div 
              v-for="(day, i) in calendarSessions" 
              :key="i"
              class="border-r last:border-r-0 p-2"
              :class="day.isToday ? 'bg-primary/5' : ''"
            >
              <div v-if="day.sessions.length === 0" class="h-full flex items-center justify-center">
                <p class="text-xs text-gray-400">Không có</p>
              </div>
              <div v-else class="space-y-2">
                <NuxtLink
                  v-for="session in day.sessions"
                  :key="session.id"
                  :to="session.status === 'live' ? `/live/${session.id}` : `/classes/${session.classId}`"
                  class="block p-2 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 hover:from-primary/20 hover:to-purple-500/20 transition-colors"
                >
                  <p class="text-xs font-medium text-primary">{{ formatTime(session.scheduledAt!) }}</p>
                  <p class="text-sm font-semibold text-gray-900 truncate mt-1">{{ session.title }}</p>
                  <p class="text-xs text-gray-500 truncate">{{ session.class?.name }}</p>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- List View - Sessions grouped by date -->
      <div v-else class="space-y-8">
        <div v-for="group in groupedSessions" :key="group.date" class="space-y-4">
          <!-- Date header -->
          <div class="flex items-center gap-4">
            <h2 class="text-lg font-bold text-gray-900 whitespace-nowrap">{{ formatDate(group.date) }}</h2>
            <div class="h-px flex-1 bg-gray-200" />
          </div>

          <!-- Sessions -->
          <div class="grid gap-4 md:grid-cols-2">
            <div 
              v-for="session in group.sessions" 
              :key="session.id" 
              class="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div class="flex">
                <!-- Time sidebar -->
                <div class="w-24 flex-shrink-0 bg-gradient-to-br from-primary/10 to-purple-500/10 flex flex-col items-center justify-center p-4">
                  <span class="text-3xl font-bold text-primary">{{ formatTime(session.scheduledAt!).split(':')[0] }}</span>
                  <span class="text-lg text-primary/70">{{ formatTime(session.scheduledAt!).split(':')[1] }}</span>
                </div>

                <!-- Content -->
                <div class="flex-1 p-5">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <h3 class="font-semibold text-gray-900 leading-tight">{{ session.title }}</h3>
                      <p class="text-sm text-gray-500 mt-1">{{ session.class?.name || 'Lớp học' }}</p>
                    </div>
                    <span 
                      class="px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
                      :class="{
                        'bg-green-100 text-green-700': session.status === 'live',
                        'bg-orange-100 text-orange-700': getTimeUntil(session.scheduledAt!).urgent,
                        'bg-gray-100 text-gray-600': !getTimeUntil(session.scheduledAt!).urgent && session.status !== 'live' && !getTimeUntil(session.scheduledAt!).past,
                        'bg-red-100 text-red-600': getTimeUntil(session.scheduledAt!).past,
                      }"
                    >
                      {{ session.status === 'live' ? 'Đang diễn ra' : getTimeUntil(session.scheduledAt!).text }}
                    </span>
                  </div>

                  <div v-if="session.host" class="flex items-center gap-2 mt-3 text-sm text-gray-500">
                    <div class="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                      {{ session.host.fullName?.charAt(0) || 'T' }}
                    </div>
                    <span>{{ session.host.fullName }}</span>
                  </div>

                  <div class="flex gap-2 mt-4">
                    <NuxtLink :to="`/classes/${session.classId}`" class="flex-1">
                      <button class="w-full py-2 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm">
                        Xem lớp
                      </button>
                    </NuxtLink>
                    <NuxtLink v-if="session.status === 'live'" :to="`/live/${session.id}`" class="flex-1">
                      <button class="w-full py-2 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors text-sm flex items-center justify-center gap-2">
                        <span class="relative flex h-2 w-2">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                        </span>
                        Tham gia
                      </button>
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Import Calendar Modal -->
    <Teleport to="body">
      <div v-if="showImportModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showImportModal = false" />
        <div class="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
          <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 class="text-xl font-bold text-gray-900">Import lịch học</h2>
            <button 
              class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
              @click="showImportModal = false"
            >
              <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-6">
            <CalendarImport @close="showImportModal = false" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
