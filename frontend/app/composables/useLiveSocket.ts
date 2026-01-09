import { io, Socket } from 'socket.io-client'

interface SignalData {
  fromUserId: number
  type: 'offer' | 'answer' | 'ice-candidate'
  payload: any
  timestamp: string
}

interface MediaState {
  userId: number
  userName: string
  audio: boolean
  video: boolean
  screen?: boolean
}

interface UserJoined {
  userId: number
  userName?: string
  socketId: string
  roomId: string
  timestamp: string
}

interface UserLeft {
  userId: number
  roomId: string
  timestamp: string
}

interface ChatMessage {
  userId: number
  userName: string
  message: string
  timestamp: string
}

interface HandRaiseEvent {
  userId: number
  userName: string
  timestamp: string
}

// Attendance events
interface AttendanceStartedEvent {
  isOpen: boolean
  code?: string
  method: string
  startedBy: number
  timestamp: string
}

interface AttendanceCheckedInEvent {
  userId: number
  userName: string
  status: string
  byHost?: number
  timestamp: string
}

// Waiting Room events
interface WaitingRoomStatusEvent {
  enabled: boolean
  byHostId: number
  timestamp: string
  users?: Array<{
    userId: number
    userName: string
    socketId: string
    requestedAt: string
  }>
}

interface UserWaitingEvent {
  userId: number
  userName: string
  socketId: string
  roomId: string
  timestamp: string
}

interface AdmissionEvent {
  userId?: number
  byHostId?: number
  roomId?: string
  reason?: string
  timestamp: string
}

// Singleton state - shared across all components
const socket = ref<Socket | null>(null)
const isConnected = ref(false)
const connectionError = ref<string | null>(null)

// Event callbacks - shared
const onSignal = ref<((data: SignalData) => void) | null>(null)
const onUserJoined = ref<((data: UserJoined) => void) | null>(null)
const onUserLeft = ref<((data: UserLeft) => void) | null>(null)
const onMediaState = ref<((data: MediaState) => void) | null>(null)
const onChatMessage = ref<((data: ChatMessage) => void) | null>(null)
const onHandRaised = ref<((data: HandRaiseEvent) => void) | null>(null)
const onHandLowered = ref<((data: HandRaiseEvent) => void) | null>(null)
const onSessionEnded = ref<(() => void) | null>(null)

// Attendance event callbacks
const onAttendanceStarted = ref<((data: AttendanceStartedEvent) => void) | null>(null)
const onAttendanceClosed = ref<((data: { isOpen: boolean; closedBy: number; timestamp: string }) => void) | null>(null)
const onAttendanceCheckedIn = ref<((data: AttendanceCheckedInEvent) => void) | null>(null)

// Waiting room event callbacks  
const onWaitingRoomStatus = ref<((data: WaitingRoomStatusEvent) => void) | null>(null)
const onUserWaiting = ref<((data: UserWaitingEvent) => void) | null>(null)
const onAdmissionGranted = ref<((data: AdmissionEvent) => void) | null>(null)
const onAdmissionDenied = ref<((data: AdmissionEvent) => void) | null>(null)
const onRoomJoined = ref<((data: { roomId: string; participants: Array<{ userId: number; socketId?: string }> }) => void) | null>(null)

