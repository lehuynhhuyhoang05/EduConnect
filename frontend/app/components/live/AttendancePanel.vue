<script setup lang="ts">
/**
 * Attendance Panel Component (Socket-based)
 * ==========================================
 * Panel điểm danh cho live session sử dụng WebSocket real-time
 * - Teacher: Bắt đầu/đóng điểm danh, xem code/QR, điểm danh thủ công
 * - Student: Nhập code điểm danh, xem trạng thái
 */

interface AttendanceRecord {
  userId: number
  userName?: string
  status: string
  checkInTime?: string
}

const props = defineProps<{
  sessionId: number
  isHost: boolean
  participants: Array<{ userId: number; userName: string }>
}>()

const emit = defineEmits<{
  attendanceUpdated: [records: AttendanceRecord[]]
}>()

// Get composables
const { toast } = useToast()
const liveSocket = useLiveSocket()

// Room ID
const roomId = computed(() => `session-${props.sessionId}`)

// Attendance state
const isOpen = ref(false)
const currentCode = ref<string | null>(null)
const method = ref<'code' | 'manual' | 'auto'>('code')
const records = ref<AttendanceRecord[]>([])
const isLoading = ref(false)

// Local state
const showQRCode = ref(false)
const studentCode = ref('')
const selectedMethod = ref<'code' | 'manual'>('code')
const hasCheckedIn = ref(false)

// Computed
const presentCount = computed(() => records.value.filter(r => r.status === 'present').length)
const lateCount = computed(() => records.value.filter(r => r.status === 'late').length)
const absentCount = computed(() => records.value.filter(r => r.status === 'absent').length)

