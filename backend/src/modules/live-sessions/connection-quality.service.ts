

import { Injectable } from '@nestjs/common';

/**
 * CONNECTION QUALITY MONITOR SERVICE
 * ===================================
 * Tính năng đặc biệt: Theo dõi chất lượng kết nối real-time
 * Giống như indicator chất lượng mạng trên Zoom/Meet
 * 
 * Network Concepts:
 * - WebRTC stats API integration
 * - Jitter, latency, packet loss monitoring
 * - Adaptive quality suggestions
 * - Network issue detection & alerts
 */

export interface ConnectionStats {
  userId: number;
  timestamp: Date;
  
  // Video stats
  videoBytesSent: number;
  videoBytesReceived: number;
  videoPacketsSent: number;
  videoPacketsReceived: number;
  videoPacketsLost: number;
  videoFrameRate: number;
  videoResolution: { width: number; height: number };
  
  // Audio stats
  audioBytesSent: number;
  audioBytesReceived: number;
  audioPacketsSent: number;
  audioPacketsReceived: number;
  audioPacketsLost: number;
  audioLevel: number;
  
  // Network stats
  roundTripTime: number; // ms
  jitter: number; // ms
  availableOutgoingBitrate: number; // bps
  availableIncomingBitrate: number; // bps
  
  // Connection info
  connectionType: 'relay' | 'direct' | 'unknown';
  localCandidateType: string;
  remoteCandidateType: string;
}

export interface QualityRating {
  overall: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  video: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'off';
  audio: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'off';
  network: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  score: number; // 0-100
}

export interface QualityIssue {
  type: 'high-latency' | 'packet-loss' | 'low-bandwidth' | 'high-jitter' | 'no-video' | 'no-audio';
  severity: 'warning' | 'critical';
  message: string;
  suggestion: string;
  detectedAt: Date;
}

export interface ParticipantQuality {
  userId: number;
  userName?: string;
  rating: QualityRating;
  issues: QualityIssue[];
  lastUpdate: Date;
  history: { timestamp: Date; score: number }[];
}

@Injectable()
export class ConnectionQualityService {
  // In-memory storage
  private sessionStats: Map<number, Map<number, ConnectionStats[]>> = new Map(); // sessionId -> userId -> stats history
  private qualityCache: Map<string, ParticipantQuality> = new Map(); // `${sessionId}-${userId}` -> quality
  
  // Thresholds for quality rating
  private readonly THRESHOLDS = {
    latency: { excellent: 50, good: 100, fair: 200, poor: 500 },
    jitter: { excellent: 10, good: 30, fair: 50, poor: 100 },
    packetLoss: { excellent: 0.5, good: 1, fair: 3, poor: 5 }, // percentage
    bandwidth: { excellent: 2000000, good: 1000000, fair: 500000, poor: 200000 }, // bps
  };

  /**
   * Nhận stats từ client
   */
  reportStats(sessionId: number, userId: number, stats: Partial<ConnectionStats>): void {
    if (!this.sessionStats.has(sessionId)) {
      this.sessionStats.set(sessionId, new Map());
    }
    
    const sessionMap = this.sessionStats.get(sessionId)!;
    if (!sessionMap.has(userId)) {
      sessionMap.set(userId, []);
    }

    const fullStats: ConnectionStats = {
      userId,
      timestamp: new Date(),
      videoBytesSent: stats.videoBytesSent || 0,
      videoBytesReceived: stats.videoBytesReceived || 0,
      videoPacketsSent: stats.videoPacketsSent || 0,
      videoPacketsReceived: stats.videoPacketsReceived || 0,
      videoPacketsLost: stats.videoPacketsLost || 0,
      videoFrameRate: stats.videoFrameRate || 0,
      videoResolution: stats.videoResolution || { width: 0, height: 0 },
      audioBytesSent: stats.audioBytesSent || 0,
      audioBytesReceived: stats.audioBytesReceived || 0,
      audioPacketsSent: stats.audioPacketsSent || 0,
      audioPacketsReceived: stats.audioPacketsReceived || 0,
      audioPacketsLost: stats.audioPacketsLost || 0,
      audioLevel: stats.audioLevel || 0,
      roundTripTime: stats.roundTripTime || 0,
      jitter: stats.jitter || 0,
      availableOutgoingBitrate: stats.availableOutgoingBitrate || 0,
      availableIncomingBitrate: stats.availableIncomingBitrate || 0,
      connectionType: stats.connectionType || 'unknown',
      localCandidateType: stats.localCandidateType || 'unknown',
      remoteCandidateType: stats.remoteCandidateType || 'unknown',
    };

    const history = sessionMap.get(userId)!;
    history.push(fullStats);
    
    // Keep only last 60 entries (1 minute at 1/sec reporting)
    if (history.length > 60) {
      history.shift();
    }

    // Update quality cache
    this.updateQualityRating(sessionId, userId, fullStats);
  }