export function useLiveSocket() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  
  const connect = () => {
    if (isConnected.value && socket.value) {
      return
    }
    
    const apiUrl = config.public.apiUrl?.replace('/api', '') || 'http://localhost:3000'
    
    socket.value = io(`${apiUrl}/live`, {
      auth: {
        token: authStore.token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
    
    socket.value.on('connect', () => {
      console.log('Live socket connected:', socket.value?.id)
      isConnected.value = true
      connectionError.value = null
    })
    
    socket.value.on('connected', (data) => {
      console.log('Server confirmed connection:', data)
    })
    
    socket.value.on('disconnect', (reason) => {
      console.log('Live socket disconnected:', reason)
      isConnected.value = false
    })
    
    socket.value.on('connect_error', (error) => {
      console.error('Live socket connection error:', error)
      connectionError.value = error.message
      isConnected.value = false
    })
    
    // WebRTC Signaling
    socket.value.on('signal', (data: SignalData) => {
      console.log('Received signal:', data.type, 'from:', data.fromUserId)
      onSignal.value?.(data)
    })
    
    // Room events
    socket.value.on('user-joined', (data: UserJoined) => {
      console.log('User joined:', data)
      onUserJoined.value?.(data)
    })
    
    socket.value.on('user-left', (data: UserLeft) => {
      console.log('User left:', data)
      onUserLeft.value?.(data)
    })
    
    // Media state changes - listen for both event names for compatibility
    socket.value.on('media-state', (data: MediaState) => {
      console.log('Media state changed:', data)
      onMediaState.value?.(data)
    })
    
    socket.value.on('media-state-updated', (data: MediaState) => {
      console.log('Media state updated:', data)
      onMediaState.value?.(data)
    })
    
    // Chat messages
    socket.value.on('chat-message', (data: ChatMessage) => {
      console.log('Chat message:', data)
      onChatMessage.value?.(data)
    })
    
    // Hand raise events
    socket.value.on('hand-raised', (data: HandRaiseEvent) => {
      console.log('Hand raised:', data)
      onHandRaised.value?.(data)
    })
    
    socket.value.on('hand-lowered', (data: HandRaiseEvent) => {
      console.log('Hand lowered:', data)
      onHandLowered.value?.(data)
    })
    
    // Session ended
    socket.value.on('session-ended', () => {
      console.log('Session ended by host')
      onSessionEnded.value?.()
    })
    
    // ========== ATTENDANCE EVENTS ==========
    socket.value.on('attendance-started', (data: AttendanceStartedEvent) => {
      console.log('Attendance started:', data)
      onAttendanceStarted.value?.(data)
    })
    
    socket.value.on('attendance-closed', (data: any) => {
      console.log('Attendance closed:', data)
      onAttendanceClosed.value?.(data)
    })
    
    socket.value.on('attendance-checked-in', (data: AttendanceCheckedInEvent) => {
      console.log('Attendance checked in:', data)
      onAttendanceCheckedIn.value?.(data)
    })
    
    // ========== WAITING ROOM EVENTS ==========
    socket.value.on('waiting-room-status', (data: WaitingRoomStatusEvent) => {
      console.log('Waiting room status:', data)
      onWaitingRoomStatus.value?.(data)
    })
    
    socket.value.on('user-waiting', (data: UserWaitingEvent) => {
      console.log('User waiting:', data)
      onUserWaiting.value?.(data)
    })
    
    socket.value.on('admission-granted', (data: AdmissionEvent) => {
      console.log('Admission granted:', data)
      onAdmissionGranted.value?.(data)
    })
    
    socket.value.on('admission-denied', (data: AdmissionEvent) => {
      console.log('Admission denied:', data)
      onAdmissionDenied.value?.(data)
    })
    
    // Room joined event (sent after admission from waiting room)
    socket.value.on('room-joined', (data: { roomId: string; participants: Array<{ userId: number; socketId?: string }> }) => {
      console.log('Room joined:', data)
      onRoomJoined.value?.(data)
    })
  }
  
  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
    }
  }
  
  const joinRoom = async (roomId: string, sessionId: number): Promise<{
    success: boolean
    participants?: Array<{ userId: number; userName?: string; socketId?: string }>
    waiting?: boolean
    error?: string
  }> => {
    return new Promise((resolve) => {
      if (!isConnected.value || !socket.value) {
        resolve({ success: false, error: 'Socket not connected' })
        return
      }
      
      socket.value.emit('join-room', { 
        roomId, 
        sessionId,
        userName: authStore.user?.fullName
      }, (response: any) => {
        console.log('Join room response:', response)
        resolve(response)
      })
    })
  }
  
  const leaveRoom = async (roomId: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (!isConnected.value || !socket.value) {
        resolve({ success: false })
        return
      }
      
      socket.value.emit('leave-room', { roomId }, (response: any) => {
        resolve(response)
      })
    })
  }
  
  // WebRTC Signaling methods
  const sendOffer = (targetUserId: number, sdp: RTCSessionDescriptionInit) => {
    socket.value?.emit('offer', { targetUserId, sdp })
  }
  
  const sendAnswer = (targetUserId: number, sdp: RTCSessionDescriptionInit) => {
    socket.value?.emit('answer', { targetUserId, sdp })
  }
  
  const sendIceCandidate = (targetUserId: number, candidate: RTCIceCandidate) => {
    socket.value?.emit('ice-candidate', { targetUserId, candidate })
  }
  
  // Media state
  const updateMediaState = (roomId: string, audio: boolean, video: boolean, screen?: boolean) => {
    socket.value?.emit('media-state', { roomId, audio, video, screen })
  }
  
  // Chat
  const sendChatMessage = (roomId: string, message: string) => {
    socket.value?.emit('chat-message', { roomId, message })
  }
  
  // Hand raise
  const raiseHand = (roomId: string) => {
    socket.value?.emit('raise-hand', { roomId })
  }
  
  const lowerHand = (roomId: string) => {
    socket.value?.emit('lower-hand', { roomId })
  }
  
  // ========== ATTENDANCE SOCKET METHODS ==========
  const startAttendance = (roomId: string, method: string = 'code'): Promise<{ success: boolean; code?: string }> => {
    return new Promise((resolve) => {
      if (!isConnected.value || !socket.value) {
        resolve({ success: false })
        return
      }
      socket.value.emit('start-attendance', { roomId, method }, (response: any) => {
        resolve(response)
      })
    })
  }
  
  const closeAttendance = (roomId: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (!isConnected.value || !socket.value) {
        resolve({ success: false })
        return
      }
      socket.value.emit('close-attendance', { roomId }, (response: any) => {
        resolve(response)
      })
    })
  }
  
  const checkInAttendance = (roomId: string, code: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!isConnected.value || !socket.value) {
        resolve({ success: false, error: 'Not connected' })
        return
      }
      socket.value.emit('check-in-attendance', { roomId, code }, (response: any) => {
        resolve(response)
      })
    })
  }
  
  const manualAttendance = (roomId: string, targetUserId: number, status: string, userName?: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (!isConnected.value || !socket.value) {
        resolve({ success: false })
        return
      }
      socket.value.emit('manual-attendance', { roomId, targetUserId, status, userName }, (response: any) => {
        resolve(response)
      })
    })
  }
  
  const getAttendanceStatus = (roomId: string): Promise<{ success: boolean; isOpen?: boolean; code?: string; method?: string; records?: any[] }> => {
    return new Promise((resolve) => {
      if (!isConnected.value || !socket.value) {
        resolve({ success: false })
        return
      }
      socket.value.emit('get-attendance-status', { roomId }, (response: any) => {
        resolve(response)
      })
    })
  }
  
  // ========== WAITING ROOM SOCKET METHODS ==========
  const enableWaitingRoom = (roomId: string, enabled: boolean): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (!isConnected.value || !socket.value) {
        resolve({ success: false })
        return
      }
      socket.value.emit('enable-waiting-room', { roomId, enabled }, (response: any) => {
        resolve(response)
      })
    })
  }
  
  const getWaitingUsers = (roomId: string): Promise<{ success: boolean; users?: any[] }> => {
    return new Promise((resolve) => {
      if (!isConnected.value || !socket.value) {
        resolve({ success: false })
        return
      }
      socket.value.emit('get-waiting-users', { roomId }, (response: any) => {
        resolve(response)
      })
    })
  }
  
  const admitUser = (roomId: string, targetUserId: number): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      console.log('admitUser called:', { roomId, targetUserId, isConnected: isConnected.value })
      if (!isConnected.value || !socket.value) {
        console.log('admitUser: socket not connected')
        resolve({ success: false })
        return
      }
      socket.value.emit('admit-user', { roomId, targetUserId }, (response: any) => {
        console.log('admitUser response:', response)
        resolve(response)
      })
    })
  }
  
  const admitAllUsers = (roomId: string): Promise<{ success: boolean; admittedCount?: number }> => {
    return new Promise((resolve) => {
      if (!isConnected.value || !socket.value) {
        resolve({ success: false })
        return
      }
      socket.value.emit('admit-all-users', { roomId }, (response: any) => {
        resolve(response)
      })
    })
  }
  
  const denyUser = (roomId: string, targetUserId: number, reason?: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      if (!isConnected.value || !socket.value) {
        resolve({ success: false })
        return
      }
      socket.value.emit('deny-user', { roomId, targetUserId, reason }, (response: any) => {
        resolve(response)
      })
    })
  }
  
  return {
    socket,
    isConnected,
    connectionError,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    updateMediaState,
    sendChatMessage,
    raiseHand,
    lowerHand,
    // Attendance methods
    startAttendance,
    closeAttendance,
    checkInAttendance,
    manualAttendance,
    getAttendanceStatus,
    // Waiting room methods
    enableWaitingRoom,
    getWaitingUsers,
    admitUser,
    admitAllUsers,
    denyUser,
    // Event callbacks
    onSignal,
    onUserJoined,
    onUserLeft,
    onMediaState,
    onChatMessage,
    onHandRaised,
    onHandLowered,
    onSessionEnded,
    // Attendance events
    onAttendanceStarted,
    onAttendanceClosed,
    onAttendanceCheckedIn,
    // Waiting room events
    onWaitingRoomStatus,
    onUserWaiting,
    onAdmissionGranted,
    onAdmissionDenied,
    onRoomJoined,
  }
}