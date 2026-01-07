import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * RECORDING SERVICE
 * =================
 * Tính năng đặc biệt: Ghi lại toàn bộ session để xem lại
 * Như Google Meet Recording, Zoom Cloud Recording
 * 
 * Concepts:
 * - Server-side recording coordination
 * - Multi-track recording (video + audio + screen)
 * - Cloud storage integration ready
 */

export interface RecordingInfo {
  id: string;
  sessionId: number;
  startedAt: Date;
  endedAt?: Date;
  status: 'recording' | 'processing' | 'ready' | 'failed';
  durationSeconds?: number;
  fileUrl?: string;
  fileSize?: number;
  recordedBy: number;
  participants: number[];
  hasVideo: boolean;
  hasAudio: boolean;
  hasScreenShare: boolean;
  thumbnailUrl?: string;
}

export interface RecordingChunk {
  id: string;
  recordingId: string;
  chunkIndex: number;
  timestamp: Date;
  data: Buffer; // In production, this would be file path or S3 URL
  mimeType: string;
}

export interface RecordingSettings {
  quality: 'low' | 'medium' | 'high' | 'auto';
  format: 'webm' | 'mp4';
  includeChat: boolean;
  includeWhiteboard: boolean;
  autoStart: boolean;
  maxDurationMinutes: number;
}

@Injectable()
export class RecordingService {
  // In-memory storage (production: use database + cloud storage)
  private recordings: Map<string, RecordingInfo> = new Map();
  private sessionRecordings: Map<number, string[]> = new Map(); // sessionId -> recordingIds
  private activeRecordings: Map<number, string> = new Map(); // sessionId -> active recordingId

  private defaultSettings: RecordingSettings = {
    quality: 'high',
    format: 'webm',
    includeChat: true,
    includeWhiteboard: true,
    autoStart: false,
    maxDurationMinutes: 180, // 3 hours max
  };

  /**
   * Bắt đầu ghi session
   */
  startRecording(
    sessionId: number,
    hostId: number,
    settings?: Partial<RecordingSettings>,
  ): RecordingInfo {
    // Check if already recording
    if (this.activeRecordings.has(sessionId)) {
      throw new BadRequestException('Session is already being recorded');
    }

    const recordingId = `rec-${sessionId}-${Date.now()}`;
    const finalSettings = { ...this.defaultSettings, ...settings };

    const recording: RecordingInfo = {
      id: recordingId,
      sessionId,
      startedAt: new Date(),
      status: 'recording',
      recordedBy: hostId,
      participants: [],
      hasVideo: true,
      hasAudio: true,
      hasScreenShare: false,
    };

    this.recordings.set(recordingId, recording);
    this.activeRecordings.set(sessionId, recordingId);

    // Track recordings per session
    if (!this.sessionRecordings.has(sessionId)) {
      this.sessionRecordings.set(sessionId, []);
    }
    this.sessionRecordings.get(sessionId)!.push(recordingId);

    // Auto-stop after max duration
    if (finalSettings.maxDurationMinutes) {
      setTimeout(() => {
        if (this.activeRecordings.get(sessionId) === recordingId) {
          this.stopRecording(sessionId, hostId);
        }
      }, finalSettings.maxDurationMinutes * 60 * 1000);
    }

    return recording;
  }

  /**
   * Dừng ghi
   */
  stopRecording(sessionId: number, hostId?: number): RecordingInfo | null {
    const recordingId = this.activeRecordings.get(sessionId);
    if (!recordingId) {
      return null;
    }

    const recording = this.recordings.get(recordingId);
    if (!recording) {
      return null;
    }

    // Calculate duration
    recording.endedAt = new Date();
    recording.durationSeconds = Math.round(
      (recording.endedAt.getTime() - recording.startedAt.getTime()) / 1000
    );
    recording.status = 'processing';

    this.activeRecordings.delete(sessionId);

    // Simulate processing (in production: actual video processing)
    setTimeout(() => {
      recording.status = 'ready';
      recording.fileUrl = `/recordings/${recordingId}.webm`;
      recording.thumbnailUrl = `/recordings/${recordingId}-thumb.jpg`;
      recording.fileSize = Math.round(recording.durationSeconds! * 500000); // ~500KB/s estimate
    }, 5000);

    return recording;
  }

  /**
   * Pause/Resume recording
   */
  pauseRecording(sessionId: number): boolean {
    const recordingId = this.activeRecordings.get(sessionId);
    if (!recordingId) {
      return false;
    }
    // In production: implement actual pause logic
    return true;
  }

  resumeRecording(sessionId: number): boolean {
    const recordingId = this.activeRecordings.get(sessionId);
    if (!recordingId) {
      return false;
    }
    return true;
  }

