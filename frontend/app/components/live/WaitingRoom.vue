<script setup lang="ts">
/**
 * Waiting Room Component (Socket-based)
 * ======================================
 * Phòng chờ trước khi vào live session sử dụng WebSocket real-time
 * - Host: Bật/tắt phòng chờ, xem danh sách người chờ, cho phép/từ chối vào
 * - Student: Hiển thị trạng thái chờ, vị trí trong hàng đợi
 */

interface WaitingUser {
  id?: number
  userId: number
  userName: string
  joinRequestedAt: string
  status?: string
}

const props = defineProps<{
  sessionId: number
  isHost: boolean
  userId: number
}>()

const emit = defineEmits<{
  userAdmitted: [user: WaitingUser]
  userDenied: [user: WaitingUser]
  allAdmitted: []
  joinApproved: []
  waitingRoomToggled: [enabled: boolean]
}>()

// Get composables
const { toast } = useToast()
const liveSocket = useLiveSocket()

// Room ID
const roomId = computed(() => `session-${props.sessionId}`)

// State
const isWaitingRoomEnabled = ref(false)
const waitingUsers = ref<WaitingUser[]>([])
const myStatus = ref<'waiting' | 'admitted' | 'denied' | null>(null)
const myPosition = ref<number | null>(null)
const deniedReason = ref<string | null>(null)
const isLoading = ref(false)
const hasRequestedJoin = ref(false)

// Deny reason input
const showDenyReason = ref<number | null>(null)
const localDenyReason = ref('')

// Computed
const waitingCount = computed(() => waitingUsers.value.length)
const isWaiting = computed(() => myStatus.value === 'waiting')
const isAdmitted = computed(() => myStatus.value === 'admitted')
const isDenied = computed(() => myStatus.value === 'denied')
const computedPosition = computed(() => myPosition.value || 0)

// Setup socket event listeners
onMounted(async () => {
  // Listen for waiting room status updates
  liveSocket.onWaitingRoomStatus.value = (data) => {
    console.log('Waiting room status:', data)
    if (typeof data.enabled === 'boolean') {
      isWaitingRoomEnabled.value = data.enabled
    }
    if (data.users) {
      waitingUsers.value = data.users.map(u => ({
        userId: u.userId,
        userName: u.userName,
        joinRequestedAt: u.requestedAt,
      }))
    }
  }
  
  // Listen for new user waiting
  liveSocket.onUserWaiting.value = (data) => {
    console.log('User waiting event:', data)
    // Add to waiting list if host
    if (props.isHost) {
      const existing = waitingUsers.value.find(u => u.userId === data.userId)
      if (!existing) {
        waitingUsers.value.push({
          userId: data.userId,
          userName: data.userName,
          joinRequestedAt: new Date().toISOString(),
        })
        toast.info(`${data.userName} đang chờ tham gia`)
      } 
  
    }
  }
  
  // Listen for admission granted (student gets this)
  liveSocket.onAdmissionGranted.value = (data) => {
    console.log('Admission granted:', data)
    if (data.userId === props.userId) {
      myStatus.value = 'admitted'
      toast.success('Bạn đã được phép tham gia!')
      emit('joinApproved')
    } else if (props.isHost) {
      // Remove from waiting list
      waitingUsers.value = waitingUsers.value.filter(u => u.userId !== data.userId)
    }
  }
  
  // Listen for admission denied (student gets this)
  liveSocket.onAdmissionDenied.value = (data) => {
    console.log('Admission denied:', data)
    if (data.userId === props.userId) {
      myStatus.value = 'denied'
      deniedReason.value = data.reason || null
      toast.error('Yêu cầu của bạn đã bị từ chối')
    } else if (props.isHost) {
      // Remove from waiting list
      waitingUsers.value = waitingUsers.value.filter(u => u.userId !== data.userId)
    }
  }
  
  // Initialize based on role
  if (props.isHost) {
    await fetchWaitingUsers()
  } else {
    await checkMyStatus()
  }
})

// Cleanup
onUnmounted(() => {
  liveSocket.onWaitingRoomStatus.value = null
  liveSocket.onUserWaiting.value = null
  liveSocket.onAdmissionGranted.value = null
  liveSocket.onAdmissionDenied.value = null
})

// Fetch waiting users (host)
const fetchWaitingUsers = async () => {
  isLoading.value = true
  try {
    const result = await liveSocket.getWaitingUsers(roomId.value)
    if (result.users) {
      waitingUsers.value = result.users
    }
  } catch (e) {
    console.error('Failed to fetch waiting users:', e)
  } finally {
    isLoading.value = false
  }
}

