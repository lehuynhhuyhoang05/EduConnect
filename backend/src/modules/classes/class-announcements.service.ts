import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * CLASS ANNOUNCEMENTS SERVICE
 * ============================
 * Thông báo lớp học như Google Classroom
 * 
 * Features:
 * - Pinned announcements
 * - Schedule announcements
 * - Read receipts
 * - Attachments support
 * - Rich text content
 */

export interface Announcement {
  id: string;
  classId: number;
  title: string;
  content: string;
  createdBy: number;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Settings
  isPinned: boolean;
  isPublished: boolean;
  scheduledAt?: Date;
  expiresAt?: Date;
  
  // Attachments
  attachments: AnnouncementAttachment[];
  
  // Read tracking
  readBy: Map<number, Date>; // userId -> readAt
  
  // Priority
  priority: 'normal' | 'important' | 'urgent';
  
  // Comments
  allowComments: boolean;
  comments: AnnouncementComment[];
}

export interface AnnouncementAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface AnnouncementComment {
  id: string;
  userId: number;
  userName?: string;
  content: string;
  createdAt: Date;
  isEdited: boolean;
}

@Injectable()
export class ClassAnnouncementsService {
  private announcements: Map<string, Announcement> = new Map();
  private classAnnouncements: Map<number, Set<string>> = new Map(); // classId -> announcementIds
  private announcementCounter = 0;

  /**
   * Create announcement
   */
  createAnnouncement(
    classId: number,
    createdBy: number,
    data: {
      title: string;
      content: string;
      isPinned?: boolean;
      scheduledAt?: Date;
      expiresAt?: Date;
      priority?: 'normal' | 'important' | 'urgent';
      allowComments?: boolean;
      attachments?: Omit<AnnouncementAttachment, 'id'>[];
    },
    creatorName?: string,
  ): Announcement {
    const id = `ann-${classId}-${++this.announcementCounter}`;
    const now = new Date();

    const announcement: Announcement = {
      id,
      classId,
      title: data.title,
      content: data.content,
      createdBy,
      createdByName: creatorName,
      createdAt: now,
      updatedAt: now,
      isPinned: data.isPinned || false,
      isPublished: !data.scheduledAt || data.scheduledAt <= now,
      scheduledAt: data.scheduledAt,
      expiresAt: data.expiresAt,
      attachments: (data.attachments || []).map((att, idx) => ({
        ...att,
        id: `att-${id}-${idx}`,
      })),
      readBy: new Map(),
      priority: data.priority || 'normal',
      allowComments: data.allowComments !== false,
      comments: [],
    };

    this.announcements.set(id, announcement);

    // Add to class index
    if (!this.classAnnouncements.has(classId)) {
      this.classAnnouncements.set(classId, new Set());
    }
    this.classAnnouncements.get(classId)!.add(id);

    // Schedule publish if needed
    if (data.scheduledAt && data.scheduledAt > now) {
      const delay = data.scheduledAt.getTime() - now.getTime();
      setTimeout(() => {
        const ann = this.announcements.get(id);
        if (ann) ann.isPublished = true;
      }, delay);
    }

    return announcement;
  }

