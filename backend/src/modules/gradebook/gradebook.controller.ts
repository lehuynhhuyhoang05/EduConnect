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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { CurrentUser, Roles } from '@modules/auth/decorators';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { GradebookService } from './gradebook.service';
import { CreateGradeItemDto, UpdateGradeEntryDto, BulkUpdateGradesDto } from './dto';

@ApiTags('Gradebook')
@Controller('gradebook')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GradebookController {
  constructor(private readonly gradebookService: GradebookService) {}

  @Post('items')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a grade item (column in gradebook)' })
  async createGradeItem(@Body() dto: CreateGradeItemDto) {
    return this.gradebookService.createGradeItem(dto);
  }

  @Get('class/:classId')
  @ApiOperation({ summary: 'Get complete gradebook for a class (Teacher view)' })
  async getGradebook(@Param('classId', ParseIntPipe) classId: number) {
    return this.gradebookService.getGradebook(classId);
  }

  @Get('class/:classId/student')
  @ApiOperation({ summary: 'Get student own grades (Student view)' })
  async getStudentGrades(
    @Param('classId', ParseIntPipe) classId: number,
    @CurrentUser() user: User,
  ) {
    return this.gradebookService.getStudentGrades(classId, user.id);
  }

  @Get('class/:classId/items')
  @ApiOperation({ summary: 'Get grade items for a class' })
  async getGradeItems(@Param('classId', ParseIntPipe) classId: number) {
    return this.gradebookService.getGradeItemsByClass(classId);
  }

  @Put('items/:gradeItemId/student/:studentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Update a single grade entry' })
  async updateGradeEntry(
    @Param('gradeItemId', ParseIntPipe) gradeItemId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: UpdateGradeEntryDto,
    @CurrentUser() user: User,
  ) {
    return this.gradebookService.updateGradeEntry(gradeItemId, studentId, dto, user.id);
  }

  @Put('bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Bulk update grades for a grade item' })
  async bulkUpdateGrades(@Body() dto: BulkUpdateGradesDto, @CurrentUser() user: User) {
    return this.gradebookService.bulkUpdateGrades(dto, user.id);
  }

  @Delete('items/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete a grade item' })
  async deleteGradeItem(@Param('id', ParseIntPipe) id: number) {
    await this.gradebookService.deleteGradeItem(id);
    return { success: true };
  }

  @Get('class/:classId/statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get class grade statistics' })
  async getClassStatistics(@Param('classId', ParseIntPipe) classId: number) {
    return this.gradebookService.getClassStatistics(classId);
  }

  @Get('class/:classId/export')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Export gradebook to CSV' })
  async exportGradebook(
    @Param('classId', ParseIntPipe) classId: number,
    @Res() res: Response,
  ) {
    const csv = await this.gradebookService.exportGradebook(classId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=gradebook-class-${classId}.csv`);
    res.send(csv);
  }
}
