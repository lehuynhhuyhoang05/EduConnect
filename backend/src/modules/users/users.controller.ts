import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { User, UserRole } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.TEACHER) // Only teachers can create users (students)
  @ApiOperation({ summary: 'Create new user (Teacher only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Teacher only' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get('stats')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get user statistics (Teacher only)' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  async getStats() {
    return this.usersService.getStats();
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getProfile(@CurrentUser() user: User) {
    return this.usersService.findOne(user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // Users can only update their own profile (name, avatar)
    // Cannot change isActive or isVerified
    const safeUpdate: UpdateUserDto = {
      fullName: updateUserDto.fullName,
      avatarUrl: updateUserDto.avatarUrl,
    };
    return this.usersService.update(user.id, safeUpdate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Update user (Teacher only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete user (Teacher only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.remove(id);
    return { message: 'User đã được xóa' };
  }
}
