import { Injectable } from '@nestjs/common';

/**
 * SCREEN ANNOTATION SERVICE
 * ==========================
 * Vẽ chú thích lên màn hình share như Zoom
 * 
 * Features:
 * - Draw on shared screen
 * - Highlight areas
 * - Add text annotations
 * - Pointer/laser mode
 * - Clear/undo annotations
 */

export interface Annotation {
  id: string;
  sessionId: number;
  type: 'pen' | 'highlighter' | 'arrow' | 'rectangle' | 'ellipse' | 'text' | 'pointer';
  createdBy: number;
  createdByName?: string;
  createdAt: Date;
  
  // Drawing data
  points?: { x: number; y: number }[];
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  text?: string;
  
  // Style
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize?: number;
  
  // State
  isTemporary: boolean; // For pointer/laser
  expiresAt?: Date;
}

export interface AnnotationSession {
  sessionId: number;
  isEnabled: boolean;
  annotations: Map<string, Annotation>;
  settings: AnnotationSettings;
  pointers: Map<number, {
    userId: number;
    userName?: string;
    position: { x: number; y: number };
    lastUpdate: Date;
  }>;
}

export interface AnnotationSettings {
  allowParticipantAnnotations: boolean; // Only host can annotate if false
  allowedTools: ('pen' | 'highlighter' | 'arrow' | 'rectangle' | 'ellipse' | 'text' | 'pointer')[];
  maxAnnotationsPerUser: number;
  autoCleanupSeconds: number; // Auto-remove annotations after X seconds (0 = disabled)
  pointerTimeoutMs: number; // How long pointer stays visible
}

@Injectable()
export class ScreenAnnotationService {
  private sessions: Map<number, AnnotationSession> = new Map();
  private annotationCounter = 0;

  private defaultSettings: AnnotationSettings = {
    allowParticipantAnnotations: true,
    allowedTools: ['pen', 'highlighter', 'arrow', 'rectangle', 'ellipse', 'text', 'pointer'],
    maxAnnotationsPerUser: 50,
    autoCleanupSeconds: 0, // Disabled by default
    pointerTimeoutMs: 3000,
  };

  /**
   * Initialize annotation session
   */
  initSession(sessionId: number, settings?: Partial<AnnotationSettings>): AnnotationSession {
    const session: AnnotationSession = {
      sessionId,
      isEnabled: false,
      annotations: new Map(),
      settings: { ...this.defaultSettings, ...settings },
      pointers: new Map(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Enable/disable annotations for a session
   */
  setEnabled(sessionId: number, enabled: boolean): void {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.initSession(sessionId);
    }
    session.isEnabled = enabled;
  }

  /**
   * Check if annotations are enabled
   */
  isEnabled(sessionId: number): boolean {
    return this.sessions.get(sessionId)?.isEnabled || false;
  }

  /**
   * Add annotation
   */
  addAnnotation(
    sessionId: number,
    userId: number,
    annotation: {
      type: Annotation['type'];
      points?: { x: number; y: number }[];
      startPoint?: { x: number; y: number };
      endPoint?: { x: number; y: number };
      text?: string;
      color?: string;
      strokeWidth?: number;
      opacity?: number;
      fontSize?: number;
    },
    userName?: string,
  ): { success: boolean; annotation?: Annotation; error?: string } {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.initSession(sessionId);
    }

    if (!session.isEnabled) {
      return { success: false, error: 'Annotations chưa được bật' };
    }

    // Check tool allowed
    if (!session.settings.allowedTools.includes(annotation.type)) {
      return { success: false, error: 'Công cụ này không được phép' };
    }

    // Check participant permission
    // (In real implementation, check if user is host)
    
    // Check max annotations
    const userAnnotations = Array.from(session.annotations.values())
      .filter(a => a.createdBy === userId);
    if (userAnnotations.length >= session.settings.maxAnnotationsPerUser) {
      return { success: false, error: 'Đã đạt giới hạn annotations' };
    }

    const id = `ann-${sessionId}-${++this.annotationCounter}`;
    const now = new Date();

    const newAnnotation: Annotation = {
      id,
      sessionId,
      type: annotation.type,
      createdBy: userId,
      createdByName: userName,
      createdAt: now,
      points: annotation.points,
      startPoint: annotation.startPoint,
      endPoint: annotation.endPoint,
      text: annotation.text,
      color: annotation.color || '#FF0000',
      strokeWidth: annotation.strokeWidth || 3,
      opacity: annotation.opacity || 1,
      fontSize: annotation.fontSize || 16,
      isTemporary: annotation.type === 'pointer',
    };

    // Set expiry for temporary annotations
    if (newAnnotation.isTemporary) {
      newAnnotation.expiresAt = new Date(now.getTime() + session.settings.pointerTimeoutMs);
      
      // Auto-remove
      setTimeout(() => {
        this.removeAnnotation(sessionId, id);
      }, session.settings.pointerTimeoutMs);
    }

    // Auto-cleanup if enabled
    if (session.settings.autoCleanupSeconds > 0 && !newAnnotation.isTemporary) {
      newAnnotation.expiresAt = new Date(now.getTime() + session.settings.autoCleanupSeconds * 1000);
      
      setTimeout(() => {
        this.removeAnnotation(sessionId, id);
      }, session.settings.autoCleanupSeconds * 1000);
    }

    session.annotations.set(id, newAnnotation);

    return { success: true, annotation: newAnnotation };
  }

  /**
   * Update pointer position
   */
  updatePointer(
    sessionId: number,
    userId: number,
    position: { x: number; y: number },
    userName?: string,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isEnabled) return;

    session.pointers.set(userId, {
      userId,
      userName,
      position,
      lastUpdate: new Date(),
    });

    // Auto-remove stale pointer
    setTimeout(() => {
      const pointer = session.pointers.get(userId);
      if (pointer && Date.now() - pointer.lastUpdate.getTime() >= session.settings.pointerTimeoutMs) {
        session.pointers.delete(userId);
      }
    }, session.settings.pointerTimeoutMs);
  }

