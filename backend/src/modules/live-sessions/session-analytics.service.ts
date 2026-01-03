import { Injectable } from '@nestjs/common';

/**
 * SESSION ANALYTICS SERVICE
 * =========================
 * Tính năng đặc biệt: Phân tích chi tiết về session
 * Thu thập và phân tích dữ liệu real-time về participation, engagement
 * 
 * Network Concepts:
 * - Event-driven data collection qua WebSocket
 * - Real-time aggregation
 * - Time-series data cho attendance tracking
 */

export interface ParticipantEvent {
  userId: number;
  username: string;
  eventType: 'join' | 'leave' | 'camera-on' | 'camera-off' | 'mic-on' | 'mic-off' | 
             'screen-share-start' | 'screen-share-stop' | 'hand-raise' | 'chat-message' |
             'reaction' | 'poll-vote' | 'breakout-join' | 'connection-issue';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SessionTimeline {
  sessionId: number;
  startTime: Date;
  endTime?: Date;
  events: ParticipantEvent[];
}

export interface ParticipantSummary {
  userId: number;
  username: string;
  totalTimeMinutes: number;
  joinCount: number;
  firstJoin: Date;
  lastLeave?: Date;
  cameraOnMinutes: number;
  micOnMinutes: number;
  chatMessageCount: number;
  handRaiseCount: number;
  pollVoteCount: number;
  engagementScore: number; // 0-100
  connectionIssues: number;
}

export interface SessionSummary {
  sessionId: number;
  hostId: number;
  title: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes: number;
  peakParticipants: number;
  averageParticipants: number;
  totalUniqueParticipants: number;
  averageEngagementScore: number;
  totalChatMessages: number;
  totalPollsCreated: number;
  totalHandRaises: number;
  breakoutRoomsUsed: boolean;
  screenShareMinutes: number;
}

@Injectable()
export class SessionAnalyticsService {
  // In-memory storage (migrate sang database cho production)
  private sessions: Map<number, SessionTimeline> = new Map();
  private participantStates: Map<string, {
    cameraOn: boolean;
    micOn: boolean;
    lastStateChange: Date;
    cameraOnTime: number;
    micOnTime: number;
  }> = new Map();

  /**
   * Bắt đầu tracking session mới
   */
  startTracking(sessionId: number): void {
    this.sessions.set(sessionId, {
      sessionId,
      startTime: new Date(),
      events: [],
    });
  }

  /**
   * Ghi nhận event
   */
  recordEvent(
    sessionId: number,
    userId: number,
    username: string,
    eventType: ParticipantEvent['eventType'],
    metadata?: Record<string, any>,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const event: ParticipantEvent = {
      userId,
      username,
      eventType,
      timestamp: new Date(),
      metadata,
    };
    session.events.push(event);

    // Update participant state cho camera/mic tracking
    const stateKey = `${sessionId}-${userId}`;
    const state = this.participantStates.get(stateKey) || {
      cameraOn: false,
      micOn: false,
      lastStateChange: new Date(),
      cameraOnTime: 0,
      micOnTime: 0,
    };

    const now = new Date();
    const elapsed = (now.getTime() - state.lastStateChange.getTime()) / 60000; // minutes

    switch (eventType) {
      case 'camera-on':
        state.cameraOn = true;
        state.lastStateChange = now;
        break;
      case 'camera-off':
        if (state.cameraOn) {
          state.cameraOnTime += elapsed;
        }
        state.cameraOn = false;
        state.lastStateChange = now;
        break;
      case 'mic-on':
        state.micOn = true;
        state.lastStateChange = now;
        break;
      case 'mic-off':
        if (state.micOn) {
          state.micOnTime += elapsed;
        }
        state.micOn = false;
        state.lastStateChange = now;
        break;
    }

    this.participantStates.set(stateKey, state);
  }

  /**
   * Kết thúc tracking session
   */
  stopTracking(sessionId: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = new Date();
    }
  }

  /**
   * Lấy timeline của session
   */
  getTimeline(sessionId: number): SessionTimeline | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Lấy thống kê real-time
   */
  getRealTimeStats(sessionId: number): {
    currentParticipants: number;
    participantList: { userId: number; username: string; cameraOn: boolean; micOn: boolean }[];
    recentEvents: ParticipantEvent[];
    chatMessagesLast5Min: number;
    handsRaised: number;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Find current participants (joined but not left, or last event was join)
    const participantStatus = new Map<number, { username: string; online: boolean }>();
    session.events.forEach(event => {
      if (event.eventType === 'join') {
        participantStatus.set(event.userId, { username: event.username, online: true });
      } else if (event.eventType === 'leave') {
        participantStatus.set(event.userId, { username: event.username, online: false });
      }
    });

    const currentParticipants: { userId: number; username: string; cameraOn: boolean; micOn: boolean }[] = [];
    participantStatus.forEach((status, userId) => {
      if (status.online) {
        const stateKey = `${sessionId}-${userId}`;
        const state = this.participantStates.get(stateKey);
        currentParticipants.push({
          userId: userId,
          username: status.username,
          cameraOn: state?.cameraOn || false,
          micOn: state?.micOn || false,
        });
      }
    });

    const recentEvents = session.events
      .filter(e => e.timestamp >= fiveMinutesAgo)
      .slice(-20);

    const chatMessagesLast5Min = session.events.filter(
      e => e.eventType === 'chat-message' && e.timestamp >= fiveMinutesAgo
    ).length;

    const handsRaised = session.events.filter(
      e => e.eventType === 'hand-raise' && e.timestamp >= fiveMinutesAgo
    ).length;

    return {
      currentParticipants: currentParticipants.length,
      participantList: currentParticipants,
      recentEvents,
      chatMessagesLast5Min,
      handsRaised,
    };
  }

