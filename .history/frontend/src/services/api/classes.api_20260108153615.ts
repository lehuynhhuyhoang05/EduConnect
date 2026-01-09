import api from './axios';
import type {
  Class,
  ClassMember,
  CreateClassDto,
  UpdateClassDto,
  JoinClassDto,
  GetClassesParams,
  ClassAnnouncement,
  CreateAnnouncementDto,
  GradebookEntry,
  GradebookAssignment,
  GradingPolicy,
} from '@/types';
import type { PaginatedResponse } from '@/types/api.types';

// ==================== Class CRUD ====================

/**
 * Create a new class (Teacher only)
 */
export async function createClass(data: CreateClassDto): Promise<Class> {
  const response = await api.post<Class>('/classes', data);
  return response.data;
}

/**
 * Get all classes
 */
export async function getClasses(params?: GetClassesParams): Promise<PaginatedResponse<Class>> {
  const response = await api.get<PaginatedResponse<Class>>('/classes', { params });
  return response.data;
}

/**
 * Get class by ID
 */
export async function getClassById(id: string | number): Promise<Class> {
  const response = await api.get<Class>(`/classes/${id}`);
  return response.data;
}

/**
 * Update class
 */
export async function updateClass(id: string | number, data: UpdateClassDto): Promise<Class> {
  const response = await api.put<Class>(`/classes/${id}`, data);
  return response.data;
}

/**
 * Delete/Deactivate class
 */
export async function deleteClass(id: string | number): Promise<void> {
  await api.delete(`/classes/${id}`);
}

/**
 * Reactivate class
 */
export async function reactivateClass(id: string | number): Promise<Class> {
  const response = await api.post<Class>(`/classes/${id}/reactivate`);
  return response.data;
}

// ==================== Class Members ====================

/**
 * Join a class using class code
 */
export async function joinClass(data: JoinClassDto): Promise<ClassMember> {
  const response = await api.post<ClassMember>('/classes/join', data);
  return response.data;
}

/**
 * Get class members
 */
export async function getClassMembers(classId: string | number): Promise<ClassMember[]> {
  const response = await api.get<ClassMember[]>(`/classes/${classId}/members`);
  return response.data;
}

/**
 * Leave a class (Student only)
 */
export async function leaveClass(classId: string | number): Promise<void> {
  await api.delete(`/classes/${classId}/leave`);
}

/**
 * Remove a member from class (Teacher only)
 */
export async function removeMember(classId: string | number, userId: number): Promise<void> {
  await api.delete(`/classes/${classId}/members/${userId}`);
}

// ==================== Announcements ====================

/**
 * Create announcement
 */
export async function createAnnouncement(
  classId: string | number,
  data: CreateAnnouncementDto
): Promise<ClassAnnouncement> {
  const response = await api.post<ClassAnnouncement>(`/classes/${classId}/announcements`, data);
  return response.data;
}

/**
 * Get class announcements
 */
export async function getAnnouncements(
  classId: string | number,
  pinnedOnly?: boolean
): Promise<ClassAnnouncement[]> {
  const response = await api.get<ClassAnnouncement[]>(`/classes/${classId}/announcements`, {
    params: { pinnedOnly },
  });
  return response.data;
}

/**
 * Get unread announcement count
 */
export async function getUnreadAnnouncementCount(classId: string | number): Promise<number> {
  const response = await api.get<{ count: number }>(`/classes/${classId}/announcements/unread`);
  return response.data.count;
}

/**
 * Update announcement
 */
export async function updateAnnouncement(
  classId: string | number,
  announcementId: number,
  data: Partial<CreateAnnouncementDto>
): Promise<ClassAnnouncement> {
  const response = await api.put<ClassAnnouncement>(
    `/classes/${classId}/announcements/${announcementId}`,
    data
  );
  return response.data;
}

/**
 * Delete announcement
 */
export async function deleteAnnouncement(
  classId: string | number,
  announcementId: number
): Promise<void> {
  await api.delete(`/classes/${classId}/announcements/${announcementId}`);
}

/**
 * Mark announcement as read
 */
export async function markAnnouncementAsRead(
  classId: string | number,
  announcementId: number
): Promise<void> {
  await api.post(`/classes/${classId}/announcements/${announcementId}/read`);
}

/**
 * Add comment to announcement
 */
export async function addAnnouncementComment(
  classId: string | number,
  announcementId: number,
  content: string
): Promise<void> {
  await api.post(`/classes/${classId}/announcements/${announcementId}/comments`, { content });
}

/**
 * Toggle pin announcement
 */
export async function togglePinAnnouncement(
  classId: string | number,
  announcementId: number
): Promise<void> {
  await api.post(`/classes/${classId}/announcements/${announcementId}/pin`);
}

// ==================== Gradebook ====================

/**
 * Get class gradebook
 */
export async function getGradebook(classId: string | number): Promise<{
  assignments: GradebookAssignment[];
  entries: GradebookEntry[];
}> {
  const response = await api.get(`/classes/${classId}/gradebook`);
  return response.data;
}

/**
 * Get all student grades
 */
export async function getStudentGrades(classId: string | number): Promise<GradebookEntry[]> {
  const response = await api.get<GradebookEntry[]>(`/classes/${classId}/gradebook/students`);
  return response.data;
}

/**
 * Get own grades
 */
export async function getOwnGrades(classId: string | number): Promise<GradebookEntry[]> {
  const response = await api.get<GradebookEntry[]>(`/classes/${classId}/gradebook/me`);
  return response.data;
}

/**
 * Get gradebook statistics
 */
export async function getGradebookStatistics(classId: string | number): Promise<{
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
}> {
  const response = await api.get(`/classes/${classId}/gradebook/statistics`);
  return response.data;
}

/**
 * Add assignment to gradebook
 */
export async function addGradebookAssignment(
  classId: string | number,
  data: GradebookAssignment
): Promise<void> {
  await api.post(`/classes/${classId}/gradebook/assignments`, data);
}

/**
 * Record a grade
 */
export async function recordGrade(
  classId: string | number,
  data: GradebookEntry
): Promise<void> {
  await api.post(`/classes/${classId}/gradebook/grades`, data);
}

/**
 * Excuse student from assignment
 */
export async function excuseStudent(
  classId: string | number,
  assignmentId: number,
  userId: number
): Promise<void> {
  await api.post(`/classes/${classId}/gradebook/excuse`, { assignmentId, userId });
}

/**
 * Update grading policy
 */
export async function updateGradingPolicy(
  classId: string | number,
  policy: GradingPolicy
): Promise<void> {
  await api.put(`/classes/${classId}/gradebook/policy`, policy);
}

/**
 * Export gradebook as CSV
 */
export async function exportGradebook(classId: string | number): Promise<Blob> {
  const response = await api.get(`/classes/${classId}/gradebook/export`, {
    responseType: 'blob',
  });
  return response.data;
}
