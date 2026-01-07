import { Injectable } from '@nestjs/common';

/**
 * WAITING ROOM SERVICE
 * ====================
 * Phòng chờ trước khi vào session như Google Meet/Zoom
 * 
 * Features:
 * - Users wait for host approval
 * - Admit one or all
 * - Deny with reason
 * - Auto-admit options
 */

export interface WaitingUser {
  id: string;
  userId: number;
  userName: string;
  email?: string;
  avatar?: string;
  joinRequestedAt: Date;
  status: 'waiting' | 'admitted' | 'denied';
  deniedReason?: string;
  deniedBy?: number;
  admittedBy?: number;
  admittedAt?: Date;
}

export interface WaitingRoomSettings {
  enabled: boolean;
  autoAdmitMembers: boolean; // Auto-admit class members
  autoAdmitTeachers: boolean; // Auto-admit teachers
  requireApproval: boolean; // Host must approve everyone
  maxWaitTime: number; // Auto-deny after X minutes (0 = disabled)
  notifyHost: boolean; // Notify host when someone joins waiting room
}

export interface WaitingRoom {
  sessionId: number;
  settings: WaitingRoomSettings;
  waiting: Map<number, WaitingUser>;
  denied: Map<number, WaitingUser>;
  admitted: Map<number, WaitingUser>;
}

@Injectable()
export class WaitingRoomService {
  private rooms: Map<number, WaitingRoom> = new Map();

  private defaultSettings: WaitingRoomSettings = {
    enabled: true,
    autoAdmitMembers: true,
    autoAdmitTeachers: true,
    requireApproval: false,
    maxWaitTime: 30, // 30 minutes
    notifyHost: true,
  };

  /**
   * Initialize waiting room for a session
   */
  initWaitingRoom(sessionId: number, settings?: Partial<WaitingRoomSettings>): WaitingRoom {
    const room: WaitingRoom = {
      sessionId,
      settings: { ...this.defaultSettings, ...settings },
      waiting: new Map(),
      denied: new Map(),
      admitted: new Map(),
    };
    this.rooms.set(sessionId, room);
    return room;
  }

  /**
   * Configure waiting room settings
   */
  updateSettings(sessionId: number, settings: Partial<WaitingRoomSettings>): WaitingRoomSettings | null {
    const room = this.rooms.get(sessionId);
    if (!room) return null;

    room.settings = { ...room.settings, ...settings };
    return room.settings;
  }

  /**
   * User requests to join session
   */
  requestJoin(
    sessionId: number,
    userId: number,
    userName: string,
    options?: { email?: string; avatar?: string; isClassMember?: boolean; isTeacher?: boolean },
  ): {
    status: 'waiting' | 'admitted' | 'denied';
    waitingUser?: WaitingUser;
    position?: number;
    reason?: string;
  } {
    const room = this.rooms.get(sessionId);
    
    // If no waiting room, auto-admit
    if (!room || !room.settings.enabled) {
      return { status: 'admitted' };
    }

    // Check if previously denied
    if (room.denied.has(userId)) {
      const denied = room.denied.get(userId)!;
      return { status: 'denied', reason: denied.deniedReason || 'Bạn đã bị từ chối tham gia' };
    }

    // Check if already waiting
    if (room.waiting.has(userId)) {
      const existing = room.waiting.get(userId)!;
      return { status: 'waiting', waitingUser: existing, position: this.getPosition(room, userId) };
    }

    // Check if already admitted
    if (room.admitted.has(userId)) {
      return { status: 'admitted' };
    }

    // Check auto-admit rules
    if (options?.isTeacher && room.settings.autoAdmitTeachers) {
      return { status: 'admitted' };
    }

    if (options?.isClassMember && room.settings.autoAdmitMembers) {
      return { status: 'admitted' };
    }

    if (!room.settings.requireApproval) {
      return { status: 'admitted' };
    }

    // Add to waiting room
    const waitingUser: WaitingUser = {
      id: `wait-${sessionId}-${userId}`,
      userId,
      userName,
      email: options?.email,
      avatar: options?.avatar,
      joinRequestedAt: new Date(),
      status: 'waiting',
    };

    room.waiting.set(userId, waitingUser);

    // Set auto-deny timer if configured
    if (room.settings.maxWaitTime > 0) {
      setTimeout(() => {
        this.autoDeny(sessionId, userId);
      }, room.settings.maxWaitTime * 60 * 1000);
    }

    return {
      status: 'waiting',
      waitingUser,
      position: room.waiting.size,
    };
  }

  /**
   * Auto-deny after max wait time
   */
  private autoDeny(sessionId: number, userId: number): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;

