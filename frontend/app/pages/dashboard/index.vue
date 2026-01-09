<script setup lang="ts">
import type { Assignment } from '~/types'

const authStore = useAuthStore()
const classesStore = useClassesStore()
const assignmentsStore = useAssignmentsStore()
const liveSessionsStore = useLiveSessionsStore()

const isLoading = ref(true)
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
})

// Stats with trend
const stats = computed(() => [
  {
    label: 'Lớp học',
    value: authStore.isTeacher
      ? (classesStore.teachingClasses?.length ?? 0)
      : (classesStore.enrolledClasses?.length ?? 0),
    icon: 'academic-cap',
    color: 'from-blue-500 to-blue-600',
    trend: '+2',
    trendUp: true,
  },
  {
    label: 'Bài tập chưa nộp',
    value: assignmentsStore.upcomingAssignments?.length ?? 0,
    icon: 'clipboard',
    color: 'from-amber-500 to-orange-500',
    trend: assignmentsStore.upcomingAssignments?.length > 0 ? 'Sắp hết hạn' : '',
    trendUp: false,
  },
  {
    label: 'Buổi học hôm nay',
    value: liveSessionsStore.liveSessions?.filter((s: any) => {
      const sessionDate = new Date(s.scheduledAt || s.startedAt)
      const today = new Date()
      return sessionDate.toDateString() === today.toDateString()
    })?.length ?? 0,
    icon: 'video',
    color: 'from-emerald-500 to-green-500',
    trend: liveSessionsStore.activeSessions?.length > 0 ? 'Đang live' : '',
    trendUp: true,
  },
  {
    label: authStore.isTeacher ? 'Tổng học sinh' : 'Tiến độ học tập',
    value: authStore.isTeacher ? '125' : '85%',
    icon: authStore.isTeacher ? 'users' : 'chart',
    color: 'from-purple-500 to-violet-500',
    trend: '+12%',
    trendUp: true,
  },
])

// Format date
const formatDueDate = (date: string) => {
  const dueDate = new Date(date)
  const now = new Date()
  const diff = dueDate.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days < 0) return 'Đã quá hạn'
  if (days === 0) return 'Hôm nay'
  if (days === 1) return 'Ngày mai'
  if (days <= 7) return `${days} ngày nữa`
  return dueDate.toLocaleDateString('vi-VN')
}

const getUrgencyColor = (date: string) => {
  const dueDate = new Date(date)
  const now = new Date()
  const diff = dueDate.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days < 0) return 'text-red-500 bg-red-500/10'
  if (days <= 1) return 'text-orange-500 bg-orange-500/10'
  if (days <= 3) return 'text-amber-500 bg-amber-500/10'
  return 'text-green-500 bg-green-500/10'
}

onMounted(async () => {
  // Wait for auth to be initialized
  const authStore = useAuthStore()
  if (!authStore.token) {
    isLoading.value = false
    return
  }
  
  try {
    await Promise.all([
      classesStore.fetchClasses(),
      assignmentsStore.fetchAssignments(),
      liveSessionsStore.fetchSessions(),
    ])
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
  } finally {
    isLoading.value = false
  }
})

const { toast } = useToast()

// Delete live session
const deleteLiveSession = async (sessionId: number) => {
  if (!confirm('Bạn có chắc muốn xóa phiên live này?')) return
  try {
    await liveSessionsStore.deleteSession(sessionId)
    await liveSessionsStore.fetchSessions()
    toast.success('Đã xóa phiên live')
  } catch (error: any) {
    toast.error('Không thể xóa phiên live')
  }
}

