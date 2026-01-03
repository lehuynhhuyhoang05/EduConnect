import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';

/**
 * BREAKOUT ROOMS SERVICE
 * =====================
 * Tính năng đặc biệt: Chia phòng nhỏ trong live session
 * Giống như Zoom Breakout Rooms - cho phép teacher chia học sinh thành nhóm nhỏ
 * 
 * Network Concepts:
 * - Mỗi breakout room là một WebRTC mesh riêng biệt
 * - Signaling được route theo roomId
 * - Hỗ trợ broadcast message từ host tới tất cả rooms
 */

export interface BreakoutRoom {
  id: string;
  sessionId: number;
  name: string;
  participants: BreakoutParticipant[];
  createdAt: Date;
  isOpen: boolean;
  maxParticipants?: number;
}

export interface BreakoutParticipant {
  userId: number;
  username: string;
  joinedAt: Date;
  isCoHost?: boolean;
}

export interface BreakoutConfig {
  sessionId: number;
  rooms: { name: string; participantIds?: number[] }[];
  allowParticipantsToChoose: boolean;
  allowReturnToMain: boolean;
  autoCloseAfterMinutes?: number;
  notifyBeforeCloseSeconds?: number;
}

@Injectable()
export class BreakoutRoomsService {
  // In-memory storage (có thể migrate sang Redis cho production scale)
  private breakoutSessions: Map<number, {
    config: BreakoutConfig;
    rooms: Map<string, BreakoutRoom>;
    hostId: number;
    startedAt: Date;
    status: 'preparing' | 'active' | 'closing' | 'closed';
  }> = new Map();

  /**
   * Tạo breakout rooms cho một session
   */
  createBreakoutRooms(
    sessionId: number,
    hostId: number,
    config: Omit<BreakoutConfig, 'sessionId'>,
  ): { rooms: BreakoutRoom[]; sessionId: number } {
    // Kiểm tra session đã có breakout chưa
    if (this.breakoutSessions.has(sessionId)) {
      const existing = this.breakoutSessions.get(sessionId);
      if (existing.status === 'active') {
        throw new BadRequestException('Breakout rooms already active for this session');
      }
    }

    const rooms = new Map<string, BreakoutRoom>();
    const createdRooms: BreakoutRoom[] = [];

    // Tạo các phòng từ config
    config.rooms.forEach((roomConfig, index) => {
      const roomId = `${sessionId}-breakout-${index + 1}`;
      const room: BreakoutRoom = {
        id: roomId,
        sessionId,
        name: roomConfig.name || `Room ${index + 1}`,
        participants: [],
        createdAt: new Date(),
        isOpen: true,
      };
      rooms.set(roomId, room);
      createdRooms.push(room);
    });

    // Lưu session breakout
    this.breakoutSessions.set(sessionId, {
      config: { ...config, sessionId },
      rooms,
      hostId,
      startedAt: new Date(),
      status: 'preparing',
    });

    return { rooms: createdRooms, sessionId };
  }

  /**
   * Bắt đầu breakout rooms (mở cho participants join)
   */
  startBreakoutRooms(sessionId: number, hostId: number): {
    success: boolean;
    rooms: BreakoutRoom[];
  } {
    const session = this.breakoutSessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('No breakout rooms configured for this session');
    }

    if (session.hostId !== hostId) {
      throw new ForbiddenException('Only host can start breakout rooms');
    }

    session.status = 'active';
    session.startedAt = new Date();

    // Nếu có auto-close, set timer
    if (session.config.autoCloseAfterMinutes) {
      const closeTime = session.config.autoCloseAfterMinutes * 60 * 1000;
      const notifyTime = session.config.notifyBeforeCloseSeconds 
        ? closeTime - (session.config.notifyBeforeCloseSeconds * 1000)
        : closeTime - 60000; // Default 1 minute warning

      setTimeout(() => {
        this.notifyBreakoutClosing(sessionId);
      }, notifyTime);

      setTimeout(() => {
        this.closeBreakoutRooms(sessionId, hostId);
      }, closeTime);
    }

