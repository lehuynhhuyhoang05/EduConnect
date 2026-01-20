<template>
  <div class="h-full flex flex-col">
    <!-- Language Selector - Compact -->
    <div class="flex items-center gap-2 mb-3">
      <select 
        v-model="selectedLanguage"
        @change="onLanguageChange"
        class="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:border-primary focus:outline-none"
        :disabled="isTranscribing"
      >
        <option value="vi-VN">Tiếng Việt</option>
        <option value="en-US">English</option>
        <option value="ja-JP">日本語</option>
        <option value="ko-KR">한국어</option>
        <option value="zh-CN">中文</option>
      </select>
      
      <div 
        class="w-2 h-2 rounded-full"
        :class="isTranscribing && !isPaused ? 'bg-green-500 animate-pulse' : 'bg-gray-500'"
      />
    </div>
    
    <!-- Transcript Area -->
    <div 
      ref="transcriptArea"
      class="flex-1 bg-gray-800/50 rounded-lg p-3 overflow-y-auto min-h-0"
    >
      <!-- Empty State -->
      <div 
        v-if="transcript.length === 0 && !currentInterim" 
        class="h-full flex flex-col items-center justify-center text-gray-500"
      >
        <svg class="w-10 h-10 mb-3 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        <p v-if="isSupported" class="text-sm">Nhấn bắt đầu để ghi chép</p>
        <p v-else class="text-sm text-yellow-500">Yêu cầu Chrome browser</p>
      </div>
      
      <!-- Transcript Entries -->
      <div v-else class="space-y-3">
        <div 
          v-for="entry in transcript" 
          :key="entry.id"
          class="text-sm"
        >
          <span class="text-gray-500 text-xs tabular-nums">{{ formatTime(entry.timestamp) }}</span>
          <p class="text-gray-200 mt-0.5">{{ entry.text }}</p>
        </div>
        
        <!-- Interim -->
        <div v-if="currentInterim" class="text-sm opacity-50">
          <span class="text-gray-500 text-xs tabular-nums">{{ formatTime(new Date()) }}</span>
          <p class="text-gray-400 mt-0.5 italic">{{ currentInterim }}...</p>
        </div>
      </div>
    </div>
    
    <!-- Stats -->
    <div class="flex items-center justify-between text-xs text-gray-500 py-2 px-1">
      <span>{{ entryCount }} câu · {{ wordCount }} từ</span>
      <span v-if="sessionStartTime">{{ formatDuration() }}</span>
    </div>
    
    <!-- Controls -->
    <div class="flex items-center gap-2">
      <!-- Start Button -->
      <button
        v-if="!isTranscribing"
        @click="start"
        :disabled="!isSupported"
        class="flex-1 h-10 bg-primary hover:bg-primary/90 disabled:bg-gray-600 disabled:cursor-not-allowed
               text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        </svg>
        Bắt đầu
      </button>
      
      <template v-else>
        <!-- Pause/Resume -->
        <button
          @click="togglePause"
          class="flex-1 h-10 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg v-if="isPaused" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
          {{ isPaused ? 'Tiếp tục' : 'Tạm dừng' }}
        </button>
        
        <!-- Stop -->
        <button
          @click="stop"
          class="h-10 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center justify-center"
          title="Dừng"
        >
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
          </svg>
        </button>
      </template>
      
      <!-- Export Menu -->
      <div class="relative" v-if="transcript.length > 0" ref="exportMenuRef">
        <button
          @click.stop="showExportMenu = !showExportMenu"
          class="h-10 w-10 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center"
          title="Xuất file"
        >
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        
        <div 
          v-if="showExportMenu"
          class="absolute bottom-full right-0 mb-2 bg-gray-700 rounded-lg shadow-xl overflow-hidden z-50 min-w-[140px] border border-gray-600"
        >
          <button 
            @click.stop="download('txt')" 
            class="block w-full px-4 py-2.5 text-sm text-white hover:bg-gray-600 text-left transition-colors"
          >
            Xuất .txt
          </button>
          <button 
            @click.stop="download('srt')" 
            class="block w-full px-4 py-2.5 text-sm text-white hover:bg-gray-600 text-left transition-colors"
          >
            Xuất .srt
          </button>
          <button 
            @click.stop="download('json')" 
            class="block w-full px-4 py-2.5 text-sm text-white hover:bg-gray-600 text-left transition-colors"
          >
            Xuất .json
          </button>
        </div>
      </div>
      
      <!-- Clear -->
      <button
        v-if="transcript.length > 0"
        @click="clear"
        class="h-10 w-10 bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white rounded-lg flex items-center justify-center transition-colors"
        title="Xóa"
      >
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
    
    <!-- Error Message -->
    <div 
      v-if="error" 
      class="mt-2 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg text-sm"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  sessionId?: number
}>()

const emit = defineEmits<{
  transcriptUpdate: [text: string]
}>()

// Use transcription composable
const {
  isTranscribing,
  isPaused,
  transcript,
  currentInterim,
  error,
  isSupported,
  settings,
  sessionStartTime,
  wordCount,
  entryCount,
  startTranscription,
  stopTranscription,
  pauseTranscription,
  resumeTranscription,
  setLanguage,
  clearTranscript,
  downloadTranscript,
} = useTranscription()

// Local state
const selectedLanguage = ref('vi-VN')
const showExportMenu = ref(false)
const transcriptArea = ref<HTMLElement | null>(null)
const exportMenuRef = ref<HTMLElement | null>(null)

// Actions
const start = () => {
  startTranscription()
}

const stop = () => {
  stopTranscription()
}

const togglePause = () => {
  if (isPaused.value) {
    resumeTranscription()
  } else {
    pauseTranscription()
  }
}

const onLanguageChange = () => {
  setLanguage(selectedLanguage.value)
}

const clear = () => {
  if (confirm('Bạn có chắc muốn xóa toàn bộ transcript?')) {
    clearTranscript()
  }
}

const download = (format: 'txt' | 'srt' | 'json') => {
  downloadTranscript(format)
  showExportMenu.value = false
}

// Format time
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// Format duration
const formatDuration = (): string => {
  if (!sessionStartTime.value) return '00:00'
  const diff = Math.floor((Date.now() - sessionStartTime.value.getTime()) / 1000)
  const minutes = Math.floor(diff / 60)
  const seconds = diff % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// Auto-scroll to bottom
watch(transcript, () => {
  nextTick(() => {
    if (transcriptArea.value) {
      transcriptArea.value.scrollTop = transcriptArea.value.scrollHeight
    }
  })
}, { deep: true })

// Watch for interim updates
watch(currentInterim, () => {
  nextTick(() => {
    if (transcriptArea.value) {
      transcriptArea.value.scrollTop = transcriptArea.value.scrollHeight
    }
  })
})

// Emit transcript updates
watch(transcript, () => {
  const fullText = transcript.value.map(e => e.text).join(' ')
  emit('transcriptUpdate', fullText)
}, { deep: true })

// Close export menu on click outside
const closeExportMenu = (e: MouseEvent) => {
  // Only close if clicking outside the menu
  if (showExportMenu.value && exportMenuRef.value && !exportMenuRef.value.contains(e.target as Node)) {
    showExportMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeExportMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeExportMenu)
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