    const user = room.waiting.get(userId);
    if (user && user.status === 'waiting') {
      user.status = 'denied';
      user.deniedReason = 'Hết thời gian chờ';
      room.denied.set(userId, user);
      room.waiting.delete(userId);
    }
  }

  /**
   * Host admits a user
   */
  admitUser(sessionId: number, hostId: number, userId: number): {
    success: boolean;
    user?: WaitingUser;
    error?: string;
  } {
    const room = this.rooms.get(sessionId);
    if (!room) return { success: false, error: 'Waiting room không tồn tại' };

    const user = room.waiting.get(userId);
    if (!user) return { success: false, error: 'User không có trong phòng chờ' };

    user.status = 'admitted';
    user.admittedBy = hostId;
    user.admittedAt = new Date();

    room.admitted.set(userId, user);
    room.waiting.delete(userId);

    return { success: true, user };
  }

  /**
   * Host admits all waiting users
   */
  admitAll(sessionId: number, hostId: number): {
    admitted: number;
    users: WaitingUser[];
  } {
    const room = this.rooms.get(sessionId);
    if (!room) return { admitted: 0, users: [] };

    const users: WaitingUser[] = [];
    const now = new Date();

    room.waiting.forEach((user, odifyId) => {
      user.status = 'admitted';
      user.admittedBy = hostId;
      user.admittedAt = now;
      room.admitted.set(odifyId, user);
      users.push(user);
    });

    room.waiting.clear();

    return { admitted: users.length, users };
  }

  /**
   * Host denies a user
   */
  denyUser(sessionId: number, hostId: number, userId: number, reason?: string): {
    success: boolean;
    error?: string;
  } {
    const room = this.rooms.get(sessionId);
    if (!room) return { success: false, error: 'Waiting room không tồn tại' };

    const user = room.waiting.get(userId);
    if (!user) return { success: false, error: 'User không có trong phòng chờ' };

    user.status = 'denied';
    user.deniedReason = reason || 'Host đã từ chối yêu cầu của bạn';
    user.deniedBy = hostId;

    room.denied.set(userId, user);
    room.waiting.delete(userId);

    return { success: true };
  }

  /**
   * Host denies all waiting users
   */
  denyAll(sessionId: number, hostId: number, reason?: string): number {
    const room = this.rooms.get(sessionId);
    if (!room) return 0;

    const count = room.waiting.size;

    room.waiting.forEach((user, odifyId) => {
      user.status = 'denied';
      user.deniedReason = reason || 'Session đã bị đóng';
      user.deniedBy = hostId;
      room.denied.set(odifyId, user);
    });

    room.waiting.clear();

    return count;
  }

  /**
   * Get all waiting users
   */
  getWaitingUsers(sessionId: number): WaitingUser[] {
    const room = this.rooms.get(sessionId);
    if (!room) return [];
    return Array.from(room.waiting.values()).sort((a, b) => 
      a.joinRequestedAt.getTime() - b.joinRequestedAt.getTime()
    );
  }

  /**
   * Get waiting count
   */
  getWaitingCount(sessionId: number): number {
    const room = this.rooms.get(sessionId);
    return room?.waiting.size || 0;
  }

  /**
   * Check if user is waiting
   */
  isWaiting(sessionId: number, userId: number): boolean {
    const room = this.rooms.get(sessionId);
    return room?.waiting.has(userId) || false;
  }

  /**
   * Check if user was denied
   */
  wasDenied(sessionId: number, userId: number): boolean {
    const room = this.rooms.get(sessionId);
    return room?.denied.has(userId) || false;
  }

  /**
   * Get user status
   */
  getUserStatus(sessionId: number, userId: number): {
    status: 'not-found' | 'waiting' | 'admitted' | 'denied';
    position?: number;
    waitingSince?: Date;
    reason?: string;
  } {
    const room = this.rooms.get(sessionId);
    if (!room) return { status: 'not-found' };

    if (room.waiting.has(userId)) {
      const user = room.waiting.get(userId)!;
      return {
        status: 'waiting',
        position: this.getPosition(room, userId),
        waitingSince: user.joinRequestedAt,
      };
    }

    if (room.admitted.has(userId)) {
      return { status: 'admitted' };
    }

    if (room.denied.has(userId)) {
      const user = room.denied.get(userId)!;
      return { status: 'denied', reason: user.deniedReason };
    }

    return { status: 'not-found' };
  }

  /**
   * Get user position in queue
   */
  private getPosition(room: WaitingRoom, userId: number): number {
    const sorted = Array.from(room.waiting.values())
      .sort((a, b) => a.joinRequestedAt.getTime() - b.joinRequestedAt.getTime());
    return sorted.findIndex(u => u.userId === userId) + 1;
  }

  /**
   * Get waiting room settings
   */
  getSettings(sessionId: number): WaitingRoomSettings | null {
    const room = this.rooms.get(sessionId);
    return room?.settings || null;
  }

  /**
   * Check if waiting room is enabled
   */
  isEnabled(sessionId: number): boolean {
    const room = this.rooms.get(sessionId);
    return room?.settings.enabled || false;
  }

  /**
   * Enable/disable waiting room
   */
  setEnabled(sessionId: number, enabled: boolean): void {
    const room = this.rooms.get(sessionId);
    if (room) {
      room.settings.enabled = enabled;
    }
  }

  /**
   * Cleanup session data
   */
  cleanupSession(sessionId: number): void {
    this.rooms.delete(sessionId);
  }

  /**
   * Get statistics
   */
  getStatistics(sessionId: number): {
    waiting: number;
    admitted: number;
    denied: number;
    averageWaitTime: number; // seconds
  } {
    const room = this.rooms.get(sessionId);
    if (!room) {
      return { waiting: 0, admitted: 0, denied: 0, averageWaitTime: 0 };
    }

    const waitTimes: number[] = [];
    room.admitted.forEach(user => {
      if (user.admittedAt) {
        waitTimes.push((user.admittedAt.getTime() - user.joinRequestedAt.getTime()) / 1000);
      }
    });

    const averageWaitTime = waitTimes.length > 0
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
      : 0;

    return {
      waiting: room.waiting.size,
      admitted: room.admitted.size,
      denied: room.denied.size,
      averageWaitTime: Math.round(averageWaitTime),
    };
  }
}
