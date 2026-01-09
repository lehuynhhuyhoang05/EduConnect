import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Class, CreateClassData, JoinClassData, PaginatedResponse, User } from '../types';

// Query keys
export const classKeys = {
  all: ['classes'] as const,
  lists: () => [...classKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...classKeys.lists(), filters] as const,
  details: () => [...classKeys.all, 'detail'] as const,
  detail: (id: string) => [...classKeys.details(), id] as const,
  members: (id: string) => [...classKeys.all, 'members', id] as const,
  materials: (id: string) => [...classKeys.all, 'materials', id] as const,
};

// Get all classes
export function useClasses(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: classKeys.list(params || {}),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Class>>('/classes', { params });
      return response.data;
    },
  });
}

// Get my classes (as teacher or student)
export function useMyClasses() {
  return useQuery({
    queryKey: [...classKeys.lists(), 'my'],
    queryFn: async () => {
      const response = await api.get<Class[]>('/classes/my');
      return response.data;
    },
  });
}

// Get class by ID
export function useClass(id: string) {
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
export function useClassMembers(classId: string) {
  return useQuery({
    queryKey: classKeys.members(classId),
    queryFn: async () => {
      const response = await api.get<User[]>(`/classes/${classId}/members`);
      return response.data;
    },
    enabled: !!classId,
  });
}

// Create class mutation
export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateClassData) => {
      const response = await api.post<Class>('/classes', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
}

// Update class mutation
export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateClassData> }) => {
      const response = await api.patch<Class>(`/classes/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      queryClient.setQueryData(classKeys.detail(data.id), data);
    },
  });
}

// Delete class mutation
export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/classes/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
      queryClient.removeQueries({ queryKey: classKeys.detail(id) });
    },
  });
}

// Join class mutation
export function useJoinClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: JoinClassData) => {
      const response = await api.post<Class>('/classes/join', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
}

// Leave class mutation
export function useLeaveClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classId: string) => {
      await api.post(`/classes/${classId}/leave`);
      return classId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.lists() });
    },
  });
}

// Remove student from class mutation
export function useRemoveStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, studentId }: { classId: string; studentId: string }) => {
      await api.delete(`/classes/${classId}/members/${studentId}`);
      return { classId, studentId };
    },
    onSuccess: ({ classId }) => {
      queryClient.invalidateQueries({ queryKey: classKeys.members(classId) });
    },
  });
}
