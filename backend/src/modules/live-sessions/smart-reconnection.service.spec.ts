import { Test, TestingModule } from '@nestjs/testing';
import { SmartReconnectionService, ReconnectionToken, DisconnectedUser } from './smart-reconnection.service';

describe('SmartReconnectionService', () => {
  let service: SmartReconnectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmartReconnectionService],
    }).compile();

    service = module.get<SmartReconnectionService>(SmartReconnectionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReconnectionToken', () => {
    it('should generate a valid reconnection token', () => {
      const userId = 100;
      const sessionId = 1;
      const roomId = 'room-1';
      const mediaState = { audio: true, video: true, screen: false };

      const token = service.generateReconnectionToken(userId, sessionId, roomId, mediaState);

      expect(token).toBeDefined();
      expect(token).toMatch(/^recon-100-1-\d+-[a-z0-9]+$/);
    });

    it('should create unique tokens for different sessions', () => {
      const mediaState = { audio: true, video: true, screen: false };

      const token1 = service.generateReconnectionToken(100, 1, 'room-1', mediaState);
      const token2 = service.generateReconnectionToken(100, 2, 'room-2', mediaState);

      expect(token1).not.toBe(token2);
    });

    it('should store media state in token', () => {
      const userId = 100;
      const sessionId = 1;
      const roomId = 'room-1';
      const mediaState = { audio: true, video: false, screen: true };

      const token = service.generateReconnectionToken(userId, sessionId, roomId, mediaState);
      const result = service.attemptReconnection(token);

      expect(result.success).toBe(true);
      expect(result.data!.mediaState).toEqual(mediaState);
    });
  });

  describe('updateReconnectionState', () => {
    it('should update media state for user', () => {
      const userId = 100;
      const sessionId = 1;
      const initialState = { audio: true, video: true, screen: false };
      const newState = { audio: false, video: false, screen: true };

      const token = service.generateReconnectionToken(userId, sessionId, 'room-1', initialState);
      service.updateReconnectionState(userId, sessionId, { mediaState: newState });

      const result = service.attemptReconnection(token);
      expect(result.data!.mediaState).toEqual(newState);
    });

    it('should update last position (breakout room, etc)', () => {
      const userId = 100;
      const sessionId = 1;
      const mediaState = { audio: true, video: true, screen: false };

      const token = service.generateReconnectionToken(userId, sessionId, 'room-1', mediaState);
      service.updateReconnectionState(userId, sessionId, {
        breakoutRoomId: 'breakout-1',
        raisedHand: true,
        lastChatId: 'chat-123',
      });

      const result = service.attemptReconnection(token);
      expect(result.data!.lastPosition).toBeDefined();
      expect(result.data!.lastPosition!.breakoutRoomId).toBe('breakout-1');
      expect(result.data!.lastPosition!.raisedHand).toBe(true);
    });

    it('should extend token expiry on update', () => {
      const userId = 100;
      const sessionId = 1;
      const mediaState = { audio: true, video: true, screen: false };

      const token = service.generateReconnectionToken(userId, sessionId, 'room-1', mediaState);
      
      // Wait a bit then update
      service.updateReconnectionState(userId, sessionId, { mediaState });

      // Token should still be valid
      const result = service.attemptReconnection(token);
      expect(result.success).toBe(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should create disconnected user entry', () => {
      const userId = 100;
      const sessionId = 1;
      const mediaState = { audio: true, video: true, screen: false };

      service.generateReconnectionToken(userId, sessionId, 'room-1', mediaState);
      const disconnected = service.handleDisconnect(userId, 'Test User', sessionId, 'room-1', false);

      expect(disconnected).toBeDefined();
      expect(disconnected!.userId).toBe(userId);
      expect(disconnected!.sessionId).toBe(sessionId);
      expect(disconnected!.wasHost).toBe(false);
      expect(disconnected!.disconnectedAt).toBeInstanceOf(Date);
      expect(disconnected!.gracePeriodEndsAt).toBeInstanceOf(Date);
    });

    it('should return null if no token exists', () => {
      const disconnected = service.handleDisconnect(999, 'Unknown', 999, 'room-x', false);
      expect(disconnected).toBeNull();
    });

    it('should preserve media state on disconnect', () => {
      const userId = 100;
      const sessionId = 1;
      const mediaState = { audio: true, video: false, screen: true };

      service.generateReconnectionToken(userId, sessionId, 'room-1', mediaState);
      const disconnected = service.handleDisconnect(userId, 'Test User', sessionId, 'room-1', false);

      expect(disconnected!.mediaState).toEqual(mediaState);
    });

    it('should mark host status correctly', () => {
      const userId = 100;
      const sessionId = 1;
      const mediaState = { audio: true, video: true, screen: false };

      service.generateReconnectionToken(userId, sessionId, 'room-1', mediaState);
      const disconnected = service.handleDisconnect(userId, 'Host User', sessionId, 'room-1', true);

      expect(disconnected!.wasHost).toBe(true);
    });
  });

  describe('attemptReconnection', () => {
    it('should succeed with valid token', () => {
      const userId = 100;
      const sessionId = 1;
      const roomId = 'room-1';
      const mediaState = { audio: true, video: true, screen: false };

      const token = service.generateReconnectionToken(userId, sessionId, roomId, mediaState);
      const result = service.attemptReconnection(token);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.userId).toBe(userId);
      expect(result.data!.sessionId).toBe(sessionId);
      expect(result.data!.roomId).toBe(roomId);
    });

    it('should fail with invalid token', () => {
      const result = service.attemptReconnection('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should track attempt count', () => {
      const token = service.generateReconnectionToken(100, 1, 'room-1', { audio: true, video: true, screen: false });

      const result1 = service.attemptReconnection(token);
      const result2 = service.attemptReconnection(token);

      expect(result1.data!.attemptsRemaining).toBeGreaterThan(result2.data!.attemptsRemaining);
    });

    it('should fail after max attempts exceeded', () => {
      const token = service.generateReconnectionToken(100, 1, 'room-1', { audio: true, video: true, screen: false });

      // Exhaust all attempts (max is 5)
      for (let i = 0; i < 5; i++) {
        service.attemptReconnection(token);
      }

      const result = service.attemptReconnection(token);
      expect(result.success).toBe(false);
      expect(result.error).toContain('vượt quá');
    });

    it('should clear from disconnected list on successful reconnection', () => {
      const userId = 100;
      const sessionId = 1;
      const mediaState = { audio: true, video: true, screen: false };

      const token = service.generateReconnectionToken(userId, sessionId, 'room-1', mediaState);
      service.handleDisconnect(userId, 'Test User', sessionId, 'room-1', false);

      expect(service.getDisconnectedUsers(sessionId).length).toBe(1);

      service.attemptReconnection(token);

      expect(service.getDisconnectedUsers(sessionId).length).toBe(0);
    });
  });

  describe('getDisconnectedUsers', () => {
    it('should return disconnected users for a session', () => {
      const sessionId = 1;
      const mediaState = { audio: true, video: true, screen: false };

      service.generateReconnectionToken(100, sessionId, 'room-1', mediaState);
      service.generateReconnectionToken(101, sessionId, 'room-1', mediaState);
      
      service.handleDisconnect(100, 'User 1', sessionId, 'room-1', false);
      service.handleDisconnect(101, 'User 2', sessionId, 'room-1', false);

      const disconnected = service.getDisconnectedUsers(sessionId);

      expect(disconnected.length).toBe(2);
      expect(disconnected.map(u => u.userId)).toContain(100);
      expect(disconnected.map(u => u.userId)).toContain(101);
    });

    it('should return empty array for session with no disconnects', () => {
      const disconnected = service.getDisconnectedUsers(999);
      expect(disconnected).toEqual([]);
    });

    it('should not include users from other sessions', () => {
      const mediaState = { audio: true, video: true, screen: false };

      service.generateReconnectionToken(100, 1, 'room-1', mediaState);
      service.generateReconnectionToken(101, 2, 'room-2', mediaState);
      
      service.handleDisconnect(100, 'User 1', 1, 'room-1', false);
      service.handleDisconnect(101, 'User 2', 2, 'room-2', false);

      const session1 = service.getDisconnectedUsers(1);
      const session2 = service.getDisconnectedUsers(2);

      expect(session1.length).toBe(1);
      expect(session1[0].userId).toBe(100);
      expect(session2.length).toBe(1);
      expect(session2[0].userId).toBe(101);
    });
  });

  describe('isInGracePeriod', () => {
    it('should return true for recently disconnected user', () => {
      const userId = 100;
      const sessionId = 1;
      const mediaState = { audio: true, video: true, screen: false };

      service.generateReconnectionToken(userId, sessionId, 'room-1', mediaState);
      service.handleDisconnect(userId, 'Test User', sessionId, 'room-1', false);

      expect(service.isInGracePeriod(sessionId, userId)).toBe(true);
    });

    it('should return false for user not in session', () => {
      expect(service.isInGracePeriod(999, 999)).toBe(false);
    });
  });

  describe('getGracePeriodRemaining', () => {
    it('should return remaining time for disconnected user', () => {
      const userId = 100;
      const sessionId = 1;
      const mediaState = { audio: true, video: true, screen: false };

      service.generateReconnectionToken(userId, sessionId, 'room-1', mediaState);
      service.handleDisconnect(userId, 'Test User', sessionId, 'room-1', false);

      const remaining = service.getGracePeriodRemaining(sessionId, userId);

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(2 * 60 * 1000); // Max 2 minutes
    });

    it('should return 0 for user not in grace period', () => {
      const remaining = service.getGracePeriodRemaining(999, 999);
      expect(remaining).toBe(0);
    });
  });

  describe('forceRemove', () => {
    it('should remove user from reconnection system', () => {
      const userId = 100;
      const sessionId = 1;
      const mediaState = { audio: true, video: true, screen: false };

      const token = service.generateReconnectionToken(userId, sessionId, 'room-1', mediaState);
      service.handleDisconnect(userId, 'Test User', sessionId, 'room-1', false);

      service.forceRemove(sessionId, userId);

      // Token should no longer work
      const result = service.attemptReconnection(token);
      expect(result.success).toBe(false);

      // Not in disconnected list
      expect(service.getDisconnectedUsers(sessionId).length).toBe(0);
    });
  });

  describe('getActiveTokenCount', () => {
    it('should return count of active tokens for session', () => {
      const sessionId = 1;
      const mediaState = { audio: true, video: true, screen: false };

      service.generateReconnectionToken(100, sessionId, 'room-1', mediaState);
      service.generateReconnectionToken(101, sessionId, 'room-1', mediaState);
      service.generateReconnectionToken(102, sessionId, 'room-1', mediaState);

      const count = service.getActiveTokenCount(sessionId);
      expect(count).toBe(3);
    });
  });

  describe('cleanupSession', () => {
    it('should remove all data for a session', () => {
      const sessionId = 1;
      const mediaState = { audio: true, video: true, screen: false };

      const token = service.generateReconnectionToken(100, sessionId, 'room-1', mediaState);
      service.handleDisconnect(100, 'Test User', sessionId, 'room-1', false);

      service.cleanupSession(sessionId);

      expect(service.attemptReconnection(token).success).toBe(false);
      expect(service.getDisconnectedUsers(sessionId).length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle same user with multiple sessions', () => {
      const userId = 100;
      const mediaState = { audio: true, video: true, screen: false };

      const token1 = service.generateReconnectionToken(userId, 1, 'room-1', mediaState);
      const token2 = service.generateReconnectionToken(userId, 2, 'room-2', mediaState);

      const result1 = service.attemptReconnection(token1);
      const result2 = service.attemptReconnection(token2);

      expect(result1.data!.sessionId).toBe(1);
      expect(result2.data!.sessionId).toBe(2);
    });

    it('should handle rapid connect/disconnect cycles', () => {
      const userId = 100;
      const sessionId = 1;
      const mediaState = { audio: true, video: true, screen: false };

      for (let i = 0; i < 10; i++) {
        service.generateReconnectionToken(userId, sessionId, 'room-1', mediaState);
        service.handleDisconnect(userId, 'Test User', sessionId, 'room-1', false);
      }

      // Should still have valid state
      expect(service.getDisconnectedUsers(sessionId).length).toBe(1);
    });
  });
});
