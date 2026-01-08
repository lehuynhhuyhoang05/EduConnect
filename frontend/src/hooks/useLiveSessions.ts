import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useState } from 'react';
import { liveSessionsApi } from '@/services/api';
import {
  socketManager,
  subscribeToLiveSession,
  subscribeToWebRTCSignaling,
  updateMediaState,
  raiseHand as emitRaiseHand,
  lowerHand as emitLowerHand,
  joinLiveSession,
} from '@/services/socket';
import type {
  CreateSessionDto,
  UpdateSessionDto,
  QuerySessionDto,
  CreatePollDto,
  User,
  Poll,
} from '@/types';

// Query keys
export const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (params?: QuerySessionDto) => [...sessionKeys.lists(), params] as const,
  byClass: (classId: number, params?: QuerySessionDto) => [...sessionKeys.all, 'class', classId, params] as const,
  details: () => [...sessionKeys.all, 'detail'] as const,
  detail: (id: number) => [...sessionKeys.details(), id] as const,
  participants: (id: number) => [...sessionKeys.detail(id), 'participants'] as const,
  webrtcConfig: (id: number) => [...sessionKeys.detail(id), 'webrtc-config'] as const,
  polls: (id: number) => [...sessionKeys.detail(id), 'polls'] as const,
  handRaise: (id: number) => [...sessionKeys.detail(id), 'hand-raise'] as const,
  attendance: (id: number) => [...sessionKeys.detail(id), 'attendance'] as const,
};

// ============================================
// QUERIES
// ============================================

// Get all sessions
export const useLiveSessions = (params?: QuerySessionDto) => {
  return useQuery({
    queryKey: sessionKeys.list(params),
    queryFn: () => liveSessionsApi.getAll(params),
    staleTime: 60 * 1000, // 1 minute
  });
};

// Get upcoming sessions
export const useUpcomingSessions = () => {
  return useLiveSessions({ upcoming: true, status: 'scheduled' });
};

// Get live sessions
export const useLiveSessionsActive = () => {
  return useLiveSessions({ status: 'live' });
};

// Get sessions by class
export const useClassSessions = (classId: number, params?: QuerySessionDto) => {
  return useQuery({
    queryKey: sessionKeys.byClass(classId, params),
    queryFn: () => liveSessionsApi.getByClass(classId, params),
    enabled: !!classId,
  });
};

// Get session by ID
export const useLiveSession = (id: number) => {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => liveSessionsApi.getById(id),
    enabled: !!id,
    refetchInterval: (query) => {
      // Refetch every 5 seconds if session is live
      return query.state.data?.status === 'live' ? 5000 : false;
    },
  });
};

// Get WebRTC config
export const useWebRTCConfig = (sessionId: number) => {
  return useQuery({
    queryKey: sessionKeys.webrtcConfig(sessionId),
    queryFn: () => liveSessionsApi.getWebRTCConfig(sessionId),
    enabled: !!sessionId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Get polls
export const useSessionPolls = (sessionId: number) => {
  return useQuery({
    queryKey: sessionKeys.polls(sessionId),
    queryFn: () => liveSessionsApi.getPolls(sessionId),
    enabled: !!sessionId,
  });
};

// Get hand raise queue
export const useHandRaiseQueue = (sessionId: number) => {
  return useQuery({
    queryKey: sessionKeys.handRaise(sessionId),
    queryFn: () => liveSessionsApi.getHandRaiseQueue(sessionId),
    enabled: !!sessionId,
    refetchInterval: 5000,
  });
};

// Get attendance
export const useSessionAttendance = (sessionId: number) => {
  return useQuery({
    queryKey: sessionKeys.attendance(sessionId),
    queryFn: () => liveSessionsApi.getAttendance(sessionId),
    enabled: !!sessionId,
  });
};

// ============================================
// MUTATIONS
// ============================================

// Create session
export const useCreateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classId, data }: { classId: number; data: CreateSessionDto }) =>
      liveSessionsApi.create(classId, data),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: sessionKeys.byClass(classId) });
    },
  });
};

