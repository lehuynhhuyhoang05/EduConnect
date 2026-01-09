import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { LiveSession, LiveSessionStatus, LiveSessionParticipant, ConnectionQuality } from './entities';
import {
  CreateLiveSessionDto,
  UpdateLiveSessionDto,
  QueryLiveSessionDto,
} from './dto';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { ClassesService } from '@modules/classes/classes.service';
import { FileLoggerService } from '@common/logger/file-logger.service';

@Injectable()
export class LiveSessionsService {
  private readonly logger = new Logger(LiveSessionsService.name);

  constructor(
    @InjectRepository(LiveSession)
    private readonly sessionRepository: Repository<LiveSession>,
    @InjectRepository(LiveSessionParticipant)
    private readonly participantRepository: Repository<LiveSessionParticipant>,
    private readonly classesService: ClassesService,
    private readonly dataSource: DataSource,
    private readonly fileLogger: FileLoggerService,
  ) {}

  /**
   * Sanitize user object
   */
  private sanitizeUser(user: any): any {
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // ===================== SESSION CRUD =====================

  /**
   * Get session by ID (internal use - no user verification)
   */
  async findById(sessionId: number): Promise<LiveSession | null> {
    return this.sessionRepository.findOne({
      where: { id: sessionId },
    });
  }

  /**
   * Create a new live session (Teacher only)
   */
  async createSession(
    classId: number,
    createDto: CreateLiveSessionDto,
    teacher: User,
  ): Promise<LiveSession> {
    // Verify teacher owns the class
    const isTeacher = await this.classesService.isTeacher(classId, teacher.id);
    if (!isTeacher) {
      throw new ForbiddenException('Chỉ giáo viên của lớp mới có thể tạo phiên học');
    }

    // Validate scheduled time
    if (createDto.scheduledAt) {
      const scheduledTime = new Date(createDto.scheduledAt);
      if (scheduledTime <= new Date()) {
        throw new BadRequestException('Thời gian dự kiến phải sau thời điểm hiện tại');
      }
    }

    const session = this.sessionRepository.create({
      classId,
      hostId: teacher.id,
      roomId: uuidv4(),
      title: createDto.title,
      description: createDto.description,
      scheduledAt: createDto.scheduledAt ? new Date(createDto.scheduledAt) : null,
      maxParticipants: createDto.maxParticipants || 20,
      status: createDto.scheduledAt ? LiveSessionStatus.SCHEDULED : LiveSessionStatus.SCHEDULED,
    });

    const saved = await this.sessionRepository.save(session);
    this.logger.log(`Live session created: ${saved.title} (${saved.roomId}) by teacher ${teacher.id}`);
    this.fileLogger.liveSessions('log', 'Session created', {
      sessionId: saved.id,
      roomId: saved.roomId,
      classId,
      hostId: teacher.id,
      title: saved.title,
    });
    return saved;
  }

  /**
   * Get all live sessions with filters
   */
  async findAllSessions(query: QueryLiveSessionDto, user: User) {
    const { classId, status, upcoming, page = 1, limit = 10 } = query;

    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.class', 'class')
      .leftJoinAndSelect('session.host', 'host');

    // Filter by class if provided
    if (classId) {
      const isMember = await this.classesService.isMember(classId, user.id);
      const isTeacher = await this.classesService.isTeacher(classId, user.id);
      if (!isMember && !isTeacher) {
        throw new ForbiddenException('Bạn không phải thành viên của lớp này');
      }
      queryBuilder.andWhere('session.classId = :classId', { classId });
    } else {
      // Only show sessions from user's classes
      queryBuilder
        .innerJoin('class.members', 'member', 'member.userId = :userId', { userId: user.id });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('session.status = :status', { status });
    }

    // Filter upcoming sessions
    if (upcoming) {
      queryBuilder.andWhere('session.scheduledAt > :now', { now: new Date() });
      queryBuilder.andWhere('session.status = :scheduled', { scheduled: LiveSessionStatus.SCHEDULED });
    }

    const [sessions, total] = await queryBuilder
      .select([
        'session.id',
        'session.classId',
        'session.roomId',
        'session.title',
        'session.description',
        'session.status',
        'session.scheduledAt',
        'session.startedAt',
        'session.endedAt',
        'session.maxParticipants',
        'session.currentParticipants',
        'session.durationSeconds',
        'session.createdAt',
        'class.id',
        'class.name',
        'host.id',
        'host.fullName',
      ])
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('session.scheduledAt', 'DESC')
      .addOrderBy('session.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: sessions.map(s => ({
        ...s,
        host: this.sanitizeUser(s.host),
        isLive: s.status === LiveSessionStatus.LIVE,
        canJoin: s.status === LiveSessionStatus.LIVE && s.currentParticipants < s.maxParticipants,
      })),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get session details by ID or roomId
   */
  async findOneSession(idOrRoomId: string, user: User): Promise<any> {
    const isNumeric = /^\d+$/.test(idOrRoomId);

    const session = await this.sessionRepository.findOne({
      where: isNumeric ? { id: parseInt(idOrRoomId) } : { roomId: idOrRoomId },
      relations: ['class', 'host', 'participants', 'participants.user'],
    });

    if (!session) {
      throw new NotFoundException('Phiên học không tồn tại');
    }

    // Verify membership
    const isMember = await this.classesService.isMember(session.classId, user.id);
    const isTeacher = await this.classesService.isTeacher(session.classId, user.id);
    if (!isMember && !isTeacher) {
      throw new ForbiddenException('Bạn không có quyền xem phiên học này');
    }

    // Get active participants
    const activeParticipants = session.participants
      .filter(p => p.isActive)
      .map(p => ({
        id: p.id,
        userId: p.userId,
        user: this.sanitizeUser(p.user),
        joinedAt: p.joinedAt,
        connectionQuality: p.connectionQuality,
      }));

    return {
      ...session,
      host: this.sanitizeUser(session.host),
      participants: activeParticipants,
      isHost: session.hostId === user.id,
      canStart: session.hostId === user.id && session.status === LiveSessionStatus.SCHEDULED,
      canEnd: session.hostId === user.id && session.status === LiveSessionStatus.LIVE,
    };
  }