  /**
   * Get announcements for a class
   */
  getClassAnnouncements(
    classId: number,
    options?: {
      includeUnpublished?: boolean;
      includeExpired?: boolean;
      onlyPinned?: boolean;
    },
  ): Announcement[] {
    const announcementIds = this.classAnnouncements.get(classId);
    if (!announcementIds) return [];

    const now = new Date();
    
    return Array.from(announcementIds)
      .map(id => this.announcements.get(id))
      .filter((ann): ann is Announcement => {
        if (!ann) return false;
        if (!options?.includeUnpublished && !ann.isPublished) return false;
        if (!options?.includeExpired && ann.expiresAt && ann.expiresAt < now) return false;
        if (options?.onlyPinned && !ann.isPinned) return false;
        return true;
      })
      .sort((a, b) => {
        // Pinned first, then by priority, then by date
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const priorityOrder = { urgent: 0, important: 1, normal: 2 };
        if (a.priority !== b.priority) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  /**
   * Get announcement by ID
   */
  getAnnouncement(announcementId: string): Announcement | null {
    return this.announcements.get(announcementId) || null;
  }

  /**
   * Update announcement
   */
  updateAnnouncement(
    announcementId: string,
    userId: number,
    data: Partial<{
      title: string;
      content: string;
      isPinned: boolean;
      scheduledAt: Date;
      expiresAt: Date;
      priority: 'normal' | 'important' | 'urgent';
      allowComments: boolean;
    }>,
  ): { success: boolean; announcement?: Announcement; error?: string } {
    const announcement = this.announcements.get(announcementId);
    if (!announcement) {
      return { success: false, error: 'Thông báo không tồn tại' };
    }

    if (announcement.createdBy !== userId) {
      return { success: false, error: 'Bạn không có quyền sửa thông báo này' };
    }

    // Update fields
    if (data.title !== undefined) announcement.title = data.title;
    if (data.content !== undefined) announcement.content = data.content;
    if (data.isPinned !== undefined) announcement.isPinned = data.isPinned;
    if (data.scheduledAt !== undefined) {
      announcement.scheduledAt = data.scheduledAt;
      announcement.isPublished = data.scheduledAt <= new Date();
    }
    if (data.expiresAt !== undefined) announcement.expiresAt = data.expiresAt;
    if (data.priority !== undefined) announcement.priority = data.priority;
    if (data.allowComments !== undefined) announcement.allowComments = data.allowComments;

    announcement.updatedAt = new Date();

    return { success: true, announcement };
  }

  /**
   * Delete announcement
   */
  deleteAnnouncement(announcementId: string, userId: number): boolean {
    const announcement = this.announcements.get(announcementId);
    if (!announcement || announcement.createdBy !== userId) return false;

    this.announcements.delete(announcementId);
    this.classAnnouncements.get(announcement.classId)?.delete(announcementId);

    return true;
  }

  /**
   * Mark as read
   */
  markAsRead(announcementId: string, userId: number): boolean {
    const announcement = this.announcements.get(announcementId);
    if (!announcement) return false;

    if (!announcement.readBy.has(userId)) {
      announcement.readBy.set(userId, new Date());
    }
    return true;
  }

  /**
   * Mark multiple as read
   */
  markMultipleAsRead(announcementIds: string[], userId: number): number {
    let count = 0;
    announcementIds.forEach(id => {
      if (this.markAsRead(id, userId)) count++;
    });
    return count;
  }

  /**
   * Get read status
   */
  getReadStatus(announcementId: string): {
    totalReaders: number;
    readers: Array<{ userId: number; readAt: Date }>;
  } {
    const announcement = this.announcements.get(announcementId);
    if (!announcement) {
      return { totalReaders: 0, readers: [] };
    }

    const readers = Array.from(announcement.readBy.entries()).map(([userId, readAt]) => ({
      userId,
      readAt,
    }));

    return {
      totalReaders: readers.length,
      readers,
    };
  }

  /**
   * Check if user has read
   */
  hasRead(announcementId: string, userId: number): boolean {
    return this.announcements.get(announcementId)?.readBy.has(userId) || false;
  }

  /**
   * Get unread announcements for user
   */
  getUnreadAnnouncements(classId: number, userId: number): Announcement[] {
    return this.getClassAnnouncements(classId)
      .filter(ann => !ann.readBy.has(userId));
  }

  /**
   * Get unread count
   */
  getUnreadCount(classId: number, userId: number): number {
    return this.getUnreadAnnouncements(classId, userId).length;
  }

  /**
   * Add attachment
   */
  addAttachment(
    announcementId: string,
    userId: number,
    attachment: Omit<AnnouncementAttachment, 'id'>,
  ): { success: boolean; attachment?: AnnouncementAttachment; error?: string } {
    const announcement = this.announcements.get(announcementId);
    if (!announcement) {
      return { success: false, error: 'Thông báo không tồn tại' };
    }

    if (announcement.createdBy !== userId) {
      return { success: false, error: 'Bạn không có quyền sửa thông báo này' };
    }

    const att: AnnouncementAttachment = {
      ...attachment,
      id: `att-${announcementId}-${announcement.attachments.length}`,
    };

    announcement.attachments.push(att);
    announcement.updatedAt = new Date();

    return { success: true, attachment: att };
  }

  /**
   * Remove attachment
   */
  removeAttachment(announcementId: string, attachmentId: string, userId: number): boolean {
    const announcement = this.announcements.get(announcementId);
    if (!announcement || announcement.createdBy !== userId) return false;

    const idx = announcement.attachments.findIndex(att => att.id === attachmentId);
    if (idx === -1) return false;

    announcement.attachments.splice(idx, 1);
    announcement.updatedAt = new Date();

    return true;
  }

  /**
   * Add comment
   */
  addComment(
    announcementId: string,
    userId: number,
    content: string,
    userName?: string,
  ): { success: boolean; comment?: AnnouncementComment; error?: string } {
    const announcement = this.announcements.get(announcementId);
    if (!announcement) {
      return { success: false, error: 'Thông báo không tồn tại' };
    }

    if (!announcement.allowComments) {
      return { success: false, error: 'Thông báo này không cho phép bình luận' };
    }

    const comment: AnnouncementComment = {
      id: `cmt-${announcementId}-${announcement.comments.length}`,
      userId,
      userName,
      content,
      createdAt: new Date(),
      isEdited: false,
    };

    announcement.comments.push(comment);

    return { success: true, comment };
  }

  /**
   * Delete comment
   */
  deleteComment(
    announcementId: string,
    commentId: string,
    userId: number,
  ): boolean {
    const announcement = this.announcements.get(announcementId);
    if (!announcement) return false;

    const idx = announcement.comments.findIndex(
      c => c.id === commentId && c.userId === userId,
    );
    if (idx === -1) return false;

    announcement.comments.splice(idx, 1);
    return true;
  }

  /**
   * Toggle pin
   */
  togglePin(announcementId: string, userId: number): boolean | null {
    const announcement = this.announcements.get(announcementId);
    if (!announcement || announcement.createdBy !== userId) return null;

    announcement.isPinned = !announcement.isPinned;
    announcement.updatedAt = new Date();
    return announcement.isPinned;
  }

  /**
   * Get statistics
   */
  getStatistics(classId: number): {
    total: number;
    pinned: number;
    urgent: number;
    avgReadRate: number;
    byPriority: Record<string, number>;
  } {
    const announcements = this.getClassAnnouncements(classId);
    
    const byPriority: Record<string, number> = {
      normal: 0,
      important: 0,
      urgent: 0,
    };

    let totalReadRates = 0;

    announcements.forEach(ann => {
      byPriority[ann.priority]++;
      totalReadRates += ann.readBy.size;
    });

    return {
      total: announcements.length,
      pinned: announcements.filter(a => a.isPinned).length,
      urgent: byPriority.urgent,
      avgReadRate: announcements.length > 0 ? totalReadRates / announcements.length : 0,
      byPriority,
    };
  }

  /**
   * Cleanup expired announcements
   */
  cleanupExpired(classId: number): number {
    const now = new Date();
    const ids = this.classAnnouncements.get(classId);
    if (!ids) return 0;

    let count = 0;
    ids.forEach(id => {
      const ann = this.announcements.get(id);
      if (ann?.expiresAt && ann.expiresAt < now) {
        this.announcements.delete(id);
        ids.delete(id);
        count++;
      }
    });

    return count;
  }
}
