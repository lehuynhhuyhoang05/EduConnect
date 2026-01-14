import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, BulkCreateUsersDto } from './dto';
import { Public } from './decorators';
import { JwtAuthGuard } from './guards';
import { CurrentUser } from './decorators';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Extract request info for token tracking
   */
  private getRequestInfo(req: Request) {
    return {
      userAgent: req.headers['user-agent'] || undefined,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || undefined,
    };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        user: {
          id: 1,
          email: 'user@example.com',
          fullName: 'Nguyen Van A',
          role: 'STUDENT',
          isVerified: false,
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'secure-random-token...',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    return this.authService.register(registerDto, this.getRequestInfo(req));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        user: {
          id: 1,
          email: 'user@example.com',
          fullName: 'Nguyen Van A',
          role: 'STUDENT',
          isVerified: true,
          isActive: true,
          lastLogin: '2026-01-01T00:00:00.000Z',
        },
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'secure-random-token...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account deactivated' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDto, this.getRequestInfo(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'new-secure-random-token...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken, this.getRequestInfo(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout (revoke refresh token)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    await this.authService.logout(refreshTokenDto.refreshToken);
    return { message: 'Đăng xuất thành công' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(@CurrentUser() user: User) {
    await this.authService.logoutAll(user.id);
    return { message: 'Đã đăng xuất khỏi tất cả thiết bị' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        fullName: 'Nguyen Van A',
        role: 'STUDENT',
        isVerified: true,
        isActive: true,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: User) {
    return this.usersService.sanitizeUser(user);
  }

  /**
   * LOAD TEST ONLY: Bulk create test users
   * ⚠️ This endpoint should be disabled in production
   */
  @Public()
  @Post('test/bulk-create-users')
  @ApiOperation({ 
    summary: '[LOAD TEST] Bulk create test users',
    description: '⚠️ For load testing only. Creates multiple test users at once without rate limiting.'
  })
  @ApiResponse({
    status: 201,
    description: 'Test users created successfully',
    schema: {
      example: {
        success: true,
        created: 100,
        users: [
          {
            id: 1,
            username: 'loadtest_user_0',
            email: 'loadtest0@test.com',
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          }
        ]
      }
    }
  })
  async bulkCreateTestUsers(@Body() bulkCreateDto: BulkCreateUsersDto) {
    const users = [];
    const password = 'Test123!@#';

    for (let i = 0; i < bulkCreateDto.count; i++) {
      try {
        const username = `loadtest_user_${Date.now()}_${i}`;
        const email = `loadtest_${Date.now()}_${i}@test.com`;

        const result = await this.authService.register({
          username,
          email,
          password,
          fullName: `Load Test User ${i}`,
          role: 'student',
        }, {});

        users.push({
          id: result.user.id,
          username,
          email,
          token: result.tokens.accessToken,
        });
      } catch (error) {
        // Continue on error
        console.error(`Failed to create user ${i}:`, error.message);
      }
    }

    return {
      success: true,
      created: users.length,
      users,
    };
  }
}
