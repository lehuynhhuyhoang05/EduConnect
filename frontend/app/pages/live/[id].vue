<script setup lang="ts">
import type { LiveSession } from '~/types'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const { toast } = useToast()
const authStore = useAuthStore()
const liveSessionsStore = useLiveSessionsStore()

const sessionId = computed(() => route.params.id as string)
const session = ref<LiveSession | null>(null)
const isLoading = ref(true)
const isJoining = ref(false)

// Media controls
const isMicOn = ref(true)
const isCameraOn = ref(true)
const isScreenSharing = ref(false)
const isChatOpen = ref(true)
const isParticipantsOpen = ref(false)
const isWhiteboardOpen = ref(false)

// Chat
const chatMessage = ref('')
const messages = ref<Array<{
  id: number
  user: { fullName: string; avatar?: string }
  message: string
  timestamp: Date
}>>([
  { id: 1, user: { fullName: 'Nguyễn Văn A' }, message: 'Xin chào mọi người!', timestamp: new Date() },
  { id: 2, user: { fullName: 'Trần Thị B' }, message: 'Chào thầy, em có câu hỏi ạ', timestamp: new Date() },
])

// Participants
const participants = ref([
  { id: 1, fullName: 'Giáo viên', role: 'host', isMuted: false, isCameraOn: true },
  { id: 2, fullName: 'Nguyễn Văn A', role: 'participant', isMuted: true, isCameraOn: true },
  { id: 3, fullName: 'Trần Thị B', role: 'participant', isMuted: false, isCameraOn: false },
  { id: 4, fullName: 'Lê Văn C', role: 'participant', isMuted: true, isCameraOn: true },
])

const toggleMic = () => {
  isMicOn.value = !isMicOn.value
}

const toggleCamera = () => {
  isCameraOn.value = !isCameraOn.value
}

const toggleScreenShare = () => {
  isScreenSharing.value = !isScreenSharing.value
}

const sendMessage = () => {
  if (!chatMessage.value.trim()) return
  
  messages.value.push({
    id: Date.now(),
    user: { fullName: authStore.user?.fullName || 'Bạn' },
    message: chatMessage.value,
    timestamp: new Date(),
  })
  chatMessage.value = ''
}

const leaveSession = () => {
  router.push('/dashboard')
}

const endSession = () => {
  toast.success('Đã kết thúc buổi học')
  router.push('/dashboard')
}

