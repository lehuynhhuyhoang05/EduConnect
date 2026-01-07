import { Injectable } from '@nestjs/common';

/**
 * Q&A SERVICE
 * ============
 * Hệ thống hỏi đáp cho live session
 * Tách biệt với chat, cho phép upvote và answer marking
 * 
 * Features:
 * - Ask questions
 * - Upvote questions
 * - Mark as answered
 * - Pin important questions
 * - Filter/sort by votes, time, answered status
 */

export interface Question {
  id: string;
  sessionId: number;
  askedBy: number;
  askedByName?: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  
  // Status
  status: 'pending' | 'answered' | 'dismissed';
  isAnonymous: boolean;
  isPinned: boolean;
  
  // Engagement
  upvotes: Set<number>; // User IDs who upvoted
  upvoteCount: number;
  
  // Answer
  answer?: {
    content: string;
    answeredBy: number;
    answeredByName?: string;
    answeredAt: Date;
  };
  
  // Read status (for host)
  isRead: boolean;
  readAt?: Date;
}

export interface QASession {
  sessionId: number;
  questions: Map<string, Question>;
  settings: QASettings;
  isOpen: boolean;
  openedAt?: Date;
  closedAt?: Date;
}

export interface QASettings {
  allowAnonymous: boolean;
  allowUpvoting: boolean;
  moderateQuestions: boolean; // Host approves before visible
  maxQuestionLength: number;
  maxQuestionsPerUser: number;
  autoCloseOnSessionEnd: boolean;
}

@Injectable()
export class QAService {
  private sessions: Map<number, QASession> = new Map();
  private questionCounter = 0;

  private defaultSettings: QASettings = {
    allowAnonymous: true,
    allowUpvoting: true,
    moderateQuestions: false,
    maxQuestionLength: 500,
    maxQuestionsPerUser: 10,
    autoCloseOnSessionEnd: true,
  };