  /**
   * Thêm participant vào recording metadata
   */
  addParticipantToRecording(sessionId: number, userId: number): void {
    const recordingId = this.activeRecordings.get(sessionId);
    if (recordingId) {
      const recording = this.recordings.get(recordingId);
      if (recording && !recording.participants.includes(userId)) {
        recording.participants.push(userId);
      }
    }
  }

  /**
   * Alias for addParticipantToRecording (for test compatibility)
   */
  addParticipant(sessionId: number, userId: number): void {
    this.addParticipantToRecording(sessionId, userId);
  }

  /**
   * Mark screen share in recording
   */
  markScreenShare(sessionId: number, hasScreen: boolean): void {
    const recordingId = this.activeRecordings.get(sessionId);
    if (recordingId) {
      const recording = this.recordings.get(recordingId);
      if (recording) {
        recording.hasScreenShare = hasScreen;
      }
    }
  }

  /**
   * Alias for markScreenShare (for test compatibility)
   */
  updateScreenShareStatus(sessionId: number, hasScreen: boolean): void {
    this.markScreenShare(sessionId, hasScreen);
  }

  /**
   * Check if session is being recorded
   */
  isRecording(sessionId: number): boolean {
    return this.activeRecordings.has(sessionId);
  }

  /**
   * Get active recording info
   */
  getActiveRecording(sessionId: number): RecordingInfo | null {
    const recordingId = this.activeRecordings.get(sessionId);
    if (recordingId) {
      return this.recordings.get(recordingId) || null;
    }
    return null;
  }

  /**
   * Lấy tất cả recordings của session
   */
  getSessionRecordings(sessionId: number): RecordingInfo[] {
    const recordingIds = this.sessionRecordings.get(sessionId) || [];
    return recordingIds
      .map(id => this.recordings.get(id))
      .filter((r): r is RecordingInfo => r !== undefined);
  }

  /**
   * Get recording by ID
   */
  getRecording(recordingId: string): RecordingInfo | null {
    return this.recordings.get(recordingId) || null;
  }

  /**
   * Delete recording with user verification
   */
  deleteRecordingByUser(recordingId: string, userId: number): { success: boolean } {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      throw new BadRequestException('Recording not found');
    }

    if (recording.recordedBy !== userId) {
      throw new BadRequestException('Only the recorder can delete this recording');
    }

    this.recordings.delete(recordingId);
    
    // Remove from session list
    const sessionRecordings = this.sessionRecordings.get(recording.sessionId);
    if (sessionRecordings) {
      const index = sessionRecordings.indexOf(recordingId);
      if (index !== -1) sessionRecordings.splice(index, 1);
    }

    return { success: true };
  }

  /**
   * Get recording status for UI
   */
  getRecordingStatus(sessionId: number): {
    isRecording: boolean;
    recordingId?: string;
    durationSeconds?: number;
    startedAt?: Date;
    participants?: number[];
    hasScreenShare?: boolean;
  } | null {
    const recordingId = this.activeRecordings.get(sessionId);
    if (recordingId) {
      const recording = this.recordings.get(recordingId);
      if (recording) {
        const now = new Date();
        return {
          isRecording: true,
          recordingId,
          durationSeconds: Math.round((now.getTime() - recording.startedAt.getTime()) / 1000),
          startedAt: recording.startedAt,
          participants: recording.participants,
          hasScreenShare: recording.hasScreenShare,
        };
      }
    }
    return null;
  }

  /**
   * Get recording by ID
   */
  getRecordingById(recordingId: string): RecordingInfo | null {
    return this.recordings.get(recordingId) || null;
  }

  /**
   * Delete recording (simple version for tests)
   */
  deleteRecording(recordingId: string): boolean {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      return false;
    }

    this.recordings.delete(recordingId);
    
    // Remove from session list
    const sessionRecordings = this.sessionRecordings.get(recording.sessionId);
    if (sessionRecordings) {
      const index = sessionRecordings.indexOf(recordingId);
      if (index !== -1) sessionRecordings.splice(index, 1);
    }

    return true;
  }

  /**
   * Get storage usage
   */
  getStorageUsage(userId: number): {
    totalRecordings: number;
    totalSizeBytes: number;
    totalDurationSeconds: number;
  } {
    let totalRecordings = 0;
    let totalSizeBytes = 0;
    let totalDurationSeconds = 0;

    this.recordings.forEach(recording => {
      if (recording.recordedBy === userId && recording.status === 'ready') {
        totalRecordings++;
        totalSizeBytes += recording.fileSize || 0;
        totalDurationSeconds += recording.durationSeconds || 0;
      }
    });

    return { totalRecordings, totalSizeBytes, totalDurationSeconds };
  }
}
