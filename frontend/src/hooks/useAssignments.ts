import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '@/services/api';
import type {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  QueryAssignmentDto,
  CreateSubmissionDto,
  GradeSubmissionDto,
} from '@/types';

// Query keys
export const assignmentKeys = {
  all: ['assignments'] as const,
  lists: () => [...assignmentKeys.all, 'list'] as const,
  list: (params?: QueryAssignmentDto) => [...assignmentKeys.lists(), params] as const,
  byClass: (classId: number, params?: QueryAssignmentDto) => [...assignmentKeys.all, 'class', classId, params] as const,
  details: () => [...assignmentKeys.all, 'detail'] as const,
  detail: (id: number) => [...assignmentKeys.details(), id] as const,
  submissions: (id: number) => [...assignmentKeys.detail(id), 'submissions'] as const,
  mySubmission: (id: number) => [...assignmentKeys.detail(id), 'my-submission'] as const,
  stats: (id: number) => [...assignmentKeys.detail(id), 'stats'] as const,
};

// ============================================
// QUERIES
// ============================================

// Get all assignments
export const useAssignments = (params?: QueryAssignmentDto) => {
  return useQuery({
    queryKey: assignmentKeys.list(params),
    queryFn: () => assignmentsApi.getAll(params),
    staleTime: 2 * 60 * 1000,
  });
};

// Get assignments by class
export const useClassAssignments = (classId: number, params?: QueryAssignmentDto) => {
  return useQuery({
    queryKey: assignmentKeys.byClass(classId, params),
    queryFn: () => assignmentsApi.getByClass(classId, params),
    enabled: !!classId,
    staleTime: 2 * 60 * 1000,
  });
};

// Get assignment by ID
export const useAssignment = (id: number) => {
  return useQuery({
    queryKey: assignmentKeys.detail(id),
    queryFn: () => assignmentsApi.getById(id),
    enabled: !!id,
  });
};

// Get submissions (teacher)
export const useSubmissions = (assignmentId: number) => {
  return useQuery({
    queryKey: assignmentKeys.submissions(assignmentId),
    queryFn: () => assignmentsApi.getSubmissions(assignmentId),
    enabled: !!assignmentId,
  });
};

// Get my submission (student)
export const useMySubmission = (assignmentId: number) => {
  return useQuery({
    queryKey: assignmentKeys.mySubmission(assignmentId),
    queryFn: () => assignmentsApi.getMySubmission(assignmentId),
    enabled: !!assignmentId,
  });
};

// Get assignment stats
export const useAssignmentStats = (assignmentId: number) => {
  return useQuery({
    queryKey: assignmentKeys.stats(assignmentId),
    queryFn: () => assignmentsApi.getStats(assignmentId),
    enabled: !!assignmentId,
  });
};

// ============================================
// MUTATIONS
// ============================================

// Create assignment
export const useCreateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ classId, data }: { classId: number; data: CreateAssignmentDto }) =>
      assignmentsApi.create(classId, data),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.byClass(classId) });
    },
  });
};

// Update assignment
export const useUpdateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAssignmentDto }) =>
      assignmentsApi.update(id, data),
    onSuccess: (updatedAssignment) => {
      queryClient.setQueryData(assignmentKeys.detail(updatedAssignment.id), updatedAssignment);
      queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
    },
  });
};

// Delete assignment
export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => assignmentsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: assignmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
    },
  });
};

// Submit assignment
export const useSubmitAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: number; data: CreateSubmissionDto }) =>
      assignmentsApi.submit(assignmentId, data),
    onSuccess: (submission, { assignmentId }) => {
      queryClient.setQueryData(assignmentKeys.mySubmission(assignmentId), submission);
      queryClient.invalidateQueries({ queryKey: assignmentKeys.detail(assignmentId) });
    },
  });
};

// Grade submission
export const useGradeSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, data }: { submissionId: number; data: GradeSubmissionDto }) =>
      assignmentsApi.grade(submissionId, data),
    onSuccess: (gradedSubmission) => {
      // Invalidate submissions list
      queryClient.invalidateQueries({ queryKey: assignmentKeys.submissions(gradedSubmission.assignmentId) });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.stats(gradedSubmission.assignmentId) });
    },
  });
};

// Return submission for revision
export const useReturnSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, feedback }: { submissionId: number; feedback: string }) =>
      assignmentsApi.returnSubmission(submissionId, feedback),
    onSuccess: (returnedSubmission) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.submissions(returnedSubmission.assignmentId) });
    },
  });
};

// Export grades
export const useExportGrades = () => {
  return useMutation({
    mutationFn: (assignmentId: number) => assignmentsApi.exportGrades(assignmentId),
    onSuccess: (blob, assignmentId) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grades-assignment-${assignmentId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
};

// Bulk grade submissions
export const useBulkGrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, grades }: { 
      assignmentId: number; 
      grades: Array<{ submissionId: number; score: number; feedback?: string }> 
    }) => assignmentsApi.bulkGrade(assignmentId, grades),
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.submissions(assignmentId) });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.stats(assignmentId) });
    },
  });
};

// ============================================
// HELPER HOOKS
// ============================================

// Get upcoming assignments
export const useUpcomingAssignments = () => {
  const { data, ...rest } = useAssignments();

  const upcomingAssignments = data?.data
    .filter((a) => new Date(a.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  return { data: upcomingAssignments, ...rest };
};

// Get overdue assignments
export const useOverdueAssignments = () => {
  const { data, ...rest } = useAssignments();

  const overdueAssignments = data?.data
    .filter((a) => new Date(a.dueDate) < new Date() && !a.mySubmission);

  return { data: overdueAssignments, ...rest };
};