  /**
   * Update quality rating based on stats
   */
  private updateQualityRating(sessionId: number, userId: number, stats: ConnectionStats): void {
    const cacheKey = `${sessionId}-${userId}`;
    const existing = this.qualityCache.get(cacheKey);

    // Calculate scores
    const latencyScore = this.calculateScore(stats.roundTripTime, this.THRESHOLDS.latency);
    const jitterScore = this.calculateScore(stats.jitter, this.THRESHOLDS.jitter);
    
    const videoPacketLoss = stats.videoPacketsSent > 0 
      ? (stats.videoPacketsLost / stats.videoPacketsSent) * 100 
      : 0;
    const audioPacketLoss = stats.audioPacketsSent > 0 
      ? (stats.audioPacketsLost / stats.audioPacketsSent) * 100 
      : 0;
    const packetLossScore = this.calculateScore(
      Math.max(videoPacketLoss, audioPacketLoss), 
      this.THRESHOLDS.packetLoss
    );
    
    const bandwidthScore = this.calculateBandwidthScore(stats.availableOutgoingBitrate);

    // Overall score (weighted average)
    const overallScore = Math.round(
      latencyScore * 0.25 +
      jitterScore * 0.2 +
      packetLossScore * 0.35 +
      bandwidthScore * 0.2
    );

    // Detect issues
    const issues: QualityIssue[] = [];
    
    if (stats.roundTripTime > this.THRESHOLDS.latency.poor) {
      issues.push({
        type: 'high-latency',
        severity: 'critical',
        message: `Độ trễ cao: ${stats.roundTripTime}ms`,
        suggestion: 'Kiểm tra kết nối mạng, thử chuyển sang WiFi/4G ổn định hơn',
        detectedAt: new Date(),
      });
    } else if (stats.roundTripTime > this.THRESHOLDS.latency.fair) {
      issues.push({
        type: 'high-latency',
        severity: 'warning',
        message: `Độ trễ cao: ${stats.roundTripTime}ms`,
        suggestion: 'Đóng các ứng dụng sử dụng mạng khác',
        detectedAt: new Date(),
      });
    }

    if (Math.max(videoPacketLoss, audioPacketLoss) > this.THRESHOLDS.packetLoss.poor) {
      issues.push({
        type: 'packet-loss',
        severity: 'critical',
        message: `Mất gói tin: ${Math.round(Math.max(videoPacketLoss, audioPacketLoss))}%`,
        suggestion: 'Mạng không ổn định. Thử tắt camera để cải thiện',
        detectedAt: new Date(),
      });
    }

    if (stats.availableOutgoingBitrate < this.THRESHOLDS.bandwidth.poor) {
      issues.push({
        type: 'low-bandwidth',
        severity: 'critical',
        message: 'Băng thông thấp',
        suggestion: 'Tắt camera hoặc giảm chất lượng video',
        detectedAt: new Date(),
      });
    }

    if (stats.videoFrameRate < 10 && stats.videoPacketsSent > 0) {
      issues.push({
        type: 'no-video',
        severity: 'warning',
        message: 'Frame rate thấp',
        suggestion: 'Camera có thể đang bị ứng dụng khác sử dụng',
        detectedAt: new Date(),
      });
    }

    const quality: ParticipantQuality = {
      userId,
      rating: {
        overall: this.scoreToRating(overallScore),
        video: stats.videoPacketsSent > 0 ? this.scoreToRating(bandwidthScore) : 'off',
        audio: stats.audioPacketsSent > 0 ? this.scoreToRating(100 - audioPacketLoss * 10) : 'off',
        network: this.scoreToRating((latencyScore + jitterScore) / 2),
        score: overallScore,
      },
      issues,
      lastUpdate: new Date(),
      history: existing?.history || [],
    };

    // Add to history
    quality.history.push({ timestamp: new Date(), score: overallScore });
    if (quality.history.length > 60) {
      quality.history.shift();
    }

    this.qualityCache.set(cacheKey, quality);
  }

  /**
   * Calculate score from value using thresholds (lower is better)
   */
  private calculateScore(value: number, thresholds: { excellent: number; good: number; fair: number; poor: number }): number {
    if (value <= thresholds.excellent) return 100;
    if (value <= thresholds.good) return 80;
    if (value <= thresholds.fair) return 60;
    if (value <= thresholds.poor) return 40;
    return 20;
  }

  /**
   * Calculate bandwidth score (higher is better)
   */
  private calculateBandwidthScore(bandwidth: number): number {
    const t = this.THRESHOLDS.bandwidth;
    if (bandwidth >= t.excellent) return 100;
    if (bandwidth >= t.good) return 80;
    if (bandwidth >= t.fair) return 60;
    if (bandwidth >= t.poor) return 40;
    return 20;
  }

