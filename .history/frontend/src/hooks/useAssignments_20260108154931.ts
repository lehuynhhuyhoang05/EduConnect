import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '@/services/api/assignments.api';
import { queryKeys } from '@/lib/queryClient';
import { useToast } from '@/components/ui/Toast';
import type { Assignment, Submission } from '@/types/assignment.types';

export function useAssignments(classId: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.assignments.list(classId, params),
    queryFn: () => assignmentsApi.getAssignments(classId, params),
    enabled: !!classId,
  });
}

export function useAssignment(assignmentId: string) {
  return useQuery({
    queryKey: queryKeys.assignments.detail(assignmentId),
    queryFn: () => assignmentsApi.getAssignmentById(assignmentId),
    enabled: !!assignmentId,
  });
}

export function useMySubmission(assignmentId: string) {
  return useQuery({
    queryKey: ['assignments', assignmentId, 'my-submission'],
    queryFn: () => assignmentsApi.getMySubmission(assignmentId),
    enabled: !!assignmentId,
  });
}

export function useSubmissions(assignmentId: string) {
  return useQuery({
    queryKey: queryKeys.assignments.submissions(assignmentId),
    queryFn: () => assignmentsApi.getSubmissions(assignmentId),
    enabled: !!assignmentId,
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ classId, data }: { classId: string; data: Partial<Assignment> }) =>
      assignmentsApi.createAssignment(classId, data),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.list(classId) });
      toast.success('Tạo bài tập thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Tạo bài tập thất bại');
    },
  });
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: Partial<Assignment> }) =>
      assignmentsApi.updateAssignment(assignmentId, data),
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.detail(assignmentId) });
      toast.success('Cập nhật bài tập thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Cập nhật thất bại');
    },
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: assignmentsApi.deleteAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Xóa bài tập thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Xóa bài tập thất bại');
    },
  });
}

export function useSubmitAssignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: Partial<Submission> }) =>
      assignmentsApi.submitAssignment(assignmentId, data),
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['assignments', assignmentId, 'my-submission'] });
      toast.success('Nộp bài thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Nộp bài thất bại');
    },
  });
}

export function useGradeSubmission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      submissionId,
      grade,
      feedback,
    }: {
      submissionId: string;
      grade: number;
      feedback?: string;
    }) => assignmentsApi.gradeSubmission(submissionId, grade, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Chấm điểm thành công!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Chấm điểm thất bại');
    },
  });
}
