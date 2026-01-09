import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

// ============================================
// SOCKET CONNECTION MANAGER
// ============================================

class SocketManager {
  private mainSocket: Socket | null = null;
  private chatSocket: Socket | null = null;
  private liveSocket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private token: string | null = null;

  connect(token: string): Socket {
    this.token = token;
    
    // Main socket for general events
    if (!this.mainSocket?.connected) {
      this.mainSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.setupListeners(this.mainSocket, 'main');
    }

    return this.mainSocket;
  }

  // Connect to chat namespace
  connectChat(): Socket | null {
    if (!this.token) {
      // Try to get token from localStorage as fallback
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        this.token = storedToken;
      } else {
        console.warn('[SocketManager] No token available for chat socket');
        return null;
      }
    }
    
    // Always recreate socket if not connected to ensure fresh auth
    if (!this.chatSocket || !this.chatSocket.connected) {
      // Disconnect existing socket if any
      if (this.chatSocket) {
        this.chatSocket.disconnect();
      }
      
      this.chatSocket = io(`${SOCKET_URL}/chat`, {
        auth: { token: this.token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      this.setupListeners(this.chatSocket, 'chat');
    }

    return this.chatSocket;
  }

  // Connect to live session namespace
  connectLive(): Socket | null {
    if (!this.token) {
      // Try to get token from localStorage as fallback
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        this.token = storedToken;
      } else {
        console.warn('[SocketManager] No token available for live socket');
        return null;
      }
    }
    
    // Always recreate socket if not connected to ensure fresh auth
    if (!this.liveSocket || !this.liveSocket.connected) {
      // Disconnect existing socket if any
      if (this.liveSocket) {
        this.liveSocket.disconnect();
      }
      
      this.liveSocket = io(`${SOCKET_URL}/live`, {
        auth: { token: this.token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      this.setupListeners(this.liveSocket, 'live');
    }

    return this.liveSocket;
  }

  private setupListeners(socket: Socket, name: string): void {
    socket.on('connect', () => {
      console.log(`[${name}] Socket connected:`, socket.id);
      this.reconnectAttempts = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log(`[${name}] Socket disconnected:`, reason);
    });

    socket.on('connect_error', (error) => {
      console.error(`[${name}] Socket connection error:`, error);
      this.reconnectAttempts++;
    });

    socket.on('error', (error) => {
      console.error(`[${name}] Socket error:`, error);
    });
  }

  disconnect(): void {
    if (this.mainSocket) {
      this.mainSocket.disconnect();
      this.mainSocket = null;
    }
    if (this.chatSocket) {
      this.chatSocket.disconnect();
      this.chatSocket = null;
    }
    if (this.liveSocket) {
      this.liveSocket.disconnect();
      this.liveSocket = null;
    }
    this.token = null;
  }

  getSocket(): Socket | null {
    return this.mainSocket;
  }

  getChatSocket(): Socket | null {
    return this.chatSocket;
  }

  getLiveSocket(): Socket | null {
    return this.liveSocket;
  }

  isConnected(): boolean {
    return this.mainSocket?.connected ?? false;
  }

  isChatConnected(): boolean {
    return this.chatSocket?.connected ?? false;
  }

  isLiveConnected(): boolean {
    return this.liveSocket?.connected ?? false;
  }

  // Emit with acknowledgment - main socket
  emit<T>(event: string, data?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.mainSocket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.mainSocket.emit(event, data, (response: { success: boolean; data?: T; error?: string }) => {
        if (response?.success !== undefined) {
          if (response.success) {
            resolve(response.data as T);
          } else {
            reject(new Error(response.error || 'Unknown error'));
          }
        } else {
          resolve(response as T);
        }
      });
    });
  }

  // Subscribe to event
  on<T>(event: string, callback: (data: T) => void): void {
    this.mainSocket?.on(event, callback);
  }

  // Unsubscribe from event
  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (callback) {
      this.mainSocket?.off(event, callback);
    } else {
      this.mainSocket?.off(event);
    }
  }

  // ============================================
  // LIVE SESSION METHODS
  // ============================================

  joinLiveSession(sessionId: string): void {
    const socket = this.connectLive();
    if (socket) {
      socket.emit('join-session', { sessionId });
    }
  }

  leaveLiveSession(sessionId: string): void {
    const socket = this.liveSocket;
    if (socket) {
      socket.emit('leave-session', { sessionId });
    }
  }

  sendLiveMessage(sessionId: string, message: string): void {
    const socket = this.liveSocket;
    if (socket) {
      socket.emit('live-message', { sessionId, message });
    }
  }

  raiseHand(sessionId: string, raised: boolean): void {
    const socket = this.liveSocket;
    if (socket) {
      socket.emit('raise-hand', { sessionId, raised });
    }
  }

  // ============================================
  // WEBRTC METHODS
  // ============================================

  sendOffer(targetUserId: number, offer: RTCSessionDescriptionInit): void {
    const socket = this.liveSocket;
    if (socket) {
      socket.emit('signal', { targetUserId, type: 'offer', payload: offer });
    }
  }

  sendAnswer(targetUserId: number, answer: RTCSessionDescriptionInit): void {
    const socket = this.liveSocket;
    if (socket) {
      socket.emit('signal', { targetUserId, type: 'answer', payload: answer });
    }
  }

  sendIceCandidate(targetUserId: number, candidate: RTCIceCandidateInit): void {
    const socket = this.liveSocket;
    if (socket) {
      socket.emit('signal', { targetUserId, type: 'ice-candidate', payload: candidate });
    }
  }

  emitMediaStateChange(sessionId: string, mediaState: { video: boolean; audio: boolean }): void {
    const socket = this.liveSocket;
    if (socket) {
      socket.emit('media-state', { sessionId, ...mediaState });
    }
  }

  emitScreenShare(sessionId: string, isSharing: boolean): void {
    const socket = this.liveSocket;
    if (socket) {
      socket.emit('screen-share', { sessionId, isSharing });
    }
  }
}

export const socketManager = new SocketManager();

// ============================================
// NOTIFICATION SOCKET
// ============================================

export interface NotificationSocketEvents {
  'notification:new': (notification: {
    id: number;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) => void;
  'notification:read': (notificationIds: number[]) => void;
}

export const subscribeToNotifications = (
  onNewNotification: NotificationSocketEvents['notification:new'],
  onRead?: NotificationSocketEvents['notification:read']
): (() => void) => {
  const socket = socketManager.getSocket();
  if (!socket) return () => {};

  socket.on('notification:new', onNewNotification);
  if (onRead) {
    socket.on('notification:read', onRead);
  }

  return () => {
    socket.off('notification:new', onNewNotification);
    if (onRead) {
      socket.off('notification:read', onRead);
    }
  };
};

// ============================================
// CHAT SOCKET (uses /chat namespace)
// ============================================

export interface ChatMessage {
  id: number;
  roomType: 'class' | 'live_session';
  roomId: number;
  senderId: number;
  sender: { id: number; fullName: string; avatarUrl?: string };
  message: string;
  messageType: string;
  createdAt: string;
}

export interface ChatSocketEvents {
  'new-message': (message: ChatMessage) => void;
  'user-typing': (data: { userId: number; userName: string; isTyping: boolean }) => void;
  'message-edited': (message: ChatMessage) => void;
  'message-deleted': (data: { messageId: number }) => void;
  'user-joined': (data: { userId: number; userName: string; avatarUrl?: string }) => void;
  'user-left': (data: { userId: number; userName: string }) => void;
}

// Map frontend room types to backend format
const mapRoomType = (type: 'CLASS' | 'SESSION'): 'class' | 'live_session' => {
  return type === 'CLASS' ? 'class' : 'live_session';
};

export const joinChatRoom = (roomType: 'CLASS' | 'SESSION', roomId: number): Promise<{
  success: boolean;
  messages?: ChatMessage[];
  hasMore?: boolean;
  error?: string;
}> => {
  return new Promise((resolve) => {
    const socket = socketManager.connectChat();
    if (!socket) {
      resolve({ success: false, error: 'Chat socket not connected' });
      return;
    }

    socket.emit('join-room', { roomId: String(roomId), roomType: mapRoomType(roomType) }, (response: any) => {
      console.log('[Chat] join-room response:', response);
      resolve(response);
    });
  });
};

export const leaveChatRoom = (): void => {
  const socket = socketManager.getChatSocket();
  if (socket) {
    socket.emit('leave-room');
  }
};

export const sendChatMessage = (
  roomType: 'CLASS' | 'SESSION',
  roomId: number,
  message: string,
  messageType: string = 'text',
  replyTo?: number
): Promise<{ success: boolean; message?: ChatMessage; error?: string }> => {
  return new Promise((resolve) => {
    const socket = socketManager.getChatSocket();
    if (!socket) {
      resolve({ success: false, error: 'Chat socket not connected' });
      return;
    }

    socket.emit('send-message', { 
      roomId: String(roomId), 
      roomType: mapRoomType(roomType), 
      message, 
      messageType: messageType.toLowerCase(), 
      replyTo 
    }, (response: any) => {
      console.log('[Chat] send-message response:', response);
      resolve(response);
    });
  });
};

export const sendTypingIndicator = (roomType: 'CLASS' | 'SESSION', roomId: number, isTyping: boolean): void => {
  const socket = socketManager.getChatSocket();
  socket?.emit('typing', { roomId: String(roomId), roomType: mapRoomType(roomType), isTyping });
};

export const subscribeToChatRoom = (
  roomType: 'CLASS' | 'SESSION',
  roomId: number,
  callbacks: {
    onMessage: ChatSocketEvents['new-message'];
    onTyping?: ChatSocketEvents['user-typing'];
    onMessageEdited?: ChatSocketEvents['message-edited'];
    onMessageDeleted?: ChatSocketEvents['message-deleted'];
    onUserJoined?: ChatSocketEvents['user-joined'];
    onUserLeft?: ChatSocketEvents['user-left'];
  }
): (() => void) => {
  const socket = socketManager.connectChat();
  if (!socket) return () => {};

  // Join room first
  joinChatRoom(roomType, roomId);

  // Subscribe to events
  socket.on('new-message', callbacks.onMessage);
  if (callbacks.onTyping) socket.on('user-typing', callbacks.onTyping);
  if (callbacks.onMessageEdited) socket.on('message-edited', callbacks.onMessageEdited);
  if (callbacks.onMessageDeleted) socket.on('message-deleted', callbacks.onMessageDeleted);
  if (callbacks.onUserJoined) socket.on('user-joined', callbacks.onUserJoined);
  if (callbacks.onUserLeft) socket.on('user-left', callbacks.onUserLeft);

  return () => {
    leaveChatRoom();
    socket.off('new-message', callbacks.onMessage);
    if (callbacks.onTyping) socket.off('user-typing', callbacks.onTyping);
    if (callbacks.onMessageEdited) socket.off('message-edited', callbacks.onMessageEdited);
    if (callbacks.onMessageDeleted) socket.off('message-deleted', callbacks.onMessageDeleted);
    if (callbacks.onUserJoined) socket.off('user-joined', callbacks.onUserJoined);
    if (callbacks.onUserLeft) socket.off('user-left', callbacks.onUserLeft);
  };
};

// ============================================
// LIVE SESSION SOCKET (uses /live namespace)
// ============================================

export interface LiveSessionParticipant {
  userId: number;
  socketId?: string;
  userName?: string;
  avatarUrl?: string;
}

export interface LiveSessionSocketEvents {
  'connected': (data: { userId: number; socketId: string }) => void;
  'user-joined': (data: { userId: number; socketId: string; roomId: string; userName?: string; timestamp: string }) => void;
  'user-left': (data: { userId: number; roomId: string; timestamp: string }) => void;
  'session-started': (data: { sessionId: number }) => void;
  'session-ended': (data: { sessionId: number }) => void;
  'media-state-changed': (data: { userId: number; audio: boolean; video: boolean; screen?: boolean }) => void;
  'hand-raised': (data: { userId: number; timestamp: string }) => void;
  'hand-lowered': (data: { userId: number; timestamp: string }) => void;
  // WebRTC signaling
  'signal': (data: { from: number; type: string; payload: any }) => void;
}

export const joinLiveSession = (sessionId: number, roomId?: string, userName?: string): Promise<{
  success: boolean;
  roomId?: string;
  participants?: LiveSessionParticipant[];
  waiting?: boolean;
  error?: string;
}> => {
  return new Promise((resolve) => {
    const socket = socketManager.connectLive();
    if (!socket) {
      resolve({ success: false, error: 'Live socket not connected' });
      return;
    }

    const room = roomId || `session-${sessionId}`;
    socket.emit('join-room', { roomId: room, sessionId, userName }, (response: any) => {
      console.log('[Live] join-room response:', response);
      resolve(response);
    });
  });
};

export const leaveLiveSession = (sessionId: number): void => {
  const socket = socketManager.getLiveSocket();
  if (socket) {
    const roomId = `session-${sessionId}`;
    socket.emit('leave-room', { roomId });
  }
};

export const updateMediaState = (
  sessionId: number,
  state: { audio: boolean; video: boolean; screen?: boolean }
): void => {
  const socket = socketManager.getLiveSocket();
  if (socket) {
    const roomId = `session-${sessionId}`;
    socket.emit('media-state', { roomId, ...state });
  }
};

export const raiseHand = (sessionId: number): void => {
  const socket = socketManager.getLiveSocket();
  if (socket) {
    const roomId = `session-${sessionId}`;
    socket.emit('raise-hand', { roomId });
  }
};

export const lowerHand = (sessionId: number): void => {
  const socket = socketManager.getLiveSocket();
  if (socket) {
    const roomId = `session-${sessionId}`;
    socket.emit('lower-hand', { roomId });
  }
};

export const subscribeToLiveSession = (
  sessionId: number,
  callbacks: {
    onUserJoined: LiveSessionSocketEvents['user-joined'];
    onUserLeft: LiveSessionSocketEvents['user-left'];
    onSessionStarted?: LiveSessionSocketEvents['session-started'];
    onSessionEnded?: LiveSessionSocketEvents['session-ended'];
    onMediaStateChanged?: LiveSessionSocketEvents['media-state-changed'];
    onHandRaised?: LiveSessionSocketEvents['hand-raised'];
    onHandLowered?: LiveSessionSocketEvents['hand-lowered'];
    onSignal?: LiveSessionSocketEvents['signal'];
  }
): (() => void) => {
  const socket = socketManager.connectLive();
  if (!socket) return () => {};

  // Subscribe to events
  socket.on('user-joined', callbacks.onUserJoined);
  socket.on('user-left', callbacks.onUserLeft);
  if (callbacks.onSessionStarted) socket.on('session-started', callbacks.onSessionStarted);
  if (callbacks.onSessionEnded) socket.on('session-ended', callbacks.onSessionEnded);
  if (callbacks.onMediaStateChanged) socket.on('media-state-changed', callbacks.onMediaStateChanged);
  if (callbacks.onHandRaised) socket.on('hand-raised', callbacks.onHandRaised);
  if (callbacks.onHandLowered) socket.on('hand-lowered', callbacks.onHandLowered);
  if (callbacks.onSignal) socket.on('signal', callbacks.onSignal);

  return () => {
    leaveLiveSession(sessionId);
    socket.off('user-joined');
    socket.off('user-left');
    socket.off('session-started');
    socket.off('session-ended');
    socket.off('media-state-changed');
    socket.off('hand-raised');
    socket.off('hand-lowered');
    socket.off('signal');
  };
};

// ============================================
// WEBRTC SIGNALING (uses /live namespace)
// ============================================

export interface WebRTCSignalingEvents {
  'signal': (data: { from: number; type: string; payload: any }) => void;
}

export const sendWebRTCSignal = (
  targetUserId: number,
  type: 'offer' | 'answer' | 'ice-candidate',
  payload: any
): void => {
  const socket = socketManager.getLiveSocket();
  if (socket) {
    socket.emit('signal', { targetUserId, type, payload });
    console.log(`[WebRTC] Sent ${type} to user ${targetUserId}`);
  }
};

export const sendWebRTCOffer = (_sessionId: number, targetUserId: number, offer: RTCSessionDescriptionInit): void => {
  sendWebRTCSignal(targetUserId, 'offer', offer);
};

export const sendWebRTCAnswer = (_sessionId: number, targetUserId: number, answer: RTCSessionDescriptionInit): void => {
  sendWebRTCSignal(targetUserId, 'answer', answer);
};

export const sendICECandidate = (sessionId: number, targetUserId: number, candidate: RTCIceCandidateInit): void => {
  sendWebRTCSignal(targetUserId, 'ice-candidate', candidate);
};

export const subscribeToWebRTCSignaling = (
  callbacks: {
    onOffer: (data: { from: number; offer: RTCSessionDescriptionInit }) => void;
    onAnswer: (data: { from: number; answer: RTCSessionDescriptionInit }) => void;
    onIceCandidate: (data: { from: number; candidate: RTCIceCandidateInit }) => void;
  }
): (() => void) => {
  const socket = socketManager.getLiveSocket();
  if (!socket) return () => {};

  const handleSignal = (data: { fromUserId: number; type: string; payload: any }) => {
    console.log(`[WebRTC] Received ${data.type} from user ${data.fromUserId}`, data);
    switch (data.type) {
      case 'offer':
        callbacks.onOffer({ from: data.fromUserId, offer: data.payload });
        break;
      case 'answer':
        callbacks.onAnswer({ from: data.fromUserId, answer: data.payload });
        break;
      case 'ice-candidate':
        callbacks.onIceCandidate({ from: data.fromUserId, candidate: data.payload });
        break;
    }
  };

  socket.on('signal', handleSignal);

  return () => {
    socket.off('signal', handleSignal);
  };
};

export default socketManager;
