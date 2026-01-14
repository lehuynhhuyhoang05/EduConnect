import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { Class, ClassMember } from '@modules/classes/entities';
import { Assignment, Submission } from '@modules/assignments/entities';
import { LiveSession } from '@modules/live-sessions/entities/live-session.entity';

export interface DashboardStats {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  totalAssignments: number;
  totalSubmissions: number;
  totalLiveSessions: number;
  activeUsersToday: number;
  newUsersThisWeek: number;
  newClassesThisWeek: number;
}

export interface SystemActivity {
  date: string;
  newUsers: number;
  newClasses: number;
  submissions: number;
  liveSessions: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(ClassMember)
    private readonly classMemberRepository: Repository<ClassMember>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(LiveSession)
    private readonly liveSessionRepository: Repository<LiveSession>,
  ) {}

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalTeachers,
      totalStudents,
      totalClasses,
      totalAssignments,
      totalSubmissions,
      totalLiveSessions,
      newUsersThisWeek,
      newClassesThisWeek,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { role: UserRole.TEACHER } }),
      this.userRepository.count({ where: { role: UserRole.STUDENT } }),
      this.classRepository.count(),
      this.assignmentRepository.count(),
      this.submissionRepository.count(),
      this.liveSessionRepository.count(),
      this.userRepository.count({
        where: { createdAt: MoreThanOrEqual(startOfWeek) },
      }),
      this.classRepository.count({
        where: { createdAt: MoreThanOrEqual(startOfWeek) },
      }),
    ]);

    return {
      totalUsers,
      totalTeachers,
      totalStudents,
      totalClasses,
      totalAssignments,
      totalSubmissions,
      totalLiveSessions,
      activeUsersToday: 0, // lastLogin field may not exist
      newUsersThisWeek,
      newClassesThisWeek,
    };
  }

  /**
   * Get system activity for the last N days
   */
  async getSystemActivity(days: number = 7): Promise<SystemActivity[]> {
    const activities: SystemActivity[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const [newUsers, newClasses, submissions, liveSessions] = await Promise.all([
        this.userRepository.count({
          where: { createdAt: Between(startOfDay, endOfDay) },
        }),
        this.classRepository.count({
          where: { createdAt: Between(startOfDay, endOfDay) },
        }),
        this.submissionRepository.count({
          where: { submittedAt: Between(startOfDay, endOfDay) },
        }),
        this.liveSessionRepository.count({
          where: { createdAt: Between(startOfDay, endOfDay) },
        }),
      ]);

      activities.push({
        date: startOfDay.toISOString().split('T')[0],
        newUsers,
        newClasses,
        submissions,
        liveSessions,
      });
    }

    return activities;
  }

  /**
   * Get all users with pagination and filtering
   */
  async getAllUsers(options: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        '(user.email LIKE :search OR user.fullName LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    const [users, total] = await queryBuilder
      .select([
        'user.id',
        'user.email',
        'user.fullName',
        'user.role',
        'user.avatarUrl',
        'user.isVerified',
        'user.isActive',
        'user.createdAt',
        'user.updatedAt',
      ])
      .orderBy(`user.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update user status (activate/deactivate)
   */
  async updateUserStatus(userId: number, isActive: boolean): Promise<User> {
    await this.userRepository.update(userId, { isActive });
    return this.userRepository.findOneOrFail({ where: { id: userId } });
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: number, role: UserRole): Promise<User> {
    await this.userRepository.update(userId, { role });
    return this.userRepository.findOneOrFail({ where: { id: userId } });
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  async deleteUser(userId: number): Promise<void> {
    await this.userRepository.update(userId, { isActive: false });
  }

  /**
   * Get all classes with statistics
   */
  async getAllClasses(options: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const queryBuilder = this.classRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.teacher', 'teacher');

    if (search) {
      queryBuilder.where(
        '(class.name LIKE :search OR class.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('class.isActive = :isActive', { isActive });
    }

    const [classes, total] = await queryBuilder
      .orderBy(`class.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: classes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete class
   */
  async deleteClass(classId: number): Promise<void> {
    await this.classRepository.update(classId, { isActive: false });
  }

  /**
   * Get system logs/recent activities
   */
  async getRecentActivities(limit: number = 50) {
    const [recentUsers, recentClasses, recentSubmissions, recentSessions] =
      await Promise.all([
        this.userRepository.find({
          select: ['id', 'email', 'fullName', 'role', 'createdAt'],
          order: { createdAt: 'DESC' },
          take: 10,
        }),
        this.classRepository.find({
          relations: ['teacher'],
          order: { createdAt: 'DESC' },
          take: 10,
        }),
        this.submissionRepository.find({
          relations: ['student', 'assignment'],
          order: { submittedAt: 'DESC' },
          take: 10,
        }),
        this.liveSessionRepository.find({
          relations: ['host', 'class'],
          order: { createdAt: 'DESC' },
          take: 10,
        }),
      ]);

    // Combine and sort all activities
    const activities = [
      ...recentUsers.map((u) => ({
        type: 'user_created',
        message: `Người dùng mới: ${u.fullName} (${u.role})`,
        timestamp: u.createdAt,
        data: u,
      })),
      ...recentClasses.map((c) => ({
        type: 'class_created',
        message: `Lớp mới: ${c.name} bởi ${c.teacher?.fullName}`,
        timestamp: c.createdAt,
        data: c,
      })),
      ...recentSubmissions.map((s) => ({
        type: 'submission',
        message: `Bài nộp: ${s.student?.fullName} nộp ${s.assignment?.title}`,
        timestamp: s.submittedAt,
        data: s,
      })),
      ...recentSessions.map((s) => ({
        type: 'live_session',
        message: `Phiên live: ${s.title} trong ${s.class?.name}`,
        timestamp: s.createdAt,
        data: s,
      })),
    ];

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    // This would typically integrate with your file storage service
    return {
      totalFiles: 0,
      totalSize: 0,
      byType: {
        images: 0,
        documents: 0,
        videos: 0,
        others: 0,
      },
    };
  }

  /**
   * Bulk update users
   */
  async bulkUpdateUsers(
    userIds: number[],
    updates: { isActive?: boolean; role?: UserRole },
  ): Promise<void> {
    await this.userRepository.update(userIds, updates);
  }

  /**
   * Get top teachers by class count
   */
  async getTopTeachers(limit: number = 10) {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.teachingClasses', 'class')
      .where('user.role = :role', { role: UserRole.TEACHER })
      .select([
        'user.id',
        'user.fullName',
        'user.email',
        'user.avatarUrl',
        'COUNT(class.id) as classCount',
      ])
      .groupBy('user.id')
      .orderBy('classCount', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  /**
   * Get top active classes
   */
  async getTopClasses(limit: number = 10) {
    return this.classRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.teacher', 'teacher')
      .where('class.isActive = :isActive', { isActive: true })
      .orderBy('class.memberCount', 'DESC')
      .limit(limit)
      .getMany();
  }
}
