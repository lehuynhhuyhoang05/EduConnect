import type { User } from './user.types';

export interface Class {
  id: number;
  name: string;
  description: string | null;
  code: string;
  classCode: string;
  teacherId: number;
  subject: string | null;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  teacher?: User;
  members?: ClassMember[];
}

export interface ClassMember {
  id: number;
  classId: number;
  userId: number;
  role: 'TEACHER' | 'STUDENT';
  joinedAt: string;
  user?: User;
}

export interface CreateClassDto {
  name: string;
  description?: string;
  subject?: string;
}

export interface UpdateClassDto {
  name?: string;
  description?: string;
  subject?: string;
  isActive?: boolean;
}

export interface JoinClassDto {
  classCode: string;
}

// Class Announcement
export interface ClassAnnouncement {
  id: number;
  classId: number;
  title: string;
  content: string;
  isPinned: boolean;
  priority: 'normal' | 'important' | 'urgent';
  allowComments: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  author?: User;
  comments?: AnnouncementComment[];
  readBy?: number[];
}

export interface AnnouncementComment {
  id: number;
  announcementId: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: User;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  isPinned?: boolean;
  scheduledAt?: string;
  expiresAt?: string;
  priority?: 'normal' | 'important' | 'urgent';
  allowComments?: boolean;
}

// Gradebook
export interface GradebookEntry {
  assignmentId: number;
  userId: number;
  score: number | null;
  submissionId?: number;
  submittedAt?: string;
  isLate?: boolean;
  comments?: string;
  isExcused?: boolean;
}

export interface GradebookAssignment {
  id: number;
  title: string;
  category?: string;
  maxScore: number;
  weight?: number;
  dueDate?: string;
}

export interface GradingPolicy {
  latePenaltyPerDay?: number;
  maxLatePenalty?: number;
  passThreshold?: number;
}

// Query params
export interface GetClassesParams {
  search?: string;
  isActive?: boolean;
  myClasses?: boolean;
  page?: number;
  limit?: number;
}