  /**
   * Initialize Q&A for a session
   */
  initSession(sessionId: number, settings?: Partial<QASettings>): QASession {
    const session: QASession = {
      sessionId,
      questions: new Map(),
      settings: { ...this.defaultSettings, ...settings },
      isOpen: true,
      openedAt: new Date(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Ask a question
   */
  askQuestion(
    sessionId: number,
    userId: number,
    content: string,
    options?: { userName?: string; isAnonymous?: boolean },
  ): { success: boolean; question?: Question; error?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.initSession(sessionId);
      return this.askQuestion(sessionId, userId, content, options);
    }

    if (!session.isOpen) {
      return { success: false, error: 'Q&A đã đóng' };
    }

    // Validate content length
    if (content.length > session.settings.maxQuestionLength) {
      return { success: false, error: `Câu hỏi quá dài (tối đa ${session.settings.maxQuestionLength} ký tự)` };
    }

    // Check user question limit
    const userQuestions = Array.from(session.questions.values())
      .filter(q => q.askedBy === userId);
    if (userQuestions.length >= session.settings.maxQuestionsPerUser) {
      return { success: false, error: `Bạn đã đạt giới hạn ${session.settings.maxQuestionsPerUser} câu hỏi` };
    }

    // Check anonymous allowed
    if (options?.isAnonymous && !session.settings.allowAnonymous) {
      return { success: false, error: 'Câu hỏi ẩn danh không được phép' };
    }

    const questionId = `q-${sessionId}-${++this.questionCounter}`;
    const question: Question = {
      id: questionId,
      sessionId,
      askedBy: userId,
      askedByName: options?.isAnonymous ? undefined : options?.userName,
      content: content.trim(),
      createdAt: new Date(),
      status: session.settings.moderateQuestions ? 'pending' : 'pending',
      isAnonymous: options?.isAnonymous || false,
      isPinned: false,
      upvotes: new Set(),
      upvoteCount: 0,
      isRead: false,
    };

    session.questions.set(questionId, question);

    return { success: true, question };
  }

  /**
   * Upvote a question
   */
  upvoteQuestion(sessionId: number, questionId: string, userId: number): {
    success: boolean;
    upvoteCount?: number;
    error?: string;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session không tồn tại' };

    if (!session.settings.allowUpvoting) {
      return { success: false, error: 'Upvoting không được phép' };
    }

    const question = session.questions.get(questionId);
    if (!question) return { success: false, error: 'Câu hỏi không tồn tại' };

    if (question.upvotes.has(userId)) {
      // Remove upvote (toggle)
      question.upvotes.delete(userId);
    } else {
      question.upvotes.add(userId);
    }
    question.upvoteCount = question.upvotes.size;

    return { success: true, upvoteCount: question.upvoteCount };
  }

  /**
   * Host answers a question
   */
  answerQuestion(
    sessionId: number,
    questionId: string,
    hostId: number,
    answer: string,
    hostName?: string,
  ): { success: boolean; question?: Question; error?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session không tồn tại' };

    const question = session.questions.get(questionId);
    if (!question) return { success: false, error: 'Câu hỏi không tồn tại' };

    question.answer = {
      content: answer.trim(),
      answeredBy: hostId,
      answeredByName: hostName,
      answeredAt: new Date(),
    };
    question.status = 'answered';
    question.updatedAt = new Date();

    return { success: true, question };
  }

  /**
   * Dismiss a question (won't answer)
   */
  dismissQuestion(sessionId: number, questionId: string): {
    success: boolean;
    error?: string;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session không tồn tại' };

    const question = session.questions.get(questionId);
    if (!question) return { success: false, error: 'Câu hỏi không tồn tại' };

    question.status = 'dismissed';
    question.updatedAt = new Date();

    return { success: true };
  }

  /**
   * Pin/unpin a question
   */
  togglePin(sessionId: number, questionId: string): {
    success: boolean;
    isPinned?: boolean;
    error?: string;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session không tồn tại' };

    const question = session.questions.get(questionId);
    if (!question) return { success: false, error: 'Câu hỏi không tồn tại' };

    question.isPinned = !question.isPinned;
    question.updatedAt = new Date();

    return { success: true, isPinned: question.isPinned };
  }

  /**
   * Mark question as read
   */
  markAsRead(sessionId: number, questionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const question = session.questions.get(questionId);
    if (question) {
      question.isRead = true;
      question.readAt = new Date();
    }
  }

  /**
   * Mark all questions as read
   */
  markAllAsRead(sessionId: number): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;

    let count = 0;
    const now = new Date();
    session.questions.forEach(question => {
      if (!question.isRead) {
        question.isRead = true;
        question.readAt = now;
        count++;
      }
    });

    return count;
  }

  /**
   * Get questions for a session
   */
  getQuestions(
    sessionId: number,
    options?: {
      status?: 'pending' | 'answered' | 'dismissed' | 'all';
      sortBy?: 'time' | 'upvotes' | 'status';
      includeHidden?: boolean;
    },
  ): Question[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    let questions = Array.from(session.questions.values());

    // Filter by status
    if (options?.status && options.status !== 'all') {
      questions = questions.filter(q => q.status === options.status);
    }

    // Sort
    switch (options?.sortBy) {
      case 'upvotes':
        questions.sort((a, b) => b.upvoteCount - a.upvoteCount);
        break;
      case 'status':
        // Pending first, then answered, then dismissed
        const statusOrder = { pending: 0, answered: 1, dismissed: 2 };
        questions.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
        break;
      case 'time':
      default:
        questions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Pinned always first
    questions.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    return questions;
  }

  /**
   * Get question by ID
   */
  getQuestion(sessionId: number, questionId: string): Question | null {
    const session = this.sessions.get(sessionId);
    return session?.questions.get(questionId) || null;
  }

  /**
   * Delete a question
   */
  deleteQuestion(sessionId: number, questionId: string, userId: number): {
    success: boolean;
    error?: string;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session không tồn tại' };

    const question = session.questions.get(questionId);
    if (!question) return { success: false, error: 'Câu hỏi không tồn tại' };

    // Only allow delete by asker or host
    if (question.askedBy !== userId) {
      return { success: false, error: 'Bạn không có quyền xóa câu hỏi này' };
    }

    session.questions.delete(questionId);
    return { success: true };
  }

  /**
   * Get unread count (for host)
   */
  getUnreadCount(sessionId: number): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;

    return Array.from(session.questions.values())
      .filter(q => !q.isRead && q.status === 'pending')
      .length;
  }

  /**
   * Open/close Q&A
   */
  setOpen(sessionId: number, isOpen: boolean): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isOpen = isOpen;
      if (!isOpen) {
        session.closedAt = new Date();
      }
    }
  }

  /**
   * Check if Q&A is open
   */
  isOpen(sessionId: number): boolean {
    const session = this.sessions.get(sessionId);
    return session?.isOpen || false;
  }

  /**
   * Get statistics
   */
  getStatistics(sessionId: number): {
    total: number;
    pending: number;
    answered: number;
    dismissed: number;
    totalUpvotes: number;
    unread: number;
    topQuestions: Question[];
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { total: 0, pending: 0, answered: 0, dismissed: 0, totalUpvotes: 0, unread: 0, topQuestions: [] };
    }

    const questions = Array.from(session.questions.values());
    
    return {
      total: questions.length,
      pending: questions.filter(q => q.status === 'pending').length,
      answered: questions.filter(q => q.status === 'answered').length,
      dismissed: questions.filter(q => q.status === 'dismissed').length,
      totalUpvotes: questions.reduce((sum, q) => sum + q.upvoteCount, 0),
      unread: questions.filter(q => !q.isRead).length,
      topQuestions: questions.sort((a, b) => b.upvoteCount - a.upvoteCount).slice(0, 5),
    };
  }

  /**
   * Export Q&A to JSON
   */
  exportQA(sessionId: number): object | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId,
      exportedAt: new Date(),
      questions: Array.from(session.questions.values()).map(q => ({
        id: q.id,
        content: q.content,
        askedBy: q.isAnonymous ? 'Anonymous' : q.askedByName,
        createdAt: q.createdAt,
        upvotes: q.upvoteCount,
        status: q.status,
        answer: q.answer ? {
          content: q.answer.content,
          answeredBy: q.answer.answeredByName,
          answeredAt: q.answer.answeredAt,
        } : null,
      })),
    };
  }

  /**
   * Cleanup session
   */
  cleanupSession(sessionId: number): void {
    this.sessions.delete(sessionId);
  }
}