// Toggle waiting room (host)
const toggleWaitingRoom = async () => {
  console.log('Toggle waiting room, isConnected:', liveSocket.isConnected.value)
  isLoading.value = true
  try {
    const newState = !isWaitingRoomEnabled.value
    const result = await liveSocket.enableWaitingRoom(roomId.value, newState)
    console.log('enableWaitingRoom result:', result)
    
    if (result.success) {
      isWaitingRoomEnabled.value = newState
      emit('waitingRoomToggled', newState)
      toast.success(newState ? 'Đã bật phòng chờ' : 'Đã tắt phòng chờ')
    } else {
      toast.error('Không thể thay đổi trạng thái phòng chờ')
    }
  } catch (e: any) {
    toast.error(e.message || 'Không thể thay đổi trạng thái phòng chờ')
  } finally {
    isLoading.value = false
  }
}

// Check my waiting status (student)
const checkMyStatus = async () => {
  // This would need a backend endpoint or socket event
  // For now, we'll rely on socket events
}

// Request to join (student)
const handleRequestJoin = async () => {
  isLoading.value = true
  try {
    // Send join request via socket
    liveSocket.socket.value?.emit('request-join', {
      roomId: roomId.value,
      userId: props.userId,
    })
    
    hasRequestedJoin.value = true
    myStatus.value = 'waiting'
    myPosition.value = 1
    toast.success('Đã gửi yêu cầu tham gia')
  } catch (e: any) {
    toast.error(e.message || 'Không thể gửi yêu cầu')
  } finally {
    isLoading.value = false
  }
}

// Admit user (host)
const handleAdmitUser = async (user: WaitingUser) => {
  console.log('Admitting user:', user.userId, user.userName)
  isLoading.value = true
  try {
    const result = await liveSocket.admitUser(roomId.value, user.userId)
    console.log('Admit result:', result)
    if (result.success) {
      // Remove from local list
      waitingUsers.value = waitingUsers.value.filter(u => u.userId !== user.userId)
      toast.success(`Đã cho phép ${user.userName} tham gia`)
      emit('userAdmitted', user)
    } else {
      toast.error('Không thể cho phép tham gia')
    }
  } catch (e: any) {
    console.error('Admit error:', e)
    toast.error(e.message || 'Không thể cho phép tham gia')
  } finally {
    isLoading.value = false
  }
}

// Deny user (host)
const handleDenyUser = async (user: WaitingUser, reason?: string) => {
  isLoading.value = true
  try {
    const result = await liveSocket.denyUser(roomId.value, user.userId, reason)
    if (result.success) {
      // Remove from local list
      waitingUsers.value = waitingUsers.value.filter(u => u.userId !== user.userId)
      showDenyReason.value = null
      localDenyReason.value = ''
      toast.success(`Đã từ chối ${user.userName}`)
      emit('userDenied', user)
    }
  } catch (e: any) {
    toast.error(e.message || 'Không thể từ chối')
  } finally {
    isLoading.value = false
  }
}

// Admit all (host)
const handleAdmitAll = async () => {
  isLoading.value = true
  try {
    const result = await liveSocket.admitAllUsers(roomId.value)
    if (result.success) {
      waitingUsers.value = []
      toast.success('Đã cho phép tất cả tham gia')
      emit('allAdmitted')
    }
  } catch (e: any) {
    toast.error(e.message || 'Không thể cho phép tất cả')
  } finally {
    isLoading.value = false
  }
}

// Format time waiting
const formatWaitingTime = (joinedAt: string) => {
  const now = Date.now()
  const joined = new Date(joinedAt).getTime()
  const diff = Math.floor((now - joined) / 1000)
  
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}
</script>

