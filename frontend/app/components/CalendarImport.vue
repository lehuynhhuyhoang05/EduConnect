<template>
  <div class="space-y-6">
    <!-- Import Section -->
    <div class="bg-gray-50 rounded-xl p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Import lịch</h3>
      
      <div class="space-y-4">
        <!-- Source Selection -->
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="source in importSources"
            :key="source.id"
            @click="selectedSource = source.id"
            class="p-4 rounded-lg border-2 transition-all text-center"
            :class="selectedSource === source.id 
              ? 'border-primary bg-primary/10 text-gray-900' 
              : 'border-gray-200 hover:border-gray-300 text-gray-600'"
          >
            <div class="text-2xl mb-2">{{ source.icon }}</div>
            <div class="text-sm font-medium">{{ source.name }}</div>
          </button>
        </div>

        <!-- File Upload (for iCal) -->
        <div v-if="selectedSource === 'ical'" class="space-y-4">
          <div
            class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors bg-white"
            @click="openFileInput"
            @dragover.prevent
            @drop.prevent="handleFileDrop"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".ics,.ical"
              class="hidden"
              @change="handleFileSelect"
            />
            <svg class="w-12 h-12 mx-auto text-gray-400 mb-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p v-if="!selectedFile" class="text-gray-500">
              Kéo thả file .ics vào đây hoặc <span class="text-primary font-medium">click để chọn</span>
            </p>
            <p v-else class="text-gray-900 font-medium">
              {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
            </p>
          </div>

          <p class="text-xs text-gray-500">
            Hỗ trợ file iCal (.ics) từ Google Calendar, Outlook, Apple Calendar
          </p>
        </div>

        <!-- Google Calendar (future) -->
        <div v-else-if="selectedSource === 'google'" class="text-center py-8">
          <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 22.5h-15A2.25 2.25 0 012.25 20.25v-15A2.25 2.25 0 014.5 3h15a2.25 2.25 0 012.25 2.25v15a2.25 2.25 0 01-2.25 2.25zM4.5 4.5a.75.75 0 00-.75.75v15c0 .414.336.75.75.75h15a.75.75 0 00.75-.75v-15a.75.75 0 00-.75-.75h-15z"/>
              <path d="M8.25 10.5h7.5v1.5h-7.5zM8.25 13.5h7.5v1.5h-7.5zM8.25 7.5h7.5V9h-7.5z"/>
            </svg>
          </div>
          <h4 class="font-semibold text-gray-900 mb-2">Kết nối Google Calendar</h4>
          <p class="text-gray-500 text-sm mb-4 max-w-xs mx-auto">
            Tính năng này cần cấu hình Google OAuth. Vui lòng sử dụng <strong>file iCal</strong> để import từ Google Calendar.
          </p>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-sm">
            <p class="font-medium text-blue-900 mb-2">Hướng dẫn export từ Google Calendar:</p>
            <ol class="text-blue-800 space-y-1 list-decimal list-inside">
              <li>Mở <a href="https://calendar.google.com/calendar/r/settings/export" target="_blank" class="underline">Google Calendar Settings</a></li>
              <li>Click "Export" để tải file .ics</li>
              <li>Quay lại đây và upload file vừa tải</li>
            </ol>
          </div>
        </div>

        <!-- Outlook (future) -->
        <div v-else-if="selectedSource === 'outlook'" class="text-center py-8">
          <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 22.5h-15A2.25 2.25 0 012.25 20.25v-15A2.25 2.25 0 014.5 3h15a2.25 2.25 0 012.25 2.25v15a2.25 2.25 0 01-2.25 2.25z"/>
            </svg>
          </div>
          <h4 class="font-semibold text-gray-900 mb-2">Kết nối Outlook Calendar</h4>
          <p class="text-gray-500 text-sm mb-4 max-w-xs mx-auto">
            Vui lòng sử dụng <strong>file iCal</strong> để import từ Outlook.
          </p>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-sm">
            <p class="font-medium text-blue-900 mb-2">Hướng dẫn export từ Outlook:</p>
            <ol class="text-blue-800 space-y-1 list-decimal list-inside">
              <li>Mở Outlook Calendar</li>
              <li>File → Save Calendar → chọn định dạng iCalendar</li>
              <li>Quay lại đây và upload file .ics</li>
            </ol>
          </div>
        </div>

        <!-- Import Options -->
        <div v-if="selectedFile" class="space-y-4 pt-4 border-t border-gray-200">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Hành động</label>
            <select
              v-model="importOptions.action"
              class="w-full bg-white text-gray-900 rounded-lg px-4 py-2 border border-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="create_events">Chỉ tạo sự kiện lịch</option>
              <option value="create_live_sessions">Chỉ tạo buổi học Live</option>
              <option value="both">Tạo cả hai</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Lớp học (tuỳ chọn)</label>
            <select
              v-model="importOptions.classId"
              class="w-full bg-white text-gray-900 rounded-lg px-4 py-2 border border-gray-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option :value="undefined">-- Cá nhân (không gắn lớp) --</option>
              <option v-for="cls in classes" :key="cls.id" :value="cls.id">
                {{ cls.name }}
              </option>
            </select>
            <p class="text-xs text-gray-500 mt-1">Chọn lớp để tạo buổi học Live tự động</p>
          </div>

          <button
            @click="importCalendar"
            :disabled="isImporting"
            class="w-full py-3 bg-primary hover:bg-primary/90 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span v-if="isImporting" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {{ isImporting ? 'Đang import...' : 'Import lịch' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Import Result -->
    <div v-if="importResult" class="bg-gray-50 rounded-xl p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Kết quả import</h3>
      
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg p-4 text-center border border-gray-200">
          <div class="text-2xl font-bold text-gray-900">{{ importResult.totalEvents }}</div>
          <div class="text-xs text-gray-500">Tổng sự kiện</div>
        </div>
        <div class="bg-green-50 rounded-lg p-4 text-center border border-green-200">
          <div class="text-2xl font-bold text-green-600">{{ importResult.importedEvents }}</div>
          <div class="text-xs text-gray-500">Đã import</div>
        </div>
        <div class="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
          <div class="text-2xl font-bold text-blue-600">{{ importResult.createdLiveSessions }}</div>
          <div class="text-xs text-gray-500">Buổi học Live</div>
        </div>
        <div class="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
          <div class="text-2xl font-bold text-yellow-600">{{ importResult.skippedEvents }}</div>
          <div class="text-xs text-gray-500">Bỏ qua</div>
        </div>
      </div>

      <!-- Events List -->
      <div class="space-y-2 max-h-64 overflow-y-auto">
        <div
          v-for="(event, index) in importResult.events"
          :key="index"
          class="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center"
              :class="event.imported ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'"
            >
              <svg v-if="event.imported" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p class="text-gray-900 text-sm font-medium">{{ event.title }}</p>
              <p class="text-xs text-gray-500">{{ formatDateTime(event.startTime) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="event.liveSessionCreated" class="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded font-medium">
              Live Session
            </span>
            <span v-if="event.error" class="text-xs text-yellow-600">{{ event.error }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Section -->
    <div class="bg-gray-50 rounded-xl p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Export lịch</h3>
      
      <p class="text-gray-600 text-sm mb-4">
        Xuất lịch sang định dạng iCal (.ics) để import vào Google Calendar, Outlook hoặc các ứng dụng khác.
      </p>

      <div class="flex gap-3">
        <button
          @click="exportCalendar"
          :disabled="isExporting"
          class="px-6 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2 border border-gray-300"
        >
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {{ isExporting ? 'Đang xuất...' : 'Xuất file .ics' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const { toast } = useToast()
const liveSessionsStore = useLiveSessionsStore()

const emit = defineEmits<{
  close: []
  imported: []
}>()

// File input ref
const fileInput = ref<HTMLInputElement | null>(null)

// Import sources
const importSources = [
  { id: 'ical', name: 'File iCal', icon: '📄' },
  { id: 'google', name: 'Google Calendar', icon: '📅' },
  { id: 'outlook', name: 'Outlook', icon: '📧' },
]

// State
const selectedSource = ref('ical')
const selectedFile = ref<File | null>(null)
const isImporting = ref(false)
const isExporting = ref(false)
const importResult = ref<any>(null)
const classes = ref<any[]>([])

const importOptions = ref({
  action: 'both',
  classId: undefined as number | undefined,
})

// Fetch user's classes
onMounted(async () => {
  try {
    const response = await api.get<any[]>('/classes/my-classes')
    classes.value = response.filter((c: any) => c.role === 'teacher')
  } catch (error) {
    console.error('Failed to fetch classes:', error)
  }
})

// File handling
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

const handleFileDrop = (event: DragEvent) => {
  const files = event.dataTransfer?.files
  if (files && files[0]) {
    const file = files[0]
    if (file.name.endsWith('.ics') || file.name.endsWith('.ical')) {
      selectedFile.value = file
    } else {
      toast.error('Vui lòng chọn file .ics')
    }
  }
}

const openFileInput = () => {
  fileInput.value?.click()
}

// Import calendar
const importCalendar = async () => {
  if (!selectedFile.value) return

  isImporting.value = true
  importResult.value = null

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('source', 'ical_file')
    formData.append('action', importOptions.value.action)
    if (importOptions.value.classId) {
      formData.append('classId', String(importOptions.value.classId))
    }

    const response = await api.upload<any>('/calendar/import', formData)

    importResult.value = response
    toast.success(`Đã import ${response.importedEvents} sự kiện`)
    
    // Refresh live sessions store
    await liveSessionsStore.fetchSessions()
    emit('imported')
  } catch (error: any) {
    toast.error(error.message || 'Import thất bại')
  } finally {
    isImporting.value = false
  }
}

// Export calendar
const exportCalendar = async () => {
  isExporting.value = true

  try {
    const response = await api.get<string>('/calendar/export')

    // Download file
    const blob = new Blob([response], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'educonnect-calendar.ics'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Đã xuất file lịch')
  } catch (error: any) {
    toast.error(error.message || 'Export thất bại')
  } finally {
    isExporting.value = false
  }
}

// Google Calendar
const connectGoogleCalendar = async () => {
  try {
    const redirectUri = `${window.location.origin}/schedule/callback`
    const response = await api.get<{ url: string }>('/calendar/google/auth-url', { redirectUri })
    window.location.href = response.url
  } catch (error: any) {
    toast.error('Google Calendar chưa được cấu hình')
  }
}

// Helpers
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
</script>
