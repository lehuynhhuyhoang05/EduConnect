import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  MessageSquare,
  Users,
  Hand,
  Maximize2,
  Minimize2,
  Grid,
  ChevronLeft,
  Send,
  Copy,
} from 'lucide-react';
import { useLiveSession, useJoinLiveSession, useLeaveLiveSession } from '../../hooks/useLiveSessions';
import { useAuthStore } from '../../store';
import { useWebRTC } from '../../hooks/useWebRTC';
import { socketManager } from '../../services/socket';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

type SessionState = 'lobby' | 'joining' | 'active' | 'ended';
type LayoutMode = 'grid' | 'spotlight' | 'sidebar';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  stream?: MediaStream;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
}

export function LiveSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Session state
  const [sessionState, setSessionState] = useState<SessionState>('lobby');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Panel visibility
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [_showSettings, _setShowSettings] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Participants
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Media devices
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  // API hooks
  const { data: session, isLoading: sessionLoading } = useLiveSession(sessionId || '');
  const joinSession = useJoinLiveSession();
  const leaveSession = useLeaveLiveSession();

  // WebRTC hook
  const {
    localStream,
    screenStream,
    peers,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    initializeMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    cleanup,
  } = useWebRTC({
    sessionId: sessionId || '',
    userId: user?.id || '',
    onRemoteStream: (peerId, stream) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === peerId ? { ...p, stream } : p))
      );
    },
    onPeerDisconnected: (peerId) => {
      setParticipants((prev) => prev.filter((p) => p.id !== peerId));
    },
  });

  // Get available media devices
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      }
    }
    getDevices();
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!sessionId || sessionState !== 'active') return;

    const liveSocket = socketManager.getLiveSocket();
    if (!liveSocket) return;

    const handleParticipantJoined = (participant: Participant) => {
      setParticipants((prev) => {
        if (prev.find((p) => p.id === participant.id)) return prev;
        return [...prev, participant];
      });
    };

    const handleParticipantLeft = (data: { oderId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== data.oderId));
    };

    const handleChatMessage = (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    };

    const handleHandRaised = (data: { oderId: string; raised: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === data.oderId ? { ...p, isHandRaised: data.raised } : p
        )
      );
    };

    const handleMediaStateChange = (data: {
      peerId: string;
      type: 'audio' | 'video';
      enabled: boolean;
    }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === data.peerId
            ? {
                ...p,
                isMuted: data.type === 'audio' ? !data.enabled : p.isMuted,
                isVideoOff: data.type === 'video' ? !data.enabled : p.isVideoOff,
              }
            : p
        )
      );
    };

    const handleSessionEnded = () => {
      setSessionState('ended');
    };

    liveSocket.on('participant-joined', handleParticipantJoined);
    liveSocket.on('participant-left', handleParticipantLeft);
    liveSocket.on('chat-message', handleChatMessage);
    liveSocket.on('hand-raised', handleHandRaised);
    liveSocket.on('media-state-change', handleMediaStateChange);
    liveSocket.on('session-ended', handleSessionEnded);

    return () => {
      liveSocket.off('participant-joined', handleParticipantJoined);
      liveSocket.off('participant-left', handleParticipantLeft);
      liveSocket.off('chat-message', handleChatMessage);
      liveSocket.off('hand-raised', handleHandRaised);
      liveSocket.off('media-state-change', handleMediaStateChange);
      liveSocket.off('session-ended', handleSessionEnded);
    };
  }, [sessionId, sessionState]);

  // Join session handler
  const handleJoinSession = async () => {
    if (!sessionId) return;

    setSessionState('joining');

    try {
      // Initialize media
      await initializeMedia(true, true);

      // Join via API
      await joinSession.mutateAsync(sessionId);

      // Connect to live socket
      await socketManager.connectLive();
      socketManager.joinLiveSession(sessionId);

      // Add self to participants
      setParticipants([
        {
          id: user?.id || '',
          name: user?.name || 'Bạn',
          avatar: user?.avatar,
          isHost: session?.hostId === user?.id,
          isMuted: false,
          isVideoOff: false,
          isHandRaised: false,
          isScreenSharing: false,
          stream: localStream || undefined,
        },
      ]);

      setSessionState('active');
    } catch (error) {
      console.error('Failed to join session:', error);
      setSessionState('lobby');
    }
  };

  // Leave session handler
  const handleLeaveSession = async () => {
    if (!sessionId) return;

    try {
      // Cleanup WebRTC
      cleanup();

      // Leave via socket
      socketManager.leaveLiveSession(sessionId);

      // Leave via API
      await leaveSession.mutateAsync(sessionId);

      navigate('/live-sessions');
    } catch (error) {
      console.error('Failed to leave session:', error);
    }
  };

  // Send chat message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !sessionId) return;

    socketManager.sendLiveMessage(sessionId, newMessage);

    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        userId: user?.id || '',
        userName: user?.name || 'Bạn',
        content: newMessage,
        timestamp: new Date(),
      },
    ]);

    setNewMessage('');
  };

  // Toggle hand raise
  const handleToggleHand = () => {
    if (!sessionId) return;
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    socketManager.raiseHand(sessionId, newState);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Copy invite link
  const copyInviteLink = () => {
    const link = `${window.location.origin}/live-session/${sessionId}`;
    navigator.clipboard.writeText(link);
  };

  // Loading state
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Đang tải phiên học...</p>
        </div>
      </div>
    );
  }

  // Session not found
  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Video className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Không tìm thấy phiên học
          </h2>
          <p className="text-neutral-400 mb-6">
            Phiên học này có thể đã kết thúc hoặc không tồn tại
          </p>
          <button
            onClick={() => navigate('/live-sessions')}
            className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  // Lobby state - Preview before joining
  if (sessionState === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl"
        >
          {/* Back button */}
          <button
            onClick={() => navigate('/live-sessions')}
            className="flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Quay lại
          </button>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Video Preview */}
            <div className="space-y-4">
              <div className="relative aspect-video bg-neutral-800 rounded-2xl overflow-hidden">
                {localStream ? (
                  <video
                    autoPlay
                    playsInline
                    muted
                    ref={(el) => {
                      if (el) el.srcObject = localStream;
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-neutral-700 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">
                        {user?.name?.[0] || 'U'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Preview controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full transition-colors ${
                      isAudioEnabled
                        ? 'bg-neutral-700 hover:bg-neutral-600'
                        : 'bg-error-500 hover:bg-error-600'
                    }`}
                  >
                    {isAudioEnabled ? (
                      <Mic className="w-5 h-5 text-white" />
                    ) : (
                      <MicOff className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-colors ${
                      isVideoEnabled
                        ? 'bg-neutral-700 hover:bg-neutral-600'
                        : 'bg-error-500 hover:bg-error-600'
                    }`}
                  >
                    {isVideoEnabled ? (
                      <Video className="w-5 h-5 text-white" />
                    ) : (
                      <VideoOff className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
              </div>

              {/* Device settings */}
              <div className="space-y-3">
                <select
                  value={selectedVideoDevice}
                  onChange={(e) => setSelectedVideoDevice(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Chọn camera</option>
                  {videoDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedAudioDevice}
                  onChange={(e) => setSelectedAudioDevice(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Chọn microphone</option>
                  {audioDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Mic ${device.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Session Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {session.title}
                </h1>
                <p className="text-neutral-400">{session.description}</p>
              </div>

              <div className="bg-neutral-800/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Lớp học</span>
                  <span className="text-white font-medium">
                    {session.class?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Giáo viên</span>
                  <span className="text-white font-medium">
                    {session.host?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Bắt đầu</span>
                  <span className="text-white font-medium">
                    {format(new Date(session.startTime), 'HH:mm - dd/MM/yyyy', {
                      locale: vi,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Trạng thái</span>
                  <span
                    className={`px-2 py-1 rounded-full text-sm font-medium ${
                      session.status === 'active'
                        ? 'bg-success-500/20 text-success-400'
                        : session.status === 'scheduled'
                        ? 'bg-warning-500/20 text-warning-400'
                        : 'bg-neutral-500/20 text-neutral-400'
                    }`}
                  >
                    {session.status === 'active'
                      ? 'Đang diễn ra'
                      : session.status === 'scheduled'
                      ? 'Sắp diễn ra'
                      : 'Đã kết thúc'}
                  </span>
                </div>
              </div>

              {/* Invite link */}
              <div className="bg-neutral-800/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-400">Link tham gia</span>
                  <button
                    onClick={copyInviteLink}
                    className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="text-sm">Sao chép</span>
                  </button>
                </div>
                <p className="text-sm text-neutral-500 truncate">
                  {window.location.origin}/live-session/{sessionId}
                </p>
              </div>

              {/* Join button */}
              <button
                onClick={handleJoinSession}
                disabled={session.status !== 'active'}
                className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all ${
                  session.status === 'active'
                    ? 'bg-primary-500 text-white hover:bg-primary-600 hover:shadow-glow'
                    : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                }`}
              >
                {session.status === 'active'
                  ? 'Tham gia ngay'
                  : session.status === 'scheduled'
                  ? 'Chưa bắt đầu'
                  : 'Phiên đã kết thúc'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Joining state
  if (sessionState === 'joining') {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Đang kết nối...</p>
        </div>
      </div>
    );
  }

  // Session ended state
  if (sessionState === 'ended') {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <PhoneOff className="w-16 h-16 text-error-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Phiên học đã kết thúc
          </h2>
          <p className="text-neutral-400 mb-6">
            Cảm ơn bạn đã tham gia phiên học. Hẹn gặp lại bạn trong phiên học
            tiếp theo!
          </p>
          <button
            onClick={() => navigate('/live-sessions')}
            className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  // Active session state
  return (
    <div className="h-screen bg-neutral-900 flex flex-col overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 p-4">
          <div
            className={`h-full grid gap-4 ${
              layoutMode === 'grid'
                ? participants.length <= 1
                  ? 'grid-cols-1'
                  : participants.length <= 4
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
                : layoutMode === 'spotlight'
                ? 'grid-cols-1'
                : 'grid-cols-4'
            }`}
          >
            {/* Local video */}
            <motion.div
              layout
              className={`relative bg-neutral-800 rounded-2xl overflow-hidden ${
                layoutMode === 'spotlight' && participants.length > 1
                  ? 'col-span-full row-span-2'
                  : ''
              }`}
            >
              {isScreenSharing && screenStream ? (
                <video
                  autoPlay
                  playsInline
                  ref={(el) => {
                    if (el) el.srcObject = screenStream;
                  }}
                  className="w-full h-full object-contain"
                />
              ) : localStream && isVideoEnabled ? (
                <video
                  autoPlay
                  playsInline
                  muted
                  ref={(el) => {
                    if (el) el.srcObject = localStream;
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary-400">
                      {user?.name?.[0] || 'U'}
                    </span>
                  </div>
                </div>
              )}

              {/* Name tag */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-white text-sm font-medium">
                  {user?.name} (Bạn)
                </span>
                {!isAudioEnabled && (
                  <span className="p-1.5 bg-error-500/80 rounded-lg">
                    <MicOff className="w-4 h-4 text-white" />
                  </span>
                )}
                {isHandRaised && (
                  <span className="p-1.5 bg-warning-500/80 rounded-lg">
                    <Hand className="w-4 h-4 text-white" />
                  </span>
                )}
              </div>
            </motion.div>

            {/* Remote videos */}
            {Array.from(peers.values()).map((peer) => {
              const participant = participants.find((p) => p.id === peer.peerId);
              return (
                <motion.div
                  key={peer.peerId}
                  layout
                  className="relative bg-neutral-800 rounded-2xl overflow-hidden"
                >
                  {peer.stream ? (
                    <video
                      autoPlay
                      playsInline
                      ref={(el) => {
                        if (el) el.srcObject = peer.stream!;
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-neutral-700 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">
                          {participant?.name?.[0] || '?'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Name tag */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-white text-sm font-medium">
                      {participant?.name || 'Unknown'}
                      {participant?.isHost && ' (Host)'}
                    </span>
                    {participant?.isMuted && (
                      <span className="p-1.5 bg-error-500/80 rounded-lg">
                        <MicOff className="w-4 h-4 text-white" />
                      </span>
                    )}
                    {participant?.isHandRaised && (
                      <span className="p-1.5 bg-warning-500/80 rounded-lg">
                        <Hand className="w-4 h-4 text-white" />
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Side panels */}
        <AnimatePresence>
          {(showChat || showParticipants) && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-neutral-800 border-l border-neutral-700 overflow-hidden flex flex-col"
            >
              {/* Panel tabs */}
              <div className="flex border-b border-neutral-700">
                <button
                  onClick={() => {
                    setShowChat(true);
                    setShowParticipants(false);
                  }}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    showChat
                      ? 'text-primary-400 border-b-2 border-primary-400'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => {
                    setShowParticipants(true);
                    setShowChat(false);
                  }}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    showParticipants
                      ? 'text-primary-400 border-b-2 border-primary-400'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Người tham gia ({participants.length})
                </button>
              </div>

              {/* Chat panel */}
              {showChat && (
                <div className="flex-1 flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-neutral-500 py-8">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Chưa có tin nhắn nào</p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            msg.userId === user?.id ? 'items-end' : 'items-start'
                          }`}
                        >
                          <span className="text-xs text-neutral-500 mb-1">
                            {msg.userName}
                          </span>
                          <div
                            className={`px-3 py-2 rounded-2xl max-w-[80%] ${
                              msg.userId === user?.id
                                ? 'bg-primary-500 text-white'
                                : 'bg-neutral-700 text-white'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <span className="text-xs text-neutral-500 mt-1">
                            {format(new Date(msg.timestamp), 'HH:mm')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Message input */}
                  <div className="p-4 border-t border-neutral-700">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-xl text-white placeholder-neutral-400 focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="p-2 bg-primary-500 rounded-xl text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Participants panel */}
              {showParticipants && (
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-3 bg-neutral-700/50 rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                        {participant.avatar ? (
                          <img
                            src={participant.avatar}
                            alt={participant.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-primary-400">
                            {participant.name[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {participant.name}
                          {participant.id === user?.id && ' (Bạn)'}
                        </p>
                        <p className="text-sm text-neutral-400">
                          {participant.isHost ? 'Host' : 'Thành viên'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {participant.isMuted && (
                          <MicOff className="w-4 h-4 text-error-400" />
                        )}
                        {participant.isVideoOff && (
                          <VideoOff className="w-4 h-4 text-error-400" />
                        )}
                        {participant.isHandRaised && (
                          <Hand className="w-4 h-4 text-warning-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control bar */}
      <div className="bg-neutral-800 border-t border-neutral-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{session.title}</span>
            <span className="text-neutral-500">•</span>
            <span className="text-neutral-400">
              {format(new Date(), 'HH:mm')}
            </span>
          </div>

          {/* Center controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-colors ${
                isAudioEnabled
                  ? 'bg-neutral-700 hover:bg-neutral-600 text-white'
                  : 'bg-error-500 hover:bg-error-600 text-white'
              }`}
              title={isAudioEnabled ? 'Tắt mic' : 'Bật mic'}
            >
              {isAudioEnabled ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-colors ${
                isVideoEnabled
                  ? 'bg-neutral-700 hover:bg-neutral-600 text-white'
                  : 'bg-error-500 hover:bg-error-600 text-white'
              }`}
              title={isVideoEnabled ? 'Tắt camera' : 'Bật camera'}
            >
              {isVideoEnabled ? (
                <Video className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`p-3 rounded-full transition-colors ${
                isScreenSharing
                  ? 'bg-primary-500 hover:bg-primary-600 text-white'
                  : 'bg-neutral-700 hover:bg-neutral-600 text-white'
              }`}
              title={isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
            >
              {isScreenSharing ? (
                <MonitorOff className="w-5 h-5" />
              ) : (
                <Monitor className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={handleToggleHand}
              className={`p-3 rounded-full transition-colors ${
                isHandRaised
                  ? 'bg-warning-500 hover:bg-warning-600 text-white'
                  : 'bg-neutral-700 hover:bg-neutral-600 text-white'
              }`}
              title={isHandRaised ? 'Hạ tay' : 'Giơ tay'}
            >
              <Hand className="w-5 h-5" />
            </button>

            <div className="w-px h-8 bg-neutral-700" />

            <button
              onClick={handleLeaveSession}
              className="px-6 py-3 bg-error-500 hover:bg-error-600 text-white rounded-full font-medium transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowChat(!showChat);
                setShowParticipants(false);
              }}
              className={`p-3 rounded-full transition-colors ${
                showChat
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 hover:bg-neutral-600 text-white'
              }`}
              title="Chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setShowParticipants(!showParticipants);
                setShowChat(false);
              }}
              className={`p-3 rounded-full transition-colors ${
                showParticipants
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 hover:bg-neutral-600 text-white'
              }`}
              title="Người tham gia"
            >
              <Users className="w-5 h-5" />
            </button>

            <button
              onClick={() => setLayoutMode(layoutMode === 'grid' ? 'spotlight' : 'grid')}
              className="p-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-full transition-colors"
              title="Đổi bố cục"
            >
              <Grid className="w-5 h-5" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-full transition-colors"
              title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
