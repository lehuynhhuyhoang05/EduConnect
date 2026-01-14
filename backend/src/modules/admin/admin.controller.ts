import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard, RolesGuard } from '@modules/auth/guards';
import { Roles } from '@modules/auth/decorators';
import { UserRole } from '@modules/users/entities/user.entity';
import { UpdateUserStatusDto, UpdateUserRoleDto, BulkUpdateUsersDto } from './dto';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER) // Sử dụng TEACHER thay vì ADMIN (hệ thống không có role ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ===================== DASHBOARD =====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/activity')
  @ApiOperation({ summary: 'Get system activity for the last N days' })
  @ApiResponse({ status: 200, description: 'System activity data' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getSystemActivity(@Query('days') days?: number) {
    return this.adminService.getSystemActivity(days || 7);
  }

  @Get('dashboard/recent')
  @ApiOperation({ summary: 'Get recent system activities' })
  @ApiResponse({ status: 200, description: 'Recent activities' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentActivities(@Query('limit') limit?: number) {
    return this.adminService.getRecentActivities(limit || 50);
  }

  // ===================== USERS MANAGEMENT =====================

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'List of users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  async getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: boolean,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.adminService.getAllUsers({
      page,
      limit,
      search,
      role,
      isActive,
      sortBy,
      sortOrder,
    });
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Update user active status' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  async updateUserStatus(
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(userId, dto.isActive);
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiResponse({ status: 200, description: 'User role updated' })
  async updateUserRole(
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(userId, dto.role);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  async deleteUser(@Param('id', ParseIntPipe) userId: number) {
    return this.adminService.deleteUser(userId);
  }

  @Put('users/bulk')
  @ApiOperation({ summary: 'Bulk update users' })
  @ApiResponse({ status: 200, description: 'Users updated' })
  async bulkUpdateUsers(@Body() dto: BulkUpdateUsersDto) {
    await this.adminService.bulkUpdateUsers(dto.userIds, {
      isActive: dto.isActive,
      role: dto.role,
    });
    return { message: 'Users updated successfully' };
  }

  // ===================== CLASSES MANAGEMENT =====================

  @Get('classes')
  @ApiOperation({ summary: 'Get all classes with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'List of classes' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  async getAllClasses(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.adminService.getAllClasses({
      page,
      limit,
      search,
      isActive,
      sortBy,
      sortOrder,
    });
  }

  @Delete('classes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete class (soft delete)' })
  @ApiResponse({ status: 204, description: 'Class deleted' })
  async deleteClass(@Param('id', ParseIntPipe) classId: number) {
    return this.adminService.deleteClass(classId);
  }

  // ===================== ANALYTICS =====================

  @Get('analytics/top-teachers')
  @ApiOperation({ summary: 'Get top teachers by class count' })
  @ApiResponse({ status: 200, description: 'Top teachers' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopTeachers(@Query('limit') limit?: number) {
    return this.adminService.getTopTeachers(limit || 10);
  }

  @Get('analytics/top-classes')
  @ApiOperation({ summary: 'Get top active classes by member count' })
  @ApiResponse({ status: 200, description: 'Top classes' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopClasses(@Query('limit') limit?: number) {
    return this.adminService.getTopClasses(limit || 10);
  }

  @Get('analytics/storage')
  @ApiOperation({ summary: 'Get storage statistics' })
  @ApiResponse({ status: 200, description: 'Storage statistics' })
  async getStorageStats() {
    return this.adminService.getStorageStats();
  }
}