  /**
   * Get all pointers
   */
  getPointers(sessionId: number): Array<{
    userId: number;
    userName?: string;
    position: { x: number; y: number };
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return Array.from(session.pointers.values()).map(p => ({
      userId: p.userId,
      userName: p.userName,
      position: p.position,
    }));
  }

  /**
   * Remove annotation
   */
  removeAnnotation(sessionId: number, annotationId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    return session.annotations.delete(annotationId);
  }

  /**
   * Clear all annotations
   */
  clearAll(sessionId: number): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;

    const count = session.annotations.size;
    session.annotations.clear();
    session.pointers.clear();
    return count;
  }

  /**
   * Clear annotations by user
   */
  clearByUser(sessionId: number, userId: number): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;

    let count = 0;
    session.annotations.forEach((annotation, id) => {
      if (annotation.createdBy === userId) {
        session.annotations.delete(id);
        count++;
      }
    });
    session.pointers.delete(userId);

    return count;
  }

  /**
   * Undo last annotation by user
   */
  undoLast(sessionId: number, userId: number): Annotation | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Find last annotation by user
    const userAnnotations = Array.from(session.annotations.values())
      .filter(a => a.createdBy === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (userAnnotations.length === 0) return null;

    const last = userAnnotations[0];
    session.annotations.delete(last.id);
    return last;
  }

  /**
   * Get all annotations
   */
  getAnnotations(sessionId: number): Annotation[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return Array.from(session.annotations.values())
      .filter(a => !a.expiresAt || a.expiresAt > new Date());
  }

  /**
   * Get annotations by user
   */
  getAnnotationsByUser(sessionId: number, userId: number): Annotation[] {
    return this.getAnnotations(sessionId).filter(a => a.createdBy === userId);
  }

  /**
   * Update settings
   */
  updateSettings(sessionId: number, settings: Partial<AnnotationSettings>): AnnotationSettings | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.settings = { ...session.settings, ...settings };
    return session.settings;
  }

  /**
   * Get settings
   */
  getSettings(sessionId: number): AnnotationSettings | null {
    return this.sessions.get(sessionId)?.settings || null;
  }

  /**
   * Get statistics
   */
  getStatistics(sessionId: number): {
    totalAnnotations: number;
    byType: Record<string, number>;
    byUser: Record<number, number>;
    activePointers: number;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { totalAnnotations: 0, byType: {}, byUser: {}, activePointers: 0 };
    }

    const byType: Record<string, number> = {};
    const byUser: Record<number, number> = {};

    session.annotations.forEach(annotation => {
      byType[annotation.type] = (byType[annotation.type] || 0) + 1;
      byUser[annotation.createdBy] = (byUser[annotation.createdBy] || 0) + 1;
    });

    return {
      totalAnnotations: session.annotations.size,
      byType,
      byUser,
      activePointers: session.pointers.size,
    };
  }

  /**
   * Cleanup session
   */
  cleanupSession(sessionId: number): void {
    this.sessions.delete(sessionId);
  }
}
