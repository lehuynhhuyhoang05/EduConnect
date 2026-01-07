import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * SMART RECONNECTION SERVICE
 * ==========================
 * Tính năng đặc biệt: Tự động kết nối lại khi mất mạng
 * Giống như Zoom's network resilience
 * 
 * Network Concepts:
 * - Session state preservation
 * - Token-based reconnection
 * - Grace period for transient disconnects
 * - State synchronization after reconnect
 */

export interface ReconnectionToken {
  token: string;
  userId: number;
  sessionId: number;
  roomId: string;
  createdAt: Date;
  expiresAt: Date;
  mediaState: {
    audio: boolean;
    video: boolean;
    screen: boolean;
  };
  lastPosition?: {
    breakoutRoomId?: string;
    raisedHand?: boolean;
    lastChatId?: string;
  };
  attempts: number;
  maxAttempts: number;
}

export interface DisconnectedUser {
  userId: number;
  userName?: string;
  sessionId: number;
  roomId: string;
  disconnectedAt: Date;
  gracePeriodEndsAt: Date;
  reconnectionToken: string;
  wasHost: boolean;
  mediaState: {
    audio: boolean;
    video: boolean;
    screen: boolean;
  };
}

@Injectable()
export class SmartReconnectionService {
  // Token storage
  private reconnectionTokens: Map<string, ReconnectionToken> = new Map();
  private userTokens: Map<string, string> = new Map(); // `${sessionId}-${userId}` -> token
  private disconnectedUsers: Map<string, DisconnectedUser> = new Map();

