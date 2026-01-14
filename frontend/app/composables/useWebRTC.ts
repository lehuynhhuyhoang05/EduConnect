interface PeerConnection {
  pc: RTCPeerConnection
  userId: number
  stream?: MediaStream
  screenStream?: MediaStream
}

interface WebRTCConfig {
  iceServers: RTCIceServer[]
}

export function useWebRTC() {
  const { toast } = useToast()
  const { $api } = useNuxtApp()
  const config = useRuntimeConfig()
  
  // Local streams
  const localStream = ref<MediaStream | null>(null)
  const localScreenStream = ref<MediaStream | null>(null)
  
  // Peer connections map: userId -> PeerConnection
  const peerConnections = ref<Map<number, PeerConnection>>(new Map())
  
  // Remote streams map: userId -> MediaStream
  const remoteStreams = ref<Map<number, MediaStream>>(new Map())
  const remoteScreenStreams = ref<Map<number, MediaStream>>(new Map())
  
  // Media state
  const isAudioEnabled = ref(true)
  const isVideoEnabled = ref(true)
  const isScreenSharing = ref(false)
  
  // ICE servers configuration
  const iceServers = ref<RTCIceServer[]>([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ])
  
  // Fetch WebRTC config from server (includes TURN servers)
  const fetchWebRTCConfig = async () => {
    try {
      const apiUrl = config.public.apiUrl
      const authStore = useAuthStore()
      
      const response = await $fetch<{ iceServers: RTCIceServer[] }>('/webrtc/config', {
        baseURL: apiUrl,
        headers: {
          Authorization: `Bearer ${authStore.token}`
        }
      })
      
      if (response.iceServers) {
        iceServers.value = response.iceServers
        console.log('WebRTC config loaded:', iceServers.value)
      }
    } catch (error) {
      console.warn('Failed to fetch WebRTC config, using defaults:', error)
    }
  }
  
  // Initialize local media stream
  const initLocalStream = async (audio = true, video = true): Promise<MediaStream | null> => {
    try {
      // If both audio and video are disabled, create an empty stream
      if (!audio && !video) {
        console.log('Both audio and video disabled, creating empty stream')
        localStream.value = new MediaStream()
        isAudioEnabled.value = false
        isVideoEnabled.value = false
        return localStream.value
      }
      
      const constraints: MediaStreamConstraints = {
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
        video: video ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user',
        } : false,
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStream.value = stream
      isAudioEnabled.value = audio
      isVideoEnabled.value = video
      
      console.log('Local stream initialized:', stream.getTracks().map(t => t.kind))
      return stream
    } catch (error: any) {
      console.error('Failed to get user media:', error)
      
      // For any error, create empty stream and allow joining
      // User can still participate without camera/mic
      console.log('Device unavailable or permission denied, creating empty stream')
      localStream.value = new MediaStream()
      isAudioEnabled.value = false
      isVideoEnabled.value = false
      
      if (error.name === 'NotAllowedError') {
        toast.warning('Không có quyền truy cập camera/mic. Bạn vẫn có thể tham gia.')
      } else if (error.name === 'NotReadableError' || error.name === 'NotFoundError') {
        toast.warning('Không thể truy cập camera/mic. Bạn vẫn có thể tham gia.')
      }
      
      return localStream.value
    }
  }
  
  // Start screen sharing
  const startScreenShare = async (
    onStopped?: () => void | Promise<void>,
  ): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })
      
      localScreenStream.value = stream
      isScreenSharing.value = true
      
      // Add screen tracks to all existing peer connections
      // AND trigger renegotiation for each
      const renegotiationPromises: Promise<void>[] = []
      
      stream.getTracks().forEach(track => {
        peerConnections.value.forEach((peerConn) => {
          console.log('Adding screen track to peer:', peerConn.userId, track.kind)
          peerConn.pc.addTrack(track, stream)
        })
      })
      
      // Handle when user stops sharing via browser UI
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenShare()
          void onStopped?.()
        }
      }
      
      console.log('Screen sharing started')
      return stream
    } catch (error: any) {
      console.error('Failed to start screen share:', error)
      if (error.name !== 'AbortError') {
        toast.error('Không thể chia sẻ màn hình')
      }
      return null
    }
  }
  
  // Trigger renegotiation for screen share
  const renegotiateForScreenShare = async (
    onIceCandidate: (userId: number, candidate: RTCIceCandidate) => void,
    sendOffer: (userId: number, offer: RTCSessionDescriptionInit) => void
  ) => {
    for (const [userId, peerConn] of peerConnections.value) {
      try {
        console.log('Renegotiating with peer:', userId)
        const offer = await peerConn.pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
        await peerConn.pc.setLocalDescription(offer)
        sendOffer(userId, offer)
      } catch (error) {
        console.error('Failed to renegotiate with peer:', userId, error)
      }
    }
  }
  
  // Renegotiate after stopping screen share to remove tracks
  const renegotiateAfterStopScreenShare = async (
    onIceCandidate: (userId: number, candidate: RTCIceCandidate) => void,
    sendOffer: (userId: number, offer: RTCSessionDescriptionInit) => void
  ) => {
    for (const [userId, peerConn] of peerConnections.value) {
      try {
        console.log('Renegotiating after stop screen share with peer:', userId)
        const offer = await peerConn.pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
        await peerConn.pc.setLocalDescription(offer)
        sendOffer(userId, offer)
      } catch (error) {
        console.error('Failed to renegotiate after stop with peer:', userId, error)
      }
    }
  }
  
  // Stop screen sharing
  const stopScreenShare = () => {
    if (localScreenStream.value) {
      // Stop all tracks
      // Clear onended handlers first: prevents duplicate stop callbacks when we stop programmatically
      localScreenStream.value.getTracks().forEach(track => {
        track.onended = null
      })
      localScreenStream.value.getTracks().forEach(track => track.stop())
      
      // Remove screen tracks from all peer connections
      localScreenStream.value.getTracks().forEach(track => {
        peerConnections.value.forEach((peerConn) => {
          const senders = peerConn.pc.getSenders()
          const sender = senders.find(s => s.track === track)
          if (sender) {
            console.log('Removing screen track from peer:', peerConn.userId)
            peerConn.pc.removeTrack(sender)
          }
        })
      })
      
      localScreenStream.value = null
    }
    isScreenSharing.value = false
    console.log('Screen sharing stopped')
  }
  
  // Toggle audio
  const toggleAudio = () => {
    if (localStream.value) {
      const audioTracks = localStream.value.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      isAudioEnabled.value = audioTracks[0]?.enabled ?? false
      console.log('Audio toggled:', isAudioEnabled.value)
    }
  }
  
  // Toggle video
  const toggleVideo = () => {
    if (localStream.value) {
      const videoTracks = localStream.value.getVideoTracks()
      videoTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      isVideoEnabled.value = videoTracks[0]?.enabled ?? false
      console.log('Video toggled:', isVideoEnabled.value)
    }
  }
  
  // Create a peer connection for a specific user
  const createPeerConnection = (
    userId: number, 
    onIceCandidate: (candidate: RTCIceCandidate) => void
  ): RTCPeerConnection => {
    console.log('Creating peer connection for user:', userId)
    
    const pc = new RTCPeerConnection({
      iceServers: iceServers.value,
      iceCandidatePoolSize: 10,
    })
    
    // Add local tracks to connection (camera/mic)
    if (localStream.value) {
      localStream.value.getTracks().forEach(track => {
        console.log('Adding local track to PC:', track.kind, track.label)
        pc.addTrack(track, localStream.value!)
      })
    }
    
    // Also add screen share tracks if active
    if (localScreenStream.value && isScreenSharing.value) {
      localScreenStream.value.getTracks().forEach(track => {
        console.log('Adding screen share track to PC:', track.kind, track.label)
        pc.addTrack(track, localScreenStream.value!)
      })
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate generated for:', userId)
        onIceCandidate(event.candidate)
      }
    }
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state for user ${userId}:`, pc.connectionState)
      if (pc.connectionState === 'failed') {
        console.error(`Connection failed for user ${userId}`)
        // Could trigger reconnection here
      }
    }
    
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for user ${userId}:`, pc.iceConnectionState)
    }
    
    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind, 'label:', event.track.label, 'from user:', userId)
      console.log('Track streams:', event.streams.length, event.streams.map(s => s.id))
      
      // Determine if this is a screen share track
      // Screen share tracks typically:
      // 1. Have 'screen' in the label
      // 2. Or come from a different stream than camera
      const isScreenTrack = 
        event.track.label.toLowerCase().includes('screen') ||
        event.track.label.toLowerCase().includes('window') ||
        event.track.label.toLowerCase().includes('display') ||
        event.track.label.toLowerCase().includes('monitor')
      
      if (isScreenTrack || (event.streams.length > 0 && (event.streams[0]?.getVideoTracks()?.length ?? 0) > 1)) {
        // This is a screen share track
        console.log('Detected screen share track from user:', userId)
        let screenStream = remoteScreenStreams.value.get(userId)
        if (!screenStream) {
          screenStream = new MediaStream()
          remoteScreenStreams.value.set(userId, screenStream)
        }
        screenStream.addTrack(event.track)

        const cleanupRemoteScreenStream = () => {
          const stream = remoteScreenStreams.value.get(userId)
          if (!stream) return
          stream.getTracks().forEach(t => {
            try {
              stream.removeTrack(t)
              t.stop()
            } catch {
              // ignore
            }
          })
          remoteScreenStreams.value.delete(userId)
          remoteScreenStreams.value = new Map(remoteScreenStreams.value)
        }

        // Some browsers keep the track "live" but stop producing frames.
        // React to ended/mute/inactive to avoid the viewer being stuck on the last frame.
        event.track.onended = () => {
          console.log('Remote screen track ended for user:', userId)
          cleanupRemoteScreenStream()
        }

        event.track.onmute = () => {
          // Delay a bit: transient mute can happen; but if it stays muted, treat as stopped.
          window.setTimeout(() => {
            if (event.track.readyState !== 'live' || event.track.muted) {
              console.log('Remote screen track muted/inactive for user:', userId)
              cleanupRemoteScreenStream()
            }
          }, 1500)
        }
        
        remoteScreenStreams.value = new Map(remoteScreenStreams.value)
        console.log('Remote screen stream tracks for user', userId, ':', screenStream.getTracks().map(t => t.kind))
      } else {
        // This is a camera/mic track
        let remoteStream = remoteStreams.value.get(userId)
        if (!remoteStream) {
          remoteStream = new MediaStream()
          remoteStreams.value.set(userId, remoteStream)
        }
        
        // Check if we already have a track of this kind, replace it
        const existingTracks = remoteStream.getTracks().filter(t => t.kind === event.track.kind)
        if (existingTracks.length > 0 && event.track.kind === 'video') {
          // Could be a screen share added as second video track
          // Check by stream id
          const existingStreamIds = new Set(existingTracks.map(t => t.id))
          if (!existingStreamIds.has(event.track.id)) {
            // New video track - likely screen share
            console.log('New video track detected, treating as screen share')
            let screenStream = remoteScreenStreams.value.get(userId)
            if (!screenStream) {
              screenStream = new MediaStream()
              remoteScreenStreams.value.set(userId, screenStream)
            }
            screenStream.addTrack(event.track)
            // Cleanup in case the sender stops sharing without renegotiation fully removing tracks
            event.track.onended = () => {
              const stream = remoteScreenStreams.value.get(userId)
              if (stream) {
                try {
                  stream.removeTrack(event.track)
                } catch {
                  // ignore
                }
                remoteScreenStreams.value.delete(userId)
                remoteScreenStreams.value = new Map(remoteScreenStreams.value)
              }
            }
            event.track.onmute = () => {
              window.setTimeout(() => {
                if (event.track.readyState !== 'live' || event.track.muted) {
                  const stream = remoteScreenStreams.value.get(userId)
                  if (stream) {
                    try {
                      stream.removeTrack(event.track)
                    } catch {
                      // ignore
                    }
                    remoteScreenStreams.value.delete(userId)
                    remoteScreenStreams.value = new Map(remoteScreenStreams.value)
                  }
                }
              }, 1500)
            }
            remoteScreenStreams.value = new Map(remoteScreenStreams.value)
            return
          }
        }
        
        remoteStream.addTrack(event.track)
        remoteStreams.value = new Map(remoteStreams.value)
        console.log('Remote stream tracks for user', userId, ':', remoteStream.getTracks().map(t => t.kind))
      }
    }
    
    // Store peer connection
    peerConnections.value.set(userId, { pc, userId })
    
    return pc
  }
  
  // Create and send offer to a peer
  const createOffer = async (
    userId: number,
    onIceCandidate: (candidate: RTCIceCandidate) => void
  ): Promise<RTCSessionDescriptionInit | null> => {
    try {
      const pc = createPeerConnection(userId, onIceCandidate)
      
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
      
      await pc.setLocalDescription(offer)
      console.log('Offer created for user:', userId)
      
      return offer
    } catch (error) {
      console.error('Failed to create offer:', error)
      return null
    }
  }
  
  // Handle received offer and create answer
  // Implements "polite peer" pattern to handle glare (both sides sending offers)
  const handleOffer = async (
    userId: number,
    offer: RTCSessionDescriptionInit,
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    localUserId?: number
  ): Promise<RTCSessionDescriptionInit | null> => {
    try {
      let peerConn = peerConnections.value.get(userId)
      let pc: RTCPeerConnection
      
      if (!peerConn) {
        pc = createPeerConnection(userId, onIceCandidate)
      } else {
        pc = peerConn.pc
        
        // Handle glare condition - both sides sent offers
        // The peer with higher userId wins (impolite), lower userId yields (polite)
        if (pc.signalingState !== 'stable') {
          const isPolite = localUserId !== undefined && localUserId < userId
          
          if (isPolite) {
            // Polite peer: rollback our offer and accept theirs
            console.log('Glare detected, rolling back (polite peer)')
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }),
              pc.setRemoteDescription(new RTCSessionDescription(offer))
            ])
          } else {
            // Impolite peer: ignore their offer, they should accept our answer
            console.log('Glare detected, ignoring incoming offer (impolite peer)')
            return null
          }
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(offer))
        }
        
        console.log('Remote description set for user:', userId)
        
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        console.log('Answer created for user:', userId)
        
        return answer
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      console.log('Remote description set for user:', userId)
      
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      console.log('Answer created for user:', userId)
      
      return answer
    } catch (error) {
      console.error('Failed to handle offer:', error)
      return null
    }
  }
  
  // Handle received answer
  const handleAnswer = async (userId: number, answer: RTCSessionDescriptionInit) => {
    try {
      const peerConn = peerConnections.value.get(userId)
      if (!peerConn) {
        console.error('No peer connection for user:', userId)
        return
      }
      
      // Only set answer if we're in the right state (have-local-offer)
      if (peerConn.pc.signalingState !== 'have-local-offer') {
        console.log('Ignoring answer - wrong signaling state:', peerConn.pc.signalingState)
        return
      }
      
      await peerConn.pc.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('Answer handled for user:', userId)
    } catch (error) {
      console.error('Failed to handle answer:', error)
    }
  }
  
  // Handle received ICE candidate
  const handleIceCandidate = async (userId: number, candidate: RTCIceCandidateInit) => {
    try {
      const peerConn = peerConnections.value.get(userId)
      if (!peerConn) {
        console.warn('No peer connection for ICE candidate from user:', userId)
        return
      }
      
      await peerConn.pc.addIceCandidate(new RTCIceCandidate(candidate))
      console.log('ICE candidate added for user:', userId)
    } catch (error) {
      console.error('Failed to add ICE candidate:', error)
    }
  }
  
  // Remove peer connection
  const removePeerConnection = (userId: number) => {
    const peerConn = peerConnections.value.get(userId)
    if (peerConn) {
      peerConn.pc.close()
      peerConnections.value.delete(userId)
      remoteStreams.value.delete(userId)
      remoteScreenStreams.value.delete(userId)
      
      // Force reactivity update
      remoteStreams.value = new Map(remoteStreams.value)
      
      console.log('Peer connection removed for user:', userId)
    }
  }
  
  // Cleanup all resources
  const cleanup = () => {
    // Stop local streams
    if (localStream.value) {
      localStream.value.getTracks().forEach(track => track.stop())
      localStream.value = null
    }
    
    if (localScreenStream.value) {
      localScreenStream.value.getTracks().forEach(track => track.stop())
      localScreenStream.value = null
    }
    
    // Close all peer connections
    peerConnections.value.forEach((peerConn) => {
      peerConn.pc.close()
    })
    peerConnections.value.clear()
    remoteStreams.value.clear()
    remoteScreenStreams.value.clear()
    
    isAudioEnabled.value = true
    isVideoEnabled.value = true
    isScreenSharing.value = false
    
    console.log('WebRTC cleanup complete')
  }
  
  return {
    // Streams
    localStream: readonly(localStream),
    localScreenStream: readonly(localScreenStream),
    remoteStreams: readonly(remoteStreams),
    remoteScreenStreams: readonly(remoteScreenStreams),
    
    // State
    isAudioEnabled: readonly(isAudioEnabled),
    isVideoEnabled: readonly(isVideoEnabled),
    isScreenSharing: readonly(isScreenSharing),
    peerConnections: readonly(peerConnections),
    
    // Methods
    fetchWebRTCConfig,
    initLocalStream,
    startScreenShare,
    stopScreenShare,
    renegotiateForScreenShare,
    renegotiateAfterStopScreenShare,
    toggleAudio,
    toggleVideo,
    createPeerConnection,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    removePeerConnection,
    cleanup,
  }
}
