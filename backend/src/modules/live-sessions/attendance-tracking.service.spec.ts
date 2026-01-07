import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceTrackingService, AttendanceRecord, AttendanceSession, AttendanceSettings } from './attendance-tracking.service';

describe('AttendanceTrackingService', () => {
  let service: AttendanceTrackingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttendanceTrackingService],
    }).compile();

    service = module.get<AttendanceTrackingService>(AttendanceTrackingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startAttendance', () => {
    it('should start attendance tracking for a session', () => {
      const sessionId = 1;
      const classId = 10;
      const createdBy = 100;

      const attendance = service.startAttendance(sessionId, classId, createdBy);

      expect(attendance).toBeDefined();
      expect(attendance.id).toMatch(/^att-1-\d+$/);
      expect(attendance.sessionId).toBe(sessionId);
      expect(attendance.classId).toBe(classId);
      expect(attendance.createdBy).toBe(createdBy);
      expect(attendance.status).toBe('open');
      expect(attendance.startTime).toBeInstanceOf(Date);
    });

    it('should apply custom settings', () => {
      const customSettings: Partial<AttendanceSettings> = {
        method: 'code',
        lateThresholdMinutes: 5,
        autoCodeRotation: true,
      };

      const attendance = service.startAttendance(1, 10, 100, customSettings);

      expect(attendance.settings.method).toBe('code');
      expect(attendance.settings.lateThresholdMinutes).toBe(5);
      expect(attendance.settings.autoCodeRotation).toBe(true);
    });

    it('should generate check-in code for code-based attendance', () => {
      const attendance = service.startAttendance(1, 10, 100, { method: 'code' });

      expect(attendance.checkInCode).toBeDefined();
      expect(attendance.checkInCode).toMatch(/^\d{6}$/); // 6-digit code
      expect(attendance.codeExpiresAt).toBeInstanceOf(Date);
    });

    it('should not generate code for auto method', () => {
      const attendance = service.startAttendance(1, 10, 100, { method: 'auto' });

      expect(attendance.checkInCode).toBeUndefined();
    });
  });

  describe('recordJoin', () => {
    it('should record user joining as present', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);

      const record = service.recordJoin(sessionId, 200, 'Student A');

      expect(record).toBeDefined();
      expect(record!.userId).toBe(200);
      expect(record!.userName).toBe('Student A');
      expect(record!.status).toBe('present');
      expect(record!.checkInMethod).toBe('auto');
      expect(record!.joinTime).toBeInstanceOf(Date);
    });

    it('should return null if attendance not started', () => {
      const record = service.recordJoin(999, 200);
      expect(record).toBeNull();
    });

    it('should not duplicate record for same user', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);

      const record1 = service.recordJoin(sessionId, 200, 'Student A');
      const record2 = service.recordJoin(sessionId, 200, 'Student A');

      expect(record1!.id).toBe(record2!.id);
    });

    it('should handle rejoin (clear leave time)', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);

      service.recordJoin(sessionId, 200, 'Student A');
      service.recordLeave(sessionId, 200);
      const rejoin = service.recordJoin(sessionId, 200, 'Student A');

      expect(rejoin!.leaveTime).toBeUndefined();
    });
  });

  describe('recordLeave', () => {
    it('should record user leaving', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);
      service.recordJoin(sessionId, 200, 'Student A');

      service.recordLeave(sessionId, 200);
      const record = service.getAttendanceRecord(sessionId, 200);

      expect(record).toBeDefined();
      expect(record!.leaveTime).toBeInstanceOf(Date);
    });

    it('should calculate total time on leave', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);
      service.recordJoin(sessionId, 200);

      // Simulate some time passing
      service.recordLeave(sessionId, 200);
      const record = service.getAttendanceRecord(sessionId, 200);

      expect(record!.totalTimeMinutes).toBeDefined();
      expect(record!.totalTimeMinutes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkInWithCode', () => {
    it('should check in user with valid code', () => {
      const sessionId = 1;
      const attendance = service.startAttendance(sessionId, 10, 100, { method: 'code' });
      const code = attendance.checkInCode!;

      const result = service.checkInWithCode(sessionId, 200, code, 'Student A');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.record).toBeDefined();
      expect(result.record!.status).toBe('present');
      expect(result.record!.checkInMethod).toBe('code');
      expect(result.record!.verifiedAt).toBeInstanceOf(Date);
    });

    it('should fail with invalid code', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100, { method: 'code' });

      const result = service.checkInWithCode(sessionId, 200, '000000', 'Student A');

      expect(result.success).toBe(false);
    });

    it('should fail if attendance not code-based', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100, { method: 'auto' });

      const result = service.checkInWithCode(sessionId, 200, '123456', 'Student A');

      expect(result.success).toBe(false);
    });
  });

  describe('manualCheckIn', () => {
    it('should allow manual check-in by instructor', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);

      const record = service.manualCheckIn(sessionId, 100, 200, 'present');

      expect(record).toBeDefined();
      expect(record!.status).toBe('present');
      expect(record!.checkInMethod).toBe('manual');
    });

    it('should allow setting excused status', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);

      const record = service.manualCheckIn(sessionId, 100, 200, 'excused', 'Medical reason');

      expect(record!.status).toBe('excused');
      expect(record!.notes).toBe('Medical reason');
    });
  });

  describe('closeAttendance', () => {
    it('should close attendance session', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);

      const closed = service.closeAttendance(sessionId);

      expect(closed).toBeDefined();
      expect(closed!.status).toBe('closed');
      expect(closed!.endTime).toBeInstanceOf(Date);
    });

    it('should finalize all records on close', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);
      service.recordJoin(sessionId, 200, 'Student A');
      service.recordJoin(sessionId, 201, 'Student B');

      service.closeAttendance(sessionId);

      // All records should have leave time set if still connected
      const record = service.getAttendanceRecord(sessionId, 200);
      expect(record!.leaveTime).toBeDefined();
    });

    it('should return null if attendance not found', () => {
      const closed = service.closeAttendance(999);
      expect(closed).toBeNull();
    });
  });

  describe('getAttendanceSession', () => {
    it('should return attendance session', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);

      const attendance = service.getAttendanceSession(sessionId);

      expect(attendance).toBeDefined();
      expect(attendance!.sessionId).toBe(sessionId);
    });

    it('should return null for non-existent session', () => {
      const attendance = service.getAttendanceSession(999);
      expect(attendance).toBeNull();
    });
  });

  describe('getSessionRecords', () => {
    it('should return all attendance records for session', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);
      service.recordJoin(sessionId, 200, 'Student A');
      service.recordJoin(sessionId, 201, 'Student B');
      service.recordJoin(sessionId, 202, 'Student C');

      const records = service.getSessionRecords(sessionId);

      expect(records.length).toBe(3);
    });

    it('should return empty array for session with no records', () => {
      service.startAttendance(1, 10, 100);
      const records = service.getSessionRecords(1);

      expect(records).toEqual([]);
    });
  });

  describe('getCheckInCode', () => {
    it('should return current check-in code', () => {
      const sessionId = 1;
      const attendance = service.startAttendance(sessionId, 10, 100, { method: 'code' });

      const codeInfo = service.getCheckInCode(sessionId);

      expect(codeInfo).toBeDefined();
      expect(codeInfo!.code).toBe(attendance.checkInCode);
      expect(codeInfo!.expiresAt).toBeInstanceOf(Date);
    });

    it('should return null if not code-based', () => {
      service.startAttendance(1, 10, 100, { method: 'auto' });
      const codeInfo = service.getCheckInCode(1);

      expect(codeInfo).toBeNull();
    });
  });

  describe('rotateCode', () => {
    it('should generate new check-in code', () => {
      const sessionId = 1;
      const attendance = service.startAttendance(sessionId, 10, 100, { method: 'code' });
      const oldCode = attendance.checkInCode;

      service.rotateCode(sessionId);
      const newCodeInfo = service.getCheckInCode(sessionId);

      // New code should be different (with very high probability)
      expect(newCodeInfo!.code).not.toBe(oldCode);
    });
  });

  describe('getSessionSummary', () => {
    it('should return summary statistics', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);
      service.recordJoin(sessionId, 200, 'Student A');
      service.recordJoin(sessionId, 201, 'Student B');
      service.manualCheckIn(sessionId, 100, 202, 'excused');

      const summary = service.getSessionSummary(sessionId);

      expect(summary).toBeDefined();
      expect(summary!.presentCount).toBe(2);
      expect(summary!.excusedCount).toBe(1);
      expect(summary!.absentCount).toBe(0);
      expect(summary!.totalRecords).toBe(3);
    });
  });

  describe('markAbsent', () => {
    it('should mark students as absent', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);

      const record = service.markAbsent(sessionId, 200, 'Absent Student', 100);

      expect(record).toBeDefined();
      expect(record!.status).toBe('absent');
    });
  });

  describe('updateStatus', () => {
    it('should update attendance status', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);
      service.recordJoin(sessionId, 200, 'Student A');

      const updated = service.updateStatus(sessionId, 200, 'late', 'Arrived 15 mins late');

      expect(updated).toBeDefined();
      expect(updated!.status).toBe('late');
      expect(updated!.notes).toBe('Arrived 15 mins late');
    });

    it('should return null if record not found', () => {
      service.startAttendance(1, 10, 100);
      const updated = service.updateStatus(1, 999, 'late');

      expect(updated).toBeNull();
    });
  });

  describe('exportToCSV', () => {
    it('should generate CSV export', () => {
      const sessionId = 1;
      service.startAttendance(sessionId, 10, 100);
      service.recordJoin(sessionId, 200, 'Student A');
      service.recordJoin(sessionId, 201, 'Student B');

      const csv = service.exportToCSV(sessionId);

      expect(csv).toBeDefined();
      expect(csv).toContain('userId');
      expect(csv).toContain('userName');
      expect(csv).toContain('status');
      expect(csv).toContain('Student A');
      expect(csv).toContain('Student B');
    });

    it('should return empty string if no records', () => {
      service.startAttendance(1, 10, 100);
      const csv = service.exportToCSV(1);

      // Should at least have header
      expect(csv).toContain('userId');
    });
  });

  describe('getClassReport', () => {
    it('should generate class attendance report', () => {
      // Session 1
      service.startAttendance(101, 10, 100);
      service.recordJoin(101, 200, 'Student A');
      service.recordJoin(101, 201, 'Student B');
      service.closeAttendance(101);

      // Session 2
      service.startAttendance(102, 10, 100);
      service.recordJoin(102, 200, 'Student A');
      service.manualCheckIn(102, 100, 201, 'excused');
      service.closeAttendance(102);

      const report = service.getClassReport(10);

      expect(report).toBeDefined();
      expect(report!.classId).toBe(10);
      expect(report!.totalSessions).toBe(2);
      expect(report!.students.length).toBeGreaterThan(0);
    });

    it('should calculate attendance rate correctly', () => {
      // Use unique session IDs and class ID to avoid conflict with other tests
      // Session 1 - with low threshold settings to ensure present status
      service.startAttendance(9001, 9000, 100, {
        absentThresholdMinutes: 0,
        requireMinPercentage: 0, // Don't downgrade based on percentage
      });
      service.recordJoin(9001, 9100, 'Student X');
      service.closeAttendance(9001);

      // Session 2
      service.startAttendance(9002, 9000, 100, {
        absentThresholdMinutes: 0,
        requireMinPercentage: 0,
      });
      service.recordJoin(9002, 9100, 'Student X');
      service.closeAttendance(9002);

      const report = service.getClassReport(9000);
      expect(report).toBeDefined();
      expect(report!.totalSessions).toBe(2);
      
      const student = report!.students.find(s => s.userId === 9100);
      expect(student).toBeDefined();
      expect(student!.presentCount).toBe(2);
      expect(student!.attendanceRate).toBe(100);
    });
  });

  describe('late tracking', () => {
    it('should mark late arrivals correctly', async () => {
      const sessionId = 1;
      // Start attendance with short late threshold for testing
      const attendance = service.startAttendance(sessionId, 10, 100, {
        lateThresholdMinutes: 0, // Any join after start is late
      });

      // Join after start (should be late)
      const record = service.recordLateJoin(sessionId, 200, 'Late Student', 5);

      expect(record).toBeDefined();
      expect(record!.status).toBe('late');
      expect(record!.lateByMinutes).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple attendance sessions for same class', () => {
      // Different sessions for same class
      const att1 = service.startAttendance(1, 10, 100);
      service.closeAttendance(1);
      const att2 = service.startAttendance(2, 10, 100);

      expect(att1.id).not.toBe(att2.id);
      expect(att1.classId).toBe(att2.classId);
    });

    it('should handle user joining multiple times', () => {
      service.startAttendance(1, 10, 100);

      // Multiple join/leave cycles
      service.recordJoin(1, 200, 'Student A');
      service.recordLeave(1, 200);
      service.recordJoin(1, 200, 'Student A');
      service.recordLeave(1, 200);
      service.recordJoin(1, 200, 'Student A');

      const records = service.getSessionRecords(1);
      expect(records.length).toBe(1); // Still one record
    });

    it('should not allow check-in after attendance closed', () => {
      service.startAttendance(1, 10, 100);
      service.closeAttendance(1);

      const record = service.recordJoin(1, 200, 'Late Student');
      expect(record).toBeNull();
    });
  });

  describe('bulk operations', () => {
    it('should mark multiple students absent at once', () => {
      service.startAttendance(1, 10, 100);

      const absentStudents = [
        { userId: 200, userName: 'Student A' },
        { userId: 201, userName: 'Student B' },
        { userId: 202, userName: 'Student C' },
      ];

      const records = service.bulkMarkAbsent(1, absentStudents, 100);

      expect(records.length).toBe(3);
      expect(records.every(r => r.status === 'absent')).toBe(true);
    });
  });
});
