import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type {
  Assignment,
  Submission,
  GradeSubmissionDto,
  PaginatedResponse,
} from '../types';

// Helper to convert id to string
const toStr = (id: string | number): string => String(id);

// Query keys
export const assignmentKeys = {
  all: ['assignments'] as const,
  lists: () => [...assignmentKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...assignmentKeys.lists(), filters] as const,
  details: () => [...assignmentKeys.all, 'detail'] as const,
  detail: (id: string | number) => [...assignmentKeys.details(), toStr(id)] as const,
  byClass: (classId: string | number) => [...assignmentKeys.all, 'byClass', toStr(classId)] as const,
  submissions: (assignmentId: string | number) => [...assignmentKeys.all, 'submissions', toStr(assignmentId)] as const,
};

// Get all assignments with filters
export function useAssignments(params?: { classId?: string | number; page?: number; limit?: number }) {
  return useQuery({
    queryKey: assignmentKeys.list(params || {}),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Assignment>>('/assignments', { params });
      return response.data;
    },
  });
}

// Get assignments by class
export function useAssignmentsByClass(classId: string | number) {
  return useQuery({
    queryKey: assignmentKeys.byClass(classId),
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Assignment> | Assignment[]>(`/classes/${classId}/assignments`);
      // Handle both paginated and array responses
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data && 'data' in data) return data.data;
      return [];
    },
    enabled: !!classId,
  });
}

// Alias for useAssignmentsByClass
export const useClassAssignments = useAssignmentsByClass;

// Get single assignment
export function useAssignment(id: string | number) {
  return useQuery({
    queryKey: assignmentKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<Assignment>(`/assignments/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Get submissions for an assignment
export function useSubmissions(assignmentId: string | number) {
  return useQuery({
    queryKey: assignmentKeys.submissions(assignmentId),
    queryFn: async () => {
      const response = await api.get<Submission[]>(`/assignments/${assignmentId}/submissions`);
      return response.data;
    },
    enabled: !!assignmentId,
  });
}

// Create assignment
export function useCreateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { classId: string | number; title: string; description?: string; dueDate: string; maxScore?: number }) => {
      const response = await api.post<Assignment>(`/classes/${data.classId}/assignments`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
      if (data.classId) {
        queryClient.invalidateQueries({ queryKey: assignmentKeys.byClass(toStr(data.classId)) });
      }
    },
  });
}

// Update assignment
export function useUpdateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Partial<Assignment> }) => {
      const response = await api.patch<Assignment>(`/assignments/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
      queryClient.setQueryData(assignmentKeys.detail(toStr(data.id)), data);
    },
  });
}

// Delete assignment
export function useDeleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/assignments/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
    },
  });
}

// Submit assignment
export function useSubmitAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, content, attachments }: { assignmentId: string | number; content?: string; attachments?: string[] }) => {
      const response = await api.post<Submission>(`/assignments/${assignmentId}/submissions`, { content, attachments });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.submissions(toStr(data.assignmentId)) });
    },
  });
}

// Grade submission
export function useGradeSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submissionId, data }: { submissionId: string | number; data: GradeSubmissionDto }) => {
      const response = await api.patch<Submission>(`/submissions/${submissionId}/grade`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.submissions(toStr(data.assignmentId)) });
    },
  });
}

// Bulk grade submissions
export function useBulkGrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, grades }: { assignmentId: string | number; grades: Array<{ submissionId: string | number; score: number; feedback?: string }> }) => {
      const response = await api.post(`/assignments/${assignmentId}/bulk-grade`, { grades });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.submissions(toStr(variables.assignmentId)) });
    },
  });
}

// Get upcoming assignments (active assignments, sorted by due date)
export function useUpcomingAssignments() {
  return useQuery({
    queryKey: [...assignmentKeys.all, 'upcoming'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Assignment>>('/assignments', {
        params: { isActive: true, limit: 10 }
      });
      // Handle paginated response
      const data = response.data;
      const assignments = Array.isArray(data) ? data : (data?.data || []);
      // Sort by due date and filter upcoming
      const now = new Date();
      return assignments
        .filter((a: Assignment) => new Date(a.dueDate) > now)
        .sort((a: Assignment, b: Assignment) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 10);
    },
  });
}
