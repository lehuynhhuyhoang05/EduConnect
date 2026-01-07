import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionQualityService, ConnectionStats, QualityRating } from './connection-quality.service';

describe('ConnectionQualityService', () => {
  let service: ConnectionQualityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConnectionQualityService],
    }).compile();

    service = module.get<ConnectionQualityService>(ConnectionQualityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create mock stats
  const createMockStats = (overrides: Partial<ConnectionStats> = {}): Partial<ConnectionStats> => ({
    videoBytesSent: 1000000,
    videoBytesReceived: 1000000,
    videoPacketsSent: 1000,
    videoPacketsReceived: 1000,
    videoPacketsLost: 5,
    videoFrameRate: 30,
    videoResolution: { width: 1280, height: 720 },
    audioBytesSent: 50000,
    audioBytesReceived: 50000,
    audioPacketsSent: 500,
    audioPacketsReceived: 500,
    audioPacketsLost: 2,
    audioLevel: 0.5,
    roundTripTime: 50,
    jitter: 10,
    availableOutgoingBitrate: 2000000,
    availableIncomingBitrate: 2000000,
    connectionType: 'direct',
    localCandidateType: 'host',
    remoteCandidateType: 'host',
    ...overrides,
  });

  describe('reportStats', () => {
    it('should accept and store connection stats', () => {
      const sessionId = 1;
      const userId = 100;
      const stats = createMockStats();

      // Should not throw
      expect(() => {
        service.reportStats(sessionId, userId, stats);
      }).not.toThrow();
    });

    it('should handle multiple stats reports for same user', () => {
      const sessionId = 1;
      const userId = 100;

      service.reportStats(sessionId, userId, createMockStats({ roundTripTime: 50 }));
      service.reportStats(sessionId, userId, createMockStats({ roundTripTime: 60 }));
      service.reportStats(sessionId, userId, createMockStats({ roundTripTime: 55 }));

      const quality = service.getParticipantQuality(sessionId, userId);
      expect(quality).toBeDefined();
    });

    it('should handle stats from multiple users', () => {
      const sessionId = 1;

      service.reportStats(sessionId, 100, createMockStats());
      service.reportStats(sessionId, 101, createMockStats());
      service.reportStats(sessionId, 102, createMockStats());

      const sessionQuality = service.getSessionQuality(sessionId);
      expect(sessionQuality).toBeDefined();
    });
  });

  describe('getParticipantQuality', () => {
    it('should return quality rating for user with stats', () => {
      const sessionId = 2;
      const userId = 100;

      service.reportStats(sessionId, userId, createMockStats());
      const quality = service.getParticipantQuality(sessionId, userId);

      expect(quality).toBeDefined();
      expect(quality!.userId).toBe(userId);
      expect(quality!.rating).toBeDefined();
      expect(quality!.rating.overall).toBeDefined();
      expect(quality!.rating.score).toBeGreaterThanOrEqual(0);
      expect(quality!.rating.score).toBeLessThanOrEqual(100);
    });

    it('should return null for user without stats', () => {
      const quality = service.getParticipantQuality(999, 999);
      expect(quality).toBeNull();
    });

    it('should rate excellent connection properly', () => {
      const sessionId = 3;
      const userId = 100;

      // Excellent stats
      service.reportStats(sessionId, userId, createMockStats({
        roundTripTime: 30,
        jitter: 5,
        videoPacketsLost: 0,
        audioPacketsLost: 0,
        availableOutgoingBitrate: 3000000,
      }));

      const quality = service.getParticipantQuality(sessionId, userId);
      expect(quality!.rating.overall).toBe('excellent');
      expect(quality!.rating.score).toBeGreaterThanOrEqual(90);
    });

    it('should rate poor connection properly', () => {
      const sessionId = 4;
      const userId = 100;

      // Poor stats
      service.reportStats(sessionId, userId, createMockStats({
        roundTripTime: 400,
        jitter: 80,
        videoPacketsLost: 50,
        audioPacketsLost: 30,
        videoPacketsSent: 1000,
        audioPacketsSent: 500,
        availableOutgoingBitrate: 150000,
      }));

      const quality = service.getParticipantQuality(sessionId, userId);
      expect(['poor', 'critical']).toContain(quality!.rating.overall);
      expect(quality!.rating.score).toBeLessThan(50);
    });

    it('should detect quality issues', () => {
      const sessionId = 5;
      const userId = 100;

      // High latency
      service.reportStats(sessionId, userId, createMockStats({
        roundTripTime: 300,
        jitter: 60,
      }));

      const quality = service.getParticipantQuality(sessionId, userId);
      expect(quality!.issues.length).toBeGreaterThan(0);
      expect(quality!.issues.some(i => i.type === 'high-latency' || i.type === 'high-jitter')).toBe(true);
    });
  });

  describe('getSessionQuality', () => {
    it('should return average quality for all participants', () => {
      const sessionId = 10;

      // Add multiple users with different quality
      service.reportStats(sessionId, 100, createMockStats({ roundTripTime: 30 }));
      service.reportStats(sessionId, 101, createMockStats({ roundTripTime: 100 }));
      service.reportStats(sessionId, 102, createMockStats({ roundTripTime: 200 }));

      const sessionQuality = service.getSessionQuality(sessionId);

      expect(sessionQuality).toBeDefined();
      expect(sessionQuality!.participantCount).toBe(3);
      expect(sessionQuality!.averageScore).toBeDefined();
    });

    it('should identify worst performing participant', () => {
      const sessionId = 11;

      service.reportStats(sessionId, 100, createMockStats({ roundTripTime: 30 }));
      service.reportStats(sessionId, 101, createMockStats({ roundTripTime: 400, jitter: 100 }));

      const sessionQuality = service.getSessionQuality(sessionId);

      expect(sessionQuality!.worstParticipant).toBeDefined();
      expect(sessionQuality!.worstParticipant!.userId).toBe(101);
    });

    it('should return null for empty session', () => {
      const quality = service.getSessionQuality(999);
      expect(quality).toBeNull();
    });
  });

  describe('getRecommendations', () => {
    it('should provide recommendations for poor connection', () => {
      const sessionId = 20;
      const userId = 100;

      // Poor bandwidth
      service.reportStats(sessionId, userId, createMockStats({
        availableOutgoingBitrate: 100000,
        roundTripTime: 300,
      }));

      const recommendations = service.getRecommendations(sessionId, userId);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => 
        r.toLowerCase().includes('video') || 
        r.toLowerCase().includes('bandwidth') ||
        r.toLowerCase().includes('quality')
      )).toBe(true);
    });

    it('should return empty array for excellent connection', () => {
      const sessionId = 21;
      const userId = 100;

      // Excellent stats
      service.reportStats(sessionId, userId, createMockStats({
        roundTripTime: 20,
        jitter: 3,
        videoPacketsLost: 0,
        audioPacketsLost: 0,
        availableOutgoingBitrate: 5000000,
      }));

      const recommendations = service.getRecommendations(sessionId, userId);
      expect(recommendations.length).toBe(0);
    });
  });

  describe('clearSessionStats', () => {
    it('should clear all stats for a session', () => {
      const sessionId = 30;

      service.reportStats(sessionId, 100, createMockStats());
      service.reportStats(sessionId, 101, createMockStats());

      service.clearSessionStats(sessionId);

      const quality = service.getParticipantQuality(sessionId, 100);
      expect(quality).toBeNull();
    });
  });

  describe('getQualityHistory', () => {
    it('should return quality history for a user', () => {
      const sessionId = 40;
      const userId = 100;

      // Report multiple stats
      for (let i = 0; i < 5; i++) {
        service.reportStats(sessionId, userId, createMockStats({
          roundTripTime: 50 + i * 10,
        }));
      }

      const quality = service.getParticipantQuality(sessionId, userId);
      expect(quality!.history).toBeDefined();
      expect(quality!.history.length).toBeGreaterThan(0);
    });
  });

  describe('quality rating calculations', () => {
    it('should handle relay connections differently', () => {
      const sessionId = 50;
      const userId = 100;

      service.reportStats(sessionId, userId, createMockStats({
        connectionType: 'relay',
        roundTripTime: 80, // Higher but acceptable for relay
      }));

      const quality = service.getParticipantQuality(sessionId, userId);
      expect(quality).toBeDefined();
    });

    it('should handle missing video gracefully', () => {
      const sessionId = 51;
      const userId = 100;

      service.reportStats(sessionId, userId, createMockStats({
        videoBytesSent: 0,
        videoBytesReceived: 0,
        videoPacketsSent: 0,
        videoFrameRate: 0,
      }));

      const quality = service.getParticipantQuality(sessionId, userId);
      expect(quality).toBeDefined();
      expect(quality!.rating.video).toBe('off');
    });

    it('should handle missing audio gracefully', () => {
      const sessionId = 52;
      const userId = 100;

      service.reportStats(sessionId, userId, createMockStats({
        audioBytesSent: 0,
        audioBytesReceived: 0,
        audioPacketsSent: 0,
        audioLevel: 0,
      }));

      const quality = service.getParticipantQuality(sessionId, userId);
      expect(quality).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very high packet loss', () => {
      const sessionId = 60;
      const userId = 100;

      service.reportStats(sessionId, userId, createMockStats({
        videoPacketsSent: 100,
        videoPacketsLost: 50, // 50% packet loss
        audioPacketsSent: 100,
        audioPacketsLost: 50,
        roundTripTime: 500,
        jitter: 150,
        availableOutgoingBitrate: 50000,
      }));

      const quality = service.getParticipantQuality(sessionId, userId);
      expect(['poor', 'critical']).toContain(quality!.rating.overall);
      expect(quality!.issues.length).toBeGreaterThan(0);
    });

    it('should handle zero bitrate', () => {
      const sessionId = 61;
      const userId = 100;

      service.reportStats(sessionId, userId, createMockStats({
        availableOutgoingBitrate: 0,
        availableIncomingBitrate: 0,
        roundTripTime: 500,
        jitter: 100,
      }));

      const quality = service.getParticipantQuality(sessionId, userId);
      expect(quality).toBeDefined();
      // With other stats at default good values, overall may not be critical
      expect(quality!.rating.score).toBeLessThan(80);
    });
  });
});
