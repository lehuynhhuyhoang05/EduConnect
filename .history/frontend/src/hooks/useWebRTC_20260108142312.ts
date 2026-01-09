import { useCallback, useEffect, useRef, useState } from 'react';
import { socketManager } from '../services/socket';

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

interface WebRTCConfig {
  sessionId: string;
  userId: string;
  onRemoteStream?: (peerId: string, stream: MediaStream) => void;
  onPeerDisconnected?: (peerId: string) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export function useWebRTC(config: WebRTCConfig) {
  const { sessionId, onRemoteStream, onPeerDisconnected } = config;
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize local media stream
  const initializeMedia = useCallback(async (video: boolean = true, audio: boolean = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 1280, height: 720, facingMode: 'user' } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsVideoEnabled(video);
      setIsAudioEnabled(audio);
      
      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketManager.sendIceCandidate(sessionId, peerId, event.candidate);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handlePeerDisconnection(peerId);
      }
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('Received remote track from:', peerId);
      const [remoteStream] = event.streams;
      
      const peerConnection = peersRef.current.get(peerId);
      if (peerConnection) {
        peerConnection.stream = remoteStream;
        peersRef.current.set(peerId, peerConnection);
        setPeers(new Map(peersRef.current));
      }
      
      onRemoteStream?.(peerId, remoteStream);
    };

    return pc;
  }, [sessionId, onRemoteStream]);

  // Handle peer disconnection
  const handlePeerDisconnection = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.connection.close();
      peersRef.current.delete(peerId);
      setPeers(new Map(peersRef.current));
      onPeerDisconnected?.(peerId);
    }
  }, [onPeerDisconnected]);

  // Create offer
  const createOffer = useCallback(async (peerId: string) => {
    const pc = createPeerConnection(peerId);
    peersRef.current.set(peerId, { peerId, connection: pc });
    setPeers(new Map(peersRef.current));

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketManager.sendOffer(sessionId, peerId, offer);
    } catch (error) {
      console.error('Failed to create offer:', error);
    }
  }, [sessionId, createPeerConnection]);

  // Handle incoming offer
  const handleOffer = useCallback(async (peerId: string, offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection(peerId);
    peersRef.current.set(peerId, { peerId, connection: pc });
    setPeers(new Map(peersRef.current));

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketManager.sendAnswer(sessionId, peerId, answer);
    } catch (error) {
      console.error('Failed to handle offer:', error);
    }
  }, [sessionId, createPeerConnection]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (peerId: string, answer: RTCSessionDescriptionInit) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      try {
        await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Failed to handle answer:', error);
      }
    }
  }, []);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (peerId: string, candidate: RTCIceCandidateInit) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Failed to add ICE candidate:', error);
      }
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        socketManager.emitMediaStateChange(sessionId, 'audio', audioTrack.enabled);
      }
    }
  }, [sessionId]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        socketManager.emitMediaStateChange(sessionId, 'video', videoTrack.enabled);
      }
    }
  }, [sessionId]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: false,
      });

      setScreenStream(stream);
      setIsScreenSharing(true);

      // Replace video track in all peer connections
      const screenTrack = stream.getVideoTracks()[0];
      peersRef.current.forEach((peer) => {
        const sender = peer.connection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      // Handle screen share stop
      screenTrack.onended = () => {
        stopScreenShare();
      };

      socketManager.emitScreenShare(sessionId, true);
    } catch (error) {
      console.error('Failed to start screen share:', error);
    }
  }, [sessionId]);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);

      // Restore camera video track
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        peersRef.current.forEach((peer) => {
          const sender = peer.connection.getSenders().find((s) => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      }

      socketManager.emitScreenShare(sessionId, false);
    }
  }, [sessionId, screenStream]);

  // Cleanup
  const cleanup = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Stop screen stream
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }

    // Close all peer connections
    peersRef.current.forEach((peer) => {
      peer.connection.close();
    });
    peersRef.current.clear();
    setPeers(new Map());
    
    setIsScreenSharing(false);
    setConnectionState('disconnected');
  }, [screenStream]);

  // Setup socket event listeners
  useEffect(() => {
    const liveSocket = socketManager.getLiveSocket();
    if (!liveSocket) return;

    const handleUserJoined = (data: { oderId: string }) => {
      console.log('User joined:', data.peerId);
      createOffer(data.peerId);
    };

    const handleUserLeft = (data: { oderId: string }) => {
      console.log('User left:', data.peerId);
      handlePeerDisconnection(data.peerId);
    };

    const handleOfferReceived = (data: { peerId: string; offer: RTCSessionDescriptionInit }) => {
      handleOffer(data.peerId, data.offer);
    };

    const handleAnswerReceived = (data: { peerId: string; answer: RTCSessionDescriptionInit }) => {
      handleAnswer(data.peerId, data.answer);
    };

    const handleIceCandidateReceived = (data: { peerId: string; candidate: RTCIceCandidateInit }) => {
      handleIceCandidate(data.peerId, data.candidate);
    };

    liveSocket.on('user-joined', handleUserJoined);
    liveSocket.on('user-left', handleUserLeft);
    liveSocket.on('offer', handleOfferReceived);
    liveSocket.on('answer', handleAnswerReceived);
    liveSocket.on('ice-candidate', handleIceCandidateReceived);

    return () => {
      liveSocket.off('user-joined', handleUserJoined);
      liveSocket.off('user-left', handleUserLeft);
      liveSocket.off('offer', handleOfferReceived);
      liveSocket.off('answer', handleAnswerReceived);
      liveSocket.off('ice-candidate', handleIceCandidateReceived);
    };
  }, [createOffer, handlePeerDisconnection, handleOffer, handleAnswer, handleIceCandidate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    localStream,
    screenStream,
    peers,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionState,
    initializeMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    createOffer,
    cleanup,
  };
}
