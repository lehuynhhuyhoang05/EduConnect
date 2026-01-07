import { Injectable } from '@nestjs/common';

/**
 * HAND RAISE SERVICE
 * ==================
 * Tính năng giơ tay phát biểu như Google Meet/Zoom
 * 
 * Features:
 * - Raise/lower hand
 * - Queue management (FIFO)
 * - Acknowledge by host
 * - Auto-lower after speaking
 */

export interface HandRaiseInfo {
  userId: number;
  userName?: string;
  raisedAt: Date;
  position: number; // Vị trí trong queue
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: number;
}

export interface SessionHandRaises {
  sessionId: number;
  queue: HandRaiseInfo[];
  history: {
    userId: number;
    userName?: string;
    raisedAt: Date;
    loweredAt: Date;
    wasAcknowledged: boolean;
    speakDuration?: number; // seconds
  }[];
  settings: {
    autoLowerAfterAcknowledge: boolean;
    maxQueueSize: number;
    allowMultiple: boolean; // Cho phép raise lại sau khi lower
  };
}

@Injectable()
export class HandRaiseService {
  private sessions: Map<number, SessionHandRaises> = new Map();

  private defaultSettings = {
    autoLowerAfterAcknowledge: false,
    maxQueueSize: 50,
    allowMultiple: true,
  };

  /**
   * Initialize hand raise tracking for a session
   */
  initSession(sessionId: number, settings?: Partial<SessionHandRaises['settings']>): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        queue: [],
        history: [],
        settings: { ...this.defaultSettings, ...settings },
      });
    }
  }

  /**
   * Raise hand
   */
  raiseHand(sessionId: number, userId: number, userName?: string): {
    success: boolean;
    position?: number;
    error?: string;
  } {
    this.initSession(sessionId);
    const session = this.sessions.get(sessionId)!;

    // Check if already raised
    const existing = session.queue.find(h => h.userId === userId);
    if (existing) {
      return { success: false, error: 'Bạn đã giơ tay rồi' };
    }

    // Check queue size
    if (session.queue.length >= session.settings.maxQueueSize) {
      return { success: false, error: 'Hàng chờ đã đầy' };
    }

    const position = session.queue.length + 1;
    session.queue.push({
      userId,
      userName,
      raisedAt: new Date(),
      position,
      acknowledged: false,
    });

    return { success: true, position };
  }

  /**
   * Lower hand
   */
  lowerHand(sessionId: number, userId: number): {
    success: boolean;
    wasAcknowledged?: boolean;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false };

    const index = session.queue.findIndex(h => h.userId === userId);
    if (index === -1) return { success: false };

    const removed = session.queue.splice(index, 1)[0];

    // Add to history
    session.history.push({
      userId: removed.userId,
      userName: removed.userName,
      raisedAt: removed.raisedAt,
      loweredAt: new Date(),
      wasAcknowledged: removed.acknowledged,
    });

    // Update positions
    this.updatePositions(session);

    return { success: true, wasAcknowledged: removed.acknowledged };
  }

  /**
   * Host acknowledges a raised hand
   */
  acknowledgeHand(sessionId: number, hostId: number, targetUserId: number): {
    success: boolean;
    error?: string;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session không tồn tại' };

    const hand = session.queue.find(h => h.userId === targetUserId);
    if (!hand) return { success: false, error: 'User không có trong hàng chờ' };

    hand.acknowledged = true;
    hand.acknowledgedAt = new Date();
    hand.acknowledgedBy = hostId;

    // Auto-lower if setting enabled
    if (session.settings.autoLowerAfterAcknowledge) {
      setTimeout(() => {
        this.lowerHand(sessionId, targetUserId);
      }, 5000); // Lower after 5 seconds
    }

    return { success: true };
  }

  /**
   * Host forces lower all hands
   */
  lowerAllHands(sessionId: number): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;

    const count = session.queue.length;
    const now = new Date();

    // Move all to history
    session.queue.forEach(hand => {
      session.history.push({
        userId: hand.userId,
        userName: hand.userName,
        raisedAt: hand.raisedAt,
        loweredAt: now,
        wasAcknowledged: hand.acknowledged,
      });
    });

    session.queue = [];
    return count;
  }

  /**
   * Get queue for a session
   */
  getQueue(sessionId: number): HandRaiseInfo[] {
    const session = this.sessions.get(sessionId);
    return session?.queue || [];
  }

  /**
   * Get queue position for a user
   */
  getUserPosition(sessionId: number, userId: number): number | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const hand = session.queue.find(h => h.userId === userId);
    return hand?.position || null;
  }

  /**
   * Check if user has hand raised
   */
  hasHandRaised(sessionId: number, userId: number): boolean {
    const session = this.sessions.get(sessionId);
    return session?.queue.some(h => h.userId === userId) || false;
  }

  /**
   * Get next in queue (for host to call on)
   */
  getNextInQueue(sessionId: number): HandRaiseInfo | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.queue.length === 0) return null;

    // Return first unacknowledged hand
    return session.queue.find(h => !h.acknowledged) || session.queue[0];
  }

  /**
   * Get session statistics
   */
  getStatistics(sessionId: number): {
    currentQueue: number;
    totalRaised: number;
    acknowledged: number;
    averageWaitTime: number; // seconds
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { currentQueue: 0, totalRaised: 0, acknowledged: 0, averageWaitTime: 0 };
    }

    const acknowledged = session.history.filter(h => h.wasAcknowledged).length;
    const waitTimes = session.history.map(h => 
      (h.loweredAt.getTime() - h.raisedAt.getTime()) / 1000
    );
    const averageWaitTime = waitTimes.length > 0
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
      : 0;

    return {
      currentQueue: session.queue.length,
      totalRaised: session.history.length + session.queue.length,
      acknowledged,
      averageWaitTime: Math.round(averageWaitTime),
    };
  }

  /**
   * Update positions after removal
   */
  private updatePositions(session: SessionHandRaises): void {
    session.queue.forEach((hand, index) => {
      hand.position = index + 1;
    });
  }

  /**
   * Cleanup session data
   */
  cleanupSession(sessionId: number): void {
    this.sessions.delete(sessionId);
  }
}
