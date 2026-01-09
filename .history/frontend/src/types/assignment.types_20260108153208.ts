import type { User } from './user.types';

export type SubmissionStatus = 'submitted' | 'graded' | 'returned';

export interface Assignment {
  id: number;
  classId: number;
  createdBy: number;
  title: string;
  description: string;
  dueDate: string;
  deadline: string;
  maxScore: number;
  attachmentUrl: string | null;
  submissionCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  class?: {
    id: number;
    name: string;
  };
  creator?: User;
}

export interface Submission {
  id: number;
  assignmentId: number;
  studentId: number;
  fileUrl: string | null;
  content: string | null;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  gradedBy: number | null;
  isLate: boolean;
  student?: User;
  grader?: User;
}

export interface CreateAssignmentDto {
  title: string;
  description?: string;
  dueDate: string;
  maxScore?: number;
  attachmentUrl?: string;
}

export interface UpdateAssignmentDto {
  title?: string;
  description?: string;
  dueDate?: string;
  maxScore?: number;
  attachmentUrl?: string;
  isActive?: boolean;
}

export interface SubmitAssignmentDto {
  fileUrl?: string;
  content?: string;
}

export interface GradeSubmissionDto {
  score: number;
  feedback?: string;
}

export interface ReturnSubmissionDto {
  feedback: string;
}

export interface BulkGradeDto {
  grades: {
    submissionId: number;
    score: number;
    feedback?: string;
  }[];
}

// Query params
export interface GetAssignmentsParams {
  classId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface GetSubmissionsParams {
  status?: SubmissionStatus;
  page?: number;
  limit?: number;
}

// Statistics
export interface AssignmentStatistics {
  totalSubmissions: number;
  gradedCount: number;
  pendingCount: number;
  averageScore: number;
  lateSubmissions: number;
  highestScore: number;
  lowestScore: number;
}
