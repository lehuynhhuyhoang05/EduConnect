<script setup lang="ts">
import type { LiveSession } from '~/types'
import type { ComponentPublicInstance } from 'vue'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const { toast } = useToast()
const authStore = useAuthStore()
const liveSessionsStore = useLiveSessionsStore()

// Composables
const liveSocket = useLiveSocket()
const webRTC = useWebRTC()

// Session data
const sessionId = computed(() => Number(route.params.id))
const session = ref<LiveSession | null>(null)
const isLoading = ref(true)
const isJoining = ref(false)
const hasJoined = ref(false)
const isWaitingForAdmission = ref(false) // Waiting room state

// Room ID for socket
const roomId = computed(() => `session-${sessionId.value}`)

// UI state
const isChatOpen = ref(true)
const isParticipantsOpen = ref(false)
const isWhiteboardOpen = ref(false)
const isAttendanceOpen = ref(false)
const isRecordingOpen = ref(false)
const isWaitingRoomOpen = ref(false)

// Feature panel state - tracks active right panel
const activePanel = ref<'chat' | 'participants' | 'attendance' | 'recording' | 'waitingRoom' | 'transcription' | null>('chat')

// Transcription state
const isTranscriptionOpen = ref(false)

// Toggle panel helper
const togglePanel = (panel: typeof activePanel.value) => {
  if (activePanel.value === panel) {
    activePanel.value = null
    isChatOpen.value = false
    isParticipantsOpen.value = false
    isAttendanceOpen.value = false
    isRecordingOpen.value = false
    isWaitingRoomOpen.value = false
    isTranscriptionOpen.value = false
  } else {
    activePanel.value = panel
    isChatOpen.value = panel === 'chat'
    isParticipantsOpen.value = panel === 'participants'
    isAttendanceOpen.value = panel === 'attendance'
    isRecordingOpen.value = panel === 'recording'
    isWaitingRoomOpen.value = panel === 'waitingRoom'
    isTranscriptionOpen.value = panel === 'transcription'
  }
}

// Pre-join media state
const preJoinAudioEnabled = ref(true)
const preJoinVideoEnabled = ref(true)
const preJoinStreamReady = ref(false)

// Participants tracking
interface Participant {
  id: number
  fullName: string
  role: 'host' | 'participant'
  isMuted: boolean
  isCameraOn: boolean
  stream?: MediaStream
  handRaised?: boolean
}

const participants = ref<Map<number, Participant>>(new Map())
const localParticipant = computed((): Participant | null => {
  if (!authStore.user) return null
  return {
    id: authStore.user.id,
    fullName: authStore.user.fullName || 'Bạn',
    role: authStore.isTeacher ? 'host' : 'participant',
    isMuted: !webRTC.isAudioEnabled.value,
    isCameraOn: webRTC.isVideoEnabled.value,
    stream: webRTC.localStream.value || undefined,
    handRaised: false,
  }
})

// Chat messages
interface ChatMessage {
  id: number
  userId: number
  userName: string
  message: string
  timestamp: Date
  isEmoji?: boolean
}
const messages = ref<ChatMessage[]>([])
const chatMessage = ref('')
const showEmojiPicker = ref(false)

// Common emojis for reactions
const quickEmojis = ['👍', '❤️', '😂', '😮', '👏', '🎉', '🤔', '✋']

// Video element refs
const localVideoRef = ref<HTMLVideoElement | null>(null)
const localScreenVideoRef = ref<HTMLVideoElement | null>(null)
const remoteVideoRefs = ref<Map<number, HTMLVideoElement>>(new Map())

