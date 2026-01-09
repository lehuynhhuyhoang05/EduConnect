import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Assignment, Submission, SubmissionStatus } from './entities';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  CreateSubmissionDto,
  GradeSubmissionDto,
  ReturnSubmissionDto,
  QueryAssignmentDto,
  QuerySubmissionDto,
} from './dto';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { ClassesService } from '@modules/classes/classes.service';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    private readonly classesService: ClassesService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Sanitize user object
   */
  private sanitizeUser(user: any): any {
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // ===================== ASSIGNMENT CRUD =====================

  /**
   * Create assignment (Teacher only)
   */
  async createAssignment(
    classId: number,
    createDto: CreateAssignmentDto,
    teacher: User,
  ): Promise<Assignment> {
    try {
      this.logger.debug(`Creating assignment in class ${classId} by teacher ${teacher.id}`);
      
      // Verify teacher owns the class
      const isTeacher = await this.classesService.isTeacher(classId, teacher.id);
      this.logger.debug(`isTeacher check result: ${isTeacher}`);
      
      if (!isTeacher) {
        throw new ForbiddenException('Chỉ giáo viên của lớp mới có thể tạo bài tập');
      }

      // Validate due date is in future
      const deadline = new Date(createDto.dueDate);
      this.logger.debug(`Deadline: ${deadline}, Now: ${new Date()}`);
      
      if (deadline <= new Date()) {
        throw new BadRequestException('Hạn nộp phải sau thời điểm hiện tại');
      }

      const assignment = this.assignmentRepository.create({
        classId,
        createdBy: teacher.id,
        title: createDto.title,
        description: createDto.description,
        deadline,
        maxScore: createDto.maxScore || 100,
        attachmentUrl: createDto.attachmentUrl,
      });

      this.logger.debug(`Saving assignment: ${JSON.stringify(assignment)}`);
      const saved = await this.assignmentRepository.save(assignment);
      this.logger.log(`Assignment created: ${saved.title} in class ${classId} by teacher ${teacher.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Error creating assignment: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all assignments (with filters)
   */
  async findAllAssignments(query: QueryAssignmentDto, user: User) {
    const { classId, isActive, page = 1, limit = 10 } = query;

    const queryBuilder = this.assignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.class', 'class')
      .leftJoinAndSelect('assignment.creator', 'creator');

    // If specific class, verify membership
    if (classId) {
      const isMember = await this.classesService.isMember(classId, user.id);
      const isTeacher = await this.classesService.isTeacher(classId, user.id);
      if (!isMember && !isTeacher) {
        throw new ForbiddenException('Bạn không phải thành viên của lớp này');
      }
      queryBuilder.andWhere('assignment.classId = :classId', { classId });
    } else {
      // Only show assignments from classes user is member of
      queryBuilder
        .innerJoin('assignment.class', 'userClass')
        .innerJoin('userClass.members', 'member', 'member.userId = :userId', { userId: user.id });
    }

    // Filter by isActive (default show only active)
    if (isActive !== undefined) {
      queryBuilder.andWhere('assignment.isActive = :isActive', { isActive });
    } else {
      queryBuilder.andWhere('assignment.isActive = :isActive', { isActive: true });
    }

    const [assignments, total] = await queryBuilder
      .select([
        'assignment.id',
        'assignment.title',
        'assignment.description',
        'assignment.deadline',
        'assignment.maxScore',
        'assignment.submissionCount',
        'assignment.createdAt',
        'class.id',
        'class.name',
        'creator.id',
        'creator.fullName',
      ])
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('assignment.deadline', 'ASC')
      .getManyAndCount();

    // For students, include their submissions
    if (user.role === UserRole.STUDENT) {
      const assignmentIds = assignments.map(a => a.id);
      const submissions = await this.submissionRepository.find({
        where: { 
          assignmentId: In(assignmentIds),
          studentId: user.id 
        },
      });

      // Map submissions to assignments
      const submissionMap = new Map(submissions.map(s => [s.assignmentId, s]));
      assignments.forEach(assignment => {
        (assignment as any).submission = submissionMap.get(assignment.id) || null;
      });
    }

    return {
      data: assignments,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single assignment by ID
   */
  async findOneAssignment(id: number, user: User): Promise<any> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
      relations: ['class', 'creator'],
    });

    if (!assignment) {
      throw new NotFoundException('Bài tập không tồn tại');
    }

    // Verify user is member of class
    const isMember = await this.classesService.isMember(assignment.classId, user.id);
    const isTeacher = await this.classesService.isTeacher(assignment.classId, user.id);
    if (!isMember && !isTeacher) {
      throw new ForbiddenException('Bạn không có quyền xem bài tập này');
    }

    // Get user's submission if student
    let mySubmission = null;
    if (user.role === UserRole.STUDENT) {
      mySubmission = await this.submissionRepository.findOne({
        where: { assignmentId: id, studentId: user.id },
      });
    }

    return {
      ...assignment,
      creator: this.sanitizeUser(assignment.creator),
      mySubmission,
      isOverdue: new Date() > assignment.deadline,
    };
  }

  /**
   * Update assignment (Teacher only)
   */
  async updateAssignment(
    id: number,
    updateDto: UpdateAssignmentDto,
    teacher: User,
  ): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({ where: { id } });
    if (!assignment) {
      throw new NotFoundException('Bài tập không tồn tại');
    }

    if (assignment.createdBy !== teacher.id) {
      throw new ForbiddenException('Chỉ người tạo mới có thể sửa bài tập');
    }

    // Validate new due date if provided
    if (updateDto.dueDate) {
      const newDeadline = new Date(updateDto.dueDate);
      if (newDeadline <= new Date()) {
        throw new BadRequestException('Hạn nộp mới phải sau thời điểm hiện tại');
      }
      assignment.deadline = newDeadline;
    }

    Object.assign(assignment, {
      title: updateDto.title ?? assignment.title,
      description: updateDto.description ?? assignment.description,
      maxScore: updateDto.maxScore ?? assignment.maxScore,
      attachmentUrl: updateDto.attachmentUrl ?? assignment.attachmentUrl,
    });

    return this.assignmentRepository.save(assignment);
  }

  /**
   * Delete/deactivate assignment (Teacher only)
   */
  async removeAssignment(id: number, teacher: User): Promise<void> {
    const assignment = await this.assignmentRepository.findOne({ where: { id } });
    if (!assignment) {
      throw new NotFoundException('Bài tập không tồn tại');
    }

    if (assignment.createdBy !== teacher.id) {
      throw new ForbiddenException('Chỉ người tạo mới có thể xóa bài tập');
    }

    // Check if there are graded submissions
    const gradedCount = await this.submissionRepository.count({
      where: { assignmentId: id, status: SubmissionStatus.GRADED },
    });

    if (gradedCount > 0) {
      // Soft delete if has graded submissions
      assignment.isActive = false;
      await this.assignmentRepository.save(assignment);
      this.logger.log(`Assignment deactivated: ${assignment.title} by teacher ${teacher.id}`);
    } else {
      // Hard delete if no graded submissions
      await this.assignmentRepository.remove(assignment);
      this.logger.log(`Assignment deleted: ${assignment.title} by teacher ${teacher.id}`);
    }
  }

  // ===================== SUBMISSION CRUD =====================

  /**
   * Submit assignment (Student only)
   */
  async submitAssignment(
    assignmentId: number,
    submitDto: CreateSubmissionDto,
    student: User,
  ): Promise<Submission> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Bài tập không tồn tại');
    }

    // Verify student is member of class
    const isMember = await this.classesService.isMember(assignment.classId, student.id);
    if (!isMember) {
      throw new ForbiddenException('Bạn không phải thành viên của lớp này');
    }

    // Check if already submitted
    const existingSubmission = await this.submissionRepository.findOne({
      where: { assignmentId, studentId: student.id },
    });

    if (existingSubmission) {
      // Allow resubmit if returned or before deadline
      if (existingSubmission.status === SubmissionStatus.GRADED) {
        throw new ConflictException('Bài tập đã được chấm điểm, không thể nộp lại');
      }
    }

    // Check deadline (allow late submission with warning)
    const isLate = new Date() > assignment.deadline;

    // Use transaction
    return this.dataSource.transaction(async (manager) => {
      let submission: Submission;

      if (existingSubmission) {
        // Update existing submission
        existingSubmission.fileUrl = submitDto.fileUrl ?? existingSubmission.fileUrl;
        existingSubmission.originalFileName = submitDto.originalFileName ?? existingSubmission.originalFileName;
        existingSubmission.content = submitDto.content ?? existingSubmission.content;
        existingSubmission.status = SubmissionStatus.SUBMITTED;
        existingSubmission.submittedAt = new Date();
        existingSubmission.isLate = isLate;
        // Reset score and feedback on resubmission
        existingSubmission.score = null;
        existingSubmission.feedback = null;
        existingSubmission.gradedAt = null;
        existingSubmission.gradedBy = null;
        submission = await manager.save(Submission, existingSubmission);
      } else {
        // Create new submission
        submission = manager.create(Submission, {
          assignmentId,
          studentId: student.id,
          fileUrl: submitDto.fileUrl,
          originalFileName: submitDto.originalFileName,
          content: submitDto.content,
          status: SubmissionStatus.SUBMITTED,
          isLate,
        });
        submission = await manager.save(Submission, submission);

        // Increment submission count
        await manager.increment(Assignment, { id: assignmentId }, 'submissionCount', 1);
      }

      this.logger.log(
        `Submission ${existingSubmission ? 'updated' : 'created'}: assignment ${assignmentId} by student ${student.id}${isLate ? ' (LATE)' : ''}`,
      );

      return submission;
    });
  }

  /**
   * Get all submissions for an assignment (Teacher only)
   */
  async getSubmissions(
    assignmentId: number,
    query: QuerySubmissionDto,
    teacher: User,
  ) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Bài tập không tồn tại');
    }

    // Verify teacher owns the class
    const isTeacher = await this.classesService.isTeacher(assignment.classId, teacher.id);
    if (!isTeacher) {
      throw new ForbiddenException('Chỉ giáo viên của lớp mới có thể xem bài nộp');
    }

    const { status, page = 1, limit = 10 } = query;

    const queryBuilder = this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.student', 'student')
      .where('submission.assignmentId = :assignmentId', { assignmentId });

    if (status) {
      queryBuilder.andWhere('submission.status = :status', { status });
    }

    const [submissions, total] = await queryBuilder
      .select([
        'submission.id',
        'submission.fileUrl',
        'submission.content',
        'submission.status',
        'submission.score',
        'submission.feedback',
        'submission.submittedAt',
        'submission.gradedAt',
        'student.id',
        'student.fullName',
        'student.email',
      ])
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('submission.submittedAt', 'DESC')
      .getManyAndCount();

    return {
      data: submissions.map((s) => ({
        ...s,
        student: this.sanitizeUser(s.student),
        isLate: s.submittedAt > assignment.deadline,
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
   * Get student's own submission
   */
  async getMySubmission(assignmentId: number, student: User): Promise<Submission | null> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Bài tập không tồn tại');
    }

    // Verify student is member
    const isMember = await this.classesService.isMember(assignment.classId, student.id);
    if (!isMember) {
      throw new ForbiddenException('Bạn không phải thành viên của lớp này');
    }

    return this.submissionRepository.findOne({
      where: { assignmentId, studentId: student.id },
    });
  }

  /**
   * Grade a submission (Teacher only)
   */
  async gradeSubmission(
    submissionId: number,
    gradeDto: GradeSubmissionDto,
    teacher: User,
  ): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['assignment'],
    });

    if (!submission) {
      throw new NotFoundException('Bài nộp không tồn tại');
    }

    // Verify teacher owns the class
    const isTeacher = await this.classesService.isTeacher(
      submission.assignment.classId,
      teacher.id,
    );
    if (!isTeacher) {
      throw new ForbiddenException('Chỉ giáo viên của lớp mới có thể chấm điểm');
    }

    // Validate score against max score
    if (gradeDto.score > submission.assignment.maxScore) {
      throw new BadRequestException(
        `Điểm không được vượt quá ${submission.assignment.maxScore}`,
      );
    }

    submission.score = gradeDto.score;
    submission.feedback = gradeDto.feedback ?? null;
    submission.status = SubmissionStatus.GRADED;
    submission.gradedAt = new Date();
    submission.gradedBy = teacher.id;

    const saved = await this.submissionRepository.save(submission);
    this.logger.log(`Submission graded: ${submissionId} with score ${gradeDto.score} by teacher ${teacher.id}`);
    return saved;
  }

  /**
   * Return submission for revision (Teacher only)
   */
  async returnSubmission(
    submissionId: number,
    returnDto: ReturnSubmissionDto,
    teacher: User,
  ): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['assignment'],
    });

    if (!submission) {
      throw new NotFoundException('Bài nộp không tồn tại');
    }

    // Verify teacher owns the class
    const isTeacher = await this.classesService.isTeacher(
      submission.assignment.classId,
      teacher.id,
    );
    if (!isTeacher) {
      throw new ForbiddenException('Chỉ giáo viên của lớp mới có thể trả bài');
    }

    submission.status = SubmissionStatus.RETURNED;
    submission.feedback = returnDto.feedback;

    const saved = await this.submissionRepository.save(submission);
    this.logger.log(`Submission returned: ${submissionId} by teacher ${teacher.id}`);
    return saved;
  }

  // ===================== STATISTICS =====================

  /**
   * Get assignment statistics (for teacher)
   */
  async getAssignmentStats(assignmentId: number, teacher: User) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['class'],
    });

    if (!assignment) {
      throw new NotFoundException('Bài tập không tồn tại');
    }

    const isTeacher = await this.classesService.isTeacher(assignment.classId, teacher.id);
    if (!isTeacher) {
      throw new ForbiddenException('Chỉ giáo viên mới có thể xem thống kê');
    }

    const stats = await this.submissionRepository
      .createQueryBuilder('submission')
      .select('submission.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(submission.score)', 'avgScore')
      .where('submission.assignmentId = :assignmentId', { assignmentId })
      .groupBy('submission.status')
      .getRawMany();

    // Get actual student count from class_members table
    const studentCount = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from('class_members', 'cm')
      .where('cm.class_id = :classId', { classId: assignment.classId })
      .andWhere('cm.role = :role', { role: 'STUDENT' })
      .getRawOne();

    const totalStudents = parseInt(studentCount.count || '0');
    const totalSubmissions = assignment.submissionCount;
    const notSubmitted = totalStudents - totalSubmissions;

    return {
      assignmentId,
      title: assignment.title,
      deadline: assignment.deadline,
      maxScore: assignment.maxScore,
      isOverdue: new Date() > assignment.deadline,
      totalStudents,
      totalSubmissions,
      notSubmitted,
      submissionRate: totalStudents > 0 ? ((totalSubmissions / totalStudents) * 100).toFixed(2) + '%' : '0%',
      byStatus: stats.map(s => ({
        status: s.status,
        count: parseInt(s.count),
        avgScore: s.avgScore ? parseFloat(s.avgScore).toFixed(2) : null,
      })),
    };
  }

  /**
   * Export assignment grades as CSV (Teacher only)
   */
  async exportGrades(assignmentId: number, teacher: User): Promise<string> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Bài tập không tồn tại');
    }

    const isTeacher = await this.classesService.isTeacher(assignment.classId, teacher.id);
    if (!isTeacher) {
      throw new ForbiddenException('Chỉ giáo viên mới có thể xuất điểm');
    }

    const submissions = await this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.student', 'student')
      .where('submission.assignmentId = :assignmentId', { assignmentId })
      .orderBy('student.fullName', 'ASC')
      .getMany();

    // Generate CSV
    const headers = ['STT', 'Họ tên', 'Email', 'Trạng thái', 'Điểm', 'Nộp trễ', 'Ngày nộp', 'Nhận xét'];
    const rows = submissions.map((s, index) => [
      index + 1,
      s.student.fullName,
      s.student.email,
      s.status,
      s.score ?? 'Chưa chấm',
      s.isLate ? 'Có' : 'Không',
      s.submittedAt.toISOString(),
      (s.feedback || '').replace(/,/g, ';').replace(/\n/g, ' '),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csv;
  }

  /**
   * Bulk grade submissions (Teacher only)
   */
  async bulkGradeSubmissions(
    assignmentId: number,
    grades: Array<{ submissionId: number; score: number; feedback?: string }>,
    teacher: User,
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Bài tập không tồn tại');
    }

    const isTeacher = await this.classesService.isTeacher(assignment.classId, teacher.id);
    if (!isTeacher) {
      throw new ForbiddenException('Chỉ giáo viên của lớp mới có thể chấm điểm');
    }

    const results = { success: 0, failed: 0, errors: [] as any[] };

    for (const grade of grades) {
      try {
        const submission = await this.submissionRepository.findOne({
          where: { id: grade.submissionId, assignmentId },
        });

        if (!submission) {
          results.failed++;
          results.errors.push({ submissionId: grade.submissionId, error: 'Không tìm thấy bài nộp' });
          continue;
        }

        if (grade.score > assignment.maxScore) {
          results.failed++;
          results.errors.push({ submissionId: grade.submissionId, error: `Điểm vượt quá ${assignment.maxScore}` });
          continue;
        }

        submission.score = grade.score;
        submission.feedback = grade.feedback ?? null;
        submission.status = SubmissionStatus.GRADED;
        submission.gradedAt = new Date();
        submission.gradedBy = teacher.id;

        await this.submissionRepository.save(submission);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ submissionId: grade.submissionId, error: error.message });
      }
    }

    this.logger.log(`Bulk graded ${results.success}/${grades.length} submissions for assignment ${assignmentId}`);
    return results;
  }
}
