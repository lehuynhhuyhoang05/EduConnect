<script setup lang="ts">
/**
 * Class Attendance Manager Component
 * ===================================
 * Quản lý và xem lịch sử điểm danh của lớp học
 * - Xem danh sách các phiên live đã điểm danh
 * - Xem chi tiết điểm danh từng phiên
 * - Xem tổng hợp điểm danh của sinh viên
 * - GV có thể chỉnh sửa, SV chỉ xem
 */

interface Member {
  id: number
  userId: number
  fullName?: string
  user?: { fullName: string; email: string }
  role: string
}

interface LiveSession {
  id: number
  title: string
  startTime: string
  endTime?: string
  status: string
}

interface AttendanceRecord {
  id: string
  sessionId: number
  userId: number
  userName?: string
  status: 'present' | 'late' | 'absent' | 'excused'
  checkInTime?: string
  checkInMethod?: string
  notes?: string
}

interface SessionAttendance {
  session: LiveSession
  records: AttendanceRecord[]
  presentCount: number
  lateCount: number
  absentCount: number
}

const props = defineProps<{
  classId: number
  members: Member[]
}>()

const { toast } = useToast()
const authStore = useAuthStore()
const api = useApi()

// State
const sessionsWithAttendance = ref<SessionAttendance[]>([])
const selectedSession = ref<SessionAttendance | null>(null)
const isLoading = ref(false)
const showSessionDetail = ref(false)
const viewMode = ref<'sessions' | 'summary'>('sessions')

// Is teacher?
const isTeacher = computed(() => authStore.isTeacher)

// Current user's attendance (for students)
const myUserId = computed(() => authStore.user?.id)

// Students only (filter out teachers)
const students = computed(() => 
  props.members.filter(m => m.role === 'STUDENT')
)

// Summary statistics per student
const studentSummary = computed(() => {
  const summary: Record<number, { present: number; late: number; absent: number; excused: number; total: number }> = {}
  
  // Initialize for all students
  students.value.forEach(s => {
    const userId = s.userId || s.id
    summary[userId] = { present: 0, late: 0, absent: 0, excused: 0, total: 0 }
  })
  
  // Calculate from all sessions
  sessionsWithAttendance.value.forEach(sa => {
    sa.records.forEach(record => {
      const stat = summary[record.userId]
      if (stat) {
        stat[record.status]++
        stat.total++
      }
    })
  })
  
  return summary
})

// My attendance summary (for students)
const myAttendanceSummary = computed(() => {
  if (!myUserId.value) return null
  return studentSummary.value[myUserId.value] || { present: 0, late: 0, absent: 0, excused: 0, total: 0 }
})

// Attendance rate for a student
const getAttendanceRate = (userId: number) => {
  const stats = studentSummary.value[userId]
  if (!stats || sessionsWithAttendance.value.length === 0) return 0
  return Math.round(((stats.present + stats.late) / sessionsWithAttendance.value.length) * 100)
}

// Fetch all sessions with attendance for this class
const fetchAttendanceHistory = async () => {
  isLoading.value = true
  try {
    // Fetch all ended live sessions for this class
    const sessions = await api.get<LiveSession[]>(`/sessions`, {
      params: { classId: props.classId }
    })
    
    // Filter to only ended sessions
    const endedSessions = sessions.filter(s => s.status === 'ended' || s.endTime)
    
    // Fetch attendance for each session
    const results: SessionAttendance[] = []
    for (const session of endedSessions) {
      try {
        const response = await api.get<{ records: AttendanceRecord[] }>(
          `/sessions/${session.id}/attendance`
        )
        
        if (response.records && response.records.length > 0) {
          results.push({
            session,
            records: response.records,
            presentCount: response.records.filter(r => r.status === 'present').length,
            lateCount: response.records.filter(r => r.status === 'late').length,
            absentCount: response.records.filter(r => r.status === 'absent' || !r.status).length,
          })
        }
      } catch (e) {
        // Session doesn't have attendance - skip
      }
    }
    
    // Sort by date descending
    results.sort((a, b) => 
      new Date(b.session.startTime).getTime() - new Date(a.session.startTime).getTime()
    )
    
    sessionsWithAttendance.value = results
  } catch (e: any) {
    toast.error('Không thể tải lịch sử điểm danh')
  } finally {
    isLoading.value = false
  }
}

