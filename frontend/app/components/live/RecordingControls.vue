<script setup lang="ts">
/**
 * Recording Controls Component
 * ============================
 * Điều khiển ghi hình buổi học
 * 
 * ⚠️ LƯU Ý: Đây là DEMO UI
 * - Backend chỉ lưu metadata (thời gian, trạng thái)
 * - KHÔNG thực sự ghi video/audio
 * - Để ghi hình thật cần tích hợp MediaRecorder API hoặc SFU server
 */

import type { RecordingInfo } from '~/composables/useLiveFeatures'

const props = defineProps<{
  sessionId: number
  isHost: boolean
}>()

const emit = defineEmits<{
  recordingStarted: []
  recordingStopped: []
}>()

// Get toast composable
const { toast } = useToast()

// Setup recording composable
const sessionIdRef = computed(() => props.sessionId)
const {
  isRecording,
  currentRecording,
  recordings,
  isLoading,
  error,
  startRecording,
  stopRecording,
  getRecordingStatus,
  fetchRecordings,
  formatDuration,
} = useRecording(sessionIdRef)

// Local state
const showRecordingsList = ref(false)
const recordingDuration = ref(0)
let durationInterval: ReturnType<typeof setInterval> | null = null

// Calculate duration
const formattedDuration = computed(() => {
  return formatDuration(recordingDuration.value)
})

// Fetch initial data
onMounted(async () => {
  await getRecordingStatus()
  await fetchRecordings()
  
  // If already recording, start duration counter
  if (isRecording.value && currentRecording.value?.startedAt) {
    startDurationCounter(currentRecording.value.startedAt)
  }
})

// Watch for recording status changes
watch(isRecording, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    // Recording started
    recordingDuration.value = 0
    startDurationCounter(new Date().toISOString())
    emit('recordingStarted')
  } else if (!newVal && oldVal) {
    // Recording stopped
    stopDurationCounter()
    emit('recordingStopped')
  }
})

onUnmounted(() => {
  stopDurationCounter()
})

// Duration counter functions
const startDurationCounter = (startTime: string) => {
  const start = new Date(startTime).getTime()
  
  const updateDuration = () => {
    recordingDuration.value = Math.floor((Date.now() - start) / 1000)
  }
  
  updateDuration()
  durationInterval = setInterval(updateDuration, 1000)
}

const stopDurationCounter = () => {
  if (durationInterval) {
    clearInterval(durationInterval)
    durationInterval = null
  }
}

// Start recording
const handleStartRecording = async () => {
  try {
    await startRecording()
    toast.success('Đã bắt đầu ghi hình')
  } catch (e: any) {
    toast.error(e.message || 'Không thể bắt đầu ghi hình')
  }
}

// Stop recording
const handleStopRecording = async () => {
  try {
    await stopRecording()
    toast.success('Đã dừng ghi hình')
    await fetchRecordings()
  } catch (e: any) {
    toast.error(e.message || 'Không thể dừng ghi hình')
  }
}

// Get status badge
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'recording':
      return { variant: 'destructive', label: 'Đang ghi' }
    case 'processing':
      return { variant: 'warning', label: 'Đang xử lý' }
    case 'ready':
      return { variant: 'success', label: 'Sẵn sàng' }
    case 'failed':
      return { variant: 'destructive', label: 'Lỗi' }
    default:
      return { variant: 'secondary', label: status }
  }
}

// Format file size
const formatFileSize = (bytes: number) => {
  if (!bytes) return 'N/A'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

// Format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="recording-controls">
    <!-- Demo Warning Banner -->
    <div class="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
      <div class="flex items-start gap-2">
        <svg class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <p class="text-sm font-medium text-yellow-800">Tính năng Demo</p>
          <p class="text-xs text-yellow-600">Chỉ lưu metadata, không ghi video thật. Cần tích hợp MediaRecorder để ghi hình thực sự.</p>
        </div>
      </div>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <svg class="w-5 h-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        Ghi hình
      </h3>

      <!-- Recording indicator -->
      <div v-if="isRecording" class="flex items-center gap-2">
        <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <span class="text-sm font-mono text-red-500">{{ formattedDuration }}</span>
      </div>
    </div>

    <!-- Host Controls -->
    <template v-if="isHost">
      <div class="space-y-4">
        <!-- Main control button -->
        <div class="flex flex-col items-center py-4">
          <button
            class="w-20 h-20 rounded-full flex items-center justify-center transition-all"
            :class="isRecording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'"
            :disabled="isLoading"
            @click="isRecording ? handleStopRecording() : handleStartRecording()"
          >
            <!-- Recording icon -->
            <svg v-if="!isRecording" class="w-8 h-8 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="8"/>
            </svg>
            <!-- Stop icon -->
            <svg v-else class="w-8 h-8 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>
          <p class="mt-3 text-sm text-muted-foreground">
            {{ isRecording ? 'Nhấn để dừng ghi hình' : 'Nhấn để bắt đầu ghi hình' }}
          </p>
        </div>

        <!-- Current recording info -->
        <div v-if="isRecording && currentRecording" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <div class="flex items-center justify-between">
            <span class="text-sm">Đang ghi:</span>
            <span class="text-sm font-mono">{{ formattedDuration }}</span>
          </div>
        </div>

        <!-- Recordings list toggle -->
        <button
          class="w-full flex items-center justify-between px-4 py-3 rounded-lg border hover:bg-accent transition-colors"
          @click="showRecordingsList = !showRecordingsList"
        >
          <span class="flex items-center gap-2">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="text-sm">Danh sách bản ghi ({{ recordings.length }})</span>
          </span>
          <svg 
            class="w-4 h-4 transition-transform"
            :class="{ 'rotate-180': showRecordingsList }"
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <!-- Recordings list -->
        <div v-if="showRecordingsList" class="space-y-2 max-h-64 overflow-y-auto">
          <div v-if="recordings.length === 0" class="text-center py-4 text-muted-foreground text-sm">
            Chưa có bản ghi nào
          </div>
          
          <div
            v-for="recording in recordings"
            :key="recording.id"
            class="border rounded-lg p-3 hover:bg-accent/50"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                  <span class="text-sm font-medium">
                    {{ formatDate(recording.startedAt) }}
                  </span>
                </div>
                <div class="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{{ formatDuration(recording.durationSeconds || 0) }}</span>
                  <span v-if="recording.fileSize">{{ formatFileSize(recording.fileSize) }}</span>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <UiBadge :variant="getStatusBadge(recording.status).variant as any">
                  {{ getStatusBadge(recording.status).label }}
                </UiBadge>
                
                <a 
                  v-if="recording.status === 'ready' && recording.fileUrl"
                  :href="recording.fileUrl"
                  target="_blank"
                  class="p-1 rounded hover:bg-accent"
                >
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Student/Participant View -->
    <template v-else>
      <div class="text-center py-6">
        <div 
          v-if="isRecording"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-500"
        >
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span class="text-sm font-medium">Đang ghi hình</span>
        </div>
        <div v-else class="text-muted-foreground">
          <svg class="w-12 h-12 mx-auto mb-2 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <p class="text-sm">Không đang ghi hình</p>
        </div>
      </div>
    </template>
  </div>
</template>
