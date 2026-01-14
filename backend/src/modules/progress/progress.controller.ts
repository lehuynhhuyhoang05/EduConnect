import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { CurrentUser, Roles } from '@modules/auth/decorators';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { ProgressService } from './progress.service';
import { LogActivityDto } from './dto';

@ApiTags('Progress')
@Controller('progress')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('activity')
  @ApiOperation({ summary: 'Log a learning activity' })
  async logActivity(@Body() dto: LogActivityDto, @CurrentUser() user: User) {
    return this.progressService.logActivity(dto, user.id);
  }

  @Get('my/:classId')
  @ApiOperation({ summary: 'Get my progress for a class' })
  async getMyProgress(
    @Param('classId', ParseIntPipe) classId: number,
    @CurrentUser() user: User,
  ) {
    return this.progressService.getStudentProgress(user.id, classId);
  }

  @Get('class/:classId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all student progress for a class (Teacher view)' })
  async getClassProgress(@Param('classId', ParseIntPipe) classId: number) {
    return this.progressService.getClassProgress(classId);
  }

  @Get('activity-history')
  @ApiOperation({ summary: 'Get activity history' })
  async getActivityHistory(
    @CurrentUser() user: User,
    @Query('classId') classId?: number,
    @Query('limit') limit?: number,
  ) {
    return this.progressService.getActivityHistory(user.id, classId, limit);
  }

  @Get('chart')
  @ApiOperation({ summary: 'Get activity chart data' })
  async getActivityChart(
    @CurrentUser() user: User,
    @Query('classId') classId?: number,
    @Query('days') days?: number,
  ) {
    return this.progressService.getActivityChart(user.id, classId, days);
  }

  @Get('leaderboard/:classId')
  @ApiOperation({ summary: 'Get class leaderboard' })
  async getLeaderboard(
    @Param('classId', ParseIntPipe) classId: number,
    @Query('limit') limit?: number,
  ) {
    return this.progressService.getLeaderboard(classId, limit);
  }

  @Get('engagement')
  @ApiOperation({ summary: 'Get engagement metrics' })
  async getEngagementMetrics(
    @CurrentUser() user: User,
    @Query('classId') classId?: number,
  ) {
    return this.progressService.getEngagementMetrics(user.id, classId);
  }
}