// End live session
const endLiveSession = async (sessionId: number) => {
  if (!confirm('Bạn có chắc muốn kết thúc phiên live này?')) return
  try {
    await liveSessionsStore.endSession(sessionId)
    await liveSessionsStore.fetchSessions()
    toast.success('Đã kết thúc phiên live')
  } catch (error: any) {
    toast.error('Không thể kết thúc phiên live')
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Hero Welcome Section -->
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 text-white">
      <!-- Background Pattern -->
      <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
      
      <!-- Decorative Circles -->
      <div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div class="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      
      <div class="relative">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p class="text-white/80 text-sm font-medium mb-1">{{ greeting }}</p>
            <h1 class="text-3xl md:text-4xl font-bold tracking-tight">
              {{ authStore.user?.fullName || 'Người dùng' }} 👋
            </h1>
            <p class="mt-2 text-white/80 max-w-lg">
              {{ authStore.isTeacher 
                ? 'Chào mừng bạn quay lại! Hãy kiểm tra hoạt động của lớp học và chuẩn bị bài giảng mới.' 
                : 'Chào mừng bạn quay lại! Hãy xem lịch học và hoàn thành các bài tập của mình.' 
              }}
            </p>
          </div>
          
          <!-- Quick Actions -->
          <div class="flex flex-wrap gap-3">
            <NuxtLink 
              :to="authStore.isTeacher ? '/classes/create' : '/classes/join'"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-primary font-medium hover:bg-white/90 transition-all shadow-lg shadow-black/10"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14m-7-7h14"/>
              </svg>
              {{ authStore.isTeacher ? 'Tạo lớp mới' : 'Tham gia lớp' }}
            </NuxtLink>
            <NuxtLink 
              to="/schedule"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 text-white font-medium hover:bg-white/30 transition-all backdrop-blur-sm"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Xem lịch học
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="group relative overflow-hidden rounded-2xl bg-card border border-border p-6 hover:shadow-lg transition-all duration-300"
      >
        <!-- Gradient Background on Hover -->
        <div 
          :class="`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`"
        />
        
        <div class="relative flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-muted-foreground">{{ stat.label }}</p>
            <p class="text-3xl font-bold mt-2 text-foreground">{{ stat.value }}</p>
            <p 
              v-if="stat.trend"
              class="text-xs mt-2 font-medium"
              :class="stat.trendUp ? 'text-emerald-500' : 'text-amber-500'"
            >
              {{ stat.trend }}
            </p>
          </div>
          <div 
            :class="`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`"
          >
            <svg v-if="stat.icon === 'academic-cap'" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5"/>
            </svg>
            <svg v-else-if="stat.icon === 'clipboard'" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            <svg v-else-if="stat.icon === 'video'" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            <svg v-else-if="stat.icon === 'users'" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <svg v-else class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Live Sessions Section -->
    <div v-if="liveSessionsStore.activeSessions?.length > 0" class="rounded-2xl border-2 border-red-500/30 bg-gradient-to-r from-red-500/5 to-orange-500/5 overflow-hidden">
      <div class="flex items-center justify-between p-5 border-b border-red-500/20">
        <div class="flex items-center gap-3">
          <div class="relative">
            <span class="flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
          <div>
            <h2 class="text-lg font-semibold text-foreground">Phiên live đang diễn ra</h2>
            <p class="text-sm text-muted-foreground">{{ liveSessionsStore.activeSessions.length }} phiên live</p>
          </div>
        </div>
      </div>
      
      <div class="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="session in liveSessionsStore.activeSessions"
          :key="session.id"
          class="group relative rounded-xl border border-red-500/20 bg-card p-4 hover:shadow-lg hover:border-red-500/40 transition-all duration-200"
        >
          <!-- Live Badge -->
          <div class="absolute top-3 right-3">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
              <span class="relative flex h-1.5 w-1.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-white"></span>
              </span>
              LIVE
            </span>
          </div>
          
          <div class="flex items-start gap-3 mb-3">
            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0 pr-12">
              <h3 class="font-semibold text-foreground truncate">{{ session.title }}</h3>
              <p class="text-sm text-muted-foreground truncate">
                {{ classesStore.classes?.find(c => c.id === session.classId)?.name || 'Lớp học' }}
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
              {{ session.participantCount || 0 }} tham gia
            </span>
            <span class="flex items-center gap-1">
              <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {{ session.startedAt ? new Date(session.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '' }}
            </span>
          </div>
          
          <div class="flex items-center gap-2">
            <NuxtLink
              :to="`/live/${session.id}`"
              class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium hover:from-red-600 hover:to-orange-600 transition-all shadow-md"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Tham gia
            </NuxtLink>
            
            <!-- Teacher actions -->
            <template v-if="authStore.isTeacher">
              <button
                @click="endLiveSession(session.id)"
                class="p-2.5 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors"
                title="Kết thúc phiên"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              </button>
              <button
                @click="deleteLiveSession(session.id)"
                class="p-2.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                title="Xóa phiên"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Classes Section -->
      <div class="lg:col-span-2 space-y-6">
        <div class="rounded-2xl border border-border bg-card overflow-hidden">
          <div class="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 class="text-lg font-semibold text-foreground">Lớp học của bạn</h2>
              <p class="text-sm text-muted-foreground">Các lớp bạn đang {{ authStore.isTeacher ? 'giảng dạy' : 'tham gia' }}</p>
            </div>
            <NuxtLink to="/classes" class="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
              Xem tất cả
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14m-7-7 7 7-7 7"/>
              </svg>
            </NuxtLink>
          </div>
          
          <div class="p-6">
            <div v-if="isLoading" class="grid gap-4 md:grid-cols-2">
              <div v-for="i in 4" :key="i" class="h-32 rounded-xl bg-muted animate-pulse" />
            </div>
            
            <div v-else-if="!classesStore.classes || classesStore.classes.length === 0" class="py-12 text-center">
              <div class="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2v-5"/>
                </svg>
              </div>
              <h3 class="font-semibold text-foreground">Chưa có lớp học nào</h3>
              <p class="text-sm text-muted-foreground mt-1 mb-4">
                {{ authStore.isTeacher ? 'Tạo lớp học đầu tiên của bạn' : 'Tham gia một lớp học để bắt đầu' }}
              </p>
              <NuxtLink 
                :to="authStore.isTeacher ? '/classes/create' : '/classes/join'"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14m-7-7h14"/>
                </svg>
                {{ authStore.isTeacher ? 'Tạo lớp học' : 'Tham gia lớp' }}
              </NuxtLink>
            </div>
            
            <div v-else class="grid gap-4 md:grid-cols-2">
              <NuxtLink
                v-for="classItem in classesStore.classes.slice(0, 4)"
                :key="classItem.id"
                :to="`/classes/${classItem.id}`"
                class="group relative rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all duration-200"
              >
                <!-- Live Badge -->
                <div v-if="classItem.hasActiveLiveSession" class="absolute top-3 right-3">
                  <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span class="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                    </span>
                    LIVE
                  </span>
                </div>
                
                <div class="flex items-start gap-4">
                  <div 
                    class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-white font-bold text-xl"
                    :style="{ background: `linear-gradient(135deg, hsl(${(classItem.id * 137) % 360}, 70%, 50%), hsl(${(classItem.id * 137 + 30) % 360}, 70%, 40%))` }"
                  >
                    {{ classItem.name.charAt(0) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {{ classItem.name }}
                    </h3>
                    <p class="text-sm text-muted-foreground truncate">
                      {{ classItem.teacher?.fullName }}
                    </p>
                    <div class="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                        </svg>
                        {{ classItem.memberCount || 0 }}
                      </span>
                      <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {{ classItem.assignmentCount || 0 }} bài tập
                      </span>
                    </div>
                  </div>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Upcoming Assignments -->
        <div class="rounded-2xl border border-border bg-card overflow-hidden">
          <div class="p-5 border-b border-border">
            <h2 class="font-semibold text-foreground flex items-center gap-2">
              <svg class="w-5 h-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
              Bài tập sắp đến hạn
            </h2>
          </div>
          
          <div class="p-4">
            <div v-if="isLoading" class="space-y-3">
              <div v-for="i in 3" :key="i" class="h-16 rounded-lg bg-muted animate-pulse" />
            </div>
            
            <div v-else-if="!assignmentsStore.upcomingAssignments || assignmentsStore.upcomingAssignments.length === 0" class="py-8 text-center">
              <div class="w-12 h-12 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                <svg class="w-6 h-6 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <p class="text-sm text-muted-foreground">Tuyệt vời! Bạn đã hoàn thành tất cả</p>
            </div>
            
            <div v-else class="space-y-3">
              <NuxtLink
                v-for="assignment in (assignmentsStore.upcomingAssignments as Assignment[]).slice(0, 4)"
                :key="assignment.id"
                :to="`/assignments/${assignment.id}`"
                class="block rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-foreground truncate">{{ assignment.title }}</p>
                    <p class="text-xs text-muted-foreground mt-1 truncate">{{ assignment.class?.name }}</p>
                  </div>
                  <span
                    v-if="assignment.deadline"
                    class="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full"
                    :class="getUrgencyColor(assignment.deadline)"
                  >
                    {{ formatDueDate(assignment.deadline) }}
                  </span>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Active Live Sessions -->
        <div class="rounded-2xl border border-border bg-card overflow-hidden">
          <div class="p-5 border-b border-border">
            <h2 class="font-semibold text-foreground flex items-center gap-2">
              <span class="relative flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
              </span>
              Đang diễn ra
            </h2>
          </div>
          
          <div class="p-4">
            <div v-if="isLoading" class="space-y-3">
              <div v-for="i in 2" :key="i" class="h-16 rounded-lg bg-muted animate-pulse" />
            </div>
            
            <div v-else-if="!liveSessionsStore.activeSessions || liveSessionsStore.activeSessions.length === 0" class="py-8 text-center">
              <div class="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                <svg class="w-6 h-6 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              </div>
              <p class="text-sm text-muted-foreground">Không có buổi học trực tiếp</p>
            </div>
            
            <div v-else class="space-y-3">
              <NuxtLink
                v-for="session in liveSessionsStore.activeSessions.slice(0, 3)"
                :key="session.id"
                :to="`/live/${session.id}`"
                class="block rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 p-4 hover:from-green-500/15 hover:to-emerald-500/15 transition-all"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-foreground truncate">{{ session.title }}</p>
                    <p class="text-xs text-muted-foreground truncate">
                      {{ session.class?.name }} • {{ session.participantCount || 0 }} người
                    </p>
                  </div>
                  <div class="flex-shrink-0">
                    <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-medium">
                      Tham gia
                    </span>
                  </div>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
