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
import { AssignmentsService } from './assignments.service';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  CreateSubmissionDto,
  GradeSubmissionDto,
  ReturnSubmissionDto,
  QueryAssignmentDto,
  QuerySubmissionDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '@modules/auth/guards';
import { CurrentUser, Roles } from '@modules/auth/decorators';
import { User, UserRole } from '@modules/users/entities/user.entity';

@ApiTags('Assignments')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // ===================== ASSIGNMENT ENDPOINTS =====================

  @Post('classes/:classId/assignments')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Create assignment in a class (Teacher only)' })
  @ApiResponse({ status: 201, description: 'Assignment created' })
  @ApiResponse({ status: 403, description: 'Only class teacher can create assignments' })
  async createAssignment(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() createDto: CreateAssignmentDto,
    @CurrentUser() user: User,
  ) {
    return this.assignmentsService.createAssignment(classId, createDto, user);
  }

  @Get('assignments')
  @ApiOperation({ summary: 'Get all assignments (from user\'s classes)' })
  @ApiResponse({ status: 200, description: 'List of assignments' })
  async findAllAssignments(
    @Query() query: QueryAssignmentDto,
    @CurrentUser() user: User,
  ) {
    return this.assignmentsService.findAllAssignments(query, user);
  }

  @Get('classes/:classId/assignments')
  @ApiOperation({ summary: 'Get all assignments in a class' })
  @ApiResponse({ status: 200, description: 'List of assignments' })
  async findClassAssignments(
    @Param('classId', ParseIntPipe) classId: number,
    @Query() query: QueryAssignmentDto,
    @CurrentUser() user: User,
  ) {
    return this.assignmentsService.findAllAssignments({ ...query, classId }, user);
  }

  @Get('assignments/:id')
  @ApiOperation({ summary: 'Get assignment details' })
  @ApiResponse({ status: 200, description: 'Assignment details' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async findOneAssignment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.assignmentsService.findOneAssignment(id, user);
  }

  @Put('assignments/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Update assignment (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Assignment updated' })
  @ApiResponse({ status: 403, description: 'Only creator can update' })
  async updateAssignment(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAssignmentDto,
    @CurrentUser() user: User,
  ) {
    return this.assignmentsService.updateAssignment(id, updateDto, user);
  }

  @Delete('assignments/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete/deactivate assignment (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Assignment deleted' })
  @ApiResponse({ status: 403, description: 'Only creator can delete' })
  async removeAssignment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.assignmentsService.removeAssignment(id, user);
    return { message: 'Bài tập đã được xóa' };
  }

  // ===================== SUBMISSION ENDPOINTS =====================

  @Post('assignments/:id/submit')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit assignment (Student only)' })
  @ApiResponse({ status: 201, description: 'Submission created' })
  @ApiResponse({ status: 409, description: 'Already submitted and graded' })
  async submitAssignment(
    @Param('id', ParseIntPipe) assignmentId: number,
    @Body() submitDto: CreateSubmissionDto,
    @CurrentUser() user: User,
  ) {
    return this.assignmentsService.submitAssignment(assignmentId, submitDto, user);
  }

  @Get('assignments/:id/submissions')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all submissions for an assignment (Teacher only)' })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  async getSubmissions(
    @Param('id', ParseIntPipe) assignmentId: number,
    @Query() query: QuerySubmissionDto,
    @CurrentUser() user: User,
  ) {
    return this.assignmentsService.getSubmissions(assignmentId, query, user);
  }

  @Get('assignments/:id/my-submission')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get my submission for an assignment (Student only)' })
  @ApiResponse({ status: 200, description: 'My submission or null' })
  async getMySubmission(
    @Param('id', ParseIntPipe) assignmentId: number,
    @CurrentUser() user: User,
  ) {
    return this.assignmentsService.getMySubmission(assignmentId, user);
  }

  @Post('submissions/:id/grade')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Grade a submission (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Submission graded' })
  @ApiResponse({ status: 400, description: 'Score exceeds max score' })
  async gradeSubmission(
    @Param('id', ParseIntPipe) submissionId: number,
    @Body() gradeDto: GradeSubmissionDto,
    @CurrentUser() user: User,
  ) {
    return this.assignmentsService.gradeSubmission(submissionId, gradeDto, user);
  }

  @Post('submissions/:id/return')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Return submission for revision (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Submission returned' })
  async returnSubmission(
    @Param('id', ParseIntPipe) submissionId: number,
    @Body() returnDto: ReturnSubmissionDto,
    @CurrentUser() user: User,
  ) {
    return this.assignmentsService.returnSubmission(submissionId, returnDto, user);
  }

  // ===================== STATISTICS =====================

  @Get('assignments/:id/stats')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get assignment statistics (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Assignment statistics' })
  async getAssignmentStats(
    @Param('id', ParseIntPipe) assignmentId: number,
    @CurrentUser() user: User,
  ) {
    return this.assignmentsService.getAssignmentStats(assignmentId, user);
  }
}
