import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { 
  LearningActivity, 
  StudentProgress, 
  DailyActivitySummary, 
  ActivityType 
} from './entities/progress.entity';
import { LogActivityDto } from './dto';
import { User } from '@modules/users/entities/user.entity';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(LearningActivity)
    private activityRepository: Repository<LearningActivity>,
    @InjectRepository(StudentProgress)
    private progressRepository: Repository<StudentProgress>,
    @InjectRepository(DailyActivitySummary)
    private dailySummaryRepository: Repository<DailyActivitySummary>,
  ) {}

  /**
   * Log a learning activity
   */
  async logActivity(dto: LogActivityDto, userId: number): Promise<LearningActivity> {
    const activity = this.activityRepository.create({
      ...dto,
      userId,
    });

    const saved = await this.activityRepository.save(activity);

    // Update progress summary
    if (dto.classId) {
      await this.updateProgress(userId, dto.classId);
    }

    // Update daily summary
    await this.updateDailySummary(userId, dto.classId || null, dto);

    return saved;
  }

  /**
   * Get student progress for a class
   */
  async getStudentProgress(userId: number, classId: number): Promise<StudentProgress> {
    let progress = await this.progressRepository.findOne({
      where: { userId, classId },
    });

    if (!progress) {
      progress = await this.updateProgress(userId, classId);
    }

    return progress;
  }

  /**
   * Get all student progress (Teacher view)
   */
  async getClassProgress(classId: number): Promise<{
    students: StudentProgress[];
    classAverage: any;
  }> {
    const students = await this.progressRepository.find({
      where: { classId },
      relations: ['user'],
      order: { overallProgress: 'DESC' },
    });

    // Calculate class averages
    const classAverage = this.calculateClassAverage(students);

    return { students, classAverage };
  }

  /**
   * Get activity history for a student
   */
  async getActivityHistory(
    userId: number,
    classId?: number,
    limit = 50,
  ): Promise<LearningActivity[]> {
    const where: any = { userId };
    if (classId) where.classId = classId;

    return this.activityRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get activity chart data (daily/weekly/monthly)
   */
  async getActivityChart(
    userId: number,
    classId?: number,
    days = 30,
  ): Promise<DailyActivitySummary[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = {
      userId,
      date: MoreThanOrEqual(startDate),
    };
    if (classId) where.classId = classId;

    return this.dailySummaryRepository.find({
      where,
      order: { date: 'ASC' },
    });
  }

  /**
   * Get leaderboard for a class
   */
  async getLeaderboard(classId: number, limit = 10): Promise<StudentProgress[]> {
    return this.progressRepository.find({
      where: { classId },
      relations: ['user'],
      order: { overallProgress: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get engagement metrics for a student
   */
  async getEngagementMetrics(userId: number, classId?: number): Promise<{
    totalActivities: number;
    totalTimeSpent: number;
    mostActiveDay: string;
    averageSessionDuration: number;
    activityBreakdown: Record<string, number>;
    weeklyTrend: any[];
  }> {
    const where: any = { userId };
    if (classId) where.classId = classId;

    // Get all activities
    const activities = await this.activityRepository.find({ where });

    // Activity breakdown by type
    const activityBreakdown: Record<string, number> = {};
    Object.values(ActivityType).forEach((type) => {
      activityBreakdown[type] = activities.filter((a) => a.activityType === type).length;
    });

    // Total time spent
    const totalTimeSpent = activities.reduce((sum, a) => sum + (a.duration || 0), 0);

    // Most active day
    const dayCount: Record<string, number> = {};
    activities.forEach((a) => {
      const day = new Date(a.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
      dayCount[day] = (dayCount[day] || 0) + 1;
    });
    const mostActiveDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Session durations
    const sessionActivities = activities.filter(
      (a) => a.activityType === ActivityType.ATTEND_LIVE_SESSION && a.duration > 0,
    );
    const averageSessionDuration = sessionActivities.length > 0
      ? sessionActivities.reduce((sum, a) => sum + a.duration, 0) / sessionActivities.length
      : 0;

    // Weekly trend (last 4 weeks)
    const weeklyTrend = await this.getWeeklyTrend(userId, classId);

    return {
      totalActivities: activities.length,
      totalTimeSpent,
      mostActiveDay,
      averageSessionDuration: Math.round(averageSessionDuration),
      activityBreakdown,
      weeklyTrend,
    };
  }

  /**
   * Update student progress summary
   */
  private async updateProgress(userId: number, classId: number): Promise<StudentProgress> {
    let progress = await this.progressRepository.findOne({
      where: { userId, classId },
    });

    if (!progress) {
      progress = this.progressRepository.create({ userId, classId });
    }

    // Count activities by type
    const activities = await this.activityRepository.find({
      where: { userId, classId },
    });

    const materialViews = activities.filter(
      (a) => a.activityType === ActivityType.VIEW_MATERIAL,
    );
    const submissions = activities.filter(
      (a) => a.activityType === ActivityType.SUBMIT_ASSIGNMENT,
    );
    const sessions = activities.filter(
      (a) => a.activityType === ActivityType.ATTEND_LIVE_SESSION,
    );
    const quizzes = activities.filter(
      (a) => a.activityType === ActivityType.COMPLETE_QUIZ,
    );
    const logins = activities.filter(
      (a) => a.activityType === ActivityType.LOGIN,
    );

    // Update counts
    progress.viewedMaterials = new Set(materialViews.map((m) => m.resourceId)).size;
    progress.submittedAssignments = new Set(submissions.map((s) => s.resourceId)).size;
    progress.attendedSessions = new Set(sessions.map((s) => s.resourceId)).size;
    progress.totalSessionTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    progress.completedQuizzes = quizzes.length;
    progress.totalLogins = logins.length;

    // Calculate quiz average
    if (quizzes.length > 0) {
      const quizScores = quizzes
        .map((q) => q.metadata?.score)
        .filter((s) => s !== undefined) as number[];
      progress.averageQuizScore = quizScores.length > 0
        ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length
        : 0;
    }

    // Update last activity
    if (activities.length > 0) {
      const sorted = activities.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      progress.lastActivityAt = sorted[0].createdAt;
    }

    // Calculate streak
    progress.streakDays = await this.calculateStreak(userId, classId);
    if (progress.streakDays > (progress.longestStreak || 0)) {
      progress.longestStreak = progress.streakDays;
    }

    // Calculate overall progress (weighted)
    const weights = {
      materials: 0.3,
      assignments: 0.35,
      sessions: 0.2,
      quizzes: 0.15,
    };

    const materialProgress = progress.totalMaterials > 0
      ? (progress.viewedMaterials / progress.totalMaterials) * 100
      : 0;
    const assignmentProgress = progress.totalAssignments > 0
      ? (progress.submittedAssignments / progress.totalAssignments) * 100
      : 0;
    const sessionProgress = progress.totalSessions > 0
      ? (progress.attendedSessions / progress.totalSessions) * 100
      : 0;
    const quizProgress = progress.totalQuizzes > 0
      ? (progress.completedQuizzes / progress.totalQuizzes) * 100
      : 0;

    progress.overallProgress =
      materialProgress * weights.materials +
      assignmentProgress * weights.assignments +
      sessionProgress * weights.sessions +
      quizProgress * weights.quizzes;

    return this.progressRepository.save(progress);
  }

  /**
   * Update daily activity summary
   */
  private async updateDailySummary(
    userId: number,
    classId: number | null,
    dto: LogActivityDto,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let summary = await this.dailySummaryRepository.findOne({
      where: { userId, classId: classId || undefined, date: today },
    });

    if (!summary) {
      summary = this.dailySummaryRepository.create({
        userId,
        classId: classId || undefined,
        date: today,
      });
    }

    summary.activitiesCount++;
    summary.timeSpent += dto.duration || 0;

    if (dto.activityType === ActivityType.VIEW_MATERIAL) {
      summary.materialsViewed++;
    } else if (dto.activityType === ActivityType.SUBMIT_ASSIGNMENT) {
      summary.assignmentsSubmitted++;
    } else if (dto.activityType === ActivityType.ATTEND_LIVE_SESSION) {
      summary.sessionsAttended++;
    }

    await this.dailySummaryRepository.save(summary);
  }

  /**
   * Calculate current streak
   */
  private async calculateStreak(userId: number, classId?: number): Promise<number> {
    const where: any = { userId };
    if (classId) where.classId = classId;

    const summaries = await this.dailySummaryRepository.find({
      where,
      order: { date: 'DESC' },
      take: 365,
    });

    if (summaries.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const summary of summaries) {
      const summaryDate = new Date(summary.date);
      summaryDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (currentDate.getTime() - summaryDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays <= 1) {
        streak++;
        currentDate = summaryDate;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Get weekly trend data
   */
  private async getWeeklyTrend(userId: number, classId?: number): Promise<any[]> {
    const result = [];
    const today = new Date();

    for (let week = 3; week >= 0; week--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (week + 1) * 7);
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() - week * 7);

      const where: any = {
        userId,
        date: Between(weekStart, weekEnd),
      };
      if (classId) where.classId = classId;

      const summaries = await this.dailySummaryRepository.find({ where });

      result.push({
        week: `Week ${4 - week}`,
        activities: summaries.reduce((sum, s) => sum + s.activitiesCount, 0),
        timeSpent: summaries.reduce((sum, s) => sum + s.timeSpent, 0),
      });
    }

    return result;
  }

  /**
   * Calculate class average metrics
   */
  private calculateClassAverage(students: StudentProgress[]): any {
    if (students.length === 0) return null;

    return {
      averageProgress: students.reduce((sum, s) => sum + Number(s.overallProgress), 0) / students.length,
      averageMaterialsViewed: students.reduce((sum, s) => sum + s.viewedMaterials, 0) / students.length,
      averageAssignmentsSubmitted: students.reduce((sum, s) => sum + s.submittedAssignments, 0) / students.length,
      averageSessionsAttended: students.reduce((sum, s) => sum + s.attendedSessions, 0) / students.length,
      averageQuizScore: students.reduce((sum, s) => sum + Number(s.averageQuizScore), 0) / students.length,
    };
  }
}
