import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RecordingService, RecordingInfo, RecordingSettings } from './recording.service';

describe('RecordingService', () => {
  let service: RecordingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecordingService],
    }).compile();

    service = module.get<RecordingService>(RecordingService);
  });

  afterEach(() => {
    // Clean up any active recordings
    jest.clearAllMocks();
  });

  describe('startRecording', () => {
    it('should start a recording for a session', () => {
      const sessionId = 1;
      const hostId = 100;

      const recording = service.startRecording(sessionId, hostId);

      expect(recording).toBeDefined();
      expect(recording.id).toMatch(/^rec-1-\d+$/);
      expect(recording.sessionId).toBe(sessionId);
      expect(recording.recordedBy).toBe(hostId);
      expect(recording.status).toBe('recording');
      expect(recording.hasVideo).toBe(true);
      expect(recording.hasAudio).toBe(true);
      expect(recording.startedAt).toBeInstanceOf(Date);
    });

    it('should apply custom settings when provided', () => {
      const sessionId = 2;
      const hostId = 100;
      const settings: Partial<RecordingSettings> = {
        quality: 'low',
        format: 'mp4',
        includeChat: false,
      };

      const recording = service.startRecording(sessionId, hostId, settings);

      expect(recording).toBeDefined();
      expect(recording.status).toBe('recording');
    });

    it('should throw error if session is already being recorded', () => {
      const sessionId = 3;
      const hostId = 100;

      // Start first recording
      service.startRecording(sessionId, hostId);

      // Try to start another
      expect(() => {
        service.startRecording(sessionId, hostId);
      }).toThrow(BadRequestException);
    });
  });

  describe('stopRecording', () => {
    it('should stop an active recording', () => {
      const sessionId = 10;
      const hostId = 100;

      service.startRecording(sessionId, hostId);
      const stopped = service.stopRecording(sessionId);

      expect(stopped).toBeDefined();
      expect(stopped!.status).toBe('processing');
      expect(stopped!.endedAt).toBeInstanceOf(Date);
    });

    it('should return null if no active recording exists', () => {
      const result = service.stopRecording(999);
      expect(result).toBeNull();
    });

    it('should calculate duration when stopping', () => {
      const sessionId = 11;
      const hostId = 100;

      service.startRecording(sessionId, hostId);
      
      // Simulate some time passing
      const stopped = service.stopRecording(sessionId);

      expect(stopped).toBeDefined();
      expect(stopped!.durationSeconds).toBeDefined();
      expect(stopped!.durationSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('pauseRecording', () => {
    it('should pause an active recording', () => {
      const sessionId = 20;
      const hostId = 100;

      service.startRecording(sessionId, hostId);
      const paused = service.pauseRecording(sessionId);

      expect(paused).toBe(true);
    });

    it('should return false if no active recording exists', () => {
      const result = service.pauseRecording(999);
      expect(result).toBe(false);
    });
  });

  describe('resumeRecording', () => {
    it('should resume a paused recording', () => {
      const sessionId = 25;
      const hostId = 100;

      service.startRecording(sessionId, hostId);
      service.pauseRecording(sessionId);
      const resumed = service.resumeRecording(sessionId);

      expect(resumed).toBe(true);
    });

    it('should return false if no paused recording exists', () => {
      const result = service.resumeRecording(999);
      expect(result).toBe(false);
    });
  });

  describe('getRecordingStatus', () => {
    it('should return status of active recording', () => {
      const sessionId = 30;
      const hostId = 100;

      service.startRecording(sessionId, hostId);
      const status = service.getRecordingStatus(sessionId);

      expect(status).toBeDefined();
      expect(status!.isRecording).toBe(true);
      expect(status!.recordingId).toMatch(/^rec-30-\d+$/);
    });

    it('should return null if no recording exists', () => {
      const status = service.getRecordingStatus(999);
      expect(status).toBeNull();
    });
  });

  describe('getSessionRecordings', () => {
    it('should return all recordings for a session', () => {
      const sessionId = 40;
      const hostId = 100;

      // Create and stop a recording
      service.startRecording(sessionId, hostId);
      service.stopRecording(sessionId);

      const recordings = service.getSessionRecordings(sessionId);

      expect(recordings).toBeInstanceOf(Array);
      expect(recordings.length).toBe(1);
      expect(recordings[0].sessionId).toBe(sessionId);
    });

    it('should return empty array for session with no recordings', () => {
      const recordings = service.getSessionRecordings(999);
      expect(recordings).toEqual([]);
    });
  });

  describe('addParticipant', () => {
    it('should add participant to active recording', () => {
      const sessionId = 50;
      const hostId = 100;
      const participantId = 200;

      service.startRecording(sessionId, hostId);
      service.addParticipant(sessionId, participantId);

      const status = service.getRecordingStatus(sessionId);
      expect(status!.participants).toContain(participantId);
    });

    it('should not add duplicate participants', () => {
      const sessionId = 51;
      const hostId = 100;
      const participantId = 200;

      service.startRecording(sessionId, hostId);
      service.addParticipant(sessionId, participantId);
      service.addParticipant(sessionId, participantId);

      const status = service.getRecordingStatus(sessionId);
      const count = status!.participants.filter(p => p === participantId).length;
      expect(count).toBe(1);
    });
  });

  describe('updateScreenShareStatus', () => {
    it('should update screen share status in recording', () => {
      const sessionId = 60;
      const hostId = 100;

      service.startRecording(sessionId, hostId);
      service.updateScreenShareStatus(sessionId, true);

      const status = service.getRecordingStatus(sessionId);
      expect(status!.hasScreenShare).toBe(true);
    });
  });

  describe('getRecordingById', () => {
    it('should return recording by ID', () => {
      const sessionId = 70;
      const hostId = 100;

      const recording = service.startRecording(sessionId, hostId);
      const found = service.getRecordingById(recording.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(recording.id);
    });

    it('should return null for non-existent recording', () => {
      const found = service.getRecordingById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('deleteRecording', () => {
    it('should delete a recording by ID', () => {
      const sessionId = 80;
      const hostId = 100;

      const recording = service.startRecording(sessionId, hostId);
      service.stopRecording(sessionId);
      
      const deleted = service.deleteRecording(recording.id);

      expect(deleted).toBe(true);
      expect(service.getRecordingById(recording.id)).toBeNull();
    });

    it('should return false for non-existent recording', () => {
      const deleted = service.deleteRecording('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('multiple recordings per session', () => {
    it('should allow multiple recordings for same session after stopping', () => {
      const sessionId = 90;
      const hostId = 100;

      // First recording
      const rec1 = service.startRecording(sessionId, hostId);
      service.stopRecording(sessionId);

      // Second recording
      const rec2 = service.startRecording(sessionId, hostId);
      service.stopRecording(sessionId);

      const allRecordings = service.getSessionRecordings(sessionId);
      expect(allRecordings.length).toBe(2);
      expect(allRecordings[0].id).toBe(rec1.id);
      expect(allRecordings[1].id).toBe(rec2.id);
    });
  });
});
