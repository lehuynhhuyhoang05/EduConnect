import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { User } from '@modules/users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto, LoginDto } from './dto';

export interface JwtPayload {
  sub: number; // user id (INT)
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RequestInfo {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    registerDto: RegisterDto,
    requestInfo?: RequestInfo,
  ): Promise<{ user: Partial<User>; tokens: AuthTokens }> {
    const { email, password, fullName, role } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Hash password with bcrypt (cost factor 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email,
      passwordHash,
      fullName,
      role: role || undefined,
      isVerified: false, // Will be verified via OTP later
      isActive: true,
    });

    await this.userRepository.save(user);

    this.logger.log(`New user registered: ${user.email} (${user.role})`);

    // Generate tokens
    const tokens = await this.generateTokens(user, requestInfo);

    // Return user without sensitive data
    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async login(
    loginDto: LoginDto,
    requestInfo?: RequestInfo,
  ): Promise<{ user: Partial<User>; tokens: AuthTokens }> {
    const { email, password } = loginDto;

    // Find user with password
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      this.logger.warn(`Failed login attempt for non-existent email: ${email}`);
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Check if user is active
    if (!user.isActive) {
      this.logger.warn(`Login attempt for deactivated account: ${email}`);
      throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt - wrong password: ${email}`);
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Update last login
    user.lastLogin = new Date();
    await this.userRepository.save(user);

    this.logger.log(`User logged in: ${user.email} from ${requestInfo?.ipAddress || 'unknown'}`);

    // Generate tokens
    const tokens = await this.generateTokens(user, requestInfo);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async refreshToken(
    refreshToken: string,
    requestInfo?: RequestInfo,
  ): Promise<AuthTokens> {
    // Find refresh token
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isRevoked: false },
      relations: ['user'],
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedException('Refresh token đã hết hạn');
    }

    // Check if user is still active
    if (!tokenRecord.user.isActive) {
      throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa');
    }

    // Revoke old token (Token Rotation)
    tokenRecord.isRevoked = true;
    await this.refreshTokenRepository.save(tokenRecord);

    // Generate new tokens
    return this.generateTokens(tokenRecord.user, requestInfo);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (tokenRecord) {
      tokenRecord.isRevoked = true;
      await this.refreshTokenRepository.save(tokenRecord);
    }
  }

  async logoutAll(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  private async generateTokens(
    user: User,
    requestInfo?: RequestInfo,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate access token (short-lived)
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
    });

    // Generate refresh token (cryptographically secure random string)
    const refreshToken = randomBytes(64).toString('hex');
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

    // Save refresh token with device info
    const tokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: refreshTokenExpiry,
      userAgent: requestInfo?.userAgent || null,
      ipAddress: requestInfo?.ipAddress || null,
    });
    await this.refreshTokenRepository.save(tokenEntity);

    return { accessToken, refreshToken };
  }

  async validateUser(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User không tồn tại');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Tài khoản đã bị vô hiệu hóa');
    }

    return user;
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Clean up expired tokens (should be called by cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .orWhere('is_revoked = :revoked', { revoked: true })
      .execute();

    const deleted = result.affected || 0;
    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} expired/revoked tokens`);
    }
    return deleted;
  }
}