  /**
   * Lấy summary cho từng participant
   */
  getParticipantSummary(sessionId: number, userId: number): ParticipantSummary | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const userEvents = session.events.filter(e => e.userId === userId);
    if (userEvents.length === 0) return null;

    const username = userEvents[0].username;
    const joinEvents = userEvents.filter(e => e.eventType === 'join');
    const leaveEvents = userEvents.filter(e => e.eventType === 'leave');

    // Calculate total time
    let totalTimeMinutes = 0;
    for (let i = 0; i < joinEvents.length; i++) {
      const joinTime = joinEvents[i].timestamp;
      const leaveTime = leaveEvents[i]?.timestamp || session.endTime || new Date();
      totalTimeMinutes += (leaveTime.getTime() - joinTime.getTime()) / 60000;
    }

    // Get camera/mic time from state
    const stateKey = `${sessionId}-${userId}`;
    const state = this.participantStates.get(stateKey);

    // Count events
    const chatMessageCount = userEvents.filter(e => e.eventType === 'chat-message').length;
    const handRaiseCount = userEvents.filter(e => e.eventType === 'hand-raise').length;
    const pollVoteCount = userEvents.filter(e => e.eventType === 'poll-vote').length;
    const connectionIssues = userEvents.filter(e => e.eventType === 'connection-issue').length;

    // Calculate engagement score (0-100)
    const engagementScore = this.calculateEngagementScore({
      totalTimeMinutes,
      sessionDurationMinutes: session.endTime 
        ? (session.endTime.getTime() - session.startTime.getTime()) / 60000
        : (new Date().getTime() - session.startTime.getTime()) / 60000,
      cameraOnMinutes: state?.cameraOnTime || 0,
      micOnMinutes: state?.micOnTime || 0,
      chatMessageCount,
      handRaiseCount,
      pollVoteCount,
    });