// View session detail
const viewSession = (sa: SessionAttendance) => {
  selectedSession.value = sa
  showSessionDetail.value = true
}

// Update attendance manually (teacher only)
const updateAttendance = async (sessionId: number, userId: number, status: AttendanceRecord['status']) => {
  try {
    await api.post(`/sessions/${sessionId}/attendance/manual`, {
      userId,
      status
    })
    
    // Refresh data
    await fetchAttendanceHistory()
    
    // Update selected session if viewing
    if (selectedSession.value?.session.id === sessionId) {
      selectedSession.value = sessionsWithAttendance.value.find(
        sa => sa.session.id === sessionId
      ) || null
    }
    
    toast.success('Đã cập nhật điểm danh')
  } catch (e: any) {
    toast.error(e.message || 'Không thể cập nhật')
  }
}

// Export to CSV
const exportToCSV = () => {
  if (sessionsWithAttendance.value.length === 0) {
    toast.error('Không có dữ liệu để xuất')
    return
  }
  
  // Build CSV content
  let csv = 'Họ tên,Email'
  sessionsWithAttendance.value.forEach(sa => {
    csv += `,"${formatDate(sa.session.startTime)}"`
  })
  csv += ',Có mặt,Đi muộn,Vắng,Tỷ lệ\n'
  
  students.value.forEach(student => {
    const userId = student.userId || student.id
    const name = student.user?.fullName || student.fullName || 'N/A'
    const email = student.user?.email || ''
    
    csv += `"${name}","${email}"`
    
    sessionsWithAttendance.value.forEach(sa => {
      const record = sa.records.find(r => r.userId === userId)
      const statusText = record ? getStatusLabel(record.status) : 'Vắng'
      csv += `,"${statusText}"`
    })
    
    const stats = studentSummary.value[userId]
    csv += `,${stats?.present || 0},${stats?.late || 0},${stats?.absent || 0},${getAttendanceRate(userId)}%\n`
  })
  
  // Download
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `diem-danh-lop-${props.classId}.csv`
  a.click()
  URL.revokeObjectURL(url)
  
  toast.success('Đã xuất file CSV')
}

// Helpers
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'present': return 'Có mặt'
    case 'late': return 'Đi muộn'
    case 'absent': return 'Vắng'
    case 'excused': return 'Có phép'
    default: return status
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'present': return 'text-green-600 bg-green-100 dark:bg-green-500/20'
    case 'late': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-500/20'
    case 'absent': return 'text-red-600 bg-red-100 dark:bg-red-500/20'
    case 'excused': return 'text-blue-600 bg-blue-100 dark:bg-blue-500/20'
    default: return 'text-gray-600 bg-gray-100'
  }
}

// Get student's record for a session
const getStudentRecord = (sessionId: number, userId: number) => {
  const sa = sessionsWithAttendance.value.find(s => s.session.id === sessionId)
  return sa?.records.find(r => r.userId === userId)
}

// Fetch on mount
onMounted(() => {
  fetchAttendanceHistory()
})
</script>

