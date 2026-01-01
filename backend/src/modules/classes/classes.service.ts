import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomBytes } from 'crypto';
import { Class, ClassMember, ClassRole } from './entities';
import { CreateClassDto, UpdateClassDto, JoinClassDto, QueryClassDto } from './dto';
import { User, UserRole } from '@modules/users/entities/user.entity';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(ClassMember)
    private readonly memberRepository: Repository<ClassMember>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: User): Partial<User> {
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Generate a unique 6-character class code
   */
  private generateClassCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    const randomBytesArr = randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += chars[randomBytesArr[i] % chars.length];
    }
    return code;
  }

  /**
   * Generate unique class code (retry if exists)
   */
  private async generateUniqueClassCode(): Promise<string> {
    let code: string;
    let exists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (exists && attempts < maxAttempts) {
      code = this.generateClassCode();
      const existingClass = await this.classRepository.findOne({
        where: { classCode: code },
      });
      exists = !!existingClass;
      attempts++;
    }

    if (exists) {
      throw new ConflictException('Không thể tạo mã lớp. Vui lòng thử lại.');
    }

    return code;
  }

  /**
   * Create a new class (Teacher only) - Uses transaction for data consistency
   */
  async create(createClassDto: CreateClassDto, teacher: User): Promise<Class> {
    if (teacher.role !== UserRole.TEACHER) {
      throw new ForbiddenException('Chỉ giáo viên mới có thể tạo lớp học');
    }

    const classCode = await this.generateUniqueClassCode();

    // Use transaction to ensure both class and member are created together
    return this.dataSource.transaction(async (manager) => {
      const newClass = manager.create(Class, {
        ...createClassDto,
        classCode,
        teacherId: teacher.id,
        memberCount: 1,
      });

      const savedClass = await manager.save(Class, newClass);

      // Add teacher as a member with TEACHER role
      const teacherMember = manager.create(ClassMember, {
        classId: savedClass.id,
        userId: teacher.id,
        role: ClassRole.TEACHER,
      });
      await manager.save(ClassMember, teacherMember);

      return savedClass;
    });
  }

  /**
   * Find all classes with filters
   */
  async findAll(query: QueryClassDto, user: User) {
    const { search, isActive, myClasses, page = 1, limit = 10 } = query;

    const queryBuilder = this.classRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.teacher', 'teacher');

    // If myClasses, filter by membership
    if (myClasses) {
      queryBuilder
        .innerJoin('class.members', 'member', 'member.userId = :userId', {
          userId: user.id,
        });
    }

    // Default: only show active classes unless explicitly requested
    if (isActive === undefined) {
      queryBuilder.andWhere('class.isActive = :defaultActive', { defaultActive: true });
    }

    if (search) {
      queryBuilder.andWhere(
        '(class.name LIKE :search OR class.subject LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('class.isActive = :isActive', { isActive });
    }

    const [classes, total] = await queryBuilder
      .select([
        'class.id',
        'class.name',
        'class.description',
        'class.classCode',
        'class.subject',
        'class.memberCount',
        'class.isActive',
        'class.createdAt',
        'teacher.id',
        'teacher.fullName',
        'teacher.email',
        'teacher.avatarUrl',
      ])
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('class.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: classes,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find class by ID
   */
  async findOne(id: number, user: User): Promise<any> {
    const classEntity = await this.classRepository.findOne({
      where: { id },
      relations: ['teacher', 'members', 'members.user'],
    });

    if (!classEntity) {
      throw new NotFoundException('Lớp học không tồn tại');
    }

    // Check if user is a member or teacher
    const isMember = classEntity.members.some((m) => m.userId === user.id);
    const isTeacher = classEntity.teacherId === user.id;

    if (!isMember && !isTeacher) {
      throw new ForbiddenException('Bạn không phải thành viên của lớp này');
    }

    // Sanitize user data to avoid leaking passwordHash
    return {
      ...classEntity,
      teacher: this.sanitizeUser(classEntity.teacher),
      members: classEntity.members.map((m) => ({
        ...m,
        user: this.sanitizeUser(m.user),
      })),
    };
  }

  /**
   * Find class by code (for joining)
   */
  async findByCode(classCode: string): Promise<Class> {
    const classEntity = await this.classRepository.findOne({
      where: { classCode: classCode.toUpperCase(), isActive: true },
      relations: ['teacher'],
    });

    if (!classEntity) {
      throw new NotFoundException('Mã lớp không hợp lệ hoặc lớp đã bị khóa');
    }

    return classEntity;
  }

  /**
   * Join a class by code - Uses transaction for data consistency
   */
  async joinClass(joinClassDto: JoinClassDto, user: User): Promise<ClassMember> {
    const classCode = joinClassDto.classCode.toUpperCase();
    const classEntity = await this.findByCode(classCode);

    // findByCode already checks isActive, but double-check
    if (!classEntity.isActive) {
      throw new BadRequestException('Lớp học đã bị khóa, không thể tham gia');
    }

    // Check if already a member
    const existingMember = await this.memberRepository.findOne({
      where: { classId: classEntity.id, userId: user.id },
    });

    if (existingMember) {
      throw new ConflictException('Bạn đã là thành viên của lớp này');
    }

    // Use transaction to ensure member creation and count update are atomic
    return this.dataSource.transaction(async (manager) => {
      const member = manager.create(ClassMember, {
        classId: classEntity.id,
        userId: user.id,
        role: ClassRole.STUDENT,
      });

      const savedMember = await manager.save(ClassMember, member);

      // Update member count
      await manager.increment(Class, { id: classEntity.id }, 'memberCount', 1);

      return savedMember;
    });
  }

  /**
   * Update class (Teacher only)
   */
  async update(
    id: number,
    updateClassDto: UpdateClassDto,
    user: User,
  ): Promise<Class> {
    const classEntity = await this.classRepository.findOne({ where: { id } });

    if (!classEntity) {
      throw new NotFoundException('Lớp học không tồn tại');
    }

    if (classEntity.teacherId !== user.id) {
      throw new ForbiddenException('Chỉ giáo viên của lớp mới có thể chỉnh sửa');
    }

    Object.assign(classEntity, updateClassDto);
    return this.classRepository.save(classEntity);
  }

  /**
   * Delete/deactivate class (Teacher only)
   */
  async remove(id: number, user: User): Promise<void> {
    const classEntity = await this.classRepository.findOne({ where: { id } });

    if (!classEntity) {
      throw new NotFoundException('Lớp học không tồn tại');
    }

    if (classEntity.teacherId !== user.id) {
      throw new ForbiddenException('Chỉ giáo viên của lớp mới có thể xóa');
    }

    // Soft delete: deactivate instead of hard delete
    classEntity.isActive = false;
    await this.classRepository.save(classEntity);
  }

  /**
   * Reactivate a deactivated class (Teacher only)
   */
  async reactivate(id: number, user: User): Promise<Class> {
    const classEntity = await this.classRepository.findOne({ where: { id } });

    if (!classEntity) {
      throw new NotFoundException('Lớp học không tồn tại');
    }

    if (classEntity.teacherId !== user.id) {
      throw new ForbiddenException('Chỉ giáo viên của lớp mới có thể kích hoạt lại');
    }

    if (classEntity.isActive) {
      throw new BadRequestException('Lớp học đã đang hoạt động');
    }

    classEntity.isActive = true;
    return this.classRepository.save(classEntity);
  }

  /**
   * Leave a class (Student only) - Uses transaction for data consistency
   */
  async leaveClass(classId: number, user: User): Promise<void> {
    const membership = await this.memberRepository.findOne({
      where: { classId, userId: user.id },
    });

    if (!membership) {
      throw new NotFoundException('Bạn không phải thành viên của lớp này');
    }

    if (membership.role === ClassRole.TEACHER) {
      throw new BadRequestException(
        'Giáo viên không thể rời khỏi lớp. Hãy xóa lớp thay vào đó.',
      );
    }

    // Use transaction for atomic operation
    await this.dataSource.transaction(async (manager) => {
      await manager.remove(ClassMember, membership);
      await manager.decrement(Class, { id: classId }, 'memberCount', 1);
    });
  }

  /**
   * Remove a student from class (Teacher only)
   */
  async removeMember(
    classId: number,
    studentId: number,
    teacher: User,
  ): Promise<void> {
    const classEntity = await this.classRepository.findOne({
      where: { id: classId },
    });

    if (!classEntity) {
      throw new NotFoundException('Lớp học không tồn tại');
    }

    if (classEntity.teacherId !== teacher.id) {
      throw new ForbiddenException('Chỉ giáo viên mới có thể xóa thành viên');
    }

    const membership = await this.memberRepository.findOne({
      where: { classId, userId: studentId },
    });

    if (!membership) {
      throw new NotFoundException('Học sinh không phải thành viên của lớp');
    }

    if (membership.role === ClassRole.TEACHER) {
      throw new BadRequestException('Không thể xóa giáo viên khỏi lớp');
    }

    // Use transaction for atomic operation
    await this.dataSource.transaction(async (manager) => {
      await manager.remove(ClassMember, membership);
      await manager.decrement(Class, { id: classId }, 'memberCount', 1);
    });
  }

  /**
   * Get class members
   */
  async getMembers(classId: number, user: User): Promise<any[]> {
    // First verify user is a member
    const membership = await this.memberRepository.findOne({
      where: { classId, userId: user.id },
    });

    if (!membership) {
      throw new ForbiddenException('Bạn không phải thành viên của lớp này');
    }

    const members = await this.memberRepository.find({
      where: { classId },
      relations: ['user'],
      order: { role: 'ASC', joinedAt: 'ASC' },
    });

    // Sanitize user data
    return members.map((m) => ({
      ...m,
      user: this.sanitizeUser(m.user),
    }));
  }

  /**
   * Check if user is a member of class
   */
  async isMember(classId: number, userId: number): Promise<boolean> {
    const membership = await this.memberRepository.findOne({
      where: { classId, userId },
    });
    return !!membership;
  }

  /**
   * Check if user is teacher of class
   */
  async isTeacher(classId: number, userId: number): Promise<boolean> {
    const classEntity = await this.classRepository.findOne({
      where: { id: classId },
    });
    return classEntity?.teacherId === userId;
  }
}
