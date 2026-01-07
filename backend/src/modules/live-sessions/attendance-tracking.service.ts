import { Injectable } from '@nestjs/common';

/**
 * ATTENDANCE TRACKING SERVICE
 * ===========================
 * Tính năng đặc biệt: Điểm danh tự động cho LMS
 * Hỗ trợ nhiều phương thức điểm danh
 * 
 * Features:
 * - Automatic attendance based on join/leave times
 * - Manual attendance with codes/passwords
 * - Late tracking với grace period
 * - Absence tracking và notifications
 * - Export attendance reports
 */

export interface AttendanceRecord {
  id: string;
  sessionId: number;
  classId: number;
  userId: number;
  userName?: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  joinTime?: Date;
  leaveTime?: Date;
  totalTimeMinutes: number;
  checkInMethod: 'auto' | 'code' | 'manual' | 'face';
  verifiedAt?: Date;
  notes?: string;
  lateByMinutes?: number;
}

export interface AttendanceSession {
  id: string;
  sessionId: number;
  classId: number;
  createdBy: number;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'open' | 'closed';
  settings: AttendanceSettings;
  checkInCode?: string;
  codeExpiresAt?: Date;
  records: Map<number, AttendanceRecord>; // userId -> record
}

export interface AttendanceSettings {
  method: 'auto' | 'code' | 'manual';
  lateThresholdMinutes: number; // After this, marked as late
  absentThresholdMinutes: number; // If total time < this, marked as absent
  requireMinPercentage: number; // Minimum % of session to be marked present
  autoCodeRotation: boolean; // Rotate check-in code periodically
  codeRotationMinutes: number;
  allowSelfCheckIn: boolean;
  allowLateCheckIn: boolean;
  sendAbsenceNotification: boolean;
}

export interface ClassAttendanceReport {
  classId: number;
  className?: string;
  totalSessions: number;
  students: {
    userId: number;
    userName?: string;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    excusedCount: number;
    attendanceRate: number; // percentage
    averageJoinDelay: number; // minutes
    totalTimeMinutes: number;
  }[];
  sessionDetails: {
    sessionId: number;
    date: Date;
    presentCount: number;
    lateCount: number;
    absentCount: number;
  }[];
}

@Injectable()
export class AttendanceTrackingService {
  // In-memory storage
  private attendanceSessions: Map<string, AttendanceSession> = new Map();
  private sessionAttendance: Map<number, string> = new Map(); // sessionId -> attendanceId

  private defaultSettings: AttendanceSettings = {
    method: 'auto',
    lateThresholdMinutes: 10,
    absentThresholdMinutes: 15,
    requireMinPercentage: 70,
    autoCodeRotation: false,
    codeRotationMinutes: 5,
    allowSelfCheckIn: true,
    allowLateCheckIn: true,
    sendAbsenceNotification: true,
  };

  /**
   * Start attendance tracking for a session
   */
  startAttendance(
    sessionId: number,
    classId: number,
    createdBy: number,
    settings?: Partial<AttendanceSettings>,
  ): AttendanceSession {
    const attendanceId = `att-${sessionId}-${Date.now()}`;
    const finalSettings = { ...this.defaultSettings, ...settings };

    const session: AttendanceSession = {
      id: attendanceId,
      sessionId,
      classId,
      createdBy,
      startTime: new Date(),
      status: 'open',
      settings: finalSettings,
      records: new Map(),
    };

    // Generate check-in code if method is 'code'
    if (finalSettings.method === 'code') {
      session.checkInCode = this.generateCheckInCode();
      session.codeExpiresAt = new Date(Date.now() + finalSettings.codeRotationMinutes * 60 * 1000);

      // Setup code rotation if enabled
      if (finalSettings.autoCodeRotation) {
        this.scheduleCodeRotation(attendanceId, finalSettings.codeRotationMinutes);
      }
    }

    this.attendanceSessions.set(attendanceId, session);
    this.sessionAttendance.set(sessionId, attendanceId);

    return session;
  }

