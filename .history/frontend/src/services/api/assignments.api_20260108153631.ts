import api from './axios';
import type {
  Assignment,
  Submission,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
  ReturnSubmissionDto,
  BulkGradeDto,
  GetAssignmentsParams,
  GetSubmissionsParams,
  AssignmentStatistics,
} from '@/types';
import type { PaginatedResponse } from '@/types/api.types';

// ==================== Assignment CRUD ====================

/**
 * Create assignment in a class
 */
export async function createAssignment(
  classId: string | number,
  data: CreateAssignmentDto
): Promise<Assignment> {
  const response = await api.post<Assignment>(`/classes/${classId}/assignments`, data);
  return response.data;
}

/**
 * Get all assignments from user's classes
 */
export async function getAssignments(
  params?: GetAssignmentsParams
): Promise<PaginatedResponse<Assignment>> {
  const response = await api.get<PaginatedResponse<Assignment>>('/assignments', { params });
  return response.data;
}

/**
 * Get assignments in specific class
 */
export async function getClassAssignments(
  classId: string | number,
  params?: GetAssignmentsParams
): Promise<PaginatedResponse<Assignment>> {
  const response = await api.get<PaginatedResponse<Assignment>>(
    `/classes/${classId}/assignments`,
    { params }
  );
  return response.data;
}

/**
 * Get assignment details
 */
export async function getAssignmentById(id: string | number): Promise<Assignment> {
  const response = await api.get<Assignment>(`/assignments/${id}`);
  return response.data;
}

/**
 * Update assignment
 */
export async function updateAssignment(
  id: string | number,
  data: UpdateAssignmentDto
): Promise<Assignment> {
  const response = await api.put<Assignment>(`/assignments/${id}`, data);
  return response.data;
}

/**
 * Delete assignment
 */
export async function deleteAssignment(id: string | number): Promise<void> {
  await api.delete(`/assignments/${id}`);
}

// ==================== Submissions ====================

/**
 * Submit assignment (Student)
 */
export async function submitAssignment(
  assignmentId: string | number,
  data: SubmitAssignmentDto
): Promise<Submission> {
  const response = await api.post<Submission>(`/assignments/${assignmentId}/submit`, data);
  return response.data;
}

/**
 * Get all submissions for an assignment (Teacher)
 */
export async function getSubmissions(
  assignmentId: string | number,
  params?: GetSubmissionsParams
): Promise<PaginatedResponse<Submission>> {
  const response = await api.get<PaginatedResponse<Submission>>(
    `/assignments/${assignmentId}/submissions`,
    { params }
  );
  return response.data;
}

/**
 * Get own submission (Student)
 */
export async function getMySubmission(assignmentId: string | number): Promise<Submission | null> {
  try {
    const response = await api.get<Submission>(`/assignments/${assignmentId}/my-submission`);
    return response.data;
  } catch {
    return null;
  }
}

/**
 * Get submission by ID
 */
export async function getSubmissionById(submissionId: string | number): Promise<Submission> {
  const response = await api.get<Submission>(`/submissions/${submissionId}`);
  return response.data;
}

/**
 * Grade a submission (Teacher)
 */
export async function gradeSubmission(
  submissionId: string | number,
  data: GradeSubmissionDto
): Promise<Submission> {
  const response = await api.post<Submission>(`/submissions/${submissionId}/grade`, data);
  return response.data;
}

/**
 * Return submission for revision (Teacher)
 */
export async function returnSubmission(
  submissionId: string | number,
  data: ReturnSubmissionDto
): Promise<Submission> {
  const response = await api.post<Submission>(`/submissions/${submissionId}/return`, data);
  return response.data;
}

/**
 * Bulk grade submissions (Teacher)
 */
export async function bulkGradeSubmissions(
  assignmentId: string | number,
  data: BulkGradeDto
): Promise<{ success: number; failed: number }> {
  const response = await api.post(`/assignments/${assignmentId}/bulk-grade`, data);
  return response.data;
}

// ==================== Statistics ====================

/**
 * Get assignment statistics (Teacher)
 */
export async function getAssignmentStatistics(
  assignmentId: string | number
): Promise<AssignmentStatistics> {
  const response = await api.get<AssignmentStatistics>(`/assignments/${assignmentId}/statistics`);
  return response.data;
}

/**
 * Export grades as CSV
 */
export async function exportGrades(assignmentId: string | number): Promise<Blob> {
  const response = await api.get(`/assignments/${assignmentId}/export`, {
    responseType: 'blob',
  });
  return response.data;
}
