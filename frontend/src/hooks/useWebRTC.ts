import { useCallback, useEffect, useRef, useState } from 'react';
import {
  socketManager,
  subscribeToWebRTCSignaling,
  sendWebRTCOffer,
  sendWebRTCAnswer,
  sendICECandidate,
} from '@/services/socket';

interface PeerConnection {
  peerId: number;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

interface UseWebRTCOptions {
  sessionId: number;
  localStream: MediaStream | null;
  screenStream?: MediaStream | null;
  enabled: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = ({ sessionId, localStream, screenStream, enabled }: UseWebRTCOptions) => {
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(new Map());
  const [screenShareStreams, setScreenShareStreams] = useState<Map<number, MediaStream>>(new Map());
  const peerConnections = useRef<Map<number, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<number, RTCIceCandidateInit[]>>(new Map());

  // Create peer connection
  const createPeerConnection = useCallback((peerId: number, isInitiator: boolean): RTCPeerConnection => {
    console.log(`[WebRTC] Creating peer connection for ${peerId}, isInitiator: ${isInitiator}, hasLocalStream: ${!!localStream}`);
    
    // Close existing connection if any
    const existingPc = peerConnections.current.get(peerId);
    if (existingPc) {
      existingPc.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (localStream) {
      console.log(`[WebRTC] Adding ${localStream.getTracks().length} local tracks to connection`);
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    } else {
      console.warn('[WebRTC] No local stream available when creating peer connection');
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[WebRTC] Sending ICE candidate to ${peerId}`);
        sendICECandidate(sessionId, peerId, event.candidate.toJSON());
      }
    };
    
    pc.onicegatheringstatechange = () => {
      console.log(`[WebRTC] ICE gathering state: ${pc.iceGatheringState}`);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state with ${peerId}: ${pc.iceConnectionState}`);
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received track from ${peerId}:`, event.track.kind, event.track.label);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        console.log(`[WebRTC] Setting remote stream for ${peerId}`, remoteStream.id);
        // Check if this is a screen share stream (has 'screen' in label)
        const isScreen = event.track.label?.toLowerCase().includes('screen') ||
                        remoteStream.id.includes('screen');
        
        if (isScreen) {
          setScreenShareStreams((prev) => new Map(prev).set(peerId, remoteStream));
        } else {
          setRemoteStreams((prev) => new Map(prev).set(peerId, remoteStream));
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.delete(peerId);
          return updated;
        });
        setScreenShareStreams((prev) => {
          const updated = new Map(prev);
          updated.delete(peerId);
          return updated;
        });
      }
    };

    peerConnections.current.set(peerId, pc);
    return pc;
  }, [sessionId, localStream]);

  // Create and send offer
  const createOffer = useCallback(async (peerId: number) => {
    console.log(`[WebRTC] Creating offer for peer ${peerId}`);
    const pc = createPeerConnection(peerId, true);
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log(`[WebRTC] Sending offer to ${peerId}`);
      sendWebRTCOffer(sessionId, peerId, offer);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [createPeerConnection, sessionId]);

  // Handle received offer
  const handleOffer = useCallback(async (fromId: number, offer: RTCSessionDescriptionInit) => {
    console.log(`[WebRTC] Handling offer from ${fromId}, hasLocalStream: ${!!localStream}`);
    
    if (!localStream) {
      console.warn('[WebRTC] Cannot handle offer - no local stream yet. Waiting...');
      // Wait for local stream then retry
      setTimeout(() => handleOffer(fromId, offer), 500);
      return;
    }
    
    const pc = createPeerConnection(fromId, false);
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Add pending ICE candidates
      const pendingIce = pendingCandidates.current.get(fromId) || [];
      console.log(`[WebRTC] Adding ${pendingIce.length} pending ICE candidates`);
      for (const candidate of pendingIce) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.current.delete(fromId);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log(`[WebRTC] Sending answer to ${fromId}`);
      sendWebRTCAnswer(sessionId, fromId, answer);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [createPeerConnection, sessionId, localStream]);

  // Handle received answer
  const handleAnswer = useCallback(async (fromId: number, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(fromId);
    if (!pc) return;
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      
      // Add pending ICE candidates
      const pendingIce = pendingCandidates.current.get(fromId) || [];
      for (const candidate of pendingIce) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.current.delete(fromId);
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (fromId: number, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(fromId);
    
    if (!pc || !pc.remoteDescription) {
      // Store candidate for later
      const pending = pendingCandidates.current.get(fromId) || [];
      pending.push(candidate);
      pendingCandidates.current.set(fromId, pending);
      return;
    }
    
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }, []);

  // Connect to a new peer
  const connectToPeer = useCallback((peerId: number) => {
    if (!enabled || !localStream) return;
    createOffer(peerId);
  }, [enabled, localStream, createOffer]);

  // Disconnect from peer
  const disconnectFromPeer = useCallback((peerId: number) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    setRemoteStreams((prev) => {
      const updated = new Map(prev);
      updated.delete(peerId);
      return updated;
    });
    setScreenShareStreams((prev) => {
      const updated = new Map(prev);
      updated.delete(peerId);
      return updated;
    });
  }, []);

  // Add screen share to existing connections
  const addScreenShare = useCallback((stream: MediaStream) => {
    peerConnections.current.forEach((pc, peerId) => {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
      // Renegotiate
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        sendWebRTCOffer(sessionId, peerId, offer);
      });
    });
  }, [sessionId]);

  // Remove screen share from connections
  const removeScreenShare = useCallback(() => {
    peerConnections.current.forEach((pc, peerId) => {
      const senders = pc.getSenders();
      senders.forEach((sender) => {
        if (sender.track?.kind === 'video' && sender.track.label?.includes('screen')) {
          pc.removeTrack(sender);
        }
      });
      // Renegotiate
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        sendWebRTCOffer(sessionId, peerId, offer);
      });
    });
  }, [sessionId]);

  // Subscribe to WebRTC signaling
  useEffect(() => {
    if (!enabled) return;

    // Ensure live socket is connected
    socketManager.connectLive();
    
    console.log('[WebRTC] Subscribing to signaling events');

    const unsubscribe = subscribeToWebRTCSignaling({
      onOffer: ({ from, offer }) => {
        console.log('[WebRTC] Received offer from', from);
        handleOffer(from, offer);
      },
      onAnswer: ({ from, answer }) => {
        console.log('[WebRTC] Received answer from', from);
        handleAnswer(from, answer);
      },
      onIceCandidate: ({ from, candidate }) => {
        console.log('[WebRTC] Received ICE candidate from', from);
        handleIceCandidate(from, candidate);
      },
    });

    return () => {
      unsubscribe();
      // Close all connections
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
    };
  }, [enabled, handleOffer, handleAnswer, handleIceCandidate]);

  // Update tracks when local stream changes
  useEffect(() => {
    if (!localStream) return;

    peerConnections.current.forEach((pc) => {
      const senders = pc.getSenders();
      
      localStream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          pc.addTrack(track, localStream);
        }
      });
    });
  }, [localStream]);

  return {
    remoteStreams,
    screenShareStreams,
    connectToPeer,
    disconnectFromPeer,
    addScreenShare,
    removeScreenShare,
  };
};

export default useWebRTC;