// Share link modal
const showShareModal = ref(false)
const shareLink = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/live/${route.params.id}`
  }
  return ''
})

// Hand raise notification sound
const playHandRaiseSound = () => {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2telezhHcdPnqZB3VFZ8pMz2pJdlPlF1nbPE0p9vREBebpCwu5NiPkFgb4umw7uVaUlUaoOXqrOQYkBLYnOJm6mnilY8SWV2ipqpn4VJPFV0g5Shl4NJPVNuhJGcmYlGPVNugo+bloRDPVJug5GamIRAQV11gI2YloE+Q2B4g4+XjHs8Q2N5hI+VinY4RGl+homThXQ1RnCAh46Qf3AyRnCCi5CMeG0ySHKEi5CMdmsuTHaHi5GIdWYpTniKjZCGcmUoT3uLj4+EcF8lUnyNkY6CbFwhVX+Ok42Aa1ofV4GQlIx+ZlYdXYWUlox5X1AYX4iXl4x0V0gTZI2bmol0UkIUaZGdm4ZtSkATbJSgnoVnQjkQcJajoIJgOy4MdJumoX5YMycJeJ6ppHtTKh0Gfaaurndl')
    audio.volume = 0.5
    audio.play().catch(() => {})
  } catch (e) {}
}

// Copy link to clipboard
const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    toast.success('Đã sao chép link!')
  } catch (error) {
    toast.error('Không thể sao chép link')
  }
}

// Function to attach local stream to video element
const attachLocalStream = () => {
  if (webRTC.localStream.value && localVideoRef.value) {
    localVideoRef.value.srcObject = webRTC.localStream.value
    console.log('Local video attached to element')
  }
}

// Function to attach screen share stream
const attachScreenStream = () => {
  if (webRTC.localScreenStream.value && localScreenVideoRef.value) {
    localScreenVideoRef.value.srcObject = webRTC.localScreenStream.value
    console.log('Screen share attached to element')
  }
}

// Watch local stream and attach to video element
watch(() => webRTC.localStream.value, (stream) => {
  if (stream) {
    nextTick(() => attachLocalStream())
  }
}, { immediate: true })

// Watch screen share stream
watch(() => webRTC.localScreenStream.value, (stream) => {
  if (stream) {
    nextTick(() => attachScreenStream())
  }
}, { immediate: true })

// Re-attach when hasJoined changes (video element changes)
watch(hasJoined, () => {
  nextTick(() => {
    attachLocalStream()
  })
})

// Watch for localVideoRef changes
watch(localVideoRef, (el) => {
  if (el && webRTC.localStream.value) {
    el.srcObject = webRTC.localStream.value
    console.log('Local video ref changed, stream attached')
  }
})

// Watch remote streams
watch(() => webRTC.remoteStreams.value, (streams) => {
  streams.forEach((stream, userId) => {
    // Update participant stream
    const participant = participants.value.get(userId)
    if (participant) {
      participant.stream = stream
      participants.value = new Map(participants.value) // Force reactivity
    }
  })
}, { deep: true })

// Setup socket event handlers
const setupSocketHandlers = () => {
  // Handle incoming signals (WebRTC)
  liveSocket.onSignal.value = async (data) => {
    const { fromUserId, type, payload } = data
    const localUserId = authStore.user?.id
    
    if (type === 'offer') {
      console.log('Received offer from:', fromUserId)
      const answer = await webRTC.handleOffer(
        fromUserId, 
        payload,
        (candidate) => liveSocket.sendIceCandidate(fromUserId, candidate),
        localUserId // Pass local user ID for polite peer pattern
      )
      if (answer) {
        liveSocket.sendAnswer(fromUserId, answer)
      }
    } else if (type === 'answer') {
      console.log('Received answer from:', fromUserId)
      await webRTC.handleAnswer(fromUserId, payload)
    } else if (type === 'ice-candidate') {
      console.log('Received ICE candidate from:', fromUserId)
      await webRTC.handleIceCandidate(fromUserId, payload)
    }
  }
  
  // Handle new user joined
  liveSocket.onUserJoined.value = async (data) => {
    console.log('User joined:', data)
    const { userId, userName } = data
    const localUserId = authStore.user?.id || 0
    
    // Add to participants with userName from event
    if (!participants.value.has(userId)) {
      participants.value.set(userId, {
        id: userId,
        fullName: userName || `User ${userId}`,
        role: 'participant',
        isMuted: true,
        isCameraOn: false,
      })
      participants.value = new Map(participants.value)
    }
    
    // Only send offer if our userId is HIGHER than the new user
    // This prevents "glare" condition where both sides send offers
    if (localUserId > userId) {
      console.log('I have higher userId, sending offer to new user:', userId)
      const offer = await webRTC.createOffer(
        userId,
        (candidate) => liveSocket.sendIceCandidate(userId, candidate)
      )
      if (offer) {
        liveSocket.sendOffer(userId, offer)
        
        // Send current media state to new user after a brief delay
        setTimeout(() => {
          liveSocket.updateMediaState(
            roomId.value,
            webRTC.isAudioEnabled.value,
            webRTC.isVideoEnabled.value,
            webRTC.isScreenSharing.value
          )
        }, 500)
      }
    } else {
      console.log('I have lower userId, waiting for offer from new user:', userId)
      
      // Still send media state so new user knows our state
      setTimeout(() => {
        liveSocket.updateMediaState(
          roomId.value,
          webRTC.isAudioEnabled.value,
          webRTC.isVideoEnabled.value,
          webRTC.isScreenSharing.value
        )
      }, 500)
    }
    
    toast.info(`${userName || 'Người dùng mới'} đã tham gia phòng`)
  }
  
  // Handle user left
  liveSocket.onUserLeft.value = (data) => {
    console.log('User left:', data)
    const { userId } = data
    
    // Remove peer connection
    webRTC.removePeerConnection(userId)
    
    // Remove from participants
    const participant = participants.value.get(userId)
    if (participant) {
      toast.info(`${participant.fullName} đã rời phòng`)
    }
    participants.value.delete(userId)
    participants.value = new Map(participants.value)
  }
  
  // Handle media state changes
  liveSocket.onMediaState.value = (data) => {
    console.log('Media state update:', data)
    const { userId, userName, audio, video, screen } = data
    
    const participant = participants.value.get(userId)
    if (participant) {
      participant.isMuted = !audio
      participant.isCameraOn = video
      participant.fullName = userName || participant.fullName
      participants.value = new Map(participants.value)
    } else if (userId !== authStore.user?.id) {
      // New participant we didn't know about
      participants.value.set(userId, {
        id: userId,
        fullName: userName || `User ${userId}`,
        role: 'participant',
        isMuted: !audio,
        isCameraOn: video,
      })
      participants.value = new Map(participants.value)
    }

    // If a user stops screen sharing, aggressively clear any stale screen stream.
    // Otherwise the viewer can keep the last rendered frame.
    if (screen === false) {
      if (webRTC.remoteScreenStreams.value.has(userId)) {
        webRTC.remoteScreenStreams.value.delete(userId)
        webRTC.remoteScreenStreams.value = new Map(webRTC.remoteScreenStreams.value)
      }
    }
  }
  
  // Handle chat messages - skip if it's from current user (already added locally)
  liveSocket.onChatMessage.value = (data) => {
    if (data.userId === authStore.user?.id) return // Skip own messages
    messages.value.push({
      id: Date.now(),
      userId: data.userId,
      userName: data.userName,
      message: data.message,
      timestamp: new Date(data.timestamp),
    })
  }
  
  // Handle hand raise
  liveSocket.onHandRaised.value = (data) => {
    const participant = participants.value.get(data.userId)
    if (participant) {
      participant.handRaised = true
      participants.value = new Map(participants.value)
      
      // Play sound for teacher
      if (authStore.isTeacher && data.userId !== authStore.user?.id) {
        playHandRaiseSound()
      }
      
      toast.info(`${data.userName} giơ tay`)
    }
  }
  
  liveSocket.onHandLowered.value = (data) => {
    const participant = participants.value.get(data.userId)
    if (participant) {
      participant.handRaised = false
      participants.value = new Map(participants.value)
    }
  }
  
  // Handle session ended
  liveSocket.onSessionEnded.value = () => {
    toast.info('Buổi học đã kết thúc')
    leaveSession()
  }
}

// Setup handler for when student gets admitted from waiting room
const setupAdmissionHandler = () => {
  // Listen for admission granted
  liveSocket.onAdmissionGranted.value = async (data) => {
    console.log('Admission granted in [id].vue:', data)
    if (data.userId === authStore.user?.id) {
      isWaitingForAdmission.value = false
      hasJoined.value = true
      toast.success('Đã được chấp nhận tham gia!')
      // room-joined event will follow with participants list
    }
  }
  
  // Listen for room-joined event (sent by backend after admission)
  liveSocket.onRoomJoined.value = async (data) => {
    console.log('Room joined event received:', data)
    // Setup WebRTC with existing participants
    await setupWebRTCWithParticipants(data.participants || [])
  }
  
  // Listen for admission denied
  liveSocket.onAdmissionDenied.value = (data) => {
    console.log('Admission denied in [id].vue:', data)
    if (data.userId === authStore.user?.id) {
      isWaitingForAdmission.value = false
      toast.error(data.reason || 'Yêu cầu tham gia bị từ chối')
      navigateTo(`/classes/${session.value?.classId || ''}`)
    }
  }
}

// Setup WebRTC connections with participants list
const setupWebRTCWithParticipants = async (participantsList: Array<{ userId: number; socketId?: string; userName?: string }>) => {
  const localUserId = authStore.user?.id || 0
  console.log('Setting up WebRTC with participants:', participantsList)
  
  for (const p of participantsList) {
    // Add to participants list
    participants.value.set(p.userId, {
      id: p.userId,
      fullName: p.userName || `User ${p.userId}`,
      role: 'participant',
      isMuted: true,
      isCameraOn: false,
    })
    
    // Only send offer if our userId is higher (we are the initiator)
    if (localUserId > p.userId) {
      console.log('I have higher userId, sending offer to:', p.userId)
      const offer = await webRTC.createOffer(
        p.userId,
        (candidate) => liveSocket.sendIceCandidate(p.userId, candidate)
      )
      if (offer) {
        liveSocket.sendOffer(p.userId, offer)
      }
    } else {
      console.log('I have lower userId, waiting for offer from:', p.userId)
      // The host/other peer should send us an offer
    }
  }
  participants.value = new Map(participants.value)
  
  // Broadcast our media state
  liveSocket.updateMediaState(
    roomId.value,
    webRTC.isAudioEnabled.value,
    webRTC.isVideoEnabled.value
  )
}

// Join the session
const joinSession = async () => {
  if (hasJoined.value || isJoining.value) return
  
  isJoining.value = true
  
  try {
    // 1. Fetch WebRTC config from server
    await webRTC.fetchWebRTCConfig()
    
    // 2. Use existing stream or initialize new one (allows empty stream if no devices)
    if (!webRTC.localStream.value) {
      await webRTC.initLocalStream(preJoinAudioEnabled.value, preJoinVideoEnabled.value)
      // Stream can be empty if user disabled both or devices unavailable - that's OK
    }
    
    // 3. Connect socket
    liveSocket.connect()
    
    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000)
      
      const checkConnection = setInterval(() => {
        if (liveSocket.isConnected.value) {
          clearInterval(checkConnection)
          clearTimeout(timeout)
          resolve()
        }
      }, 100)
    })
    
    // 4. Setup event handlers
    setupSocketHandlers()
    
    // 5. Join room
    const result = await liveSocket.joinRoom(roomId.value, sessionId.value)
    
    if (!result.success) {
      if (result.waiting) {
        isWaitingForAdmission.value = true
        toast.info('Đang chờ host chấp nhận...')
        // Setup handler for when we get admitted
        setupAdmissionHandler()
        return
      }
      throw new Error(result.error || 'Không thể tham gia phòng')
    }
    
    hasJoined.value = true
    
    // 6. Connect to existing participants
    // Only the peer with HIGHER userId initiates the connection (sends offer)
    // This prevents "glare" condition where both sides send offers
    const localUserId = authStore.user?.id || 0
    
    if (result.participants && result.participants.length > 0) {
      console.log('Existing participants:', result.participants)
      
      for (const p of result.participants) {
        // Add to participants list with userName from server
        participants.value.set(p.userId, {
          id: p.userId,
          fullName: p.userName || `User ${p.userId}`,
          role: 'participant',
          isMuted: true,
          isCameraOn: false,
        })
        
        // Only send offer if our userId is higher (we are the initiator)
        // Otherwise, wait for the other peer to send us an offer
        if (localUserId > p.userId) {
          console.log('I have higher userId, sending offer to:', p.userId)
          const offer = await webRTC.createOffer(
            p.userId,
            (candidate) => liveSocket.sendIceCandidate(p.userId, candidate)
          )
          if (offer) {
            liveSocket.sendOffer(p.userId, offer)
          }
        } else {
          console.log('I have lower userId, waiting for offer from:', p.userId)
          // The other peer will send us an offer when they receive our user-joined event
        }
      }
      participants.value = new Map(participants.value)
    }
    
    // 7. Broadcast our media state
    liveSocket.updateMediaState(
      roomId.value,
      webRTC.isAudioEnabled.value,
      webRTC.isVideoEnabled.value
    )
    
    toast.success('Đã tham gia buổi học')
    
  } catch (error: any) {
    console.error('Failed to join session:', error)
    toast.error(error.message || 'Không thể tham gia buổi học')
  } finally {
    isJoining.value = false
  }
}

// Toggle mic
const toggleMic = async () => {
  await webRTC.toggleAudio()
  liveSocket.updateMediaState(
    roomId.value,
    webRTC.isAudioEnabled.value,
    webRTC.isVideoEnabled.value,
    webRTC.isScreenSharing.value
  )
}

// Toggle camera
const toggleCamera = async () => {
  await webRTC.toggleVideo()
  liveSocket.updateMediaState(
    roomId.value,
    webRTC.isAudioEnabled.value,
    webRTC.isVideoEnabled.value,
    webRTC.isScreenSharing.value
  )
}

// Toggle screen share
const toggleScreenShare = async () => {
  if (webRTC.isScreenSharing.value) {
    webRTC.stopScreenShare()
    
    // Renegotiate to notify peers that screen share stopped
    await webRTC.renegotiateAfterStopScreenShare(
      (userId, candidate) => liveSocket.sendIceCandidate(userId, candidate),
      (userId, offer) => liveSocket.sendOffer(userId, offer)
    )
  } else {
    const stream = await webRTC.startScreenShare(async () => {
      // Screen share might be stopped via browser/OS UI (not our toggle button).
      // In that case we still need to renegotiate and notify peers.
      await webRTC.renegotiateAfterStopScreenShare(
        (userId, candidate) => liveSocket.sendIceCandidate(userId, candidate),
        (userId, offer) => liveSocket.sendOffer(userId, offer),
      )

      liveSocket.updateMediaState(
        roomId.value,
        webRTC.isAudioEnabled.value,
        webRTC.isVideoEnabled.value,
        webRTC.isScreenSharing.value,
      )
    })
    
    // If screen share started, renegotiate with all peers
    if (stream) {
      await webRTC.renegotiateForScreenShare(
        (userId, candidate) => liveSocket.sendIceCandidate(userId, candidate),
        (userId, offer) => liveSocket.sendOffer(userId, offer)
      )
    }
  }
  
  liveSocket.updateMediaState(
    roomId.value,
    webRTC.isAudioEnabled.value,
    webRTC.isVideoEnabled.value,
    webRTC.isScreenSharing.value
  )
}

// Hand raise state
const isHandRaised = ref(false)

// Toggle hand raise
const toggleHandRaise = () => {
  isHandRaised.value = !isHandRaised.value
  if (isHandRaised.value) {
    liveSocket.raiseHand(roomId.value)
  } else {
    liveSocket.lowerHand(roomId.value)
  }
}

// Send emoji reaction
const sendEmojiReaction = (emoji: string) => {
  showEmojiPicker.value = false
  
  // Add to chat as reaction message
  const reactionMsg = {
    id: Date.now(),
    userId: authStore.user?.id || 0,
    userName: authStore.user?.fullName || 'Bạn',
    message: emoji,
    timestamp: new Date(),
    isEmoji: true,
  }
  messages.value.push(reactionMsg)
  
  // Send via socket (will show to others)
  liveSocket.sendChatMessage(roomId.value, emoji)
}

// Send chat message
const sendMessage = () => {
  if (!chatMessage.value.trim()) return
  
  const msgText = chatMessage.value
  chatMessage.value = ''
  
  // Only add locally, socket handler will NOT add again because we check userId
  messages.value.push({
    id: Date.now(),
    userId: authStore.user?.id || 0,
    userName: authStore.user?.fullName || 'Bạn',
    message: msgText,
    timestamp: new Date(),
  })
  
  liveSocket.sendChatMessage(roomId.value, msgText)
}

// Leave session
const leaveSession = async () => {
  try {
    await liveSocket.leaveRoom(roomId.value)
    webRTC.cleanup()
    liveSocket.disconnect()
    
    router.push('/dashboard')
  } catch (error) {
    console.error('Error leaving session:', error)
    router.push('/dashboard')
  }
}

// End session (host only)
const endSession = async () => {
  try {
    await liveSessionsStore.endSession(sessionId.value)
    toast.success('Đã kết thúc buổi học')
    leaveSession()
  } catch (error) {
    console.error('Error ending session:', error)
    toast.error('Không thể kết thúc buổi học')
  }
}

// Check if anyone is screen sharing (either local or remote)
const remoteScreenShareUserId = computed(() => {
  // Find user who has screen share stream
  for (const [userId, stream] of webRTC.remoteScreenStreams.value) {
    const hasLiveVideo = !!stream?.getVideoTracks().some(t => t.readyState === 'live')
    if (hasLiveVideo) {
      return userId
    }
  }
  return null
})

const remoteScreenStream = computed(() => {
  if (remoteScreenShareUserId.value) {
    return webRTC.remoteScreenStreams.value.get(remoteScreenShareUserId.value)
  }
  return null
})

const screenSharerName = computed(() => {
  if (remoteScreenShareUserId.value) {
    const participant = participants.value.get(remoteScreenShareUserId.value)
    return participant?.fullName || 'User'
  }
  return null
})

// Is anyone sharing screen (local or remote)
const isAnyoneScreenSharing = computed(() => {
  return webRTC.isScreenSharing.value || remoteScreenShareUserId.value !== null
})

// Remote screen video ref
const remoteScreenVideoRef = ref<HTMLVideoElement | null>(null)

// Watch remote screen stream
watch(remoteScreenStream, (stream) => {
  if (stream) {
    nextTick(() => {
      if (remoteScreenVideoRef.value) {
        remoteScreenVideoRef.value.srcObject = stream
        console.log('Remote screen share attached to video element')
      }
    })
  } else {
    // Important: when screen share stops, clear srcObject so the viewer doesn't keep the last frame.
    nextTick(() => {
      if (remoteScreenVideoRef.value) {
        remoteScreenVideoRef.value.srcObject = null
      }
    })
  }
}, { immediate: true })

// Also watch the ref itself for when it becomes available
watch(remoteScreenVideoRef, (el) => {
  if (el && remoteScreenStream.value) {
    el.srcObject = remoteScreenStream.value
    console.log('Remote screen video ref available, attaching stream')
  }
})

// Get all participants for display
const allParticipants = computed(() => {
  const result: Participant[] = []
  
  // Add local participant first
  if (localParticipant.value) {
    result.push(localParticipant.value)
  }
  
  // Add remote participants
  participants.value.forEach((p) => {
    // Get remote stream for this participant
    const remoteStream = webRTC.remoteStreams.value.get(p.id)
    result.push({
      ...p,
      stream: remoteStream,
    })
  })
  
  return result
})

// Attach video ref callback for local video
const setLocalVideoRef = (el: Element | ComponentPublicInstance | null) => {
  if (el && el instanceof HTMLVideoElement) {
    localVideoRef.value = el
    if (webRTC.localStream.value) {
      el.srcObject = webRTC.localStream.value
      console.log('Local video stream attached via callback ref')
    }
  }
}

// Attach video ref callback for screen share
const setScreenVideoRef = (el: Element | ComponentPublicInstance | null) => {
  if (el && el instanceof HTMLVideoElement) {
    localScreenVideoRef.value = el
    if (webRTC.localScreenStream.value) {
      el.srcObject = webRTC.localScreenStream.value
      console.log('Screen share stream attached via callback ref')
    }
  }
}

// Attach video ref callback
const setVideoRef = (el: HTMLVideoElement | null, userId: number) => {
  if (el) {
    remoteVideoRefs.value.set(userId, el)
    
    // Attach stream if available
    const stream = webRTC.remoteStreams.value.get(userId)
    if (stream) {
      el.srcObject = stream
    }
  }
}

// Watch for stream changes and update video elements
watch(() => webRTC.remoteStreams.value, (streams) => {
  console.log('Remote streams updated, count:', streams.size)
  streams.forEach((stream, userId) => {
    console.log('Processing stream for user:', userId, 'tracks:', stream.getTracks().map(t => t.kind))
    const videoEl = remoteVideoRefs.value.get(userId)
    if (videoEl) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream
        console.log('Stream attached to video element for user:', userId)
      }
    } else {
      console.log('No video element found for user:', userId)
    }
    
    // Also update participant stream reference
    const participant = participants.value.get(userId)
    if (participant && participant.stream !== stream) {
      participant.stream = stream
      participants.value = new Map(participants.value) // Force reactivity
    }
  })
}, { deep: true, immediate: true })

// Lifecycle
onMounted(async () => {
  try {
    // Fetch session details
    await liveSessionsStore.fetchSession(sessionId.value)
    session.value = liveSessionsStore.currentSession
    
    if (!session.value) {
      toast.error('Không tìm thấy buổi học')
      router.push('/dashboard')
      return
    }
    
    // Check if session is active
    if (session.value.status !== 'live' && session.value.status !== 'scheduled') {
      toast.error('Buổi học chưa bắt đầu hoặc đã kết thúc')
      router.push('/dashboard')
      return
    }
    
    // Initialize camera for pre-join preview
    isLoading.value = false
    await initPreJoinMedia()
    
  } catch (error) {
    console.error('Error loading session:', error)
    toast.error('Không thể tải thông tin buổi học')
    router.push('/dashboard')
  } finally {
    isLoading.value = false
  }
})

// Initialize media for pre-join preview
const initPreJoinMedia = async () => {
  try {
    const stream = await webRTC.initLocalStream(preJoinAudioEnabled.value, preJoinVideoEnabled.value)
    if (stream) {
      preJoinStreamReady.value = true
      await nextTick()
      attachLocalStream()
    }
  } catch (error) {
    console.error('Failed to init pre-join media:', error)
  }
}

// Toggle pre-join mic
const togglePreJoinMic = () => {
  preJoinAudioEnabled.value = !preJoinAudioEnabled.value
  if (webRTC.localStream.value) {
    const audioTracks = webRTC.localStream.value.getAudioTracks()
    audioTracks.forEach(track => {
      track.enabled = preJoinAudioEnabled.value
    })
  }
}

// Toggle pre-join camera
const togglePreJoinCamera = () => {
  preJoinVideoEnabled.value = !preJoinVideoEnabled.value
  if (webRTC.localStream.value) {
    const videoTracks = webRTC.localStream.value.getVideoTracks()
    videoTracks.forEach(track => {
      track.enabled = preJoinVideoEnabled.value
    })
  }
}

onUnmounted(() => {
  // Cleanup on leave
  webRTC.cleanup()
  liveSocket.disconnect()
})

// Prevent accidental navigation
onBeforeRouteLeave((_to, _from, next) => {
  if (hasJoined.value) {
    const confirmed = window.confirm('Bạn có chắc muốn rời khỏi buổi học?')
    if (confirmed) {
      webRTC.cleanup()
      liveSocket.disconnect()
      next()
    } else {
      next(false)
    }
  } else {
    next()
  }
})
</script>

<template>
  <div class="fixed inset-0 bg-gray-900 flex flex-col">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p class="mt-4 text-gray-400">Đang tải...</p>
      </div>
    </div>
    
    <!-- Pre-join Screen -->
    <div v-else-if="!hasJoined && !isWaitingForAdmission" class="flex-1 flex items-center justify-center p-4">
      <div class="max-w-lg w-full bg-gray-800 rounded-2xl p-8">
        <h1 class="text-2xl font-bold text-white mb-2">{{ session?.title }}</h1>
        <p class="text-gray-400 mb-6">{{ session?.class?.name }}</p>
        
        <!-- Preview Video -->
        <div class="aspect-video bg-gray-700 rounded-xl overflow-hidden mb-6 relative">
          <video
            :ref="setLocalVideoRef"
            autoplay
            muted
            playsinline
            class="w-full h-full object-cover mirror"
            :class="{ 'hidden': !preJoinVideoEnabled }"
          />
          <div v-if="!preJoinVideoEnabled || !preJoinStreamReady" class="absolute inset-0 flex items-center justify-center bg-gray-700">
            <div class="text-center">
              <div class="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-3xl font-bold mx-auto mb-3">
                {{ authStore.user?.fullName?.charAt(0) || 'U' }}
              </div>
              <p class="text-gray-400 text-sm">{{ preJoinStreamReady ? 'Camera đang tắt' : 'Đang khởi tạo camera...' }}</p>
            </div>
          </div>
        </div>
        
        <!-- Media Controls -->
        <div class="flex justify-center gap-4 mb-8">
          <button
            class="w-14 h-14 rounded-full flex items-center justify-center transition-all"
            :class="preJoinAudioEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
            @click="togglePreJoinMic"
          >
            <svg v-if="preJoinAudioEnabled" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          
          <button
            class="w-14 h-14 rounded-full flex items-center justify-center transition-all"
            :class="preJoinVideoEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
            @click="togglePreJoinCamera"
          >
            <svg v-if="preJoinVideoEnabled" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            <svg v-else class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          </button>
        </div>
        
        <!-- Join Button -->
        <button
          class="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          :disabled="isJoining"
          @click="joinSession"
        >
          <span v-if="isJoining" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {{ isJoining ? 'Đang kết nối...' : 'Tham gia ngay' }}
        </button>
        
        <button
          class="w-full mt-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
          @click="router.push('/dashboard')"
        >
          Quay lại
        </button>
      </div>
    </div>
    
    <!-- Waiting for Admission Screen -->
    <div v-else-if="isWaitingForAdmission" class="flex-1 flex items-center justify-center p-4">
      <div class="max-w-lg w-full bg-gray-800 rounded-2xl p-8 text-center">
        <div class="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-orange-400 animate-pulse" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        
        <h1 class="text-2xl font-bold text-white mb-2">Đang chờ chấp nhận</h1>
        <p class="text-gray-400 mb-6">
          Yêu cầu tham gia của bạn đã được gửi đến giảng viên.<br>
          Vui lòng đợi trong giây lát...
        </p>
        
        <div class="flex justify-center gap-2 mb-6">
          <span class="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style="animation-delay: 0ms"></span>
          <span class="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style="animation-delay: 150ms"></span>
          <span class="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style="animation-delay: 300ms"></span>
        </div>
        
        <p class="text-sm text-gray-500">{{ session?.title }}</p>
        <p class="text-xs text-gray-600">{{ session?.class?.name }}</p>
        
        <button
          class="w-full mt-8 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
          @click="router.push('/dashboard')"
        >
          Hủy và quay lại
        </button>
      </div>
    </div>
    
    <!-- In Session View -->
    <template v-else>
      <!-- Header -->
      <header class="h-16 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 flex items-center justify-between px-4">
        <div class="flex items-center gap-4">
          <div>
            <h1 class="text-white font-semibold">{{ session?.title || 'Buổi học' }}</h1>
            <p class="text-gray-400 text-sm">{{ session?.class?.name }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Share Link Button -->
          <button
            v-if="authStore.isTeacher"
            class="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary font-medium transition-colors flex items-center gap-2"
            @click="showShareModal = true"
            title="Chia sẻ link phiên live"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span class="hidden sm:inline">Chia sẻ</span>
          </button>

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
            <span class="text-sm">{{ allParticipants.length }}</span>
          </div>

          <!-- Connection status -->
          <div 
            class="flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm"
            :class="liveSocket.isConnected.value ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
          >
            <span class="w-2 h-2 rounded-full" :class="liveSocket.isConnected.value ? 'bg-green-500' : 'bg-red-500'" />
            {{ liveSocket.isConnected.value ? 'Kết nối' : 'Mất kết nối' }}
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
      <div class="flex-1 flex overflow-hidden min-h-0">
        <!-- Video Area -->
        <div class="flex-1 flex flex-col min-h-0">
          <!-- Video Grid - ensure it doesn't overflow -->
          <div class="flex-1 p-4 relative min-h-0 overflow-hidden">
            <!-- Screen Share Mode: Screen is main, camera is PIP -->
            <!-- LOCAL Screen Share -->
            <template v-if="webRTC.isScreenSharing.value">
              <!-- Main Screen Share View - constrained height -->
              <div class="h-full w-full bg-gray-800 rounded-2xl overflow-hidden relative">
                <video
                  :ref="setScreenVideoRef"
                  autoplay
                  playsinline
                  class="w-full h-full object-contain bg-black"
                />
                <div class="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Đang chia sẻ màn hình
                </div>
              </div>
              
              <!-- PIP Camera View (bottom right corner) - above controls -->
              <div class="absolute bottom-4 right-4 w-36 h-24 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-600 z-10 hover:border-primary transition-colors">
                <video
                  :ref="setLocalVideoRef"
                  autoplay
                  muted
                  playsinline
                  class="w-full h-full object-cover mirror"
                  :class="{ 'hidden': !webRTC.isVideoEnabled.value }"
                />
                <div v-if="!webRTC.isVideoEnabled.value" class="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                    {{ authStore.user?.fullName?.charAt(0) || 'U' }}
                  </div>
                </div>
                <div class="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/80 to-transparent">
                  <span class="text-white text-xs">Bạn</span>
                </div>
              </div>
            </template>
            
            <!-- REMOTE Screen Share Mode -->
            <template v-else-if="remoteScreenShareUserId">
              <!-- Main Remote Screen Share View -->
              <div class="h-full w-full bg-gray-800 rounded-2xl overflow-hidden relative">
                <video
                  ref="remoteScreenVideoRef"
                  autoplay
                  playsinline
                  class="w-full h-full object-contain bg-black"
                />
                <div class="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  {{ screenSharerName }} đang chia sẻ màn hình
                </div>
              </div>
              
              <!-- PIP Camera View for local user -->
              <div class="absolute bottom-4 right-4 w-36 h-24 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-600 z-10 hover:border-primary transition-colors">
                <video
                  :ref="setLocalVideoRef"
                  autoplay
                  muted
                  playsinline
                  class="w-full h-full object-cover mirror"
                  :class="{ 'hidden': !webRTC.isVideoEnabled.value }"
                />
                <div v-if="!webRTC.isVideoEnabled.value" class="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                    {{ authStore.user?.fullName?.charAt(0) || 'U' }}
                  </div>
                </div>
                <div class="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/80 to-transparent">
                  <span class="text-white text-xs">Bạn</span>
                </div>
              </div>
            </template>
            
            <!-- Normal Mode: Video Grid -->
            <div 
              v-else
              class="h-full grid gap-3" 
              :class="[
                allParticipants.length === 1 ? 'grid-cols-1' :
                allParticipants.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                allParticipants.length <= 4 ? 'grid-cols-2' :
                allParticipants.length <= 9 ? 'grid-cols-2 md:grid-cols-3' :
                'grid-cols-3 md:grid-cols-4'
              ]"
            >
              <!-- Participant Videos -->
              <div
                v-for="participant in allParticipants"
                :key="participant.id"
                class="relative bg-gray-800 rounded-2xl overflow-hidden"
              >
                <!-- Video element -->
                <video
                  v-if="participant.id === authStore.user?.id"
                  :ref="setLocalVideoRef"
                  autoplay
                  muted
                  playsinline
                  class="absolute inset-0 w-full h-full object-cover mirror"
                  :class="{ 'hidden': !participant.isCameraOn }"
                />
                <video
                  v-else
                  :ref="(el) => setVideoRef(el as HTMLVideoElement, participant.id)"
                  autoplay
                  playsinline
                  class="absolute inset-0 w-full h-full object-cover"
                  :class="{ 'opacity-0': !participant.stream }"
                />
                
                <!-- Avatar placeholder when video is off or no stream -->
                <div 
                  v-if="(participant.id === authStore.user?.id && !participant.isCameraOn) || (participant.id !== authStore.user?.id && (!participant.stream || !participant.isCameraOn))"
                  class="absolute inset-0 flex items-center justify-center bg-gray-800"
                >
                  <div class="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-2xl md:text-3xl font-bold">
                    {{ participant.fullName?.charAt(0) || 'U' }}
                  </div>
                </div>

                <!-- Hand raised indicator -->
                <div 
                  v-if="participant.handRaised"
                  class="absolute top-3 right-3 w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center animate-bounce"
                >
                  ✋
                </div>

                <!-- Participant info overlay -->
                <div class="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-white text-sm font-medium truncate">
                        {{ participant.id === authStore.user?.id ? 'Bạn' : participant.fullName }}
                      </span>
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
                        </svg>
                        <svg v-else class="w-3.5 h-3.5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
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
              :class="webRTC.isAudioEnabled.value ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
              :title="webRTC.isAudioEnabled.value ? 'Tắt mic' : 'Bật mic'"
              @click="toggleMic"
            >
              <svg v-if="webRTC.isAudioEnabled.value" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
              :class="webRTC.isVideoEnabled.value ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'"
              :title="webRTC.isVideoEnabled.value ? 'Tắt camera' : 'Bật camera'"
              @click="toggleCamera"
            >
              <svg v-if="webRTC.isVideoEnabled.value" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
              :class="webRTC.isScreenSharing.value ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
              :title="webRTC.isScreenSharing.value ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'"
              @click="toggleScreenShare"
            >
              <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </button>

            <div class="w-px h-8 bg-gray-600 mx-2" />

            <!-- Hand Raise (for students) -->
            <button
              v-if="!authStore.isTeacher"
              class="w-12 h-12 rounded-full flex items-center justify-center transition-all"
              :class="isHandRaised ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
              :title="isHandRaised ? 'Hạ tay' : 'Giơ tay'"
              @click="toggleHandRaise"
            >
              <span class="text-2xl">✋</span>
            </button>

            <!-- Emoji Reactions -->
            <div class="relative">
              <button
                class="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-gray-700 hover:bg-gray-600 text-white"
                title="Phản hồi"
                @click="showEmojiPicker = !showEmojiPicker"
              >
                <span class="text-xl">😊</span>
              </button>
              
              <!-- Emoji Picker Popup -->
              <Transition
                enter-active-class="transition-all duration-200"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition-all duration-150"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
              >
                <div 
                  v-if="showEmojiPicker"
                  class="absolute bottom-16 left-1/2 -translate-x-1/2 bg-gray-800 rounded-xl p-3 shadow-2xl border border-gray-700 z-20"
                >
                  <div class="flex gap-2">
                    <button
                      v-for="emoji in quickEmojis"
                      :key="emoji"
                      class="w-10 h-10 rounded-lg hover:bg-gray-700 flex items-center justify-center text-2xl transition-colors"
                      @click="sendEmojiReaction(emoji)"
                    >
                      {{ emoji }}
                    </button>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Whiteboard -->
            <button
              class="w-12 h-12 rounded-full flex items-center justify-center transition-all"
              :class="isWhiteboardOpen ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
              title="Bảng trắng"
              @click="isWhiteboardOpen = !isWhiteboardOpen"
            >
              <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>

            <!-- AI Transcription - Ghi chép tự động -->
            <button
              class="w-12 h-12 rounded-full flex items-center justify-center transition-all relative"
              :class="activePanel === 'transcription' ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
              title="AI Transcription - Ghi chép tự động"
              @click="togglePanel('transcription')"
            >
              <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
              <span class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-400 text-white text-[10px] flex items-center justify-center font-bold">AI</span>
            </button>

            <!-- Attendance - Điểm danh (cả teacher và student) -->
            <button
              class="w-12 h-12 rounded-full flex items-center justify-center transition-all"
              :class="activePanel === 'attendance' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
              title="Điểm danh"
              @click="togglePanel('attendance')"
            >
              <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </button>

            <!-- Recording (Host only) -->
            <button
              v-if="authStore.isTeacher"
              class="w-12 h-12 rounded-full flex items-center justify-center transition-all relative"
              :class="activePanel === 'recording' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
              title="Ghi hình"
              @click="togglePanel('recording')"
            >
              <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>

            <!-- Waiting Room (Host only) -->
            <button
              v-if="authStore.isTeacher"
              class="w-12 h-12 rounded-full flex items-center justify-center transition-all relative"
              :class="activePanel === 'waitingRoom' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
              title="Phòng chờ"
              @click="togglePanel('waitingRoom')"
            >
              <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </button>

            <!-- Participants -->
            <button
              class="w-12 h-12 rounded-full flex items-center justify-center transition-all relative"
              :class="activePanel === 'participants' ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
              title="Người tham gia"
              @click="togglePanel('participants')"
            >
              <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                {{ allParticipants.length }}
              </span>
            </button>

            <!-- Chat -->
            <button
              class="w-12 h-12 rounded-full flex items-center justify-center transition-all relative"
              :class="activePanel === 'chat' ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'"
              title="Chat"
              @click="togglePanel('chat')"
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

        <!-- Side Panel (Chat / Participants / Attendance / Recording / Waiting Room) -->
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="translate-x-full opacity-0"
          enter-to-class="translate-x-0 opacity-100"
          leave-active-class="transition-all duration-200"
          leave-from-class="translate-x-0 opacity-100"
          leave-to-class="translate-x-full opacity-0"
        >
          <div
            v-if="activePanel"
            class="w-80 bg-gray-800 border-l border-gray-700 flex flex-col"
          >
            <!-- Panel Header -->
            <div class="h-14 px-4 border-b border-gray-700 flex items-center justify-between">
              <h3 class="text-white font-medium">
                {{ 
                  activePanel === 'chat' ? 'Trò chuyện' : 
                  activePanel === 'participants' ? 'Người tham gia' :
                  activePanel === 'attendance' ? 'Điểm danh' :
                  activePanel === 'recording' ? 'Ghi hình' :
                  activePanel === 'waitingRoom' ? 'Phòng chờ' :
                  activePanel === 'transcription' ? '🎤 AI Transcription' : ''
                }}
              </h3>
              <button
                class="w-8 h-8 rounded-lg hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                @click="togglePanel(null)"
              >
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <!-- Chat Content -->
            <div v-if="activePanel === 'chat'" class="flex-1 flex flex-col">
              <div class="flex-1 overflow-y-auto p-4 space-y-4">
                <div v-if="messages.length === 0" class="text-center text-gray-500 py-8">
                  Chưa có tin nhắn nào
                </div>
                <div
                  v-for="msg in messages"
                  :key="msg.id"
                  class="flex gap-3"
                >
                  <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium flex-shrink-0">
                    {{ msg.userName?.charAt(0) || 'U' }}
                  </div>
                  <div class="flex-1">
                    <div class="flex items-baseline gap-2">
                      <span class="text-white text-sm font-medium">{{ msg.userName }}</span>
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
            <div v-if="activePanel === 'participants'" class="flex-1 overflow-y-auto p-4 space-y-2">
              <div
                v-for="p in allParticipants"
                :key="p.id"
                class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-700/50 transition-colors"
              >
                <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium relative">
                  {{ p.fullName?.charAt(0) || 'U' }}
                  <span 
                    v-if="p.handRaised"
                    class="absolute -top-1 -right-1 text-lg"
                  >✋</span>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-white text-sm font-medium">
                      {{ p.id === authStore.user?.id ? `${p.fullName} (Bạn)` : p.fullName }}
                    </span>
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

            <!-- Attendance Panel -->
            <div v-if="activePanel === 'attendance'" class="flex-1 overflow-y-auto p-4">
              <LiveAttendancePanel
                :session-id="sessionId"
                :is-host="authStore.isTeacher"
                :participants="allParticipants.map(p => ({ userId: p.id, userName: p.fullName }))"
              />
            </div>

            <!-- Recording Panel -->
            <div v-if="activePanel === 'recording'" class="flex-1 overflow-y-auto p-4">
              <LiveRecordingControls
                :session-id="sessionId"
                :is-host="authStore.isTeacher"
              />
            </div>

            <!-- Waiting Room Panel -->
            <div v-if="activePanel === 'waitingRoom'" class="flex-1 overflow-y-auto p-4">
              <LiveWaitingRoom
                :session-id="sessionId"
                :is-host="authStore.isTeacher"
                :user-id="authStore.user?.id || 0"
              />
            </div>

            <!-- AI Transcription Panel -->
            <div v-if="activePanel === 'transcription'" class="flex-1 overflow-y-auto p-2">
              <LiveTranscriptionPanel
                :session-id="sessionId"
              />
            </div>
          </div>
        </Transition>
      </div>

      <!-- Share Modal -->
      <Teleport to="body">
        <Transition
          enter-active-class="transition-all duration-200"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-all duration-150"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div v-if="showShareModal" class="fixed inset-0 z-50 flex items-center justify-center">
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showShareModal = false" />
            <div class="relative bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
              <button
                class="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                @click="showShareModal = false"
              >
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              <h3 class="text-xl font-semibold text-white mb-2">Chia sẻ phiên học</h3>
              <p class="text-gray-400 text-sm mb-6">Gửi link hoặc QR code cho sinh viên để tham gia</p>

              <!-- Link Input -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-gray-300 mb-2">Link tham gia</label>
                <div class="flex gap-2">
                  <input
                    :value="shareLink"
                    readonly
                    class="flex-1 h-11 px-4 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm"
                  />
                  <button
                    class="px-4 h-11 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium transition-colors flex items-center gap-2"
                    @click="copyShareLink"
                  >
                    <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Sao chép
                  </button>
                </div>
              </div>

              <!-- QR Code -->
              <div class="text-center">
                <label class="block text-sm font-medium text-gray-300 mb-3">QR Code</label>
                <div class="inline-flex bg-white p-4 rounded-xl">
                  <div class="w-48 h-48 flex items-center justify-center">
                    <img 
                      :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareLink)}`"
                      alt="QR Code"
                      class="w-full h-full"
                    />
                  </div>
                </div>
                <p class="text-gray-400 text-sm mt-3">Quét mã QR để tham gia trên điện thoại</p>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Whiteboard -->
      <LiveWhiteboard 
        :room-id="roomId"
        :is-open="isWhiteboardOpen"
        :can-draw="true"
        @close="isWhiteboardOpen = false"
      />
    </template>
  </div>
</template>

<style scoped>
.mirror {
  transform: scaleX(-1);
}
</style>