<template>
  <div class="waiting-room">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <svg class="w-5 h-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Phòng chờ
      </h3>

      <div class="flex items-center gap-2">
        <UiBadge v-if="waitingCount > 0" variant="warning">
          {{ waitingCount }} người chờ
        </UiBadge>
        <UiBadge v-if="isWaitingRoomEnabled" variant="success">
          Đang bật
        </UiBadge>
        <UiBadge v-else variant="secondary">
          Đang tắt
        </UiBadge>
      </div>
    </div>

    <!-- Host View -->
    <template v-if="isHost">
      <div class="space-y-4">
        <!-- Enable/Disable Waiting Room Toggle -->
        <div class="p-4 border rounded-xl bg-muted/30">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <p class="font-medium">Chế độ phòng chờ</p>
              <p class="text-sm text-muted-foreground">
                {{ isWaitingRoomEnabled ? 'Sinh viên phải được duyệt mới vào được' : 'Sinh viên vào trực tiếp' }}
              </p>
            </div>
            <button
              @click="toggleWaitingRoom"
              :disabled="isLoading"
              type="button"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :class="isWaitingRoomEnabled ? 'bg-green-500' : 'bg-gray-300'"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="isWaitingRoomEnabled ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="waitingUsers.length === 0" class="text-center py-8 text-muted-foreground">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          <p>Không có ai đang chờ</p>
          <p v-if="!isWaitingRoomEnabled" class="text-sm mt-1">
            Bật phòng chờ để kiểm duyệt người vào
          </p>
        </div>

        <!-- Admit all button -->
        <UiButton
          v-if="waitingUsers.length > 1"
          variant="outline"
          class="w-full"
          :loading="isLoading"
          @click="handleAdmitAll"
        >
          <svg class="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Cho phép tất cả ({{ waitingUsers.length }})
        </UiButton>

        <!-- Waiting users list -->
        <div class="space-y-2 max-h-80 overflow-y-auto">
          <div
            v-for="user in waitingUsers"
            :key="user.userId"
            class="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium">
                  {{ user.userName?.charAt(0) || '?' }}
                </div>
                <div>
                  <p class="font-medium">{{ user.userName }}</p>
                  <p class="text-xs text-muted-foreground">
                    Đang chờ {{ formatWaitingTime(user.joinRequestedAt) }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <!-- Admit button -->
                <button
                  class="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-colors"
                  :disabled="isLoading"
                  @click="handleAdmitUser(user)"
                  title="Cho phép vào"
                >
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>

                <!-- Deny button -->
                <button
                  class="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 transition-colors"
                  :disabled="isLoading"
                  @click="showDenyReason === user.userId ? handleDenyUser(user, localDenyReason) : showDenyReason = user.userId"
                  title="Từ chối"
                >
                  <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Deny reason input -->
            <div v-if="showDenyReason === user.userId" class="mt-3 space-y-2">
              <input
                v-model="localDenyReason"
                type="text"
                placeholder="Lý do từ chối (tùy chọn)"
                class="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background"
                @keyup.enter="handleDenyUser(user, localDenyReason)"
              />
              <div class="flex gap-2">
                <UiButton
                  size="sm"
                  variant="destructive"
                  @click="handleDenyUser(user, localDenyReason)"
                >
                  Từ chối
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  @click="showDenyReason = null; localDenyReason = ''"
                >
                  Hủy
                </UiButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Student/Participant View -->
    <template v-else>
      <!-- Not requested yet -->
      <div v-if="!hasRequestedJoin && !myStatus" class="text-center py-6">
        <svg class="w-16 h-16 mx-auto mb-4 text-orange-500 opacity-75" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <p class="text-muted-foreground mb-4">
          Buổi học yêu cầu xác nhận từ giảng viên
        </p>
        <UiButton 
          :loading="isLoading"
          @click="handleRequestJoin"
        >
          <svg class="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Yêu cầu tham gia
        </UiButton>
      </div>

      <!-- Waiting status -->
      <div v-else-if="isWaiting" class="text-center py-6">
        <div class="relative w-20 h-20 mx-auto mb-4">
          <svg class="w-20 h-20 text-orange-500 animate-spin-slow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="30 10"/>
          </svg>
          <span class="absolute inset-0 flex items-center justify-center text-2xl font-bold text-orange-500">
            {{ computedPosition || '?' }}
          </span>
        </div>
        <p class="font-medium text-lg mb-1">Đang chờ phê duyệt</p>
        <p class="text-muted-foreground text-sm">
          Vị trí của bạn: {{ computedPosition || '?' }} / {{ waitingCount || 1 }}
        </p>
        <p class="text-xs text-muted-foreground mt-2">
          Giảng viên sẽ sớm cho phép bạn tham gia
        </p>
      </div>

      <!-- Admitted -->
      <div v-else-if="isAdmitted" class="text-center py-6">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p class="font-medium text-green-600">Đã được phê duyệt!</p>
        <p class="text-sm text-muted-foreground">Đang kết nối vào buổi học...</p>
      </div>

      <!-- Denied -->
      <div v-else-if="isDenied" class="text-center py-6">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
        <p class="font-medium text-red-600">Yêu cầu bị từ chối</p>
        <p v-if="deniedReason" class="text-sm text-muted-foreground mt-1">
          Lý do: {{ deniedReason }}
        </p>
        <UiButton 
          variant="outline" 
          class="mt-4"
          @click="hasRequestedJoin = false; myStatus = null"
        >
          Thử lại
        </UiButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.animate-spin-slow {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
