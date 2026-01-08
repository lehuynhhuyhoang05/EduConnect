import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn, formatDate } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { SimpleContainer } from '@/components/layout/PageContainer';
import { VideoGrid } from '@/components/live-session/VideoGrid';
import { ControlBar } from '@/components/live-session/ControlBar';
import { ChatPanel, type ChatMessage } from '@/components/live-session/ChatPanel';
import { ParticipantsPanel } from '@/components/live-session/ParticipantsPanel';
import { type Participant } from '@/components/live-session/VideoTile';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';

import { Button } from '@/components/ui/Button';
import { 
  MessageSquare, 
  Users, 
  X, 
  Loader2, 
  AlertCircle, 
  Video,
  VideoOff,
  Mic,
  MicOff,
  Play,
  Square,
  Calendar,
  Clock,
  Settings,
  Monitor,
  Copy,
  Check,
  Share2,
} from 'lucide-react';
import { 
  useLiveSession, 
  useLiveSessionRealtime,
  useStartSession,
  useEndSession,
  useJoinSession,
  useLeaveSession,
} from '@/hooks/useLiveSessions';
import { useChatRealtime } from '@/hooks/useChat';
import { useCurrentUser } from '@/hooks/useAuth';
import { socketManager, joinChatRoom } from '@/services/socket';
import { useWebRTC } from '@/hooks/useWebRTC';

type SessionState = 'loading' | 'lobby' | 'joining' | 'active' | 'ended' | 'error';

const LiveSessionPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const sessionIdNum = sessionId ? parseInt(sessionId, 10) : 0;

  // Session state
  const [sessionState, setSessionState] = React.useState<SessionState>('loading');
  const [hasJoined, setHasJoined] = React.useState(false);

  // Fetch current user
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  
  // Fetch session details
  const { 
    data: session, 
    isLoading: sessionLoading, 
    error: sessionError,
    refetch: refetchSession,
  } = useLiveSession(sessionIdNum);
  
  // Mutations
  const startSessionMutation = useStartSession();
  const endSessionMutation = useEndSession();
  const joinSessionMutation = useJoinSession();
  const leaveSessionMutation = useLeaveSession();

  // Get current user's display name (wait until loaded; avoid sending fallback 'User')
  const currentUserName = currentUser
    ? (currentUser.fullName || currentUser.name || currentUser.email)
    : undefined;

  // Real-time participants (only active when joined)
  const { 
    participants: realtimeParticipants, 
    isRecording, 
    updateStatus,
    raiseHand,
    lowerHand 
  } = useLiveSessionRealtime(hasJoined ? sessionIdNum : 0, currentUserName);
  
  // Real-time chat (only active when joined)
  const { 
    messages: chatMessages, 
    sendMessage: sendChatMessage,
    isLoading: chatLoading,
  } = useChatRealtime('SESSION', hasJoined ? sessionIdNum : 0);

  const currentUserId = currentUser ? String(currentUser.id) : '';
  const isHost = session?.hostId === currentUser?.id;

  // Media state (for lobby preview)
  const [isMuted, setIsMuted] = React.useState(false);
  const [isVideoOff, setIsVideoOff] = React.useState(false);
  const [isScreenSharing, setIsScreenSharing] = React.useState(false);
  const [isHandRaised, setIsHandRaised] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  
  // Layout state
  const [layout, setLayout] = React.useState<'auto' | 'grid' | 'spotlight' | 'sidebar'>('auto');
  
  // Reaction overlay state
  const [activeReactions, setActiveReactions] = React.useState<Array<{ id: string; emoji: string; name: string }>>([]);
  
  // Side panel state
  const [sidePanelOpen, setSidePanelOpen] = React.useState(true);
  const [activePanel, setActivePanel] = React.useState<'chat' | 'participants'>('chat');
  const [pinnedParticipantId, setPinnedParticipantId] = React.useState<string | undefined>();
  const [unreadMessages, setUnreadMessages] = React.useState(0);
  const [localParticipants, setLocalParticipants] = React.useState<Participant[]>([]);

  // Local video preview ref
  const videoPreviewRef = React.useRef<HTMLVideoElement>(null);
  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = React.useState<MediaStream | null>(null);
  const [linkCopied, setLinkCopied] = React.useState(false);

  // WebRTC for peer-to-peer video
  // Enable as soon as we have localStream, even before officially joining
  // This allows us to receive incoming offers from other participants
  const {
    remoteStreams,
    screenShareStreams,
    connectToPeer,
    disconnectFromPeer,
    addScreenShare,
    removeScreenShare,
  } = useWebRTC({
    sessionId: sessionIdNum,
    localStream,
    screenStream,
    enabled: !!localStream, // Enable as soon as we have media, not just after join
  });

  // Get share URL
  const shareUrl = `${window.location.origin}/live-sessions/${sessionIdNum}`;

  // Handle copy share link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    toast.success('Đã sao chép link!');
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Transform API participants to VideoTile Participant format with remote streams
  const participants: Participant[] = React.useMemo(() => {
    const participantsList = realtimeParticipants.map((p) => {
      const peerId = p.id;
      const isLocalUser = currentUser && p.id === currentUser.id;
      
      // For local user, use localStream; for remote users, use remoteStreams
      let stream: MediaStream | null = null;
      if (isLocalUser) {
        stream = localStream;
      } else {
        const remoteStream = remoteStreams.get(peerId);
        const screenShareStream = screenShareStreams.get(peerId);
        stream = remoteStream || screenShareStream || null;
      }
      
      return {
        id: String(p.id),
        name: isLocalUser 
          ? (currentUser.fullName || currentUser.name || currentUser.email || 'Bạn')
          : (p.user?.fullName || p.user?.name || p.user?.email || `User ${p.id}`),
        avatar: isLocalUser ? currentUser.avatarUrl : p.user?.avatarUrl,
        isHost: session?.hostId === p.id,
        isMuted: isLocalUser ? isMuted : p.isMuted,
        isVideoOff: isLocalUser ? isVideoOff : p.isVideoOff,
        isScreenSharing: isLocalUser ? isScreenSharing : p.isScreenSharing,
        isHandRaised: isLocalUser ? isHandRaised : p.isHandRaised,
        isSpeaking: false,
        stream,
      };
    });
    
    // Ensure local user is in the list when joined (if not already from realtimeParticipants)
    if (hasJoined && currentUser) {
      const localExists = participantsList.some(p => p.id === String(currentUser.id));
      if (!localExists) {
        participantsList.unshift({
          id: String(currentUser.id),
          name: currentUser.fullName || currentUser.name || currentUser.email || 'Bạn',
          avatar: currentUser.avatarUrl,
          isHost: session?.hostId === currentUser.id,
          isMuted: isMuted,
          isVideoOff: isVideoOff,
          isScreenSharing: isScreenSharing,
          isHandRaised: isHandRaised,
          isSpeaking: false,
          stream: localStream,
        });
      }
    }
    
    return participantsList;
  }, [realtimeParticipants, session?.hostId, hasJoined, currentUser, isMuted, isVideoOff, isScreenSharing, isHandRaised, remoteStreams, screenShareStreams, localStream, screenStream]);

  // Find if anyone is screen sharing (for layout)
  const activeScreenShare = React.useMemo(() => {
    // Check if local user is sharing
    if (isScreenSharing && screenStream) {
      return {
        oderId: currentUser?.id || 0,
        name: currentUser?.fullName || currentUser?.name || 'Bạn',
        stream: screenStream,
      };
    }
    // Check remote users
    for (const [oderId, stream] of screenShareStreams) {
      const participant = realtimeParticipants.find(p => p.id === oderId);
      if (participant) {
        return {
          oderId,
          name: participant.user?.fullName || participant.user?.name || participant.user?.email || `User ${oderId}`,
          stream,
        };
      }
    }
    return null;
  }, [isScreenSharing, screenStream, screenShareStreams, currentUser, realtimeParticipants]);

  // Transform chat messages
  const messages: ChatMessage[] = React.useMemo(() => {
    return chatMessages.map((m) => {
      const anyMsg = m as any;
      const senderIdRaw = anyMsg.senderId ?? anyMsg.sender?.id ?? 0;
      const senderId = String(senderIdRaw);
      const senderName =
        anyMsg.sender?.fullName ||
        anyMsg.sender?.name ||
        anyMsg.sender?.email ||
        (senderIdRaw ? `User ${senderIdRaw}` : 'Unknown');

      return {
        id: String(anyMsg.id),
        senderId,
        senderName,
        senderAvatar: anyMsg.sender?.avatarUrl,
        content: String(anyMsg.message ?? anyMsg.content ?? ''),
        timestamp: new Date(anyMsg.createdAt ?? Date.now()),
        isPinned: false,
      };
    });
  }, [chatMessages]);

  // Determine session state
  React.useEffect(() => {
    if (userLoading || sessionLoading) {
      setSessionState('loading');
    } else if (sessionError || !session) {
      setSessionState('error');
    } else if (session.status === 'ended') {
      setSessionState('ended');
    } else if (hasJoined) {
      setSessionState('active');
    } else {
      setSessionState('lobby');
    }
  }, [userLoading, sessionLoading, sessionError, session, hasJoined]);

  // Initialize media stream
  const initializeMedia = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      setLocalStream(stream);
      
      // Apply mute/video settings
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
      stream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOff;
      });
      
      return stream;
    } catch (err) {
      console.error('Failed to get media devices:', err);
      toast.error('Không thể truy cập camera/microphone');
      return null;
    }
  }, [isMuted, isVideoOff]);

  // Get local media for preview (lobby)
  React.useEffect(() => {
    if (sessionState === 'lobby') {
      initializeMedia().then((stream) => {
        if (stream && videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      });
    }

    // Cleanup only when leaving page completely
    return () => {
      if (sessionState === 'lobby') {
        // Don't cleanup if transitioning to active state
      }
    };
  }, [sessionState, initializeMedia]);

  // Keep stream alive when joining active session
  React.useEffect(() => {
    if (sessionState === 'active' && localStream) {
      // Stream is already initialized, just update the video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [sessionState, localStream]);

  // Cleanup on unmount only
  React.useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Audio context for notification sounds
  const audioContextRef = React.useRef<AudioContext | null>(null);
  
  // Play notification sound helper using Web Audio API
  const playNotificationSound = React.useCallback(() => {
    try {
      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      // Create oscillator for a pleasant notification tone
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Configure sound - a pleasant two-tone notification
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1); // C#6 note
      
      // Configure volume envelope
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Could not play notification sound:', e);
    }
  }, []);
  
  // Sync remote participants to local state and detect hand raises
  const prevParticipantsRef = React.useRef<typeof participants>([]);
  React.useEffect(() => {
    if (participants.length > 0) {
      // Check for new hand raises
      participants.forEach(p => {
        const prev = prevParticipantsRef.current.find(pp => pp.id === p.id);
        if (p.isHandRaised && (!prev || !prev.isHandRaised) && p.id !== currentUserId) {
          // New hand raise detected
          playNotificationSound();
          toast.info(`${p.name} đã giơ tay`, { duration: 3000 });
          showReactionOverlay('✋', p.name);
        }
      });
      prevParticipantsRef.current = participants;
      setLocalParticipants(participants);
    }
  }, [participants, currentUserId, playNotificationSound]);
  
  // Show reaction overlay
  const showReactionOverlay = React.useCallback((emoji: string, name: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setActiveReactions(prev => [...prev, { id, emoji, name }]);
    // Remove after 3 seconds
    setTimeout(() => {
      setActiveReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  }, []);

  // Handle join session
  const handleJoinSession = async () => {
    if (!session) return;

    // Check if session is live
    if (session.status !== 'live' && !isHost) {
      toast.error('Phiên học chưa bắt đầu');
      return;
    }

    setSessionState('joining');

    try {
      const socketId = socketManager.getLiveSocket()?.id || socketManager.getSocket()?.id || '';
      console.log('[Session] Joining with socketId:', socketId);
      await joinSessionMutation.mutateAsync({ id: sessionIdNum, socketId });
      
      // Join chat room for real-time messages
      const chatResult = await joinChatRoom('SESSION', sessionIdNum);
      console.log('[Chat] Joined room:', chatResult);
      
      setHasJoined(true);
      updateStatus({ isMuted, isVideoOff });
      
      toast.success('Đã tham gia phiên học');
      
      // Connect to existing participants via WebRTC after a short delay to ensure localStream is ready
      setTimeout(() => {
        console.log('[WebRTC] Connecting to existing participants:', realtimeParticipants.length);
        realtimeParticipants.forEach((p) => {
          if (p.id !== currentUser?.id) {
            console.log('[WebRTC] Initiating connection to peer:', p.id);
            connectToPeer(p.id);
          }
        });
      }, 2000);
      
    } catch (error) {
      console.error('Failed to join session:', error);
      toast.error('Không thể tham gia phiên học');
      setSessionState('lobby');
    }
  };

  // Connect to new participants when they join
  React.useEffect(() => {
    if (!hasJoined || !currentUser || !localStream) return;
    
    console.log('[WebRTC] Checking for new participants to connect, count:', realtimeParticipants.length);
    realtimeParticipants.forEach((p) => {
      if (p.id !== currentUser.id && !remoteStreams.has(p.id)) {
        console.log('[WebRTC] New participant detected, connecting:', p.id);
        connectToPeer(p.id);
      }
    });
  }, [realtimeParticipants, hasJoined, currentUser, connectToPeer, remoteStreams, localStream]);

  // Handle start session (host only)
  const handleStartSession = async () => {
    if (!isHost) return;

    try {
      await startSessionMutation.mutateAsync(sessionIdNum);
      await refetchSession();
      toast.success('Đã bắt đầu phiên học');
      // Auto join after starting
      handleJoinSession();
    } catch (error) {
      console.error('Failed to start session:', error);
      toast.error('Không thể bắt đầu phiên học');
    }
  };

  // Handle end session (host only)
  const handleEndSession = async () => {
    if (!isHost) return;

    if (!confirm('Bạn có chắc muốn kết thúc phiên học cho tất cả mọi người?')) return;

    try {
      await endSessionMutation.mutateAsync(sessionIdNum);
      toast.success('Đã kết thúc phiên học');
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to end session:', error);
      toast.error('Không thể kết thúc phiên học');
    }
  };

  // Handle leave session
  const handleLeaveSession = async () => {
    if (!confirm('Bạn có chắc muốn rời phiên học?')) return;

    try {
      await leaveSessionMutation.mutateAsync(sessionIdNum);
      setHasJoined(false);
      toast.success('Đã rời phiên học');
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to leave session:', error);
      // Still navigate away
      navigate('/dashboard');
    }
  };

  // Media control handlers
  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (hasJoined) {
      updateStatus({ isMuted: newMuted });
    }
    // Toggle audio track
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !newMuted;
      });
    }
  };
  
  const handleToggleVideo = () => {
    const newVideoOff = !isVideoOff;
    setIsVideoOff(newVideoOff);
    if (hasJoined) {
      updateStatus({ isVideoOff: newVideoOff });
    }
    // Toggle video track
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !newVideoOff;
      });
    }
  };
  
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      if (hasJoined) {
        updateStatus({ isScreenSharing: false });
      }
      toast.success('Đã dừng chia sẻ màn hình');
    } else {
      // Start screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true, // Include audio if user chooses "Share tab audio"
        });
        
        setScreenStream(stream);
        setIsScreenSharing(true);
        if (hasJoined) {
          updateStatus({ isScreenSharing: true });
          // Add screen share to WebRTC connections
          addScreenShare(stream);
        }
        
        // Listen for screen share stop
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
          if (hasJoined) {
            updateStatus({ isScreenSharing: false });
            removeScreenShare();
          }
          toast.info('Đã dừng chia sẻ màn hình');
        };
        
        toast.success('Đang chia sẻ màn hình');
      } catch (err) {
        console.error('Failed to start screen share:', err);
        if ((err as Error).name !== 'NotAllowedError') {
          toast.error('Không thể chia sẻ màn hình');
        }
      }
    }
  };
  
  const handleToggleRecording = () => {
    if (!isHost) {
      toast.error('Chỉ host mới có thể ghi hình');
      return;
    }
    // TODO: Implement recording via API
    console.log('Toggle recording');
  };
  
  const handleToggleHandRaise = () => {
    if (isHandRaised) {
      lowerHand();
    } else {
      raiseHand();
      playNotificationSound();
      showReactionOverlay('✋', currentUser?.fullName || 'Bạn');
    }
    setIsHandRaised(!isHandRaised);
  };
  
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleToggleSidePanel = (panel: 'chat' | 'participants') => {
    if (sidePanelOpen && activePanel === panel) {
      setSidePanelOpen(false);
    } else {
      setSidePanelOpen(true);
      setActivePanel(panel);
      if (panel === 'chat') setUnreadMessages(0);
    }
  };

  const handleSendMessage = (content: string, replyTo?: string) => {
    sendChatMessage(content, 'TEXT', replyTo ? parseInt(replyTo, 10) : undefined);
  };

  const handlePinMessage = (messageId: string) => {
    console.log('Pin message:', messageId);
  };

  const handlePinParticipant = (id: string) => {
    setPinnedParticipantId(pinnedParticipantId === id ? undefined : id);
  };

  const handleMuteParticipant = (id: string) => {
    if (!isHost) return;
    setLocalParticipants(
      localParticipants.map((p) =>
        p.id === id ? { ...p, isMuted: !p.isMuted } : p
      )
    );
  };

  const handleRemoveParticipant = (id: string) => {
    if (!isHost) return;
    setLocalParticipants(localParticipants.filter((p) => p.id !== id));
  };

  const handleReaction = (emoji: string) => {
    playNotificationSound();
    showReactionOverlay(emoji, currentUser?.fullName || 'Bạn');
    // TODO: Send reaction to other participants via socket
  };
  
  // Handle layout change
  const handleLayoutChange = (newLayout: 'auto' | 'grid' | 'spotlight' | 'sidebar') => {
    setLayout(newLayout);
  };

  // =============== RENDER STATES ===============

  // Loading state
  if (sessionState === 'loading') {
    return (
      <SimpleContainer className="bg-neutral-950 text-white">
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-neutral-400">Đang tải phiên học...</p>
          </div>
        </div>
      </SimpleContainer>
    );
  }

  // Error state
  if (sessionState === 'error') {
    return (
      <SimpleContainer className="bg-neutral-950 text-white">
        <div className="h-screen flex flex-col items-center justify-center">
          <AlertCircle className="h-16 w-16 text-error-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Không thể tải phiên học</h3>
          <p className="text-neutral-400 mb-6 text-center max-w-md">
            {sessionError instanceof Error ? sessionError.message : 'Phiên học không tồn tại hoặc bạn không có quyền truy cập'}
          </p>
          <Button onClick={() => navigate('/dashboard')}>Quay lại Dashboard</Button>
        </div>
      </SimpleContainer>
    );
  }

  // Ended state
  if (sessionState === 'ended') {
    return (
      <SimpleContainer className="bg-neutral-950 text-white">
        <div className="h-screen flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center mb-6">
            <Video className="h-10 w-10 text-neutral-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Phiên học đã kết thúc</h3>
          <p className="text-neutral-400 mb-6 text-center">
            "{session?.title}" đã kết thúc vào {session?.endedAt ? formatDate(new Date(session.endedAt)) : 'trước đó'}
          </p>
          <Button onClick={() => navigate('/dashboard')}>Quay lại Dashboard</Button>
        </div>
      </SimpleContainer>
    );
  }

  // Lobby state (before joining)
  if (sessionState === 'lobby' || sessionState === 'joining') {
    const isLive = session?.status === 'live';
    const isScheduled = session?.status === 'scheduled';

    return (
      <SimpleContainer className="bg-neutral-950 text-white">
        <div className="h-screen flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Video Preview */}
              <div className="space-y-4">
                <div className="relative aspect-video bg-neutral-800 rounded-2xl overflow-hidden">
                  {isVideoOff ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-neutral-700 flex items-center justify-center mb-4">
                        <VideoOff className="h-12 w-12 text-neutral-400" />
                      </div>
                      <p className="text-neutral-400">Camera đang tắt</p>
                    </div>
                  ) : (
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover mirror"
                    />
                  )}
                  
                  {/* Preview controls */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    <Button
                      variant={isMuted ? 'danger' : 'secondary'}
                      size="icon"
                      onClick={handleToggleMute}
                      className="rounded-full"
                    >
                      {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant={isVideoOff ? 'danger' : 'secondary'}
                      size="icon"
                      onClick={handleToggleVideo}
                      className="rounded-full"
                    >
                      {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => {/* Open settings */}}
                      className="rounded-full"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-center text-sm text-neutral-400">
                  {isMuted && isVideoOff 
                    ? 'Camera và microphone đang tắt' 
                    : isMuted 
                      ? 'Microphone đang tắt'
                      : isVideoOff
                        ? 'Camera đang tắt'
                        : 'Camera và microphone sẵn sàng'
                  }
                </p>
              </div>

              {/* Session Info */}
              <div className="flex flex-col justify-center">
                <div className="space-y-6">
                  <div>
                    <Badge 
                      variant={isLive ? 'success' : isScheduled ? 'warning' : 'default'}
                      size="sm"
                      className={isLive ? 'animate-pulse' : ''}
                    >
                      {isLive ? '🔴 LIVE' : isScheduled ? '📅 Đã lên lịch' : session?.status?.toUpperCase()}
                    </Badge>
                    <h1 className="text-3xl font-bold mt-3">{session?.title}</h1>
                    <p className="text-neutral-400 mt-2">{session?.class?.name || `Lớp học #${session?.classId}`}</p>
                  </div>

                  <div className="space-y-3 text-neutral-300">
                    {session?.scheduledAt && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-neutral-500" />
                        <span>Lịch: {formatDate(new Date(session.scheduledAt))}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-neutral-500" />
                      <span>{session?.participantsCount || 0} người tham gia</span>
                    </div>
                    {isHost && (
                      <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 text-primary-500" />
                        <span className="text-primary-400">Bạn là host</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-4">
                    {/* Host: Start or Join */}
                    {isHost && !isLive && (
                      <Button
                        size="lg"
                        className="w-full"
                        onClick={handleStartSession}
                        disabled={startSessionMutation.isPending}
                      >
                        {startSessionMutation.isPending ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-5 w-5 mr-2" />
                        )}
                        Bắt đầu phiên học
                      </Button>
                    )}

                    {/* Join button (when live or host) */}
                    {(isLive || isHost) && (
                      <Button
                        size="lg"
                        className="w-full"
                        variant={isHost && !isLive ? 'outline' : 'primary'}
                        onClick={handleJoinSession}
                        disabled={sessionState === 'joining' || joinSessionMutation.isPending}
                      >
                        {(sessionState === 'joining' || joinSessionMutation.isPending) ? (
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                          <Video className="h-5 w-5 mr-2" />
                        )}
                        {isHost && !isLive ? 'Tham gia để kiểm tra' : 'Tham gia ngay'}
                      </Button>
                    )}

                    {/* Not live and not host */}
                    {!isLive && !isHost && (
                      <div className="text-center py-6">
                        <Clock className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
                        <p className="text-neutral-400">Phiên học chưa bắt đầu</p>
                        <p className="text-sm text-neutral-500">Vui lòng đợi giảng viên bắt đầu phiên học</p>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => navigate(-1)}
                    >
                      Quay lại
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SimpleContainer>
    );
  }

  // Active session state
  const displayParticipants = localParticipants.length > 0 ? localParticipants : participants;

  return (
    <SimpleContainer className="bg-neutral-950 text-white">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="h-14 px-4 flex items-center justify-between bg-neutral-900/50 backdrop-blur border-b border-white/10">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold">{session?.title}</h1>
            <Badge 
              variant="success" 
              size="sm" 
              className="animate-pulse"
            >
              🔴 LIVE
            </Badge>
            {isRecording && (
              <Badge variant="error" size="sm">
                REC
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Share link button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLink}
              className="text-neutral-300 border-neutral-600"
            >
              {linkCopied ? (
                <Check className="h-4 w-4 mr-1 text-success-500" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {linkCopied ? 'Đã sao chép' : 'Sao chép link'}
            </Button>
            <span className="text-sm text-neutral-400">
              {displayParticipants.length} người tham gia • {session?.class?.name}
            </span>
            {isHost && (
              <Button
                size="sm"
                variant="danger"
                onClick={handleEndSession}
                disabled={endSessionMutation.isPending}
              >
                {endSessionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Square className="h-4 w-4 mr-1" />
                    Kết thúc
                  </>
                )}
              </Button>
            )}
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video area */}
          <main className={cn(
            'flex-1 p-4 transition-all duration-300',
            sidePanelOpen && 'pr-0'
          )}>
            {/* Screen share mode: screen to, cam nhỏ ở góc */}
            {activeScreenShare ? (
              <div className="relative h-full">
                {/* Main screen share */}
                <div className="w-full h-full rounded-2xl overflow-hidden bg-neutral-800">
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                    ref={(el) => {
                      if (el && activeScreenShare.stream) {
                        el.srcObject = activeScreenShare.stream;
                      }
                    }}
                  />
                  <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/70 rounded-lg text-sm">
                    <Monitor className="h-4 w-4 inline mr-2" />
                    {activeScreenShare.name} đang chia sẻ màn hình
                  </div>
                </div>
                
                {/* Small camera videos in corner - always show camera, not screen */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                  {displayParticipants.slice(0, 4).map((p) => {
                    // For local user, use localStream (camera), not screenStream
                    const videoStream = p.id === currentUserId ? localStream : p.stream;
                    const hasVideo = videoStream && !p.isVideoOff;
                    
                    return (
                      <div
                        key={p.id}
                        className="w-40 aspect-video rounded-lg overflow-hidden bg-neutral-800 border-2 border-neutral-700 shadow-lg relative"
                      >
                        {hasVideo ? (
                          <video
                            autoPlay
                            playsInline
                            muted={p.id === currentUserId}
                            className={cn(
                              "w-full h-full object-cover",
                              p.id === currentUserId && "transform scale-x-[-1]"
                            )}
                            ref={(el) => {
                              if (el && videoStream) {
                                el.srcObject = videoStream;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                              {p.name?.[0]?.toUpperCase()}
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-xs truncate max-w-[90%]">
                          {p.id === currentUserId ? 'Bạn' : p.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Normal grid mode */
              <VideoGrid
                participants={displayParticipants}
                localParticipantId={currentUserId}
                pinnedParticipantId={pinnedParticipantId}
                localStream={localStream}
                screenStream={screenStream}
                layout={layout}
                onPin={handlePinParticipant}
                onMute={handleMuteParticipant}
                onRemove={handleRemoveParticipant}
                className="h-full"
              />
            )}
          </main>

          {/* Side panel */}
          <AnimatePresence>
            {sidePanelOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 360, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-l border-white/10 bg-neutral-900/50 backdrop-blur flex flex-col"
              >
                {/* Panel header */}
                <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
                  <Tabs
                    value={activePanel}
                    onValueChange={(v) => setActivePanel(v as 'chat' | 'participants')}
                    className="w-full"
                  >
                    <TabsList className="bg-neutral-800 w-full">
                      <TabsTrigger value="chat" className="flex-1 gap-2 data-[state=active]:bg-neutral-700">
                        <MessageSquare className="h-4 w-4" />
                        Chat
                        {unreadMessages > 0 && (
                          <Badge variant="error" size="sm">{unreadMessages}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="participants" className="flex-1 gap-2 data-[state=active]:bg-neutral-700">
                        <Users className="h-4 w-4" />
                        ({displayParticipants.length})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSidePanelOpen(false)}
                    className="ml-2 text-neutral-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Panel content */}
                <div className="flex-1 overflow-hidden">
                  {activePanel === 'chat' ? (
                    <ChatPanel
                      messages={messages}
                      currentUserId={currentUserId}
                      onSendMessage={handleSendMessage}
                      onPinMessage={handlePinMessage}
                      className="h-full"
                    />
                  ) : (
                    <ParticipantsPanel
                      participants={displayParticipants}
                      currentUserId={currentUserId}
                      isHost={isHost}
                      onMuteParticipant={handleMuteParticipant}
                      onRemoveParticipant={handleRemoveParticipant}
                      onPinParticipant={handlePinParticipant}
                      className="h-full"
                    />
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        {/* Control bar */}
        <ControlBar
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          isRecording={isRecording}
          isHandRaised={isHandRaised}
          isFullscreen={isFullscreen}
          isSidePanelOpen={sidePanelOpen}
          unreadMessages={unreadMessages}
          participantCount={displayParticipants.length}
          layout={layout}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleRecording={handleToggleRecording}
          onToggleHandRaise={handleToggleHandRaise}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleSidePanel={handleToggleSidePanel}
          onLeaveSession={handleLeaveSession}
          onOpenSettings={() => console.log('Open settings')}
          onReaction={handleReaction}
          onLayoutChange={handleLayoutChange}
        />
        
        {/* Reaction overlay */}
        <AnimatePresence>
          {activeReactions.map((reaction) => (
            <motion.div
              key={reaction.id}
              initial={{ opacity: 0, y: 50, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -100, scale: 0.5 }}
              className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
            >
              <div className="bg-black/70 backdrop-blur-sm rounded-full px-6 py-3 flex items-center gap-3">
                <span className="text-4xl">{reaction.emoji}</span>
                <span className="text-white font-medium">{reaction.name}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </SimpleContainer>
  );
};

export default LiveSessionPage;
