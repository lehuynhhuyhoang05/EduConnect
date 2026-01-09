import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { liveSessionsApi } from '@/services/api/live-sessions.api';
import { queryKeys } from '@/lib/queryClient';
import { useToast } from '@/components/ui/Toast';
import type { LiveSession } from '@/types/live-session.types';

export function useLiveSessions(classId?: string) {
  return useQuery({
    queryKey: classId ? queryKeys.liveSessions.list(classId) : queryKeys.liveSessions.all,
    queryFn: () =>
      classId
        ? liveSessionsApi.getClassSessions(classId)
        : liveSessionsApi.getUpcomingSessions(),
  });
}

export function useLiveSession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.liveSessions.detail(sessionId),
    queryFn: () => liveSessionsApi.getSessionById(sessionId),
    enabled: !!sessionId,
  });
}

export function useSessionParticipants(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.liveSessions.participants(sessionId),
    queryFn: () => liveSessionsApi.getParticipants(sessionId),
    enabled: !!sessionId,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ classId, data }: { classId: string; data: Partial<LiveSession> }) =>
      liveSessionsApi.createSession(classId, data),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveSessions.list(classId) });
      toast.success('Tạo phiên học thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Tạo phiên học thất bại');
    },
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: liveSessionsApi.startSession,
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveSessions.detail(sessionId) });
      toast.success('Phiên học đã bắt đầu!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Bắt đầu phiên học thất bại');
    },
  });
}

export function useEndSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: liveSessionsApi.endSession,
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.liveSessions.detail(sessionId) });
      toast.success('Phiên học đã kết thúc!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Kết thúc phiên học thất bại');
    },
  });
}

export function useJoinSession() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: liveSessionsApi.joinSession,
    onError: (error: Error) => {
      toast.error(error.message || 'Tham gia phiên học thất bại');
    },
  });
}

export function useLeaveSession() {
  return useMutation({
    mutationFn: liveSessionsApi.leaveSession,
  });
}

// Polls
export function useSessionPolls(sessionId: string) {
  return useQuery({
    queryKey: ['live-sessions', sessionId, 'polls'],
    queryFn: () => liveSessionsApi.getPolls(sessionId),
    enabled: !!sessionId,
  });
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: { question: string; options: string[]; duration?: number };
    }) => liveSessionsApi.createPoll(sessionId, data),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions', sessionId, 'polls'] });
      toast.success('Tạo khảo sát thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Tạo khảo sát thất bại');
    },
  });
}

export function useVotePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) =>
      liveSessionsApi.votePoll(pollId, optionIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions'] });
    },
  });
}

// Q&A
export function useSessionQuestions(sessionId: string) {
  return useQuery({
    queryKey: ['live-sessions', sessionId, 'questions'],
    queryFn: () => liveSessionsApi.getQuestions(sessionId),
    enabled: !!sessionId,
  });
}

export function useAskQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, content }: { sessionId: string; content: string }) =>
      liveSessionsApi.askQuestion(sessionId, content),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions', sessionId, 'questions'] });
    },
  });
}

// Hand raise
export function useRaiseHand() {
  return useMutation({
    mutationFn: liveSessionsApi.raiseHand,
  });
}

export function useLowerHand() {
  return useMutation({
    mutationFn: liveSessionsApi.lowerHand,
  });
}

// Recording
export function useStartRecording() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: liveSessionsApi.startRecording,
    onSuccess: () => {
      toast.success('Bắt đầu ghi hình!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Bắt đầu ghi hình thất bại');
    },
  });
}

export function useStopRecording() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: liveSessionsApi.stopRecording,
    onSuccess: () => {
      toast.success('Dừng ghi hình!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Dừng ghi hình thất bại');
    },
  });
}