  /**
   * Start a live session (Host only)
   */
  async startSession(id: number, teacher: User): Promise<LiveSession> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: ['class'],
    });

    if (!session) {
      throw new NotFoundException('Phiên học không tồn tại');
    }

    if (session.hostId !== teacher.id) {
      throw new ForbiddenException('Chỉ host mới có thể bắt đầu phiên học');
    }

    if (session.status === LiveSessionStatus.LIVE) {
      throw new ConflictException('Phiên học đã đang diễn ra');
    }

    if (session.status === LiveSessionStatus.ENDED) {
      throw new BadRequestException('Không thể bắt đầu lại phiên đã kết thúc');
    }

    // Check if there's already a live session in this class
    const existingLive = await this.sessionRepository.findOne({
      where: {
        classId: session.classId,
        status: LiveSessionStatus.LIVE,
      },
    });
    if (existingLive && existingLive.id !== id) {
      throw new ConflictException('Lớp này đang có phiên học khác đang diễn ra');
    }

    session.status = LiveSessionStatus.LIVE;
    session.startedAt = new Date();

    const saved = await this.sessionRepository.save(session);
    this.logger.log(`Live session started: ${session.title} (${session.roomId})`);
    return saved;
  }

  /**
   * End a live session (Host only)
   */
  async endSession(id: number, teacher: User): Promise<LiveSession> {
    this.fileLogger.liveSessions('log', 'endSession called', { sessionId: id, teacherId: teacher.id });

    try {
      const session = await this.sessionRepository.findOne({ where: { id } });

      if (!session) {
        throw new NotFoundException('Phiên học không tồn tại');
      }

      if (session.hostId !== teacher.id) {
        throw new ForbiddenException('Chỉ host mới có thể kết thúc phiên học');
      }

      if (session.status !== LiveSessionStatus.LIVE) {
        throw new BadRequestException('Phiên học chưa bắt đầu hoặc đã kết thúc');
      }

      // Use transaction to update session and kick all participants
      return this.dataSource.transaction(async (manager) => {
        const now = new Date();
        session.status = LiveSessionStatus.ENDED;
        session.endedAt = now;
        
        // Calculate duration safely
        if (session.startedAt) {
          session.durationSeconds = Math.floor(
            (now.getTime() - session.startedAt.getTime()) / 1000
          );
        } else {
          session.durationSeconds = 0;
        }

        // Mark all participants as inactive
        await manager.update(
          LiveSessionParticipant,
          { liveSessionId: id, isActive: true },
          { isActive: false, leftAt: now }
        );

        session.currentParticipants = 0;
        const saved = await manager.save(LiveSession, session);

        this.logger.log(
          `Live session ended: ${session.title} (${session.roomId}), duration: ${session.durationSeconds}s`
        );
        this.fileLogger.liveSessions('log', 'Session ended successfully', { sessionId: id, roomId: session.roomId });
        return saved;
      });
    } catch (error) {
      this.fileLogger.liveSessions('error', 'endSession failed', {
        sessionId: id,
        teacherId: teacher.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Update session details (Host only)
   */
  async updateSession(
    id: number,
    updateDto: UpdateLiveSessionDto,
    teacher: User,
  ): Promise<LiveSession> {
    const session = await this.sessionRepository.findOne({ where: { id } });

    if (!session) {
      throw new NotFoundException('Phiên học không tồn tại');
    }

    if (session.hostId !== teacher.id) {
      throw new ForbiddenException('Chỉ host mới có thể cập nhật phiên học');
    }

    if (session.status === LiveSessionStatus.ENDED) {
      // Only allow updating recording URL for ended sessions
      if (Object.keys(updateDto).some(k => k !== 'recordingUrl')) {
        throw new BadRequestException('Phiên đã kết thúc, chỉ có thể cập nhật recording URL');
      }
    }

    // Validate new scheduled time
    if (updateDto.scheduledAt) {
      const newTime = new Date(updateDto.scheduledAt);
      if (newTime <= new Date()) {
        throw new BadRequestException('Thời gian dự kiến phải sau thời điểm hiện tại');
      }
      session.scheduledAt = newTime;
    }

    Object.assign(session, {
      title: updateDto.title ?? session.title,
      description: updateDto.description ?? session.description,
      maxParticipants: updateDto.maxParticipants ?? session.maxParticipants,
      recordingUrl: updateDto.recordingUrl ?? session.recordingUrl,
    });

    return this.sessionRepository.save(session);
  }

  /**
   * Delete/cancel a session (Host only, only if scheduled)
   */
  async removeSession(id: number, teacher: User): Promise<void> {
    const session = await this.sessionRepository.findOne({ where: { id } });

    if (!session) {
      throw new NotFoundException('Phiên học không tồn tại');
    }

    if (session.hostId !== teacher.id) {
      throw new ForbiddenException('Chỉ host mới có thể hủy phiên học');
    }

    if (session.status === LiveSessionStatus.LIVE) {
      throw new BadRequestException('Không thể xóa phiên đang diễn ra, hãy kết thúc trước');
    }

    await this.sessionRepository.remove(session);
    this.logger.log(`Live session deleted: ${session.title} by teacher ${teacher.id}`);
  }

  // ===================== PARTICIPANT MANAGEMENT =====================

  /**
   * Join a live session
   */
  async joinSession(
    sessionId: number,
    user: User,
    socketId?: string,
  ): Promise<LiveSessionParticipant> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Phiên học không tồn tại');
    }

    if (session.status !== LiveSessionStatus.LIVE) {
      throw new BadRequestException('Phiên học chưa bắt đầu hoặc đã kết thúc');
    }

    // Verify membership
    const isMember = await this.classesService.isMember(session.classId, user.id);
    const isTeacher = await this.classesService.isTeacher(session.classId, user.id);
    if (!isMember && !isTeacher) {
      throw new ForbiddenException('Bạn không phải thành viên của lớp này');
    }

    // Check capacity
    if (session.currentParticipants >= session.maxParticipants) {
      throw new ConflictException('Phiên học đã đầy');
    }

    // Check if already joined
    let participant = await this.participantRepository.findOne({
      where: { liveSessionId: sessionId, userId: user.id },
    });

    return this.dataSource.transaction(async (manager) => {
      if (participant) {
        // Rejoin
        if (participant.isActive) {
          return participant; // Already active
        }
        participant.isActive = true;
        participant.joinedAt = new Date();
        participant.leftAt = null;
        participant = await manager.save(LiveSessionParticipant, participant);
      } else {
        // New join
        participant = manager.create(LiveSessionParticipant, {
          liveSessionId: sessionId,
          userId: user.id,
          isActive: true,
          connectionQuality: ConnectionQuality.UNKNOWN,
        });
        participant = await manager.save(LiveSessionParticipant, participant);
      }

      // Increment participant count
      await manager.increment(LiveSession, { id: sessionId }, 'currentParticipants', 1);

      this.logger.log(`User ${user.id} joined session ${session.roomId}`);
      return participant;
    });
  }

  /**
   * Leave a live session
   */
  async leaveSession(sessionId: number, user: User): Promise<void> {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    
    if (!session) {
      throw new NotFoundException('Phiên học không tồn tại');
    }

    const participant = await this.participantRepository.findOne({
      where: { liveSessionId: sessionId, userId: user.id, isActive: true },
    });

    if (!participant) {
      throw new BadRequestException('Bạn không trong phiên học này');
    }

    await this.dataSource.transaction(async (manager) => {
      participant.isActive = false;
      participant.leftAt = new Date();
      await manager.save(LiveSessionParticipant, participant);

      // Decrement participant count (ensure non-negative)
      if (session.currentParticipants > 0) {
        await manager.decrement(LiveSession, { id: sessionId }, 'currentParticipants', 1);
      }

      this.logger.log(`User ${user.id} left session ${sessionId}`);
    });
  }

  /**
   * Kick a participant (Host only)
   */
  async kickParticipant(
    sessionId: number,
    userId: number,
    host: User,
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });

    if (!session) {
      throw new NotFoundException('Phiên học không tồn tại');
    }

    if (session.hostId !== host.id) {
      throw new ForbiddenException('Chỉ host mới có thể kick thành viên');
    }

    if (userId === host.id) {
      throw new BadRequestException('Không thể kick chính mình');
    }

    const participant = await this.participantRepository.findOne({
      where: { liveSessionId: sessionId, userId, isActive: true },
    });

    if (!participant) {
      throw new BadRequestException('Người dùng không trong phiên học');
    }

    await this.dataSource.transaction(async (manager) => {
      participant.isActive = false;
      participant.leftAt = new Date();
      await manager.save(LiveSessionParticipant, participant);

      await manager.decrement(LiveSession, { id: sessionId }, 'currentParticipants', 1);

      this.logger.log(`User ${userId} kicked from session ${sessionId} by host ${host.id}`);
    });
  }

  /**
   * Update connection quality
   */
  async updateConnectionQuality(
    sessionId: number,
    user: User,
    quality: ConnectionQuality,
  ): Promise<void> {
    await this.participantRepository.update(
      { liveSessionId: sessionId, userId: user.id, isActive: true },
      { connectionQuality: quality }
    );
  }

  /**
   * Get session statistics (Host only)
   */
  async getSessionStats(sessionId: number, host: User) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['participants', 'participants.user'],
    });

    if (!session) {
      throw new NotFoundException('Phiên học không tồn tại');
    }

    if (session.hostId !== host.id) {
      throw new ForbiddenException('Chỉ host mới có thể xem thống kê');
    }

    const allParticipants = session.participants;
    const activeCount = allParticipants.filter(p => p.isActive).length;
    const totalJoins = allParticipants.length;

    // Calculate average connection quality
    const qualityStats = allParticipants.reduce((acc, p) => {
      acc[p.connectionQuality] = (acc[p.connectionQuality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Attendance timeline
    const attendanceTimeline = allParticipants.map(p => ({
      userId: p.userId,
      user: this.sanitizeUser(p.user),
      joinedAt: p.joinedAt,
      leftAt: p.leftAt,
      isActive: p.isActive,
      durationMinutes: p.leftAt
        ? Math.floor((p.leftAt.getTime() - p.joinedAt.getTime()) / 60000)
        : Math.floor((new Date().getTime() - p.joinedAt.getTime()) / 60000),
    }));

    return {
      sessionId,
      title: session.title,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationSeconds: session.durationSeconds,
      maxParticipants: session.maxParticipants,
      currentParticipants: activeCount,
      totalJoins,
      peakParticipants: totalJoins, // Simplified - would need tracking for accuracy
      connectionQuality: qualityStats,
      attendance: attendanceTimeline,
    };
  }

  // ===================== UTILITY METHODS =====================

  /**
   * Get live sessions for a class (for dashboard)
   */
  async getClassLiveSessions(classId: number): Promise<LiveSession[]> {
    return this.sessionRepository.find({
      where: { classId },
      order: { scheduledAt: 'DESC', createdAt: 'DESC' },
      take: 10,
    });
  }

  /**
   * Auto-end stale sessions (for cron job)
   */
  async autoEndStaleSessions(): Promise<number> {
    const staleThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours
    
    const staleSessions = await this.sessionRepository.find({
      where: {
        status: LiveSessionStatus.LIVE,
        startedAt: LessThan(staleThreshold),
      },
    });

    for (const session of staleSessions) {
      session.status = LiveSessionStatus.ENDED;
      session.endedAt = new Date();
      session.durationSeconds = Math.floor(
        (session.endedAt.getTime() - session.startedAt.getTime()) / 1000
      );
      await this.sessionRepository.save(session);

      await this.participantRepository.update(
        { liveSessionId: session.id, isActive: true },
        { isActive: false, leftAt: new Date() }
      );

      this.logger.warn(`Auto-ended stale session: ${session.roomId}`);
    }

    return staleSessions.length;
  }
}
