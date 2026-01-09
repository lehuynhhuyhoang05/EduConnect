import { Socket } from 'socket.io-client';

interface PeerConnection {
  userId: number;
  connection: RTCPeerConnection;
  remoteStream?: MediaStream;
}

export class WebRTCService {
  private peerConnections: Map<number, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private socket: Socket | null = null;
  private roomId: string = '';

  // ICE servers (STUN/TURN)
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  // Callbacks
  private onRemoteStreamCallback?: (userId: number, stream: MediaStream) => void;
  private onRemoveStreamCallback?: (userId: number) => void;
  private onErrorCallback?: (error: Error) => void;
  private onLocalStreamCallback?: (stream: MediaStream) => void;
  private onScreenStreamCallback?: (stream: MediaStream | null) => void;

  constructor(socket: Socket, roomId: string, myUserId: number) {
    this.socket = socket;
    this.roomId = roomId;
    this._myUserId = myUserId;
    this.setupSocketListeners();
  }

  // Setup socket event listeners for WebRTC signaling
  private setupSocketListeners() {
    if (!this.socket) return;

    // Receive offer
    this.socket.on('webrtc-offer', async (data: { fromUserId: number; sdp: RTCSessionDescriptionInit }) => {
      console.log(`[WebRTC] Received offer from user ${data.fromUserId}`);
      await this.handleOffer(data.fromUserId, data.sdp);
    });

    // Receive answer
    this.socket.on('webrtc-answer', async (data: { fromUserId: number; sdp: RTCSessionDescriptionInit }) => {
      console.log(`[WebRTC] Received answer from user ${data.fromUserId}`);
      await this.handleAnswer(data.fromUserId, data.sdp);
    });

    // Receive ICE candidate
    this.socket.on('webrtc-ice-candidate', async (data: { fromUserId: number; candidate: RTCIceCandidateInit }) => {
      console.log(`[WebRTC] Received ICE candidate from user ${data.fromUserId}`);
      await this.handleIceCandidate(data.fromUserId, data.candidate);
    });

    // User left - cleanup connection
    this.socket.on('user-left', (data: { userId: number }) => {
      console.log(`[WebRTC] User ${data.userId} left, cleaning up connection`);
      this.closePeerConnection(data.userId);
    });
  }