  /**
   * Generate random 6-digit check-in code
   */
  private generateCheckInCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Schedule code rotation
   */
  private scheduleCodeRotation(attendanceId: string, intervalMinutes: number): void {
    setInterval(() => {
      const session = this.attendanceSessions.get(attendanceId);
      if (session && session.status === 'open') {
        session.checkInCode = this.generateCheckInCode();
        session.codeExpiresAt = new Date(Date.now() + intervalMinutes * 60 * 1000);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Record user joining (auto check-in)
   */
  recordJoin(sessionId: number, userId: number, userName?: string): AttendanceRecord | null {
    const attendanceId = this.sessionAttendance.get(sessionId);
    if (!attendanceId) return null;

    const session = this.attendanceSessions.get(attendanceId);
    if (!session || session.status !== 'open') return null;

    const now = new Date();
    const minutesSinceStart = (now.getTime() - session.startTime.getTime()) / 60000;

    // Check if already has record
    let record = session.records.get(userId);
    
    if (record) {
      // User rejoining - don't update joinTime, just clear leaveTime
      record.leaveTime = undefined;
      return record;
    }

    // Determine status based on join time
    let status: AttendanceRecord['status'] = 'present';
    let lateByMinutes: number | undefined;

    if (minutesSinceStart > session.settings.lateThresholdMinutes) {
      if (session.settings.allowLateCheckIn) {
        status = 'late';
        lateByMinutes = Math.round(minutesSinceStart);
      } else {
        // Too late, don't record
        return null;
      }
    }

    record = {
      id: `rec-${sessionId}-${userId}`,
      sessionId,
      classId: session.classId,
      userId,
      userName,
      status,
      joinTime: now,
      totalTimeMinutes: 0,
      checkInMethod: session.settings.method === 'code' ? 'code' : 'auto',
      verifiedAt: session.settings.method === 'auto' ? now : undefined,
      lateByMinutes,
    };

    session.records.set(userId, record);
    return record;
  }

  /**
   * Record user leaving
   */
  recordLeave(sessionId: number, userId: number): AttendanceRecord | null {
    const attendanceId = this.sessionAttendance.get(sessionId);
    if (!attendanceId) return null;

    const session = this.attendanceSessions.get(attendanceId);
    if (!session) return null;

    const record = session.records.get(userId);
    if (!record) return null;

    const now = new Date();
    record.leaveTime = now;

    // Calculate total time
    if (record.joinTime) {
      const previousTime = record.totalTimeMinutes || 0;
      const thisSessionTime = (now.getTime() - record.joinTime.getTime()) / 60000;
      record.totalTimeMinutes = previousTime + thisSessionTime;
    }

    return record;
  }

  /**
   * Check-in with code
   */
  checkInWithCode(
    sessionId: number,
    userId: number,
    code: string,
    userName?: string,
  ): { success: boolean; error?: string; record?: AttendanceRecord } {
    const attendanceId = this.sessionAttendance.get(sessionId);
    if (!attendanceId) {
      return { success: false, error: 'Không tìm thấy phiên điểm danh' };
    }

    const session = this.attendanceSessions.get(attendanceId);
    if (!session || session.status !== 'open') {
      return { success: false, error: 'Phiên điểm danh đã đóng' };
    }

    if (session.settings.method !== 'code') {
      return { success: false, error: 'Phiên này không sử dụng mã điểm danh' };
    }

    // Verify code
    if (session.checkInCode !== code) {
      return { success: false, error: 'Mã điểm danh không đúng' };
    }

    // Check if code expired
    if (session.codeExpiresAt && new Date() > session.codeExpiresAt) {
      return { success: false, error: 'Mã điểm danh đã hết hạn' };
    }

    // Record attendance
    const record = this.recordJoin(sessionId, userId, userName);
    if (record) {
      record.verifiedAt = new Date();
      record.checkInMethod = 'code';
    }

    return { success: true, record: record || undefined };
  }

  /**
   * Manual check-in by teacher
   */
  manualCheckIn(
    sessionId: number,
    teacherId: number,
    userId: number,
    status: AttendanceRecord['status'],
    notes?: string,
  ): AttendanceRecord | null {
    const attendanceId = this.sessionAttendance.get(sessionId);
    if (!attendanceId) return null;

    const session = this.attendanceSessions.get(attendanceId);
    if (!session) return null;

    // Verify teacher is creator
    if (session.createdBy !== teacherId) return null;

    let record = session.records.get(userId);
    
    if (!record) {
      record = {
        id: `rec-${sessionId}-${userId}`,
        sessionId,
        classId: session.classId,
        userId,
        status,
        totalTimeMinutes: 0,
        checkInMethod: 'manual',
        verifiedAt: new Date(),
        notes,
      };
      session.records.set(userId, record);
    } else {
      record.status = status;
      record.checkInMethod = 'manual';
      record.verifiedAt = new Date();
      if (notes) record.notes = notes;
    }

    return record;
  }

  /**
   * Close attendance session
   */
  closeAttendance(sessionId: number): AttendanceSession | null {
    const attendanceId = this.sessionAttendance.get(sessionId);
    if (!attendanceId) return null;

    const session = this.attendanceSessions.get(attendanceId);
    if (!session) return null;

    session.status = 'closed';
    session.endTime = new Date();

    // Finalize all records - update status based on total time
    const sessionDuration = (session.endTime.getTime() - session.startTime.getTime()) / 60000;
    const minRequiredTime = sessionDuration * (session.settings.requireMinPercentage / 100);

    session.records.forEach(record => {
      // If user is still "joined" (no leaveTime), set leaveTime to now
      if (!record.leaveTime && record.joinTime) {
        record.leaveTime = session.endTime;
        const additionalTime = (session.endTime!.getTime() - record.joinTime.getTime()) / 60000;
        record.totalTimeMinutes = (record.totalTimeMinutes || 0) + additionalTime;
      }

      // Mark as absent if below threshold
      if (record.totalTimeMinutes < session.settings.absentThresholdMinutes) {
        record.status = 'absent';
      } else if (record.totalTimeMinutes < minRequiredTime && record.status === 'present') {
        // Downgrade from present to late if didn't meet minimum
        record.status = 'late';
      }
    });

    return session;
  }

  /**
   * Get current check-in code
   */
  getCurrentCode(sessionId: number): { code: string; expiresAt: Date } | null {
    const attendanceId = this.sessionAttendance.get(sessionId);
    if (!attendanceId) return null;

    const session = this.attendanceSessions.get(attendanceId);
    if (!session || !session.checkInCode || session.status !== 'open') return null;

    return {
      code: session.checkInCode,
      expiresAt: session.codeExpiresAt || new Date(Date.now() + 5 * 60 * 1000),
    };
  }

  /**
   * Get attendance for a session
   */
  getSessionAttendance(sessionId: number): AttendanceRecord[] {
    const attendanceId = this.sessionAttendance.get(sessionId);
    if (!attendanceId) return [];

    const session = this.attendanceSessions.get(attendanceId);
    if (!session) return [];

    return Array.from(session.records.values());
  }

  /**
   * Get attendance summary
   */
  getAttendanceSummary(sessionId: number): {
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    attendanceRate: number;
  } {
    const records = this.getSessionAttendance(sessionId);
    
    let present = 0, late = 0, absent = 0, excused = 0;
    records.forEach(r => {
      switch (r.status) {
        case 'present': present++; break;
        case 'late': late++; break;
        case 'absent': absent++; break;
        case 'excused': excused++; break;
      }
    });

    const total = records.length;
    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return { total, present, late, absent, excused, attendanceRate };
  }

  /**
   * Generate class attendance report
   */
  generateClassReport(classId: number, sessionIds: number[]): ClassAttendanceReport {
    const studentStats = new Map<number, {
      userName?: string;
      presentCount: number;
      lateCount: number;
      absentCount: number;
      excusedCount: number;
      totalJoinDelay: number;
      delayCount: number;
      totalTimeMinutes: number;
    }>();

    const sessionDetails: ClassAttendanceReport['sessionDetails'] = [];

    sessionIds.forEach(sessionId => {
      const records = this.getSessionAttendance(sessionId);
      const attendanceId = this.sessionAttendance.get(sessionId);
      const session = attendanceId ? this.attendanceSessions.get(attendanceId) : null;

      let presentCount = 0, lateCount = 0, absentCount = 0;

      records.forEach(record => {
        // Initialize student stats
        if (!studentStats.has(record.userId)) {
          studentStats.set(record.userId, {
            userName: record.userName,
            presentCount: 0,
            lateCount: 0,
            absentCount: 0,
            excusedCount: 0,
            totalJoinDelay: 0,
            delayCount: 0,
            totalTimeMinutes: 0,
          });
        }

        const stats = studentStats.get(record.userId)!;
        stats.totalTimeMinutes += record.totalTimeMinutes;

        switch (record.status) {
          case 'present':
            stats.presentCount++;
            presentCount++;
            break;
          case 'late':
            stats.lateCount++;
            lateCount++;
            if (record.lateByMinutes) {
              stats.totalJoinDelay += record.lateByMinutes;
              stats.delayCount++;
            }
            break;
          case 'absent':
            stats.absentCount++;
            absentCount++;
            break;
          case 'excused':
            stats.excusedCount++;
            break;
        }
      });

      sessionDetails.push({
        sessionId,
        date: session?.startTime || new Date(),
        presentCount,
        lateCount,
        absentCount,
      });
    });

    // Build final report
    const students = Array.from(studentStats.entries()).map(([userId, stats]) => ({
      userId: userId,
      userName: stats.userName,
      presentCount: stats.presentCount,
      lateCount: stats.lateCount,
      absentCount: stats.absentCount,
      excusedCount: stats.excusedCount,
      attendanceRate: sessionIds.length > 0
        ? Math.round(((stats.presentCount + stats.lateCount) / sessionIds.length) * 100)
        : 0,
      averageJoinDelay: stats.delayCount > 0
        ? Math.round(stats.totalJoinDelay / stats.delayCount)
        : 0,
      totalTimeMinutes: Math.round(stats.totalTimeMinutes),
    }));

    return {
      classId,
      totalSessions: sessionIds.length,
      students,
      sessionDetails,
    };
  }

  /**
   * Export attendance to CSV format
   */
  exportToCSV(sessionId: number): string {
    const records = this.getSessionAttendance(sessionId);
    
    const headers = ['userId', 'userName', 'status', 'joinTime', 'leaveTime', 'totalMinutes', 'method', 'notes'];
    const rows = records.map(r => [
      r.userId,
      r.userName || '',
      r.status,
      r.joinTime?.toISOString() || '',
      r.leaveTime?.toISOString() || '',
      r.totalTimeMinutes.toFixed(1),
      r.checkInMethod,
      r.notes || '',
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Get attendance record for a specific user
   */
  getAttendanceRecord(sessionId: number, userId: number): AttendanceRecord | null {
    const attendanceId = this.sessionAttendance.get(sessionId);
    if (!attendanceId) return null;

    const session = this.attendanceSessions.get(attendanceId);
    if (!session) return null;

    return session.records.get(userId) || null;
  }

  /**
   * Get attendance session
   */
  getAttendanceSession(sessionId: number): AttendanceSession | null {
    const attendanceId = this.sessionAttendance.get(sessionId);
    if (!attendanceId) return null;
    return this.attendanceSessions.get(attendanceId) || null;
  }

  /**
   * Get session records
   */
  getSessionRecords(sessionId: number): AttendanceRecord[] {
    return this.getSessionAttendance(sessionId);
  }

  /**
   * Get check-in code info
   */
  getCheckInCode(sessionId: number): { code: string; expiresAt: Date } | null {
    return this.getCurrentCode(sessionId);
  }

  /**
   * Rotate check-in code
   */
  rotateCode(sessionId: number): string | null {
    const attendanceId = this.sessionAttendance.get(sessionId);
    if (!attendanceId) return null;

    const session = this.attendanceSessions.get(attendanceId);
    if (!session || session.settings.method !== 'code') return null;

    session.checkInCode = this.generateCheckInCode();
    session.codeExpiresAt = new Date(Date.now() + session.settings.codeRotationMinutes * 60 * 1000);

    return session.checkInCode;
  }

  /**
   * Get session summary
   */
  getSessionSummary(sessionId: number): {
    totalRecords: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    excusedCount: number;
    attendanceRate: number;
  } | null {
    const summary = this.getAttendanceSummary(sessionId);
    return {
      totalRecords: summary.total,
      presentCount: summary.present,
      lateCount: summary.late,
      absentCount: summary.absent,
      excusedCount: summary.excused,
      attendanceRate: summary.attendanceRate,
    };
  }

  /**
   * Mark student as absent
   */
  markAbsent(sessionId: number, userId: number, userName: string, teacherId: number): AttendanceRecord | null {
    return this.manualCheckIn(sessionId, teacherId, userId, 'absent');
  }

  /**
   * Update attendance status
   */
  updateStatus(sessionId: number, userId: number, status: AttendanceRecord['status'], notes?: string): AttendanceRecord | null {
    const attendanceId = this.sessionAttendance.get(sessionId);
    if (!attendanceId) return null;

    const session = this.attendanceSessions.get(attendanceId);
    if (!session) return null;

    const record = session.records.get(userId);
    if (!record) return null;

    record.status = status;
    if (notes) record.notes = notes;

    return record;
  }

  /**
   * Record late join with specific minutes
   */
  recordLateJoin(sessionId: number, userId: number, userName: string, lateByMinutes: number): AttendanceRecord | null {
    const attendanceId = this.sessionAttendance.get(sessionId);
    if (!attendanceId) return null;

    const session = this.attendanceSessions.get(attendanceId);
    if (!session || session.status !== 'open') return null;

    const now = new Date();
    const record: AttendanceRecord = {
      id: `rec-${sessionId}-${userId}`,
      sessionId,
      classId: session.classId,
      userId,
      userName,
      status: 'late',
      joinTime: now,
      totalTimeMinutes: 0,
      checkInMethod: 'auto',
      lateByMinutes,
    };

    session.records.set(userId, record);
    return record;
  }

  /**
   * Get class report
   */
  getClassReport(classId: number): ClassAttendanceReport | null {
    // Find all sessions for this class
    const sessionIds: number[] = [];
    this.attendanceSessions.forEach((session) => {
      if (session.classId === classId) {
        sessionIds.push(session.sessionId);
      }
    });

    if (sessionIds.length === 0) return null;

    return this.generateClassReport(classId, sessionIds);
  }

  /**
   * Bulk mark students as absent
   */
  bulkMarkAbsent(
    sessionId: number, 
    students: { userId: number; userName?: string }[], 
    teacherId: number
  ): AttendanceRecord[] {
    const records: AttendanceRecord[] = [];
    
    students.forEach(student => {
      const record = this.manualCheckIn(sessionId, teacherId, student.userId, 'absent');
      if (record) {
        if (student.userName) record.userName = student.userName;
        records.push(record);
      }
    });

    return records;
  }
}
