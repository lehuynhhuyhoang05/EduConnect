import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Class, ClassMember, PaginatedResponse } from '../types';

// Query keys
export const classKeys = {
  all: ['classes'] as const,
  lists: () => [...classKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...classKeys.lists(), filters] as const,
  details: () => [...classKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...classKeys.details(), String(id)] as const,
  members: (id: string | number) => [...classKeys.all, 'members', String(id)] as const,
  announcements: (id: string | number) => [...classKeys.all, 'announcements', String(id)] as const,
  gradebook: (id: string | number) => [...classKeys.all, 'gradebook', String(id)] as const,
};

// Get all classes with pagination
export function useClasses(params?: { page?: number; limit?: number; search?: string; isActive?: boolean; myClasses?: boolean }) {
  return useQuery({
    queryKey: classKeys.list(params || {}),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Class>>('/classes', { params });
      return response.data;
    },
  });
}

// Get my classes (as teacher or student) - using myClasses=true
export function useMyClasses() {
  return useQuery({
    queryKey: [...classKeys.lists(), 'my'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Class>>('/classes', { 
        params: { myClasses: true, limit: 100 } 
      });
      return response.data.data || response.data;
    },
  });
}

// Get class by ID
export function useClass(id: string | number) {
  return useQuery({
    queryKey: classKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<Class>(`/classes/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Get class members
export function useClassMembers(classId: string | number) {
  return useQuery({
    queryKey: classKeys.members(classId),
    queryFn: async () => {
      const response = await api.get<ClassMember[]>(`/classes/${classId}/members`);
      return response.data;
    },
    enabled: !!classId,
  });
}

// Create class mutation (Teachers only)
export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; subject?: string }) => {
      const response = await api.post<Class>('/classes', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
}

// Update class mutation (Teachers only)
export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: { name?: string; description?: string; subject?: string } }) => {
      const response = await api.put<Class>(`/classes/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      queryClient.setQueryData(classKeys.detail(data.id), data);
    },
  });
}

// Delete/Deactivate class mutation (Teachers only)
export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/classes/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      queryClient.removeQueries({ queryKey: classKeys.detail(id) });
    },
  });
}

// Reactivate class mutation (Teachers only)
export function useReactivateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      const response = await api.post<Class>(`/classes/${id}/reactivate`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      queryClient.setQueryData(classKeys.detail(data.id), data);
    },
  });
}

// Join class by code mutation
export function useJoinClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { code: string }) => {
      const response = await api.post<ClassMember>('/classes/join', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
}

// Leave class mutation (Students only)
export function useLeaveClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classId: string | number) => {
      await api.post(`/classes/${classId}/leave`);
      return classId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
}

// Remove student from class mutation (Teachers only)
export function useRemoveStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, studentId }: { classId: string | number; studentId: string | number }) => {
      await api.delete(`/classes/${classId}/members/${studentId}`);
      return { classId, studentId };
    },
    onSuccess: ({ classId }) => {
      queryClient.invalidateQueries({ queryKey: classKeys.members(classId) });
    },
  });
}

// ===================== ANNOUNCEMENTS =====================

// Get class announcements
export function useClassAnnouncements(classId: string | number, options?: { onlyPinned?: boolean }) {
  return useQuery({
    queryKey: [...classKeys.announcements(classId), options],
    queryFn: async () => {
      const response = await api.get(`/classes/${classId}/announcements`, { 
        params: { onlyPinned: options?.onlyPinned } 
      });
      return response.data;
    },
    enabled: !!classId,
  });
}

// Create announcement mutation (Teachers only)
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, data }: { 
      classId: string | number; 
      data: { 
        title: string; 
        content: string; 
        isPinned?: boolean;
        priority?: 'normal' | 'important' | 'urgent';
        allowComments?: boolean;
      } 
    }) => {
      const response = await api.post(`/classes/${classId}/announcements`, data);
      return response.data;
    },
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: classKeys.announcements(classId) });
    },
  });
}

// ===================== GRADEBOOK =====================

// Get class gradebook
export function useClassGradebook(classId: string | number) {
  return useQuery({
    queryKey: classKeys.gradebook(classId),
    queryFn: async () => {
      const response = await api.get(`/classes/${classId}/gradebook`);
      return response.data;
    },
    enabled: !!classId,
  });
}

// Get my grades in a class
export function useMyGrades(classId: string | number) {
  return useQuery({
    queryKey: [...classKeys.gradebook(classId), 'my'],
    queryFn: async () => {
      const response = await api.get(`/classes/${classId}/gradebook/my-grades`);
      return response.data;
    },
    enabled: !!classId,
  });
}