  /**
   * Convert score to rating
   */
  private scoreToRating(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 30) return 'poor';
    return 'critical';
  }

  /**
   * Get quality for a participant
   */
  getParticipantQuality(sessionId: number, userId: number): ParticipantQuality | null {
    return this.qualityCache.get(`${sessionId}-${userId}`) || null;
  }

  /**
   * Get all participants quality for a session
   */
  getSessionQuality(sessionId: number): {
    participants: ParticipantQuality[];
    participantCount: number;
    averageScore: number;
    criticalIssues: number;
    warnings: number;
    worstParticipant?: ParticipantQuality;
  } | null {
    const participants: ParticipantQuality[] = [];
    let totalScore = 0;
    let criticalIssues = 0;
    let warnings = 0;
    let worstParticipant: ParticipantQuality | undefined;
    let worstScore = 101;

    this.qualityCache.forEach((quality, key) => {
      if (key.startsWith(`${sessionId}-`)) {
        participants.push(quality);
        totalScore += quality.rating.score;
        quality.issues.forEach(issue => {
          if (issue.severity === 'critical') criticalIssues++;
          else warnings++;
        });
        
        if (quality.rating.score < worstScore) {
          worstScore = quality.rating.score;
          worstParticipant = quality;
        }
      }
    });

    if (participants.length === 0) {
      return null;
    }

    return {
      participants,
      participantCount: participants.length,
      averageScore: participants.length > 0 ? Math.round(totalScore / participants.length) : 0,
      criticalIssues,
      warnings,
      worstParticipant,
    };
  }

  /**
   * Get network recommendations for a participant
   */
  getRecommendations(sessionId: number, userId: number): string[] {
    const quality = this.getParticipantQuality(sessionId, userId);
    
    if (!quality) {
      return [];
    }

    const messages: string[] = [];

    if (quality.rating.score < 30) {
      messages.push('Nên tắt camera để cải thiện chất lượng');
    } else if (quality.rating.score < 50) {
      messages.push('Nên giảm chất lượng video');
    }

    quality.issues.forEach(issue => {
      messages.push(issue.suggestion);
    });

    return [...new Set(messages)]; // Remove duplicates
  }

  /**
   * Get detailed recommendations for a participant
   */
  getDetailedRecommendations(sessionId: number, userId: number): {
    shouldDisableVideo: boolean;
    shouldReduceQuality: boolean;
    suggestedResolution: { width: number; height: number };
    suggestedBitrate: number;
    messages: string[];
  } {
    const quality = this.getParticipantQuality(sessionId, userId);
    
    if (!quality) {
      return {
        shouldDisableVideo: false,
        shouldReduceQuality: false,
        suggestedResolution: { width: 1280, height: 720 },
        suggestedBitrate: 1500000,
        messages: [],
      };
    }

    const messages: string[] = [];
    let shouldDisableVideo = false;
    let shouldReduceQuality = false;
    let suggestedResolution = { width: 1280, height: 720 };
    let suggestedBitrate = 1500000;

    if (quality.rating.score < 30) {
      shouldDisableVideo = true;
      messages.push('Nên tắt camera để cải thiện chất lượng');
    } else if (quality.rating.score < 50) {
      shouldReduceQuality = true;
      suggestedResolution = { width: 640, height: 360 };
      suggestedBitrate = 500000;
      messages.push('Nên giảm chất lượng video');
    } else if (quality.rating.score < 70) {
      suggestedResolution = { width: 854, height: 480 };
      suggestedBitrate = 800000;
    }

    quality.issues.forEach(issue => {
      messages.push(issue.suggestion);
    });

    return {
      shouldDisableVideo,
      shouldReduceQuality,
      suggestedResolution,
      suggestedBitrate,
      messages: [...new Set(messages)], // Remove duplicates
    };
  }

  /**
   * Clear session stats (alias for cleanupSession for tests)
   */
  clearSessionStats(sessionId: number): void {
    this.cleanupSession(sessionId);
  }

  /**
   * Get connection stats history
   */
  getStatsHistory(sessionId: number, userId: number): ConnectionStats[] {
    const sessionMap = this.sessionStats.get(sessionId);
    if (sessionMap) {
      return sessionMap.get(userId) || [];
    }
    return [];
  }

  /**
   * Clean up session data
   */
  cleanupSession(sessionId: number): void {
    this.sessionStats.delete(sessionId);
    
    // Remove from quality cache
    const keysToDelete: string[] = [];
    this.qualityCache.forEach((_, key) => {
      if (key.startsWith(`${sessionId}-`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.qualityCache.delete(key));
  }
}