<template>
  <div class="attendance-manager">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold">Lịch sử điểm danh</h2>
        <p class="text-sm text-muted-foreground">
          {{ sessionsWithAttendance.length }} phiên đã điểm danh
        </p>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- View mode toggle -->
        <div class="flex rounded-lg border p-1">
          <button
            class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
            :class="viewMode === 'sessions' ? 'bg-primary text-white' : 'hover:bg-muted'"
            @click="viewMode = 'sessions'"
          >
            Theo buổi
          </button>
          <button
            class="px-3 py-1.5 rounded text-sm font-medium transition-colors"
            :class="viewMode === 'summary' ? 'bg-primary text-white' : 'hover:bg-muted'"
            @click="viewMode = 'summary'"
          >
            Tổng hợp
          </button>
        </div>
        
        <!-- Export button (teacher only) -->
        <button
          v-if="isTeacher && sessionsWithAttendance.length > 0"
          class="px-4 py-2 rounded-lg border hover:bg-muted transition-colors flex items-center gap-2"
          @click="exportToCSV"
        >
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Xuất CSV
        </button>
        
        <!-- Refresh button -->
        <button
          class="p-2 rounded-lg border hover:bg-muted transition-colors"
          :class="{ 'animate-spin': isLoading }"
          @click="fetchAttendanceHistory"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Info box explaining how attendance works -->
    <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
      <div class="flex gap-3 items-start">
        <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
        <div class="text-sm text-blue-700 dark:text-blue-300">
          <p class="font-medium">Cách thức điểm danh</p>
          <ul class="mt-1 text-xs space-y-1 text-blue-600 dark:text-blue-400">
            <li>• <strong>Trong phiên live:</strong> Giảng viên bấm nút "Điểm danh" để bắt đầu</li>
            <li>• <strong>Mã số:</strong> Giảng viên hiển thị mã, sinh viên nhập mã để điểm danh</li>
            <li>• <strong>QR Code:</strong> Giảng viên hiển thị QR, sinh viên quét để điểm danh</li>
            <li>• <strong>Thủ công:</strong> Giảng viên điểm danh từng sinh viên</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Student's own summary (for students) -->
    <div v-if="!isTeacher && myAttendanceSummary" class="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
      <h3 class="font-semibold mb-3">Điểm danh của bạn</h3>
      <div class="grid grid-cols-4 gap-4">
        <div class="text-center">
          <p class="text-2xl font-bold text-green-600">{{ myAttendanceSummary.present }}</p>
          <p class="text-xs text-muted-foreground">Có mặt</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-yellow-600">{{ myAttendanceSummary.late }}</p>
          <p class="text-xs text-muted-foreground">Đi muộn</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-red-600">{{ myAttendanceSummary.absent }}</p>
          <p class="text-xs text-muted-foreground">Vắng</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary">
            {{ sessionsWithAttendance.length > 0 ? getAttendanceRate(myUserId!) : 0 }}%
          </p>
          <p class="text-xs text-muted-foreground">Tỷ lệ</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading && sessionsWithAttendance.length === 0" class="text-center py-12">
      <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-muted-foreground">Đang tải...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="sessionsWithAttendance.length === 0" class="text-center py-12">
      <svg class="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      <p class="text-lg font-medium text-muted-foreground">Chưa có điểm danh nào</p>
      <p class="text-sm text-muted-foreground mt-1">
        Điểm danh sẽ được ghi lại từ các phiên live
      </p>
    </div>

    <!-- Sessions list view -->
    <div v-else-if="viewMode === 'sessions'" class="space-y-3">
      <div
        v-for="sa in sessionsWithAttendance"
        :key="sa.session.id"
        class="p-4 border rounded-xl hover:border-primary/50 transition-colors cursor-pointer"
        @click="viewSession(sa)"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold">{{ sa.session.title }}</h3>
            <p class="text-sm text-muted-foreground">{{ formatDate(sa.session.startTime) }}</p>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-3 text-sm">
              <span class="text-green-600">{{ sa.presentCount }} có mặt</span>
              <span class="text-yellow-600">{{ sa.lateCount }} muộn</span>
              <span class="text-red-600">{{ sa.absentCount }} vắng</span>
            </div>
            <svg class="w-5 h-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary view (all students, all sessions) -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b">
            <th class="text-left p-3 font-medium sticky left-0 bg-background">Sinh viên</th>
            <th 
              v-for="sa in sessionsWithAttendance" 
              :key="sa.session.id"
              class="p-3 font-medium text-center min-w-[100px]"
            >
              <div class="text-xs">{{ formatDate(sa.session.startTime).split(' ')[0] }}</div>
            </th>
            <th class="p-3 font-medium text-center">Có mặt</th>
            <th class="p-3 font-medium text-center">Muộn</th>
            <th class="p-3 font-medium text-center">Vắng</th>
            <th class="p-3 font-medium text-center">Tỷ lệ</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="student in students" 
            :key="student.userId || student.id"
            class="border-b hover:bg-muted/50"
          >
            <td class="p-3 sticky left-0 bg-background">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                  {{ (student.user?.fullName || student.fullName || '?').charAt(0) }}
                </div>
                <span>{{ student.user?.fullName || student.fullName }}</span>
              </div>
            </td>
            <td 
              v-for="sa in sessionsWithAttendance" 
              :key="sa.session.id"
              class="p-3 text-center"
            >
              <span 
                class="px-2 py-1 rounded text-xs font-medium"
                :class="getStatusColor(getStudentRecord(sa.session.id, student.userId || student.id)?.status || 'absent')"
              >
                {{ getStatusLabel(getStudentRecord(sa.session.id, student.userId || student.id)?.status || 'absent') }}
              </span>
            </td>
            <td class="p-3 text-center font-medium text-green-600">
              {{ studentSummary[student.userId || student.id]?.present || 0 }}
            </td>
            <td class="p-3 text-center font-medium text-yellow-600">
              {{ studentSummary[student.userId || student.id]?.late || 0 }}
            </td>
            <td class="p-3 text-center font-medium text-red-600">
              {{ studentSummary[student.userId || student.id]?.absent || 0 }}
            </td>
            <td class="p-3 text-center">
              <span 
                class="font-medium"
                :class="getAttendanceRate(student.userId || student.id) >= 80 ? 'text-green-600' : getAttendanceRate(student.userId || student.id) >= 50 ? 'text-yellow-600' : 'text-red-600'"
              >
                {{ getAttendanceRate(student.userId || student.id) }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Session Detail Modal -->
    <Transition name="fade">
      <div v-if="showSessionDetail && selectedSession" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showSessionDetail = false" />
        <div class="relative bg-background rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
          <!-- Header -->
          <div class="p-4 border-b flex items-center justify-between">
            <div>
              <h3 class="font-semibold">{{ selectedSession.session.title }}</h3>
              <p class="text-sm text-muted-foreground">{{ formatDate(selectedSession.session.startTime) }}</p>
            </div>
            <button 
              class="p-2 rounded-lg hover:bg-muted transition-colors"
              @click="showSessionDetail = false"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <!-- Stats -->
          <div class="grid grid-cols-4 gap-4 p-4 border-b">
            <div class="text-center">
              <p class="text-2xl font-bold text-green-600">{{ selectedSession.presentCount }}</p>
              <p class="text-xs text-muted-foreground">Có mặt</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-yellow-600">{{ selectedSession.lateCount }}</p>
              <p class="text-xs text-muted-foreground">Đi muộn</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-red-600">{{ selectedSession.absentCount }}</p>
              <p class="text-xs text-muted-foreground">Vắng</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-primary">{{ students.length }}</p>
              <p class="text-xs text-muted-foreground">Tổng SV</p>
            </div>
          </div>
          
          <!-- Records list -->
          <div class="max-h-[400px] overflow-y-auto">
            <div
              v-for="student in students"
              :key="student.userId || student.id"
              class="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/50"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium">
                  {{ (student.user?.fullName || student.fullName || '?').charAt(0) }}
                </div>
                <div>
                  <p class="font-medium">{{ student.user?.fullName || student.fullName }}</p>
                  <p class="text-xs text-muted-foreground">{{ student.user?.email }}</p>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <!-- Status badge -->
                <span 
                  class="px-3 py-1 rounded-full text-sm font-medium"
                  :class="getStatusColor(getStudentRecord(selectedSession.session.id, student.userId || student.id)?.status || 'absent')"
                >
                  {{ getStatusLabel(getStudentRecord(selectedSession.session.id, student.userId || student.id)?.status || 'absent') }}
                </span>
                
                <!-- Edit dropdown (teacher only) -->
                <div v-if="isTeacher" class="relative group">
                  <button class="p-2 rounded-lg hover:bg-muted transition-colors">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="1"/>
                      <circle cx="12" cy="5" r="1"/>
                      <circle cx="12" cy="19" r="1"/>
                    </svg>
                  </button>
                  <div class="absolute right-0 top-full mt-1 w-32 bg-popover border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <button
                      v-for="status in ['present', 'late', 'absent', 'excused'] as const"
                      :key="status"
                      class="w-full px-3 py-2 text-left text-sm hover:bg-accent first:rounded-t-lg last:rounded-b-lg"
                      @click="updateAttendance(selectedSession.session.id, student.userId || student.id, status)"
                    >
                      {{ getStatusLabel(status) }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
