/**
 * Live Session Features Composables
 * ================================
 * - Attendance Tracking
 * - Recording
 * - Waiting Room
 */

// ==================== TYPES ====================

// Attendance Types
export interface AttendanceRecord {
  id: string
  sessionId: number
  userId: number
  userName?: string
  status: 'present' | 'late' | 'absent' | 'excused'
  joinTime?: string
  leaveTime?: string
  totalTimeMinutes: number
  checkInMethod: 'auto' | 'code' | 'manual' | 'face'
  verifiedAt?: string
  notes?: string
  lateByMinutes?: number
}

export interface AttendanceSession {
  id: string
  sessionId: number
  classId: number
  startTime: string
  endTime?: string
  status: 'pending' | 'open' | 'closed'
  checkInCode?: string
  codeExpiresAt?: string
  records: AttendanceRecord[]
}

export interface AttendanceSettings {
  method: 'auto' | 'code' | 'manual'
  lateThresholdMinutes: number
  allowLateCheckIn: boolean
}

export interface AttendanceSummary {
  totalStudents: number
  present: number
  late: number
  absent: number
  excused: number
  attendanceRate: number
}

// Recording Types
export interface RecordingInfo {
  id: string
  sessionId: number
  startedAt: string
  endedAt?: string
  status: 'recording' | 'processing' | 'ready' | 'failed'
  durationSeconds?: number
  fileUrl?: string
  fileSize?: number
  recordedBy: number
  thumbnailUrl?: string
}

// Waiting Room Types
export interface WaitingUser {
  id: string
  userId: number
  userName: string
  email?: string
  avatar?: string
  joinRequestedAt: string
  status: 'waiting' | 'admitted' | 'denied'
  deniedReason?: string
}

export interface WaitingRoomSettings {
  enabled: boolean
  autoAdmitMembers: boolean
  autoAdmitTeachers: boolean
  requireApproval: boolean
}

// ==================== ATTENDANCE COMPOSABLE ====================

export function useAttendance(sessionId: Ref<number>) {
  const api = useApi()
  
  const attendanceSession = ref<AttendanceSession | null>(null)
  const records = ref<AttendanceRecord[]>([])
  const summary = ref<AttendanceSummary | null>(null)
  const currentCode = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Computed
  const isOpen = computed(() => attendanceSession.value?.status === 'open')
  const presentCount = computed(() => records.value.filter(r => r.status === 'present').length)
  const lateCount = computed(() => records.value.filter(r => r.status === 'late').length)
  const absentCount = computed(() => records.value.filter(r => r.status === 'absent').length)
  
  // Start attendance tracking (Teacher only)
  const startAttendance = async (settings?: Partial<AttendanceSettings>) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post<AttendanceSession>(
        `/sessions/${sessionId.value}/attendance/start`,
        settings
      )
      attendanceSession.value = response
      currentCode.value = response.checkInCode || null
      return response
    } catch (e: any) {
      error.value = e.message || 'Không thể bắt đầu điểm danh'
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  // Close attendance tracking (Teacher only)
  const closeAttendance = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post<AttendanceSession>(
        `/sessions/${sessionId.value}/attendance/close`
      )
      attendanceSession.value = response
      currentCode.value = null
      return response
    } catch (e: any) {
      error.value = e.message || 'Không thể đóng điểm danh'
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  // Get current check-in code (Teacher only)
  const getCheckInCode = async () => {
    try {
      const response = await api.get<{ code: string; expiresAt: string }>(
        `/sessions/${sessionId.value}/attendance/code`
      )
      currentCode.value = response.code
      return response
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }
  
  // Check-in with code (Student)
  const checkInWithCode = async (code: string) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post<{ success: boolean; record: AttendanceRecord }>(
        `/sessions/${sessionId.value}/attendance/check-in`,
        { code }
      )
      return response
    } catch (e: any) {
      error.value = e.message || 'Mã điểm danh không đúng'
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  // Manual check-in (Teacher only)
  const manualCheckIn = async (
    userId: number, 
    status: 'present' | 'late' | 'absent' | 'excused',
    notes?: string
  ) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post<AttendanceRecord>(
        `/sessions/${sessionId.value}/attendance/manual`,
        { userId, status, notes }
      )
      // Update local records
      const index = records.value.findIndex(r => r.userId === userId)
      if (index !== -1) {
        records.value[index] = response
      } else {
        records.value.push(response)
      }
      return response
    } catch (e: any) {
      error.value = e.message || 'Không thể cập nhật điểm danh'
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  // Get attendance records
  const fetchAttendance = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.get<{ records: AttendanceRecord[]; session?: AttendanceSession }>(
        `/sessions/${sessionId.value}/attendance`
      )
      records.value = response.records || []
      if (response.session) {
        attendanceSession.value = response.session
        currentCode.value = response.session.checkInCode || null
      }
      return response
    } catch (e: any) {
      // Not started yet - not an error
      records.value = []
    } finally {
      isLoading.value = false
    }
  }
  
  // Get attendance summary
  const fetchSummary = async () => {
    try {
      const response = await api.get<AttendanceSummary>(
        `/sessions/${sessionId.value}/attendance/summary`
      )
      summary.value = response
      return response
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }
  
  // Export attendance to CSV
  const exportAttendance = async () => {
    try {
      const response = await api.get<Blob>(
        `/sessions/${sessionId.value}/attendance/export`
      )
      // Download file
      const url = window.URL.createObjectURL(response)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance-${sessionId.value}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      error.value = e.message || 'Không thể xuất file'
      throw e
    }
  }
  
  return {
    // State
    attendanceSession,
    records,
    summary,
    currentCode,
    isLoading,
    error,
    // Computed
    isOpen,
    presentCount,
    lateCount,
    absentCount,
    // Actions
    startAttendance,
    closeAttendance,
    getCheckInCode,
    checkInWithCode,
    manualCheckIn,
    fetchAttendance,
    fetchSummary,
    exportAttendance,
  }
}