  // Configuration
  private readonly GRACE_PERIOD_MS = 2 * 60 * 1000; // 2 minutes to reconnect
  private readonly TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes token validity
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  /**
   * Generate reconnection token khi user vào phòng
   */
  generateReconnectionToken(
    userId: number,
    sessionId: number,
    roomId: string,
    mediaState: { audio: boolean; video: boolean; screen: boolean },
  ): string {
    const token = `recon-${userId}-${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const reconnectionData: ReconnectionToken = {
      token,
      userId,
      sessionId,
      roomId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.TOKEN_EXPIRY_MS),
      mediaState,
      attempts: 0,
      maxAttempts: this.MAX_RECONNECT_ATTEMPTS,
    };

    this.reconnectionTokens.set(token, reconnectionData);
    this.userTokens.set(`${sessionId}-${userId}`, token);

    return token;
  }

  /**
   * Update token with current state (call periodically)
   */
  updateReconnectionState(
    userId: number,
    sessionId: number,
    state: {
      mediaState?: { audio: boolean; video: boolean; screen: boolean };
      breakoutRoomId?: string;
      raisedHand?: boolean;
      lastChatId?: string;
    },
  ): void {
    const tokenKey = this.userTokens.get(`${sessionId}-${userId}`);
    if (tokenKey) {
      const tokenData = this.reconnectionTokens.get(tokenKey);
      if (tokenData) {
        if (state.mediaState) {
          tokenData.mediaState = state.mediaState;
        }
        tokenData.lastPosition = {
          ...tokenData.lastPosition,
          ...state,
        };
        // Extend expiry
        tokenData.expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MS);
      }
    }
  }

  /**
   * Handle user disconnect - start grace period
   */
  handleDisconnect(
    userId: number,
    userName: string | undefined,
    sessionId: number,
    roomId: string,
    wasHost: boolean,
  ): DisconnectedUser | null {
    const tokenKey = this.userTokens.get(`${sessionId}-${userId}`);
    const tokenData = tokenKey ? this.reconnectionTokens.get(tokenKey) : null;

    if (!tokenData) {
      // No token - user wasn't properly connected
      return null;
    }

    const now = new Date();
    const disconnected: DisconnectedUser = {
      userId,
      userName,
      sessionId,
      roomId,
      disconnectedAt: now,
      gracePeriodEndsAt: new Date(now.getTime() + this.GRACE_PERIOD_MS),
      reconnectionToken: tokenData.token,
      wasHost,
      mediaState: tokenData.mediaState,
    };

    this.disconnectedUsers.set(`${sessionId}-${userId}`, disconnected);

    // Schedule removal after grace period
    setTimeout(() => {
      this.handleGracePeriodExpired(sessionId, userId);
    }, this.GRACE_PERIOD_MS);

    return disconnected;
  }

  /**
   * Handle grace period expired
   */
  private handleGracePeriodExpired(sessionId: number, userId: number): void {
    const key = `${sessionId}-${userId}`;
    const disconnected = this.disconnectedUsers.get(key);
    
    if (disconnected) {
      // User didn't reconnect - clean up
      this.disconnectedUsers.delete(key);
      this.userTokens.delete(key);
      
      const token = disconnected.reconnectionToken;
      this.reconnectionTokens.delete(token);

      console.log(`[Reconnection] User ${userId} grace period expired for session ${sessionId}`);
    }
  }

  /**
   * Attempt reconnection with token
   */
  attemptReconnection(token: string): {
    success: boolean;
    error?: string;
    data?: {
      userId: number;
      sessionId: number;
      roomId: string;
      mediaState: { audio: boolean; video: boolean; screen: boolean };
      lastPosition?: ReconnectionToken['lastPosition'];
      attemptsRemaining: number;
    };
  } {
    const tokenData = this.reconnectionTokens.get(token);

    if (!tokenData) {
      return { success: false, error: 'Token không hợp lệ hoặc đã hết hạn' };
    }

    // Check expiry
    if (new Date() > tokenData.expiresAt) {
      this.reconnectionTokens.delete(token);
      return { success: false, error: 'Token đã hết hạn' };
    }

    // Check attempts
    if (tokenData.attempts >= tokenData.maxAttempts) {
      this.reconnectionTokens.delete(token);
      return { success: false, error: 'Đã vượt quá số lần thử kết nối lại' };
    }

    tokenData.attempts++;

    // Clear from disconnected list
    const key = `${tokenData.sessionId}-${tokenData.userId}`;
    this.disconnectedUsers.delete(key);

    return {
      success: true,
      data: {
        userId: tokenData.userId,
        sessionId: tokenData.sessionId,
        roomId: tokenData.roomId,
        mediaState: tokenData.mediaState,
        lastPosition: tokenData.lastPosition,
        attemptsRemaining: tokenData.maxAttempts - tokenData.attempts,
      },
    };
  }

  /**
   * Get disconnected users in a session (for host dashboard)
   */
  getDisconnectedUsers(sessionId: number): DisconnectedUser[] {
    const users: DisconnectedUser[] = [];
    this.disconnectedUsers.forEach((user, key) => {
      if (key.startsWith(`${sessionId}-`)) {
        users.push(user);
      }
    });
    return users;
  }

  /**
   * Check if user is in grace period (temporarily disconnected)
   */
  isInGracePeriod(sessionId: number, userId: number): boolean {
    const key = `${sessionId}-${userId}`;
    const disconnected = this.disconnectedUsers.get(key);
    if (disconnected) {
      return new Date() < disconnected.gracePeriodEndsAt;
    }
    return false;
  }

  /**
   * Get remaining grace period time
   */
  getGracePeriodRemaining(sessionId: number, userId: number): number {
    const key = `${sessionId}-${userId}`;
    const disconnected = this.disconnectedUsers.get(key);
    if (disconnected) {
      const remaining = disconnected.gracePeriodEndsAt.getTime() - Date.now();
      return Math.max(0, remaining);
    }
    return 0;
  }

  /**
   * Force remove user (when kicked)
   */
  forceRemove(sessionId: number, userId: number): void {
    const key = `${sessionId}-${userId}`;
    const tokenKey = this.userTokens.get(key);
    
    if (tokenKey) {
      this.reconnectionTokens.delete(tokenKey);
    }
    this.userTokens.delete(key);
    this.disconnectedUsers.delete(key);
  }

  /**
   * Clean up all data for a session (when session ends)
   */
  cleanupSession(sessionId: number): { usersCleanedUp: number } {
    let count = 0;

    // Clean tokens
    const tokensToDelete: string[] = [];
    this.reconnectionTokens.forEach((data, token) => {
      if (data.sessionId === sessionId) {
        tokensToDelete.push(token);
        count++;
      }
    });
    tokensToDelete.forEach(t => this.reconnectionTokens.delete(t));

    // Clean user mappings
    const keysToDelete: string[] = [];
    this.userTokens.forEach((_, key) => {
      if (key.startsWith(`${sessionId}-`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(k => this.userTokens.delete(k));

    // Clean disconnected users
    const disconnectedToDelete: string[] = [];
    this.disconnectedUsers.forEach((_, key) => {
      if (key.startsWith(`${sessionId}-`)) {
        disconnectedToDelete.push(key);
      }
    });
    disconnectedToDelete.forEach(k => this.disconnectedUsers.delete(k));

    return { usersCleanedUp: count };
  }

  /**
   * Get reconnection stats for monitoring
   */
  getStats(): {
    activeTokens: number;
    disconnectedUsers: number;
    tokensBySession: Map<number, number>;
  } {
    const tokensBySession = new Map<number, number>();
    
    this.reconnectionTokens.forEach(token => {
      const current = tokensBySession.get(token.sessionId) || 0;
      tokensBySession.set(token.sessionId, current + 1);
    });

    return {
      activeTokens: this.reconnectionTokens.size,
      disconnectedUsers: this.disconnectedUsers.size,
      tokensBySession,
    };
  }

  /**
   * Get count of active tokens for a specific session
   */
  getActiveTokenCount(sessionId: number): number {
    let count = 0;
    this.userTokens.forEach((_, key) => {
      if (key.startsWith(`${sessionId}-`)) {
        count++;
      }
    });
    return count;
  }
}
