import { create } from 'zustand';
import type { LiveSession, LiveSessionParticipant, ConnectionQuality } from '@/types';

interface MediaState {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
}

interface LocalMediaState extends MediaState {
  audioDeviceId: string | null;
  videoDeviceId: string | null;
}

interface LiveSessionState {
  // Session info
  currentSession: LiveSession | null;
  participants: LiveSessionParticipant[];
  
  // Local media state
  localMedia: LocalMediaState;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  
  // Connection
  connectionQuality: ConnectionQuality;
  isConnecting: boolean;
  isReconnecting: boolean;
  
  // UI state
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  isPollsOpen: boolean;
  isWhiteboardOpen: boolean;
  isSettingsOpen: boolean;
  
  // Speaking indicator
  activeSpeakerId: number | null;
  
  // Hand raise
  handRaisedUsers: number[];
  
  // Recording
  isRecording: boolean;
  
  // Actions
  setSession: (session: LiveSession | null) => void;
  setParticipants: (participants: LiveSessionParticipant[]) => void;
  addParticipant: (participant: LiveSessionParticipant) => void;
  removeParticipant: (userId: number) => void;
  updateParticipant: (userId: number, data: Partial<LiveSessionParticipant>) => void;
  
  // Media actions
  setLocalStream: (stream: MediaStream | null) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  setAudioEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  setScreenSharing: (sharing: boolean) => void;
  setAudioDevice: (deviceId: string) => void;
  setVideoDevice: (deviceId: string) => void;
  
  // Connection actions
  setConnectionQuality: (quality: ConnectionQuality) => void;
  setConnecting: (connecting: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;
  
  // UI actions
  toggleChat: () => void;
  toggleParticipants: () => void;
  togglePolls: () => void;
  toggleWhiteboard: () => void;
  toggleSettings: () => void;
  closeAllPanels: () => void;
  
  // Speaker
  setActiveSpeaker: (userId: number | null) => void;
  
  // Hand raise
  addHandRaise: (userId: number) => void;
  removeHandRaise: (userId: number) => void;
  clearHandRaises: () => void;
  
  // Recording
  setRecording: (recording: boolean) => void;
  
  // Reset
  reset: () => void;
}

const initialLocalMedia: LocalMediaState = {
  audioEnabled: true,
  videoEnabled: true,
  screenSharing: false,
  audioDeviceId: null,
  videoDeviceId: null,
};

export const useLiveSessionStore = create<LiveSessionState>((set) => ({
  currentSession: null,
  participants: [],
  localMedia: initialLocalMedia,
  localStream: null,
  screenStream: null,
  connectionQuality: 'unknown',
  isConnecting: false,
  isReconnecting: false,
  isChatOpen: false,
  isParticipantsOpen: false,
  isPollsOpen: false,
  isWhiteboardOpen: false,
  isSettingsOpen: false,
  activeSpeakerId: null,
  handRaisedUsers: [],
  isRecording: false,
  
  setSession: (session) => set({ currentSession: session }),
  
  setParticipants: (participants) => set({ participants }),
  
  addParticipant: (participant) =>
    set((state) => ({
      participants: [...state.participants, participant],
    })),
  
  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.userId !== userId),
    })),
  
  updateParticipant: (userId, data) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.userId === userId ? { ...p, ...data } : p
      ),
    })),
  
  setLocalStream: (stream) => set({ localStream: stream }),
  
  setScreenStream: (stream) => set({ screenStream: stream }),
  
  toggleAudio: () =>
    set((state) => ({
      localMedia: {
        ...state.localMedia,
        audioEnabled: !state.localMedia.audioEnabled,
      },
    })),
  
  toggleVideo: () =>
    set((state) => ({
      localMedia: {
        ...state.localMedia,
        videoEnabled: !state.localMedia.videoEnabled,
      },
    })),
  
  setAudioEnabled: (enabled) =>
    set((state) => ({
      localMedia: { ...state.localMedia, audioEnabled: enabled },
    })),
  
  setVideoEnabled: (enabled) =>
    set((state) => ({
      localMedia: { ...state.localMedia, videoEnabled: enabled },
    })),
  
  setScreenSharing: (sharing) =>
    set((state) => ({
      localMedia: { ...state.localMedia, screenSharing: sharing },
    })),
  
  setAudioDevice: (deviceId) =>
    set((state) => ({
      localMedia: { ...state.localMedia, audioDeviceId: deviceId },
    })),
  
  setVideoDevice: (deviceId) =>
    set((state) => ({
      localMedia: { ...state.localMedia, videoDeviceId: deviceId },
    })),
  
  setConnectionQuality: (quality) => set({ connectionQuality: quality }),
  
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  
  setReconnecting: (reconnecting) => set({ isReconnecting: reconnecting }),
  
  toggleChat: () =>
    set((state) => ({
      isChatOpen: !state.isChatOpen,
      isParticipantsOpen: false,
      isPollsOpen: false,
      isWhiteboardOpen: false,
      isSettingsOpen: false,
    })),
  
  toggleParticipants: () =>
    set((state) => ({
      isParticipantsOpen: !state.isParticipantsOpen,
      isChatOpen: false,
      isPollsOpen: false,
      isWhiteboardOpen: false,
      isSettingsOpen: false,
    })),
  
  togglePolls: () =>
    set((state) => ({
      isPollsOpen: !state.isPollsOpen,
      isChatOpen: false,
      isParticipantsOpen: false,
      isWhiteboardOpen: false,
      isSettingsOpen: false,
    })),
  
  toggleWhiteboard: () =>
    set((state) => ({
      isWhiteboardOpen: !state.isWhiteboardOpen,
      isChatOpen: false,
      isParticipantsOpen: false,
      isPollsOpen: false,
      isSettingsOpen: false,
    })),
  
  toggleSettings: () =>
    set((state) => ({
      isSettingsOpen: !state.isSettingsOpen,
      isChatOpen: false,
      isParticipantsOpen: false,
      isPollsOpen: false,
      isWhiteboardOpen: false,
    })),
  
  closeAllPanels: () =>
    set({
      isChatOpen: false,
      isParticipantsOpen: false,
      isPollsOpen: false,
      isWhiteboardOpen: false,
      isSettingsOpen: false,
    }),
  
  setActiveSpeaker: (userId) => set({ activeSpeakerId: userId }),
  
  addHandRaise: (userId) =>
    set((state) => ({
      handRaisedUsers: state.handRaisedUsers.includes(userId)
        ? state.handRaisedUsers
        : [...state.handRaisedUsers, userId],
    })),
  
  removeHandRaise: (userId) =>
    set((state) => ({
      handRaisedUsers: state.handRaisedUsers.filter((id) => id !== userId),
    })),
  
  clearHandRaises: () => set({ handRaisedUsers: [] }),
  
  setRecording: (recording) => set({ isRecording: recording }),
  
  reset: () =>
    set({
      currentSession: null,
      participants: [],
      localMedia: initialLocalMedia,
      localStream: null,
      screenStream: null,
      connectionQuality: 'unknown',
      isConnecting: false,
      isReconnecting: false,
      isChatOpen: false,
      isParticipantsOpen: false,
      isPollsOpen: false,
      isWhiteboardOpen: false,
      isSettingsOpen: false,
      activeSpeakerId: null,
      handRaisedUsers: [],
      isRecording: false,
    }),
}));
