import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { LiveSession, CreateLiveSessionDto, PaginatedResponse } from '../types';

// Helper to convert id to string
const toStr = (id: string | number): string => String(id);

// Query keys
export const liveSessionKeys = {
  all: ['liveSessions'] as const,
  lists: () => [...liveSessionKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...liveSessionKeys.lists(), filters] as const,
  details: () => [...liveSessionKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...liveSessionKeys.details(), toStr(id)] as const,
  byClass: (classId: string | number) => [...liveSessionKeys.all, 'byClass', toStr(classId)] as const,
  upcoming: () => [...liveSessionKeys.all, 'upcoming'] as const,
  active: () => [...liveSessionKeys.all, 'active'] as const,
};

// Get all live sessions
export function useLiveSessions(params?: {
  page?: number;
  limit?: number;
  classId?: string | number;
  status?: string;
}) {
  return useQuery({
    queryKey: liveSessionKeys.list(params || {}),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<LiveSession>>('/sessions', { params });
      return response.data;
    },
  });
}

// Get live sessions by class
export function useLiveSessionsByClass(classId: string | number) {
  return useQuery({
    queryKey: liveSessionKeys.byClass(classId),
    queryFn: async () => {
      const response = await api.get<LiveSession[]>(`/classes/${classId}/sessions`);
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
      const response = await api.get<PaginatedResponse<LiveSession>>('/sessions', {
        params: { status: 'scheduled', limit: 10 }
      });
      return response.data?.data || response.data || [];
    },
  });
}

// Get active live sessions
export function useActiveLiveSessions() {
  return useQuery({
    queryKey: liveSessionKeys.active(),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<LiveSession>>('/sessions', {
        params: { status: 'active' }
      });
      return response.data?.data || response.data || [];
    },
  });
}

// Get live session by ID
export function useLiveSession(id: string | number) {
  return useQuery({
    queryKey: liveSessionKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<LiveSession>(`/sessions/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create live session mutation
export function useCreateLiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLiveSessionDto & { classId: string | number }) => {
      const response = await api.post<LiveSession>(`/classes/${data.classId}/sessions`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.lists() });
      if (data.classId) {
        queryClient.invalidateQueries({ queryKey: liveSessionKeys.byClass(toStr(data.classId)) });
      }
    },
  });
}

// Update live session mutation
export function useUpdateLiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<CreateLiveSessionDto> }) => {
      const response = await api.patch<LiveSession>(`/sessions/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.lists() });
      queryClient.setQueryData(liveSessionKeys.detail(toStr(data.id)), data);
      if (data.classId) {
        queryClient.invalidateQueries({ queryKey: liveSessionKeys.byClass(toStr(data.classId)) });
      }
    },
  });
}

// Delete live session mutation
export function useDeleteLiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/sessions/${id}`);
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
    mutationFn: async (id: string | number) => {
      const response = await api.post<LiveSession>(`/sessions/${id}/start`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.lists() });
      queryClient.setQueryData(liveSessionKeys.detail(toStr(data.id)), data);
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.active() });
    },
  });
}

// End live session mutation
export function useEndLiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.post<LiveSession>(`/sessions/${id}/end`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.lists() });
      queryClient.setQueryData(liveSessionKeys.detail(toStr(data.id)), data);
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.active() });
      queryClient.invalidateQueries({ queryKey: liveSessionKeys.upcoming() });
    },
  });
}

// Join live session mutation
export function useJoinLiveSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.post<{ token: string; session: LiveSession }>(
        `/sessions/${id}/join`
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(liveSessionKeys.detail(toStr(data.session.id)), data.session);
    },
  });
}

// Leave live session mutation
export function useLeaveLiveSession() {
  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.post(`/sessions/${id}/leave`);
      return id;
    },
  });
}

// Alias for useUpcomingLiveSessions - used in dashboard
export const useUpcomingSessions = useUpcomingLiveSessions;