// Update session
export const useUpdateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSessionDto }) =>
      liveSessionsApi.update(id, data),
    onSuccess: (updatedSession) => {
      queryClient.setQueryData(sessionKeys.detail(updatedSession.id), updatedSession);
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
};

// Delete session
export const useDeleteSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => liveSessionsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: sessionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
};

// Start session
export const useStartSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => liveSessionsApi.start(id),
    onSuccess: (updatedSession) => {
      queryClient.setQueryData(sessionKeys.detail(updatedSession.id), updatedSession);
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
};

// End session
export const useEndSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => liveSessionsApi.end(id),
    onSuccess: (updatedSession) => {
      queryClient.setQueryData(sessionKeys.detail(updatedSession.id), updatedSession);
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() });
    },
  });
};

// Join session
export const useJoinSession = () => {
  return useMutation({
    mutationFn: ({ id, socketId }: { id: number; socketId: string }) =>
      liveSessionsApi.join(id, socketId),
  });
};

// Leave session
export const useLeaveSession = () => {
  return useMutation({
    mutationFn: (id: number) => liveSessionsApi.leave(id),
  });
};

// Polls
export const useCreatePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: number; data: CreatePollDto }) =>
      liveSessionsApi.createPoll(sessionId, data),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.polls(sessionId) });
    },
  });
};

export const useVotePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      pollId,
      optionIds,
    }: {
      sessionId: number;
      pollId: number;
      optionIds: number[];
    }) => liveSessionsApi.votePoll(sessionId, pollId, optionIds),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.polls(sessionId) });
    },
  });
};

// Hand raise
export const useRaiseHand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: number) => liveSessionsApi.raiseHand(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.handRaise(sessionId) });
    },
  });
};

export const useLowerHand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: number) => liveSessionsApi.lowerHand(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.handRaise(sessionId) });
    },
  });
};

// Recording
export const useStartRecording = () => {
  return useMutation({
    mutationFn: (sessionId: number) => liveSessionsApi.startRecording(sessionId),
  });
};

export const useStopRecording = () => {
  return useMutation({
    mutationFn: (sessionId: number) => liveSessionsApi.stopRecording(sessionId),
  });
};

// Attendance
export const useStartAttendance = () => {
  return useMutation({
    mutationFn: (sessionId: number) => liveSessionsApi.startAttendance(sessionId),
  });
};

export const useCheckIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, code }: { sessionId: number; code: string }) =>
      liveSessionsApi.checkIn(sessionId, code),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.attendance(sessionId) });
    },
  });
};

// ============================================
// REAL-TIME HOOK
// ============================================

interface Participant {
  id: number;
  user: User;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
}

export const useLiveSessionRealtime = (sessionId: number, userName?: string) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;
    if (!userName) return;

    // Join the live session room first with userName
    joinLiveSession(sessionId, undefined, userName).then((response) => {
      console.log('[Live] Joined session:', response);
      if (response.participants) {
        setParticipants(response.participants.map((p) => ({
          id: p.userId,
          user: { id: p.userId, fullName: p.userName || `User ${p.userId}` } as User,
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
          isHandRaised: false,
        })));
      }
    });

    const unsubscribe = subscribeToLiveSession(sessionId, {
      onUserJoined: (data) => {
        console.log('[Live] User joined:', data);
        setParticipants((prev) => {
          if (prev.some((p) => p.id === data.userId)) return prev;
          return [
            ...prev,
            {
              id: data.userId,
              user: { id: data.userId, fullName: data.userName || `User ${data.userId}` } as User,
              isMuted: false,
              isVideoOff: false,
              isScreenSharing: false,
              isHandRaised: false,
            },
          ];
        });
      },
      onUserLeft: (data) => {
        console.log('[Live] User left:', data);
        setParticipants((prev) => prev.filter((p) => p.id !== data.userId));
      },
      onSessionEnded: () => {
        queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      },
      onMediaStateChanged: (data) => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === data.userId
              ? {
                  ...p,
                  isMuted: !data.audio,
                  isVideoOff: !data.video,
                  isScreenSharing: data.screen ?? p.isScreenSharing,
                }
              : p
          )
        );
      },
      onHandRaised: (data) => {
        setParticipants((prev) =>
          prev.map((p) => (p.id === data.userId ? { ...p, isHandRaised: true } : p))
        );
      },
      onHandLowered: (data) => {
        setParticipants((prev) =>
          prev.map((p) => (p.id === data.userId ? { ...p, isHandRaised: false } : p))
        );
      },
    });

    return unsubscribe;
  }, [sessionId, userName, queryClient]);

  const updateStatus = useCallback(
    (status: { isMuted?: boolean; isVideoOff?: boolean; isScreenSharing?: boolean }) => {
      updateMediaState(sessionId, {
        audio: !status.isMuted,
        video: !status.isVideoOff,
        screen: status.isScreenSharing,
      });
    },
    [sessionId]
  );

  const raiseHand = useCallback(() => {
    emitRaiseHand(sessionId);
  }, [sessionId]);

  const lowerHand = useCallback(() => {
    emitLowerHand(sessionId);
  }, [sessionId]);

  return {
    participants,
    isRecording,
    activePoll,
    updateStatus,
    raiseHand,
    lowerHand,
  };
};