// ==================== RECORDING COMPOSABLE ====================

export function useRecording(sessionId: Ref<number>) {
  const api = useApi()
  
  const currentRecording = ref<RecordingInfo | null>(null)
  const recordings = ref<RecordingInfo[]>([])
  const isRecording = ref(false)
  const recordingDuration = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  let durationInterval: ReturnType<typeof setInterval> | null = null
  
  // Start recording (Teacher only)
  const startRecording = async (settings?: { quality?: 'low' | 'medium' | 'high' }) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post<RecordingInfo>(
        `/sessions/${sessionId.value}/recording/start`,
        settings
      )
      currentRecording.value = response
      isRecording.value = true
      recordingDuration.value = 0
      
      // Start duration counter
      durationInterval = setInterval(() => {
        recordingDuration.value++
      }, 1000)
      
      return response
    } catch (e: any) {
      error.value = e.message || 'Không thể bắt đầu ghi hình'
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  // Stop recording (Teacher only)
  const stopRecording = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post<RecordingInfo>(
        `/sessions/${sessionId.value}/recording/stop`
      )
      currentRecording.value = response
      isRecording.value = false
      
      // Stop duration counter
      if (durationInterval) {
        clearInterval(durationInterval)
        durationInterval = null
      }
      
      // Add to recordings list
      recordings.value.unshift(response)
      
      return response
    } catch (e: any) {
      error.value = e.message || 'Không thể dừng ghi hình'
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  // Get recording status
  const getRecordingStatus = async () => {
    try {
      const response = await api.get<{ 
        isRecording: boolean
        recording?: RecordingInfo 
      }>(`/sessions/${sessionId.value}/recording/status`)
      
      isRecording.value = response.isRecording
      if (response.recording) {
        currentRecording.value = response.recording
        
        // Calculate duration if recording
        if (response.isRecording && response.recording.startedAt) {
          const start = new Date(response.recording.startedAt).getTime()
          recordingDuration.value = Math.round((Date.now() - start) / 1000)
          
          // Start counter if not already
          if (!durationInterval) {
            durationInterval = setInterval(() => {
              recordingDuration.value++
            }, 1000)
          }
        }
      }
      
      return response
    } catch (e: any) {
      // Recording not started - not an error
      isRecording.value = false
    }
  }
  
  // Get all recordings for session
  const fetchRecordings = async () => {
    isLoading.value = true
    try {
      const response = await api.get<RecordingInfo[]>(
        `/sessions/${sessionId.value}/recordings`
      )
      recordings.value = response
      return response
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  // Format duration
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }
  
  // Cleanup
  onUnmounted(() => {
    if (durationInterval) {
      clearInterval(durationInterval)
    }
  })
  
  return {
    // State
    currentRecording,
    recordings,
    isRecording,
    recordingDuration,
    isLoading,
    error,
    // Actions
    startRecording,
    stopRecording,
    getRecordingStatus,
    fetchRecordings,
    // Utils
    formatDuration,
  }
}

// ==================== WAITING ROOM COMPOSABLE ====================

export function useWaitingRoom(sessionId: Ref<number>) {
  const api = useApi()
  
  const waitingUsers = ref<WaitingUser[]>([])
  const settings = ref<WaitingRoomSettings | null>(null)
  const myStatus = ref<'waiting' | 'admitted' | 'denied' | null>(null)
  const myPosition = ref<number | null>(null)
  const deniedReason = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Request to join session (goes to waiting room)
  const requestJoin = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post<{
        status: 'waiting' | 'admitted' | 'denied'
        position?: number
        reason?: string
      }>(`/sessions/${sessionId.value}/waiting-room/request`)
      
      myStatus.value = response.status
      myPosition.value = response.position || null
      if (response.reason) {
        deniedReason.value = response.reason
      }
      
      return response
    } catch (e: any) {
      error.value = e.message || 'Không thể gửi yêu cầu tham gia'
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  // Get waiting room users (Teacher only)
  const fetchWaitingUsers = async () => {
    isLoading.value = true
    try {
      const response = await api.get<WaitingUser[]>(
        `/sessions/${sessionId.value}/waiting-room`
      )
      waitingUsers.value = response
      return response
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  // Admit user (Teacher only)
  const admitUser = async (userId: number) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post<{ success: boolean }>(
        `/sessions/${sessionId.value}/waiting-room/${userId}/admit`
      )
      // Remove from waiting list
      waitingUsers.value = waitingUsers.value.filter(u => u.userId !== userId)
      return response
    } catch (e: any) {
      error.value = e.message || 'Không thể chấp nhận người dùng'
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  // Admit all users (Teacher only)
  const admitAll = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post<{ count: number }>(
        `/sessions/${sessionId.value}/waiting-room/admit-all`
      )
      waitingUsers.value = []
      return response
    } catch (e: any) {
      error.value = e.message || 'Không thể chấp nhận tất cả'
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  // Deny user (Teacher only)
  const denyUser = async (userId: number, reason?: string) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await api.post<{ success: boolean }>(
        `/sessions/${sessionId.value}/waiting-room/${userId}/deny`,
        { reason }
      )
      // Remove from waiting list
      waitingUsers.value = waitingUsers.value.filter(u => u.userId !== userId)
      return response
    } catch (e: any) {
      error.value = e.message || 'Không thể từ chối người dùng'
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  // Get my waiting status (Student)
  const getMyStatus = async () => {
    try {
      const response = await api.get<{
        status: 'waiting' | 'admitted' | 'denied' | 'not_requested'
        position?: number
        reason?: string
      }>(`/sessions/${sessionId.value}/waiting-room/status`)
      
      myStatus.value = response.status === 'not_requested' ? null : response.status
      myPosition.value = response.position || null
      deniedReason.value = response.reason || null
      
      return response
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }
  
  // Computed
  const waitingCount = computed(() => waitingUsers.value.length)
  const isWaiting = computed(() => myStatus.value === 'waiting')
  const isAdmitted = computed(() => myStatus.value === 'admitted')
  const isDenied = computed(() => myStatus.value === 'denied')
  
  return {
    // State
    waitingUsers,
    settings,
    myStatus,
    myPosition,
    deniedReason,
    isLoading,
    error,
    // Computed
    waitingCount,
    isWaiting,
    isAdmitted,
    isDenied,
    // Actions
    requestJoin,
    fetchWaitingUsers,
    admitUser,
    admitAll,
    denyUser,
    getMyStatus,
  }
}