onMounted(async () => {
  try {
    // Fetch session details
    await new Promise(resolve => setTimeout(resolve, 1000))
    session.value = {
      id: Number(sessionId.value),
      classId: 1,
      title: 'Buổi học trực tuyến - Lập trình Web',
      status: 'active',
      startedAt: new Date().toISOString(),
      class: { id: 1, name: 'Lập trình Web cơ bản' },
      participantCount: 4,
    } as LiveSession
  } catch (error) {
    toast.error('Không thể tải thông tin buổi học')
    router.push('/dashboard')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="fixed inset-0 bg-gray-900 flex flex-col">
    <!-- Header -->
    <header class="h-16 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 flex items-center justify-between px-4">
      <div class="flex items-center gap-4">
        <button
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
          @click="leaveSession"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          <span class="hidden sm:inline">Quay lại</span>
        </button>
        
        <div>
          <h1 class="text-white font-semibold">{{ session?.title || 'Đang tải...' }}</h1>
          <p class="text-gray-400 text-sm">{{ session?.class?.name }}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Live indicator -->
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 text-red-400">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
          </span>
          <span class="text-sm font-medium">LIVE</span>
        </div>

        <!-- Participant count -->
        <div class="flex items-center gap-1.5 text-gray-400">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          <span class="text-sm">{{ participants.length }}</span>
        </div>

        <!-- End session (for host) -->
        <button
          v-if="authStore.isTeacher"
          class="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
          @click="endSession"
        >
          Kết thúc
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Video Area -->
      <div class="flex-1 flex flex-col">
        <!-- Main Video Grid -->
        <div class="flex-1 p-4">
          <div class="h-full grid gap-3" :class="participants.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'">
            <!-- Participant Videos -->
            <div
              v-for="participant in participants"
              :key="participant.id"
              class="relative bg-gray-800 rounded-2xl overflow-hidden group"
            >
              <!-- Video placeholder -->
              <div class="absolute inset-0 flex items-center justify-center">
                <div v-if="!participant.isCameraOn" class="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-3xl font-bold">
                  {{ participant.fullName.charAt(0) }}
                </div>
                <div v-else class="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800">
                  <!-- Video would go here -->
                </div>
              </div>

              <!-- Participant info overlay -->
              <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-white text-sm font-medium truncate">{{ participant.fullName }}</span>
                    <span v-if="participant.role === 'host'" class="px-1.5 py-0.5 rounded text-xs bg-primary/20 text-primary">Host</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <div 
                      class="w-6 h-6 rounded-full flex items-center justify-center"
                      :class="participant.isMuted ? 'bg-red-500/20' : 'bg-gray-600'"
                    >
                      <svg v-if="participant.isMuted" class="w-3.5 h-3.5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="1" y1="1" x2="23" y2="23"/>
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                      <svg v-else class="w-3.5 h-3.5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Controls Bar -->
        <div class="h-20 bg-gray-800/80 backdrop-blur-sm border-t border-gray-700 flex items-center justify-center gap-3 px-4">
          <!-- Mic -->
          <button
            class="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            :class="isMicOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
            @click="toggleMic"
          >
            <svg v-if="isMicOn" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            <svg v-else class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>

          <!-- Camera -->
          <button
            class="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            :class="isCameraOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
            @click="toggleCamera"
          >
            <svg v-if="isCameraOn" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            <svg v-else class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          </button>

          <!-- Screen Share -->
          <button
            class="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            :class="isScreenSharing ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
            @click="toggleScreenShare"
          >
            <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </button>

          <div class="w-px h-8 bg-gray-600 mx-2" />

          <!-- Whiteboard -->
          <button
            class="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            :class="isWhiteboardOpen ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
            @click="isWhiteboardOpen = !isWhiteboardOpen"
          >
            <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </button>

          <!-- Participants -->
          <button
            class="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            :class="isParticipantsOpen ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
            @click="isParticipantsOpen = !isParticipantsOpen; isChatOpen = false"
          >
            <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </button>

          <!-- Chat -->
          <button
            class="w-12 h-12 rounded-full flex items-center justify-center transition-all"
            :class="isChatOpen ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
            @click="isChatOpen = !isChatOpen; isParticipantsOpen = false"
          >
            <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>

          <div class="w-px h-8 bg-gray-600 mx-2" />

          <!-- Leave -->
          <button
            class="px-6 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
            @click="leaveSession"
          >
            Rời khỏi
          </button>
        </div>
      </div>

      <!-- Side Panel -->
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
      >
        <div
          v-if="isChatOpen || isParticipantsOpen"
          class="w-80 bg-gray-800 border-l border-gray-700 flex flex-col"
        >
          <!-- Panel Header -->
          <div class="h-14 px-4 border-b border-gray-700 flex items-center justify-between">
            <h3 class="text-white font-medium">
              {{ isChatOpen ? 'Trò chuyện' : 'Người tham gia' }}
            </h3>
            <button
              class="w-8 h-8 rounded-lg hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              @click="isChatOpen = false; isParticipantsOpen = false"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Chat Content -->
          <div v-if="isChatOpen" class="flex-1 flex flex-col">
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="flex gap-3"
              >
                <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium flex-shrink-0">
                  {{ msg.user.fullName.charAt(0) }}
                </div>
                <div class="flex-1">
                  <div class="flex items-baseline gap-2">
                    <span class="text-white text-sm font-medium">{{ msg.user.fullName }}</span>
                    <span class="text-gray-500 text-xs">{{ new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }}</span>
                  </div>
                  <p class="text-gray-300 text-sm mt-0.5">{{ msg.message }}</p>
                </div>
              </div>
            </div>

            <!-- Chat Input -->
            <div class="p-4 border-t border-gray-700">
              <form class="flex gap-2" @submit.prevent="sendMessage">
                <input
                  v-model="chatMessage"
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  class="flex-1 h-10 px-4 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder:text-gray-400 focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="submit"
                  class="w-10 h-10 rounded-lg bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-colors"
                >
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </form>
            </div>
          </div>

          <!-- Participants Content -->
          <div v-if="isParticipantsOpen" class="flex-1 overflow-y-auto p-4 space-y-2">
            <div
              v-for="p in participants"
              :key="p.id"
              class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-700/50 transition-colors"
            >
              <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                {{ p.fullName.charAt(0) }}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-white text-sm font-medium">{{ p.fullName }}</span>
                  <span v-if="p.role === 'host'" class="px-1.5 py-0.5 rounded text-xs bg-primary/20 text-primary">Host</span>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <div 
                  class="w-7 h-7 rounded-full flex items-center justify-center"
                  :class="p.isMuted ? 'bg-red-500/20' : 'bg-gray-600'"
                >
                  <svg v-if="p.isMuted" class="w-4 h-4 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
                  </svg>
                  <svg v-else class="w-4 h-4 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  </svg>
                </div>
                <div 
                  class="w-7 h-7 rounded-full flex items-center justify-center"
                  :class="!p.isCameraOn ? 'bg-red-500/20' : 'bg-gray-600'"
                >
                  <svg v-if="!p.isCameraOn" class="w-4 h-4 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/>
                  </svg>
                  <svg v-else class="w-4 h-4 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>