// ============================================
// WEBRTC HOOK
// ============================================

interface PeerConnection {
  peerId: number;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export const useWebRTC = (sessionId: number, localStream: MediaStream | null) => {
  const [peerConnections, setPeerConnections] = useState<Map<number, PeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(new Map());
  const { data: config } = useWebRTCConfig(sessionId);

  const createPeerConnection = useCallback(
    (peerId: number): RTCPeerConnection | null => {
      if (!config) return null;

      const pc = new RTCPeerConnection({ iceServers: config.iceServers });

      // Add local tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      // Handle remote tracks
      pc.ontrack = (event) => {
        setRemoteStreams((prev) => {
          const newMap = new Map(prev);
          newMap.set(peerId, event.streams[0]);
          return newMap;
        });
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketManager.emit('webrtc:ice_candidate', {
            sessionId,
            targetUserId: peerId,
            candidate: event.candidate,
          });
        }
      };

      setPeerConnections((prev) => {
        const newMap = new Map(prev);
        newMap.set(peerId, { peerId, connection: pc });
        return newMap;
      });

      return pc;
    },
    [config, localStream, sessionId]
  );

  const closePeerConnection = useCallback((peerId: number) => {
    setPeerConnections((prev) => {
      const newMap = new Map(prev);
      const pc = newMap.get(peerId);
      if (pc) {
        pc.connection.close();
        newMap.delete(peerId);
      }
      return newMap;
    });
    setRemoteStreams((prev) => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });
  }, []);

  const closeAllConnections = useCallback(() => {
    peerConnections.forEach((pc) => {
      pc.connection.close();
    });
    setPeerConnections(new Map());
    setRemoteStreams(new Map());
  }, [peerConnections]);

  // Handle WebRTC signaling
  useEffect(() => {
    if (!sessionId || !socketManager.isConnected()) return;

    const unsubscribe = subscribeToWebRTCSignaling({
      onOffer: async (data) => {
        let pc = peerConnections.get(data.from)?.connection;
        if (!pc) {
          pc = createPeerConnection(data.from) ?? undefined;
        }
        if (!pc) return;

        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketManager.emit('webrtc:answer', {
          sessionId,
          targetUserId: data.from,
          answer,
        });
      },
      onAnswer: async (data) => {
        const pc = peerConnections.get(data.from)?.connection;
        if (pc) {
          await pc.setRemoteDescription(data.answer);
        }
      },
      onIceCandidate: async (data) => {
        const pc = peerConnections.get(data.from)?.connection;
        if (pc) {
          await pc.addIceCandidate(data.candidate);
        }
      },
    });

    return unsubscribe;
  }, [sessionId, peerConnections, createPeerConnection]);

  return {
    peerConnections,
    remoteStreams,
    createPeerConnection,
    closePeerConnection,
    closeAllConnections,
  };
};
