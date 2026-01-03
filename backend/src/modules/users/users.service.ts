import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, QueryUserDto, ChangePasswordDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<Partial<User>> {
    const { email, password, ...rest } = createUserDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      email,
      passwordHash,
      ...rest,
    });

    const savedUser = await this.userRepository.save(user);
    return this.sanitizeUser(savedUser);
  }

  async findAll(query: QueryUserDto) {
    const { search, role, isActive, page = 1, limit = 10 } = query;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        '(user.email LIKE :search OR user.fullName LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) queryBuilder.andWhere('user.role = :role', { role });
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
        'user.lastLogin',
        'user.createdAt',
      ])
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: users,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'fullName',
        'role',
        'avatarUrl',
        'isVerified',
        'isActive',
        'lastLogin',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);
    return this.sanitizeUser(savedUser);
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }
    await this.userRepository.remove(user);
  }

  async updateAvatar(id: number, avatarUrl: string): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }
    user.avatarUrl = avatarUrl;
    const savedUser = await this.userRepository.save(user);
    return this.sanitizeUser(savedUser);
  }

  /**
   * Remove sensitive fields from user object
   */
  sanitizeUser(user: User): Partial<User> {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  async getStats() {
    const stats = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    const total = await this.userRepository.count();

    return { total, byRole: stats };
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    // Check new password is different
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.passwordHash,
    );
    if (isSamePassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    // Hash and save new password
    user.passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.userRepository.save(user);

    return { message: 'Đổi mật khẩu thành công' };
  }

  /**
   * Soft delete user (deactivate instead of hard delete)
   */
  async softDelete(id: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    user.isActive = false;
    await this.userRepository.save(user);

    return { message: 'User đã bị vô hiệu hóa' };
  }
}