    return {
      userId,
      username,
      totalTimeMinutes: Math.round(totalTimeMinutes * 10) / 10,
      joinCount: joinEvents.length,
      firstJoin: joinEvents[0]?.timestamp,
      lastLeave: leaveEvents[leaveEvents.length - 1]?.timestamp,
      cameraOnMinutes: Math.round((state?.cameraOnTime || 0) * 10) / 10,
      micOnMinutes: Math.round((state?.micOnTime || 0) * 10) / 10,
      chatMessageCount,
      handRaiseCount,
      pollVoteCount,
      engagementScore,
      connectionIssues,
    };
  }

  /**
   * Lấy session summary
   */
  getSessionSummary(sessionId: number): SessionSummary | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const endTime = session.endTime || new Date();
    const durationMinutes = (endTime.getTime() - session.startTime.getTime()) / 60000;

    // Calculate unique participants
    const uniqueParticipants = new Set(session.events.map(e => e.userId));

    // Calculate peak participants
    let currentCount = 0;
    let peakCount = 0;
    const participantCountTimeline: { time: Date; count: number }[] = [];

    session.events
      .filter(e => e.eventType === 'join' || e.eventType === 'leave')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .forEach(event => {
        if (event.eventType === 'join') currentCount++;
        else currentCount--;
        peakCount = Math.max(peakCount, currentCount);
        participantCountTimeline.push({ time: event.timestamp, count: currentCount });
      });

    // Calculate average participants
    let averageParticipants = 0;
    if (participantCountTimeline.length > 1) {
      let totalParticipantMinutes = 0;
      for (let i = 0; i < participantCountTimeline.length - 1; i++) {
        const duration = (participantCountTimeline[i + 1].time.getTime() - 
                         participantCountTimeline[i].time.getTime()) / 60000;
        totalParticipantMinutes += participantCountTimeline[i].count * duration;
      }
      averageParticipants = durationMinutes > 0 
        ? Math.round((totalParticipantMinutes / durationMinutes) * 10) / 10 
        : 0;
    }

    // Other stats
    const totalChatMessages = session.events.filter(e => e.eventType === 'chat-message').length;
    const totalHandRaises = session.events.filter(e => e.eventType === 'hand-raise').length;
    const breakoutRoomsUsed = session.events.some(e => e.eventType === 'breakout-join');
    
    // Screen share time
    let screenShareMinutes = 0;
    const screenEvents = session.events.filter(
      e => e.eventType === 'screen-share-start' || e.eventType === 'screen-share-stop'
    ).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    for (let i = 0; i < screenEvents.length; i += 2) {
      if (screenEvents[i]?.eventType === 'screen-share-start') {
        const stopEvent = screenEvents[i + 1];
        const stopTime = stopEvent?.timestamp || endTime;
        screenShareMinutes += (stopTime.getTime() - screenEvents[i].timestamp.getTime()) / 60000;
      }
    }

    // Calculate average engagement
    let totalEngagement = 0;
    let participantCount = 0;
    uniqueParticipants.forEach(userId => {
      const summary = this.getParticipantSummary(sessionId, userId);
      if (summary) {
        totalEngagement += summary.engagementScore;
        participantCount++;
      }
    });

    return {
      sessionId,
      hostId: session.events[0]?.userId || 0,
      title: '', // Would need to fetch from session entity
      startTime: session.startTime,
      endTime: session.endTime,
      durationMinutes: Math.round(durationMinutes * 10) / 10,
      peakParticipants: peakCount,
      averageParticipants,
      totalUniqueParticipants: uniqueParticipants.size,
      averageEngagementScore: participantCount > 0 
        ? Math.round(totalEngagement / participantCount) 
        : 0,
      totalChatMessages,
      totalPollsCreated: 0, // Would integrate with polls service
      totalHandRaises,
      breakoutRoomsUsed,
      screenShareMinutes: Math.round(screenShareMinutes * 10) / 10,
    };
  }

  /**
   * Tính engagement score
   */
  private calculateEngagementScore(data: {
    totalTimeMinutes: number;
    sessionDurationMinutes: number;
    cameraOnMinutes: number;
    micOnMinutes: number;
    chatMessageCount: number;
    handRaiseCount: number;
    pollVoteCount: number;
  }): number {
    let score = 0;

    // Attendance score (max 40 points)
    const attendanceRatio = data.sessionDurationMinutes > 0 
      ? data.totalTimeMinutes / data.sessionDurationMinutes 
      : 0;
    score += Math.min(40, attendanceRatio * 40);

    // Camera engagement (max 15 points)
    const cameraRatio = data.totalTimeMinutes > 0 
      ? data.cameraOnMinutes / data.totalTimeMinutes 
      : 0;
    score += Math.min(15, cameraRatio * 15);

    // Mic engagement (max 15 points)
    const micRatio = data.totalTimeMinutes > 0 
      ? data.micOnMinutes / data.totalTimeMinutes 
      : 0;
    score += Math.min(15, micRatio * 15);

    // Interaction score (max 30 points)
    const chatScore = Math.min(10, data.chatMessageCount * 2);
    const handRaiseScore = Math.min(10, data.handRaiseCount * 5);
    const pollScore = Math.min(10, data.pollVoteCount * 5);
    score += chatScore + handRaiseScore + pollScore;

    return Math.round(Math.min(100, score));
  }

  /**
   * Export analytics data
   */
  exportAnalytics(sessionId: number): {
    session: SessionSummary | null;
    participants: ParticipantSummary[];
    timeline: SessionTimeline | null;
    exportedAt: Date;
  } {
    const session = this.getSessionSummary(sessionId);
    const timeline = this.getTimeline(sessionId);
    
    const participants: ParticipantSummary[] = [];
    if (timeline) {
      const uniqueUserIds = new Set(timeline.events.map(e => e.userId));
      uniqueUserIds.forEach(userId => {
        const summary = this.getParticipantSummary(sessionId, userId);
        if (summary) participants.push(summary);
      });
    }

    return {
      session,
      participants,
      timeline,
      exportedAt: new Date(),
    };
  }

  /**
   * Lấy attendance report cho class
   */
  getAttendanceReport(sessionIds: number[]): {
    sessions: { sessionId: number; date: Date; attendees: number }[];
    userAttendance: Map<number, { sessionsAttended: number; totalSessions: number; rate: number }>;
  } {
    const sessions: { sessionId: number; date: Date; attendees: number }[] = [];
    const userAttendanceMap = new Map<number, Set<number>>(); // userId -> sessionIds attended

    sessionIds.forEach(sessionId => {
      const session = this.sessions.get(sessionId);
      if (session) {
        const uniqueUsers = new Set(session.events.map(e => e.userId));
        sessions.push({
          sessionId,
          date: session.startTime,
          attendees: uniqueUsers.size,
        });

        uniqueUsers.forEach(userId => {
          if (!userAttendanceMap.has(userId)) {
            userAttendanceMap.set(userId, new Set());
          }
          userAttendanceMap.get(userId)!.add(sessionId);
        });
      }
    });

    const userAttendance = new Map<number, { sessionsAttended: number; totalSessions: number; rate: number }>();
    userAttendanceMap.forEach((attended, userId) => {
      userAttendance.set(userId, {
        sessionsAttended: attended.size,
        totalSessions: sessionIds.length,
        rate: Math.round((attended.size / sessionIds.length) * 100),
      });
    });

    return { sessions, userAttendance };
  }

  /**
   * Clean up old data (for memory management)
   */
  cleanup(olderThanDays: number): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let cleaned = 0;
    this.sessions.forEach((session, sessionId) => {
      if (session.endTime && session.endTime < cutoff) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    });

    return cleaned;
  }
}