// QR Code URL
const qrCodeUrl = computed(() => {
  if (!currentCode.value) return ''
  const data = JSON.stringify({
    type: 'attendance',
    sessionId: props.sessionId,
    code: currentCode.value,
  })
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`
})

// Setup socket event listeners
onMounted(async () => {
  // Listen for attendance started
  liveSocket.onAttendanceStarted.value = (data) => {
    console.log('Attendance started event:', data)
    isOpen.value = data.isOpen
    currentCode.value = data.code || null
    method.value = data.method as any
    toast.success('Giảng viên đã mở điểm danh!')
  }
  
  // Listen for attendance closed
  liveSocket.onAttendanceClosed.value = (data) => {
    console.log('Attendance closed event:', data)
    isOpen.value = false
    currentCode.value = null
    toast.info('Điểm danh đã đóng')
  }
  
  // Listen for check-ins
  liveSocket.onAttendanceCheckedIn.value = (data) => {
    console.log('Attendance checked in event:', data)
    // Update records
    const existingIndex = records.value.findIndex(r => r.userId === data.userId)
    if (existingIndex >= 0) {
      records.value[existingIndex] = {
        userId: data.userId,
        userName: data.userName,
        status: data.status,
        checkInTime: data.timestamp,
      }
    } else {
      records.value.push({
        userId: data.userId,
        userName: data.userName,
        status: data.status,
        checkInTime: data.timestamp,
      })
    }
    emit('attendanceUpdated', records.value)
  }
  
  // Fetch current attendance status
  await fetchAttendanceStatus()
})

// Cleanup
onUnmounted(() => {
  liveSocket.onAttendanceStarted.value = null
  liveSocket.onAttendanceClosed.value = null
  liveSocket.onAttendanceCheckedIn.value = null
})

// Fetch current status
const fetchAttendanceStatus = async () => {
  isLoading.value = true
  try {
    const result = await liveSocket.getAttendanceStatus(roomId.value)
    if (result.success) {
      isOpen.value = result.isOpen || false
      currentCode.value = result.code || null
      method.value = (result.method as any) || 'code'
      if (result.records) {
        records.value = result.records
      }
    }
  } catch (e) {
    console.error('Failed to fetch attendance status:', e)
  } finally {
    isLoading.value = false
  }
}

// Start attendance (teacher)
const handleStartAttendance = async () => {
  isLoading.value = true
  try {
    const result = await liveSocket.startAttendance(roomId.value, selectedMethod.value)
    if (result.success) {
      isOpen.value = true
      currentCode.value = result.code || null
      method.value = selectedMethod.value
      toast.success('Đã bắt đầu điểm danh')
    } else {
      toast.error('Không thể bắt đầu điểm danh')
    }
  } catch (e: any) {
    toast.error(e.message || 'Lỗi bắt đầu điểm danh')
  } finally {
    isLoading.value = false
  }
}

// Close attendance (teacher)
const handleCloseAttendance = async () => {
  isLoading.value = true
  try {
    const result = await liveSocket.closeAttendance(roomId.value)
    if (result.success) {
      isOpen.value = false
      currentCode.value = null
      toast.success('Đã đóng điểm danh')
    }
  } catch (e: any) {
    toast.error(e.message || 'Lỗi đóng điểm danh')
  } finally {
    isLoading.value = false
  }
}

// Student check-in
const handleCheckIn = async () => {
  if (!studentCode.value.trim()) {
    toast.error('Vui lòng nhập mã điểm danh')
    return
  }
  
  isLoading.value = true
  try {
    const result = await liveSocket.checkInAttendance(roomId.value, studentCode.value.trim())
    if (result.success) {
      hasCheckedIn.value = true
      studentCode.value = ''
      toast.success('Điểm danh thành công!')
    } else {
      toast.error(result.error || 'Mã điểm danh không đúng')
    }
  } catch (e: any) {
    toast.error(e.message || 'Lỗi điểm danh')
  } finally {
    isLoading.value = false
  }
}

// Manual check-in (teacher)
const handleManualCheckIn = async (userId: number, status: string) => {
  const participant = props.participants.find(p => p.userId === userId)
  try {
    const result = await liveSocket.manualAttendance(
      roomId.value, 
      userId, 
      status,
      participant?.userName
    )
    if (result.success) {
      toast.success('Đã cập nhật điểm danh')
    }
  } catch (e: any) {
    toast.error(e.message || 'Không thể cập nhật')
  }
}

// Copy code
const copyCode = async () => {
  if (currentCode.value) {
    await navigator.clipboard.writeText(currentCode.value)
    toast.success('Đã sao chép mã điểm danh')
  }
}

// Helpers
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'present': return 'Có mặt'
    case 'late': return 'Đi muộn'
    case 'absent': return 'Vắng'
    case 'excused': return 'Có phép'
    default: return status
  }
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'present': return 'success'
    case 'late': return 'warning'
    case 'absent': return 'destructive'
    case 'excused': return 'secondary'
    default: return 'outline'
  }
}

const getParticipantRecord = (userId: number) => {
  return records.value.find(r => r.userId === userId)
}
</script>

<template>
  <div class="attendance-panel">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <svg class="w-5 h-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Điểm danh
      </h3>
      
      <UiBadge v-if="isOpen" variant="success">
        Đang mở
      </UiBadge>
      <UiBadge v-else variant="secondary">
        Chưa bắt đầu
      </UiBadge>
    </div>

    <!-- Teacher View -->
    <template v-if="isHost">
      <!-- Not started yet -->
      <div v-if="!isOpen" class="space-y-4">
        <div class="space-y-3">
          <div>
            <label class="text-sm font-medium">Phương thức điểm danh</label>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <button
                v-for="m in [
                  { value: 'code', label: 'Mã code/QR', icon: '🔢' },
                  { value: 'manual', label: 'Thủ công', icon: '✋' },
                ]"
                :key="m.value"
                class="px-3 py-2 rounded-lg border text-sm transition-colors"
                :class="selectedMethod === m.value 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-input hover:bg-accent'"
                @click="selectedMethod = m.value as any"
              >
                <span>{{ m.icon }}</span>
                <span class="ml-1">{{ m.label }}</span>
              </button>
            </div>
          </div>
        </div>
        
        <UiButton 
          class="w-full" 
          :loading="isLoading"
          @click="handleStartAttendance"
        >
          <svg class="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Bắt đầu điểm danh
        </UiButton>
      </div>

      <!-- Attendance in progress -->
      <div v-else class="space-y-4">
        <!-- Code & QR display -->
        <div v-if="currentCode" class="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <!-- Toggle between Code and QR -->
          <div class="flex gap-2 mb-3">
            <button
              class="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              :class="!showQRCode ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/80'"
              @click="showQRCode = false"
            >
              🔢 Mã số
            </button>
            <button
              class="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              :class="showQRCode ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/80'"
              @click="showQRCode = true"
            >
              📱 QR Code
            </button>
          </div>

          <!-- Code Display -->
          <div v-if="!showQRCode" class="text-center">
            <p class="text-sm text-muted-foreground mb-2">Mã điểm danh:</p>
            <div class="flex items-center justify-center gap-3">
              <span class="text-4xl font-bold font-mono tracking-widest text-primary">
                {{ currentCode }}
              </span>
              <UiButton variant="ghost" size="sm" @click="copyCode">
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </UiButton>
            </div>
            <p class="text-xs text-muted-foreground mt-2">Cho sinh viên nhập mã này để điểm danh</p>
          </div>

          <!-- QR Code Display -->
          <div v-else class="text-center">
            <p class="text-sm text-muted-foreground mb-2">Quét mã QR để điểm danh:</p>
            <div class="inline-flex bg-white p-3 rounded-xl border">
              <img
                :src="qrCodeUrl"
                alt="QR Code điểm danh"
                class="w-40 h-40"
              />
            </div>
            <p class="text-xs text-muted-foreground mt-2">Sinh viên quét mã này bằng điện thoại</p>
          </div>
        </div>

        <!-- Statistics -->
        <div class="grid grid-cols-4 gap-2 text-center">
          <div class="bg-green-500/10 rounded-lg p-2">
            <p class="text-2xl font-bold text-green-600">{{ presentCount }}</p>
            <p class="text-xs text-muted-foreground">Có mặt</p>
          </div>
          <div class="bg-yellow-500/10 rounded-lg p-2">
            <p class="text-2xl font-bold text-yellow-600">{{ lateCount }}</p>
            <p class="text-xs text-muted-foreground">Đi muộn</p>
          </div>
          <div class="bg-red-500/10 rounded-lg p-2">
            <p class="text-2xl font-bold text-red-600">{{ absentCount }}</p>
            <p class="text-xs text-muted-foreground">Vắng</p>
          </div>
          <div class="bg-gray-500/10 rounded-lg p-2">
            <p class="text-2xl font-bold text-gray-600">{{ participants.length }}</p>
            <p class="text-xs text-muted-foreground">Tổng</p>
          </div>
        </div>

        <!-- Participant list -->
        <div class="border rounded-lg divide-y max-h-64 overflow-y-auto">
          <div
            v-for="participant in participants"
            :key="participant.userId"
            class="flex items-center justify-between p-3 hover:bg-accent/50"
          >
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                {{ participant.userName?.charAt(0) || '?' }}
              </div>
              <span class="text-sm">{{ participant.userName }}</span>
            </div>
            
            <div class="flex items-center gap-2">
              <UiBadge 
                v-if="getParticipantRecord(participant.userId)"
                :variant="getStatusVariant(getParticipantRecord(participant.userId)!.status)"
              >
                {{ getStatusLabel(getParticipantRecord(participant.userId)!.status) }}
              </UiBadge>
              
              <!-- Manual check-in dropdown -->
              <div class="relative group">
                <button class="p-1 rounded hover:bg-accent">
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="12" cy="5" r="1"/>
                    <circle cx="12" cy="19" r="1"/>
                  </svg>
                </button>
                <div class="absolute right-0 top-full mt-1 w-32 bg-popover border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <button
                    v-for="status in ['present', 'late', 'absent', 'excused']"
                    :key="status"
                    class="w-full px-3 py-2 text-left text-sm hover:bg-accent first:rounded-t-lg last:rounded-b-lg"
                    @click="handleManualCheckIn(participant.userId, status)"
                  >
                    {{ getStatusLabel(status) }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Close button -->
        <UiButton 
          variant="destructive" 
          class="w-full"
          :loading="isLoading"
          @click="handleCloseAttendance"
        >
          Đóng điểm danh
        </UiButton>
      </div>
    </template>

    <!-- Student View -->
    <template v-else>
      <div v-if="!isOpen" class="text-center py-8 text-muted-foreground">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <p>Điểm danh chưa bắt đầu</p>
        <p class="text-sm">Chờ giảng viên mở điểm danh</p>
      </div>

      <div v-else-if="hasCheckedIn" class="text-center py-8">
        <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p class="font-medium text-green-600">Đã điểm danh thành công!</p>
      </div>

      <div v-else class="space-y-4">
        <div class="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
          <p class="text-sm text-green-700 dark:text-green-300 font-medium">
            ✅ Giảng viên đã mở điểm danh!
          </p>
          <p class="text-xs text-green-600 dark:text-green-400 mt-1">
            Nhập mã điểm danh bên dưới
          </p>
        </div>
        
        <div class="flex gap-2">
          <input
            v-model="studentCode"
            type="text"
            placeholder="Nhập mã 6 số"
            maxlength="6"
            class="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-center text-xl font-mono tracking-widest uppercase"
            @keyup.enter="handleCheckIn"
          />
        </div>
        
        <UiButton 
          class="w-full" 
          :loading="isLoading"
          :disabled="!studentCode.trim()"
          @click="handleCheckIn"
        >
          Điểm danh
        </UiButton>
      </div>
    </template>
  </div>
</template>
