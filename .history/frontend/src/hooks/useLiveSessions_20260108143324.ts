import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { LiveSession, CreateLiveSessionData, PaginatedResponse } from '../types';

// Query keys
export const liveSessionKeys = {
  all: ['liveSessions'] as const,
  lists: () => [...liveSessionKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...liveSessionKeys.lists(), filters] as const,
  details: () => [...liveSessionKeys.all, 'detail'] as const,
  detail: (id: string) => [...liveSessionKeys.details(), id] as const,
  byClass: (classId: string) => [...liveSessionKeys.all, 'byClass', classId] as const,
  upcoming: () => [...liveSessionKeys.all, 'upcoming'] as const,
  active: () => [...liveSessionKeys.all, 'active'] as const,
};

// Get all live sessions
export function useLiveSessions(params?: {
  page?: number;
  limit?: number;
  classId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: liveSessionKeys.list(params || {}),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<LiveSession>>('/live-sessions', { params });
      return response.data;
    },
  });
}

// Get live sessions by class
export function useLiveSessionsByClass(classId: string) {
  return useQuery({
    queryKey: liveSessionKeys.byClass(classId),
    queryFn: async () => {
      const response = await api.get<LiveSession[]>(`/live-sessions/class/${classId}`);
      return response.data;
    },
    enabled: !!classId,
  });
}

// Get upcoming live sessions
export function useUpcomingLiveSessions() {
  return useQuery({
    queryKey: liveSessionKeys.upcoming(),
    queryFn: async () => {
      const response = await api.get<LiveSession[]>('/live-sessions/upcoming');
      return response.data;
    },
  });
}

// Get active live sessions
export function useActiveLiveSessions() {
  return useQuery({
    queryKey: liveSessionKeys.active(),
    queryFn: async () => {
      const response = await api.get<LiveSession[]>('/live-sessions/active');
      return response.data;
    },
  });
}

// Get live session by ID
export function useLiveSession(id: string) {
  return useQuery({
    queryKey: liveSessionKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<LiveSession>(`/live-sessions/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create live session mutation
export function useCreateLiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLiveSessionData) => {
      const response = await api.post<LiveSession>('/live-sessions', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.lists() });
      if (data.classId) {
        queryClient.invalidateQueries({ queryKey: liveSessionKeys.byClass(data.classId) });
      }
    },
  });
}

// Update live session mutation
export function useUpdateLiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateLiveSessionData> }) => {
      const response = await api.patch<LiveSession>(`/live-sessions/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.lists() });
      queryClient.setQueryData(liveSessionKeys.detail(data.id), data);
      if (data.classId) {
        queryClient.invalidateQueries({ queryKey: liveSessionKeys.byClass(data.classId) });
      }
    },
  });
}

// Delete live session mutation
export function useDeleteLiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/live-sessions/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.upcoming() });
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.active() });
    },
  });
}

// Start live session mutation
export function useStartLiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<LiveSession>(`/live-sessions/${id}/start`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.lists() });
      queryClient.setQueryData(liveSessionKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.active() });
    },
  });
}

// End live session mutation
export function useEndLiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<LiveSession>(`/live-sessions/${id}/end`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.lists() });
      queryClient.setQueryData(liveSessionKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.active() });
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.upcoming() });
    },
  });
}

// Join live session mutation
export function useJoinLiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ token: string; session: LiveSession }>(
        `/live-sessions/${id}/join`
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(liveSessionKeys.detail(data.session.id), data.session);
    },
  });
}

// Leave live session mutation
export function useLeaveLiveSession() {
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/live-sessions/${id}/leave`);
      return id;
    },
  });
}

// Alias for useUpcomingLiveSessions - used in dashboard
export const useUpcomingSessions = useUpcomingLiveSessions;