    return {
      success: true,
      rooms: Array.from(session.rooms.values()),
    };
  }

  /**
   * Participant tham gia một breakout room
   */
  joinBreakoutRoom(
    sessionId: number,
    roomId: string,
    userId: number,
    username: string,
  ): BreakoutRoom {
    const session = this.breakoutSessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('No active breakout session');
    }

    if (session.status !== 'active') {
      throw new BadRequestException('Breakout rooms are not active yet');
    }

    const room = session.rooms.get(roomId);
    if (!room) {
      throw new BadRequestException('Breakout room not found');
    }

    if (!room.isOpen) {
      throw new BadRequestException('Breakout room is closed');
    }

    // Kiểm tra đã trong room khác chưa
    session.rooms.forEach((r) => {
      const existingIndex = r.participants.findIndex(p => p.userId === userId);
      if (existingIndex !== -1) {
        r.participants.splice(existingIndex, 1);
      }
    });

    // Thêm vào room mới
    room.participants.push({
      userId,
      username,
      joinedAt: new Date(),
    });

    return room;
  }

  /**
   * Rời breakout room (về main room)
   */
  leaveBreakoutRoom(sessionId: number, userId: number): {
    success: boolean;
    leftRoom?: string;
  } {
    const session = this.breakoutSessions.get(sessionId);
    if (!session) {
      return { success: false };
    }

    if (!session.config.allowReturnToMain) {
      throw new ForbiddenException('Returning to main room is not allowed');
    }

    let leftRoom: string | undefined;
    session.rooms.forEach((room) => {
      const index = room.participants.findIndex(p => p.userId === userId);
      if (index !== -1) {
        room.participants.splice(index, 1);
        leftRoom = room.id;
      }
    });

    return { success: true, leftRoom };
  }

  /**
   * Host di chuyển participant giữa các rooms
   */
  moveParticipant(
    sessionId: number,
    hostId: number,
    userId: number,
    targetRoomId: string,
  ): BreakoutRoom {
    const session = this.breakoutSessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('No active breakout session');
    }

    if (session.hostId !== hostId) {
      throw new ForbiddenException('Only host can move participants');
    }

    const targetRoom = session.rooms.get(targetRoomId);
    if (!targetRoom) {
      throw new BadRequestException('Target room not found');
    }

    // Tìm và di chuyển participant
    let movedParticipant: BreakoutParticipant | null = null;
    session.rooms.forEach((room) => {
      const index = room.participants.findIndex(p => p.userId === userId);
      if (index !== -1) {
        movedParticipant = room.participants.splice(index, 1)[0];
      }
    });

    if (movedParticipant) {
      movedParticipant.joinedAt = new Date();
      targetRoom.participants.push(movedParticipant);
    }

    return targetRoom;
  }

  /**
   * Host broadcast message tới tất cả breakout rooms
   */
  broadcastToAllRooms(
    sessionId: number,
    hostId: number,
    message: string,
  ): { recipients: number; rooms: string[] } {
    const session = this.breakoutSessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('No active breakout session');
    }

    if (session.hostId !== hostId) {
      throw new ForbiddenException('Only host can broadcast');
    }

    let totalRecipients = 0;
    const roomNames: string[] = [];

    session.rooms.forEach((room) => {
      totalRecipients += room.participants.length;
      roomNames.push(room.name);
    });

    // Message sẽ được gửi qua WebSocket gateway
    return {
      recipients: totalRecipients,
      rooms: roomNames,
    };
  }

  /**
   * Lấy trạng thái tất cả breakout rooms
   */
  getBreakoutStatus(sessionId: number): {
    status: string;
    rooms: BreakoutRoom[];
    config: BreakoutConfig;
    startedAt: Date | null;
    remainingMinutes?: number;
  } | null {
    const session = this.breakoutSessions.get(sessionId);
    if (!session) {
      return null;
    }

    let remainingMinutes: number | undefined;
    if (session.config.autoCloseAfterMinutes && session.status === 'active') {
      const elapsed = (Date.now() - session.startedAt.getTime()) / 60000;
      remainingMinutes = Math.max(0, session.config.autoCloseAfterMinutes - elapsed);
    }

    return {
      status: session.status,
      rooms: Array.from(session.rooms.values()),
      config: session.config,
      startedAt: session.startedAt,
      remainingMinutes,
    };
  }

  /**
   * Lấy room mà user đang ở
   */
  getUserCurrentRoom(sessionId: number, userId: number): BreakoutRoom | null {
    const session = this.breakoutSessions.get(sessionId);
    if (!session) return null;

    for (const room of session.rooms.values()) {
      if (room.participants.find(p => p.userId === userId)) {
        return room;
      }
    }
    return null;
  }

  /**
   * Thông báo breakout rooms sắp đóng
   */
  private notifyBreakoutClosing(sessionId: number): void {
    const session = this.breakoutSessions.get(sessionId);
    if (session && session.status === 'active') {
      session.status = 'closing';
      // Event sẽ được emit qua WebSocket gateway
    }
  }

  /**
   * Đóng tất cả breakout rooms, đưa mọi người về main
   */
  closeBreakoutRooms(sessionId: number, hostId: number): {
    success: boolean;
    totalParticipants: number;
  } {
    const session = this.breakoutSessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('No breakout session found');
    }

    if (session.hostId !== hostId) {
      throw new ForbiddenException('Only host can close breakout rooms');
    }

    let totalParticipants = 0;
    session.rooms.forEach((room) => {
      totalParticipants += room.participants.length;
      room.participants = [];
      room.isOpen = false;
    });

    session.status = 'closed';

    // Clean up sau 5 phút
    setTimeout(() => {
      this.breakoutSessions.delete(sessionId);
    }, 5 * 60 * 1000);

    return {
      success: true,
      totalParticipants,
    };
  }

  /**
   * Pre-assign participants vào rooms trước khi bắt đầu
   */
  preAssignParticipants(
    sessionId: number,
    hostId: number,
    assignments: { roomId: string; userIds: number[] }[],
  ): BreakoutRoom[] {
    const session = this.breakoutSessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('No breakout session found');
    }

    if (session.hostId !== hostId) {
      throw new ForbiddenException('Only host can pre-assign');
    }

    if (session.status !== 'preparing') {
      throw new BadRequestException('Can only pre-assign before starting');
    }

    assignments.forEach(({ roomId, userIds }) => {
      const room = session.rooms.get(roomId);
      if (room) {
        // Sẽ được populate khi participants thực sự join
        // Đây chỉ là "suggested room" cho mỗi user
      }
    });

    return Array.from(session.rooms.values());
  }

  /**
   * Tự động chia đều participants vào rooms
   */
  autoAssignParticipants(
    sessionId: number,
    hostId: number,
    participantList: { userId: number; username: string }[],
  ): BreakoutRoom[] {
    const session = this.breakoutSessions.get(sessionId);
    if (!session) {
      throw new BadRequestException('No breakout session found');
    }

    if (session.hostId !== hostId) {
      throw new ForbiddenException('Only host can auto-assign');
    }

    const rooms = Array.from(session.rooms.values());
    const roomCount = rooms.length;

    // Chia đều round-robin
    participantList.forEach((participant, index) => {
      const targetRoom = rooms[index % roomCount];
      targetRoom.participants.push({
        userId: participant.userId,
        username: participant.username,
        joinedAt: new Date(),
      });
    });

    return rooms;
  }

  /**
   * Lấy statistics cho host dashboard
   */
  getBreakoutStatistics(sessionId: number): {
    totalRooms: number;
    totalParticipants: number;
    roomStats: { roomId: string; name: string; count: number }[];
    averagePerRoom: number;
    emptyRooms: number;
  } | null {
    const session = this.breakoutSessions.get(sessionId);
    if (!session) return null;

    let totalParticipants = 0;
    let emptyRooms = 0;
    const roomStats: { roomId: string; name: string; count: number }[] = [];

    session.rooms.forEach((room) => {
      const count = room.participants.length;
      totalParticipants += count;
      if (count === 0) emptyRooms++;
      roomStats.push({
        roomId: room.id,
        name: room.name,
        count,
      });
    });

    const totalRooms = session.rooms.size;
    
    return {
      totalRooms,
      totalParticipants,
      roomStats,
      averagePerRoom: totalRooms > 0 ? Math.round(totalParticipants / totalRooms * 10) / 10 : 0,
      emptyRooms,
    };
  }
}
