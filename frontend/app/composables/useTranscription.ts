/**
 * AI TRANSCRIPTION COMPOSABLE
 * ===========================
 * Tự động chuyển đổi giọng nói thành văn bản real-time
 * 
 * Phương án 1: Web Speech API (Browser-based, miễn phí)
 * Phương án 2: OpenAI Whisper API (Độ chính xác cao)
 * 
 * Features:
 * - Real-time transcription
 * - Speaker identification
 * - Timestamp tracking
 * - Export to TXT/SRT format
 */

export interface TranscriptEntry {
  id: string
  text: string
  timestamp: Date
  speakerId?: number
  speakerName?: string
  confidence: number
  isFinal: boolean
  language?: string
}

export interface TranscriptionSettings {
  language: string // 'vi-VN', 'en-US', etc.
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  autoSave: boolean
  showTimestamps: boolean
}

// Check if Web Speech API is supported
const isSpeechRecognitionSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}

export function useTranscription() {
  // State
  const isTranscribing = ref(false)
  const isPaused = ref(false)
  const transcript = ref<TranscriptEntry[]>([])
  const currentInterim = ref('')
  const error = ref<string | null>(null)
  const isSupported = ref(false)
  
  // Settings
  const settings = ref<TranscriptionSettings>({
    language: 'vi-VN', // Mặc định tiếng Việt
    continuous: true,
    interimResults: true,
    maxAlternatives: 1,
    autoSave: true,
    showTimestamps: true,
  })
  
  // Speech Recognition instance
  let recognition: any = null
  
  // Session info
  const sessionStartTime = ref<Date | null>(null)
  const totalDuration = ref(0)
  
  // Initialize Speech Recognition
  const initRecognition = () => {
    if (!process.client) return false
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      error.value = 'Trình duyệt không hỗ trợ Speech Recognition. Vui lòng sử dụng Chrome.'
      isSupported.value = false
      return false
    }
    
    isSupported.value = true
    recognition = new SpeechRecognition()
    
    // Configure
    recognition.continuous = settings.value.continuous
    recognition.interimResults = settings.value.interimResults
    recognition.maxAlternatives = settings.value.maxAlternatives
    recognition.lang = settings.value.language
    
    // Event handlers
    recognition.onstart = () => {
      console.log('🎤 Transcription started')
      isTranscribing.value = true
      error.value = null
      if (!sessionStartTime.value) {
        sessionStartTime.value = new Date()
      }
    }
    
    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript
        const confidence = result[0].confidence || 0.8
        
        if (result.isFinal) {
          finalTranscript += text
          
          // Add to transcript
          const entry: TranscriptEntry = {
            id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: text.trim(),
            timestamp: new Date(),
            confidence,
            isFinal: true,
            language: settings.value.language,
          }
          
          if (entry.text) {
            transcript.value.push(entry)
          }
        } else {
          interimTranscript += text
        }
      }
      
      currentInterim.value = interimTranscript
    }
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      
      switch (event.error) {
        case 'no-speech':
          // Không có âm thanh - không hiển thị lỗi, chỉ restart
          break
        case 'audio-capture':
          error.value = 'Không thể truy cập microphone'
          break
        case 'not-allowed':
          error.value = 'Quyền truy cập microphone bị từ chối'
          break
        case 'network':
          error.value = 'Lỗi kết nối mạng'
          break
        case 'aborted':
          // User cancelled - ignore
          break
        default:
          error.value = `Lỗi: ${event.error}`
      }
    }
    
    recognition.onend = () => {
      console.log('🎤 Transcription ended')
      
      // Auto-restart if still transcribing (continuous mode)
      if (isTranscribing.value && !isPaused.value && settings.value.continuous) {
        try {
          recognition.start()
        } catch (e) {
          console.warn('Could not restart recognition:', e)
        }
      } else {
        isTranscribing.value = false
      }
    }
    
    return true
  }
  
  // Start transcription
  const startTranscription = async (speakerId?: number, speakerName?: string) => {
    if (!process.client) return false
    
    if (!recognition) {
      const success = initRecognition()
      if (!success) return false
    }
    
    try {
      recognition.lang = settings.value.language
      recognition.start()
      isPaused.value = false
      return true
    } catch (e: any) {
      if (e.message?.includes('already started')) {
        return true // Already running
      }
      console.error('Failed to start transcription:', e)
      error.value = 'Không thể bắt đầu ghi chép'
      return false
    }
  }
  
  // Stop transcription
  const stopTranscription = () => {
    if (recognition) {
      isTranscribing.value = false
      isPaused.value = false
      try {
        recognition.stop()
      } catch (e) {
        console.warn('Error stopping recognition:', e)
      }
    }
  }
  
  // Pause transcription
  const pauseTranscription = () => {
    if (recognition && isTranscribing.value) {
      isPaused.value = true
      try {
        recognition.stop()
      } catch (e) {
        console.warn('Error pausing recognition:', e)
      }
    }
  }
  
  // Resume transcription
  const resumeTranscription = () => {
    if (isPaused.value) {
      isPaused.value = false
      startTranscription()
    }
  }
  
  // Change language
  const setLanguage = (lang: string) => {
    settings.value.language = lang
    if (recognition) {
      recognition.lang = lang
    }
  }
  
  // Clear transcript
  const clearTranscript = () => {
    transcript.value = []
    currentInterim.value = ''
    sessionStartTime.value = null
  }
  
  // Export as plain text
  const exportAsText = (): string => {
    let output = `Transcript - ${sessionStartTime.value?.toLocaleString() || 'Unknown'}\n`
    output += '='.repeat(50) + '\n\n'
    
    transcript.value.forEach((entry) => {
      const time = settings.value.showTimestamps 
        ? `[${entry.timestamp.toLocaleTimeString()}] `
        : ''
      const speaker = entry.speakerName ? `${entry.speakerName}: ` : ''
      output += `${time}${speaker}${entry.text}\n`
    })
    
    return output
  }
  
  // Export as SRT (subtitle format)
  const exportAsSRT = (): string => {
    let output = ''
    
    transcript.value.forEach((entry, index) => {
      const startTime = formatSRTTime(entry.timestamp)
      const endTime = formatSRTTime(new Date(entry.timestamp.getTime() + 3000)) // +3s
      
      output += `${index + 1}\n`
      output += `${startTime} --> ${endTime}\n`
      output += `${entry.text}\n\n`
    })
    
    return output
  }
  
  // Export as JSON
  const exportAsJSON = (): string => {
    return JSON.stringify({
      sessionStart: sessionStartTime.value,
      language: settings.value.language,
      entries: transcript.value,
    }, null, 2)
  }
  
  // Download transcript
  const downloadTranscript = (format: 'txt' | 'srt' | 'json' = 'txt') => {
    if (!process.client) return
    
    let content: string
    let filename: string
    let mimeType: string
    
    const timestamp = new Date().toISOString().slice(0, 10)
    
    switch (format) {
      case 'srt':
        content = exportAsSRT()
        filename = `transcript-${timestamp}.srt`
        mimeType = 'text/plain'
        break
      case 'json':
        content = exportAsJSON()
        filename = `transcript-${timestamp}.json`
        mimeType = 'application/json'
        break
      default:
        content = exportAsText()
        filename = `transcript-${timestamp}.txt`
        mimeType = 'text/plain'
    }
    
    // Check if there's content to download
    if (!content || content.trim().length === 0) {
      console.warn('No content to download')
      return
    }
    
    try {
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      
      // Cleanup after a short delay
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
      
      console.log('Downloaded:', filename)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }
  
  // Helper: Format time for SRT
  const formatSRTTime = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    const ms = String(date.getMilliseconds()).padStart(3, '0')
    return `${hours}:${minutes}:${seconds},${ms}`
  }
  
  // Computed
  const transcriptText = computed(() => {
    return transcript.value.map(e => e.text).join(' ')
  })
  
  const wordCount = computed(() => {
    return transcriptText.value.split(/\s+/).filter(w => w.length > 0).length
  })
  
  const entryCount = computed(() => transcript.value.length)
  
  // Cleanup
  onUnmounted(() => {
    stopTranscription()
    recognition = null
  })
  
  // Check support on mount
  onMounted(() => {
    if (process.client) {
      isSupported.value = isSpeechRecognitionSupported()
    }
  })
  
  return {
    // State
    isTranscribing: readonly(isTranscribing),
    isPaused: readonly(isPaused),
    transcript: readonly(transcript),
    currentInterim: readonly(currentInterim),
    error: readonly(error),
    isSupported: readonly(isSupported),
    settings,
    sessionStartTime: readonly(sessionStartTime),
    
    // Computed
    transcriptText,
    wordCount,
    entryCount,
    
    // Actions
    startTranscription,
    stopTranscription,
    pauseTranscription,
    resumeTranscription,
    setLanguage,
    clearTranscript,
    
    // Export
    exportAsText,
    exportAsSRT,
    exportAsJSON,
    downloadTranscript,
  }
}
