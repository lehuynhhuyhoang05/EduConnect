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

export function useLiveSocket() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const connectionError = ref<string | null>(null)
  
  // Event callbacks
  const onSignal = ref<((data: SignalData) => void) | null>(null)
  const onUserJoined = ref<((data: UserJoined) => void) | null>(null)
  const onUserLeft = ref<((data: UserLeft) => void) | null>(null)
  const onMediaState = ref<((data: MediaState) => void) | null>(null)
  const onChatMessage = ref<((data: ChatMessage) => void) | null>(null)
  const onHandRaised = ref<((data: HandRaiseEvent) => void) | null>(null)
  const onHandLowered = ref<((data: HandRaiseEvent) => void) | null>(null)
  const onSessionEnded = ref<(() => void) | null>(null)
  
  const connect = () => {
    if (socket.value?.connected) {
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
      if (!socket.value?.connected) {
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
      if (!socket.value?.connected) {
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
  
  return {
    socket: readonly(socket),
    isConnected: readonly(isConnected),
    connectionError: readonly(connectionError),
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
    // Event callbacks
    onSignal,
    onUserJoined,
    onUserLeft,
    onMediaState,
    onChatMessage,
    onHandRaised,
    onHandLowered,
    onSessionEnded,
  }
}