  // Get user media (camera + microphone)
  async startLocalStream(audio = true, video = true): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });

      this.localStream = stream;
      console.log('[WebRTC] Local stream started:', stream.getTracks().map(t => t.kind));
      
      if (this.onLocalStreamCallback) {
        this.onLocalStreamCallback(stream);
      }

      return stream;
    } catch (error: any) {
      console.error('[WebRTC] Failed to get user media:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error(`Không thể truy cập camera/mic: ${error.message}`));
      }
      throw error;
    }
  }

  // Start screen sharing
  async startScreenShare(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false,
      });

      console.log('[WebRTC] Screen share started');
      
      return stream;
    } catch (error: any) {
      console.error('[WebRTC] Failed to get display media:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error(`Không thể chia sẻ màn hình: ${error.message}`));
      }
      throw error;
    }
  }

  // Stop screen sharing
  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    if (this.onScreenStreamCallback) {
      this.onScreenStreamCallback(null);
    }
    console.log('[WebRTC] Stopping screen share');
  }

  // Create peer connection for a user
  private createPeerConnection(userId: number): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });

    // Add local stream tracks to connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle negotiation needed (triggered when tracks are added)
    pc.onnegotiationneeded = async () => {
      console.log(`[WebRTC] Negotiation needed for user ${userId}`);
      try {
        // Only renegotiate if we're the offerer (have local description)
        if (pc.signalingState === 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          
          if (this.socket) {
            this.socket.emit('webrtc-offer', {
              roomId: this.roomId,
              targetUserId: userId,
              sdp: offer,
            });
            console.log(`[WebRTC] Sent renegotiation offer to user ${userId}`);
          }
        }
      } catch (err) {
        console.error(`[WebRTC] Renegotiation failed for user ${userId}:`, err);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('webrtc-ice-candidate', {
          roomId: this.roomId,
          targetUserId: userId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Handle remote stream (including new tracks from renegotiation)
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from user ${userId}:`, event.track.kind);
      const peerConn = this.peerConnections.get(userId);
      if (peerConn) {
        // Always update the stream (handles both new connections and renegotiations)
        const stream = event.streams[0];
        if (stream) {
          peerConn.remoteStream = stream;
          if (this.onRemoteStreamCallback) {
            this.onRemoteStreamCallback(userId, stream);
            console.log(`[WebRTC] Updated remote stream for user ${userId}`);
          }
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state with user ${userId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeerConnection(userId);
      }
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state with user ${userId}:`, pc.iceConnectionState);
    };

    return pc;
  }

  // Connect to a peer (create offer)
  async connectToPeer(userId: number) {
    try {
      console.log(`[WebRTC] Connecting to user ${userId}`);
      
      const pc = this.createPeerConnection(userId);
      this.peerConnections.set(userId, { userId, connection: pc });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (this.socket) {
        this.socket.emit('webrtc-offer', {
          roomId: this.roomId,
          targetUserId: userId,
          sdp: offer,
        });
      }

      console.log(`[WebRTC] Sent offer to user ${userId}`);
    } catch (error: any) {
      console.error(`[WebRTC] Error connecting to user ${userId}:`, error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    }
  }

  // Handle incoming offer (including renegotiation)
  private async handleOffer(fromUserId: number, sdp: RTCSessionDescriptionInit) {
    try {
      // Check if we already have a connection (renegotiation case)
      let peerConn = this.peerConnections.get(fromUserId);
      let pc: RTCPeerConnection;
      
      if (peerConn) {
        // Renegotiation - use existing connection
        pc = peerConn.connection;
        console.log(`[WebRTC] Renegotiating with user ${fromUserId}`);
      } else {
        // New connection
        pc = this.createPeerConnection(fromUserId);
        this.peerConnections.set(fromUserId, { userId: fromUserId, connection: pc });
        console.log(`[WebRTC] New connection with user ${fromUserId}`);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (this.socket) {
        this.socket.emit('webrtc-answer', {
          roomId: this.roomId,
          targetUserId: fromUserId,
          sdp: answer,
        });
      }

      console.log(`[WebRTC] Sent answer to user ${fromUserId}`);
    } catch (error: any) {
      console.error(`[WebRTC] Error handling offer from user ${fromUserId}:`, error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    }
  }

  // Handle incoming answer
  private async handleAnswer(fromUserId: number, sdp: RTCSessionDescriptionInit) {
    try {
      const peerConn = this.peerConnections.get(fromUserId);
      if (peerConn) {
        await peerConn.connection.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log(`[WebRTC] Set remote description for user ${fromUserId}`);
      }
    } catch (error: any) {
      console.error(`[WebRTC] Error handling answer from user ${fromUserId}:`, error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    }
  }

  // Handle incoming ICE candidate
  private async handleIceCandidate(fromUserId: number, candidate: RTCIceCandidateInit) {
    try {
      const peerConn = this.peerConnections.get(fromUserId);
      if (peerConn && peerConn.connection.remoteDescription) {
        await peerConn.connection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error: any) {
      console.error(`[WebRTC] Error adding ICE candidate from user ${fromUserId}:`, error);
    }
  }

  // Close connection with a specific peer
  closePeerConnection(userId: number) {
    const peerConn = this.peerConnections.get(userId);
    if (peerConn) {
      peerConn.connection.close();
      this.peerConnections.delete(userId);
      
      if (this.onRemoveStreamCallback) {
        this.onRemoveStreamCallback(userId);
      }
      
      console.log(`[WebRTC] Closed connection with user ${userId}`);
    }
  }

  // Toggle audio track
  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      console.log(`[WebRTC] Audio ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  // Toggle video track
  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      console.log(`[WebRTC] Video ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  // Replace video track with screen share
  async replaceWithScreenShare() {
    try {
      const screenStream = await this.startScreenShare();
      const videoTrack = screenStream.getVideoTracks()[0];

      // Store screen stream
      this.screenStream = screenStream;

      // Listen for when user stops sharing via browser button
      videoTrack.addEventListener('ended', () => {
        console.log('[WebRTC] Screen share ended by user (browser button)');
        this.handleScreenShareEnded();
      });

      // Replace or add video track in all peer connections
      this.peerConnections.forEach(({ connection }) => {
        const sender = connection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          // Replace existing video track
          sender.replaceTrack(videoTrack);
          console.log('[WebRTC] Replaced existing video track with screen share');
        } else {
          // No video sender exists (audio-only mode) - add new track
          connection.addTrack(videoTrack, screenStream);
          console.log('[WebRTC] Added screen share track (no existing video)');
        }
      });

      // Notify callback
      if (this.onScreenStreamCallback) {
        this.onScreenStreamCallback(screenStream);
      }

      return screenStream;
    } catch (error: any) {
      console.error('[WebRTC] Error replacing with screen share:', error);
      throw error;
    }
  }

  // Handle screen share ended (from browser stop button)
  private handleScreenShareEnded() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    // Notify callback that screen share ended
    if (this.onScreenStreamCallback) {
      this.onScreenStreamCallback(null);
    }
  }

  // Replace screen share with camera
  async replaceWithCamera() {
    // Stop screen stream tracks
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      
      // Replace video track in all peer connections
      this.peerConnections.forEach(({ connection }) => {
        const sender = connection.getSenders().find(s => s.track?.kind === 'video');
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      });
    }

    // Notify callback
    if (this.onScreenStreamCallback) {
      this.onScreenStreamCallback(null);
    }
  }

  // Stop all media tracks
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      console.log('[WebRTC] Local stream stopped');
    }
  }

  // Close all connections
  closeAllConnections() {
    this.peerConnections.forEach((_, userId) => {
      this.closePeerConnection(userId);
    });
    this.stopLocalStream();
    console.log('[WebRTC] All connections closed');
  }

  // Event handlers setters
  onRemoteStream(callback: (userId: number, stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  onRemoveStream(callback: (userId: number) => void) {
    this.onRemoveStreamCallback = callback;
  }

  onError(callback: (error: Error) => void) {
    this.onErrorCallback = callback;
  }

  onLocalStream(callback: (stream: MediaStream) => void) {
    this.onLocalStreamCallback = callback;
  }

  onScreenStream(callback: (stream: MediaStream | null) => void) {
    this.onScreenStreamCallback = callback;
  }

  // Get local stream
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Get screen stream
  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  // Get remote stream for a user
  getRemoteStream(userId: number): MediaStream | null {
    return this.peerConnections.get(userId)?.remoteStream || null;
  }

  // Get all remote streams
  getAllRemoteStreams(): Map<number, MediaStream> {
    const streams = new Map<number, MediaStream>();
    this.peerConnections.forEach((peerConn, userId) => {
      if (peerConn.remoteStream) {
        streams.set(userId, peerConn.remoteStream);
      }
    });
    return streams;
  }
}
