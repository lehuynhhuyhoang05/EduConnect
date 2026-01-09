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
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ClassesService } from './classes.service';
import { ClassAnnouncementsService } from './class-announcements.service';
import { GradebookService } from './gradebook.service';
import { CreateClassDto, UpdateClassDto, JoinClassDto, QueryClassDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '@modules/auth/guards';
import { CurrentUser, Roles } from '@modules/auth/decorators';
import { User, UserRole } from '@modules/users/entities/user.entity';

@ApiTags('Classes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('classes')
export class ClassesController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly announcementsService: ClassAnnouncementsService,
    private readonly gradebookService: GradebookService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Tạo lớp học mới (Giáo viên)' })
  @ApiResponse({
    status: 201,
    description: 'Lớp học được tạo thành công',
    schema: {
      example: {
        id: 1,
        name: 'Lập trình Web - K20',
        description: 'Học React và Node.js',
        classCode: 'ABC123',
        subject: 'Lập trình Web',
        memberCount: 1,
        isActive: true,
        teacherId: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Chỉ giáo viên mới có thể tạo lớp' })
  async create(
    @Body() createClassDto: CreateClassDto,
    @CurrentUser() user: User,
  ) {
    return this.classesService.create(createClassDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách lớp học' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách lớp học',
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'Lập trình Web',
            classCode: 'ABC123',
            memberCount: 25,
            teacher: { id: 1, fullName: 'Nguyen Van A' },
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      },
    },
  })
  async findAll(@Query() query: QueryClassDto, @CurrentUser() user: User) {
    return this.classesService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết lớp học' })
  @ApiParam({ name: 'id', description: 'ID lớp học' })
  @ApiResponse({ status: 200, description: 'Chi tiết lớp học' })
  @ApiResponse({ status: 404, description: 'Lớp học không tồn tại' })
  @ApiResponse({ status: 403, description: 'Không phải thành viên lớp' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.classesService.findOne(id, user);
  }

  @Post('join')
  @ApiOperation({ summary: 'Tham gia lớp học bằng mã lớp' })
  @ApiResponse({
    status: 201,
    description: 'Tham gia lớp thành công',
    schema: {
      example: {
        id: 1,
        classId: 1,
        userId: 2,
        role: 'STUDENT',
        joinedAt: '2026-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Mã lớp không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Đã là thành viên của lớp' })
  async joinClass(
    @Body() joinClassDto: JoinClassDto,
    @CurrentUser() user: User,
  ) {
    return this.classesService.joinClass(joinClassDto, user);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Lấy danh sách thành viên lớp' })
  @ApiParam({ name: 'id', description: 'ID lớp học' })
  @ApiResponse({ status: 200, description: 'Danh sách thành viên' })
  @ApiResponse({ status: 403, description: 'Không phải thành viên lớp' })
  async getMembers(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.classesService.getMembers(id, user);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Cập nhật thông tin lớp học (Giáo viên)' })
  @ApiParam({ name: 'id', description: 'ID lớp học' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không phải giáo viên của lớp' })
  @ApiResponse({ status: 404, description: 'Lớp học không tồn tại' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClassDto: UpdateClassDto,
    @CurrentUser() user: User,
  ) {
    return this.classesService.update(id, updateClassDto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa/Vô hiệu hóa lớp học (Giáo viên)' })
  @ApiParam({ name: 'id', description: 'ID lớp học' })
  @ApiResponse({ status: 204, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không phải giáo viên của lớp' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.classesService.remove(id, user);
  }

  @Post(':id/reactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kích hoạt lại lớp học (Giáo viên)' })
  @ApiParam({ name: 'id', description: 'ID lớp học' })
  @ApiResponse({ status: 200, description: 'Kích hoạt lại thành công' })
  @ApiResponse({ status: 400, description: 'Lớp đã đang hoạt động' })
  @ApiResponse({ status: 403, description: 'Không phải giáo viên của lớp' })
  async reactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.classesService.reactivate(id, user);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rời khỏi lớp học (Học sinh)' })
  @ApiParam({ name: 'id', description: 'ID lớp học' })
  @ApiResponse({ status: 200, description: 'Rời lớp thành công' })
  @ApiResponse({ status: 400, description: 'Giáo viên không thể rời lớp' })
  async leaveClass(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.classesService.leaveClass(id, user);
    return { message: 'Đã rời khỏi lớp học' };
  }

  @Delete(':id/members/:studentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa học sinh khỏi lớp (Giáo viên)' })
  @ApiParam({ name: 'id', description: 'ID lớp học' })
  @ApiParam({ name: 'studentId', description: 'ID học sinh' })
  @ApiResponse({ status: 204, description: 'Xóa thành viên thành công' })
  @ApiResponse({ status: 403, description: 'Không phải giáo viên của lớp' })
  async removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @CurrentUser() user: User,
  ) {
    await this.classesService.removeMember(id, studentId, user);
  }

  // ===================== CLASS ANNOUNCEMENTS =====================

  @Post(':id/announcements')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Tạo thông báo lớp học (Giáo viên)' })
  @ApiParam({ name: 'id', description: 'ID lớp học' })
  @ApiResponse({ status: 201, description: 'Thông báo được tạo' })
  createAnnouncement(
    @Param('id', ParseIntPipe) classId: number,
    @CurrentUser() user: User,
    @Body() data: {
      title: string;
      content: string;
      isPinned?: boolean;
      scheduledAt?: Date;
      expiresAt?: Date;
      priority?: 'normal' | 'important' | 'urgent';
      allowComments?: boolean;
    },
  ) {
    return this.announcementsService.createAnnouncement(classId, user.id, data, user.fullName);
  }

  @Get(':id/announcements')
  @ApiOperation({ summary: 'Lấy danh sách thông báo lớp' })
  @ApiParam({ name: 'id', description: 'ID lớp học' })
  @ApiResponse({ status: 200, description: 'Danh sách thông báo' })
  getAnnouncements(
    @Param('id', ParseIntPipe) classId: number,
    @Query('onlyPinned') onlyPinned?: string,
  ) {
    return this.announcementsService.getClassAnnouncements(classId, {
      onlyPinned: onlyPinned === 'true',
    });
  }

  @Get(':id/announcements/unread')
  @ApiOperation({ summary: 'Lấy số thông báo chưa đọc' })
  @ApiParam({ name: 'id', description: 'ID lớp học' })
  @ApiResponse({ status: 200, description: 'Số thông báo chưa đọc' })
  getUnreadCount(
    @Param('id', ParseIntPipe) classId: number,
    @CurrentUser() user: User,
  ) {
    return { count: this.announcementsService.getUnreadCount(classId, user.id) };
  }

  @Put(':id/announcements/:announcementId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Cập nhật thông báo (Giáo viên)' })
  @ApiResponse({ status: 200, description: 'Thông báo được cập nhật' })
  updateAnnouncement(
    @Param('announcementId') announcementId: string,
    @CurrentUser() user: User,
    @Body() data: {
      title?: string;
      content?: string;
      isPinned?: boolean;
      priority?: 'normal' | 'important' | 'urgent';
    },
  ) {
    return this.announcementsService.updateAnnouncement(announcementId, user.id, data);
  }

  @Delete(':id/announcements/:announcementId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa thông báo (Giáo viên)' })
  @ApiResponse({ status: 204, description: 'Đã xóa thông báo' })
  deleteAnnouncement(
    @Param('announcementId') announcementId: string,
    @CurrentUser() user: User,
  ) {
    this.announcementsService.deleteAnnouncement(announcementId, user.id);
  }

  @Post(':id/announcements/:announcementId/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc thông báo' })
  @ApiResponse({ status: 200, description: 'Đã đánh dấu đọc' })
  markAsRead(
    @Param('announcementId') announcementId: string,
    @CurrentUser() user: User,
  ) {
    return { success: this.announcementsService.markAsRead(announcementId, user.id) };
  }

  @Post(':id/announcements/:announcementId/comments')
  @ApiOperation({ summary: 'Thêm bình luận vào thông báo' })
  @ApiResponse({ status: 201, description: 'Bình luận được thêm' })
  addComment(
    @Param('announcementId') announcementId: string,
    @CurrentUser() user: User,
    @Body() data: { content: string },
  ) {
    return this.announcementsService.addComment(announcementId, user.id, data.content, user.fullName);
  }

  @Post(':id/announcements/:announcementId/pin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Ghim/bỏ ghim thông báo' })
  @ApiResponse({ status: 200, description: 'Đã thay đổi trạng thái ghim' })
  togglePinAnnouncement(
    @Param('announcementId') announcementId: string,
    @CurrentUser() user: User,
  ) {
    return { isPinned: this.announcementsService.togglePin(announcementId, user.id) };
  }

  // ===================== GRADEBOOK =====================

  @Get(':id/gradebook')
  @ApiOperation({ summary: 'Lấy bảng điểm lớp học' })
  @ApiParam({ name: 'id', description: 'ID lớp học' })
  @ApiResponse({ status: 200, description: 'Bảng điểm' })
  getGradebook(@Param('id', ParseIntPipe) classId: number) {
    return this.gradebookService.getGradebook(classId);
  }

  @Get(':id/gradebook/students')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Lấy điểm tất cả học sinh (Giáo viên)' })
  @ApiResponse({ status: 200, description: 'Điểm học sinh' })
  getAllStudentGrades(@Param('id', ParseIntPipe) classId: number) {
    return this.gradebookService.getAllStudentGrades(classId);
  }

  @Get(':id/gradebook/my-grades')
  @ApiOperation({ summary: 'Lấy điểm của bản thân' })
  @ApiResponse({ status: 200, description: 'Điểm cá nhân' })
  getMyGrades(
    @Param('id', ParseIntPipe) classId: number,
    @CurrentUser() user: User,
  ) {
    return this.gradebookService.getStudentGradebook(classId, user.id);
  }

  @Get(':id/gradebook/statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Thống kê điểm lớp (Giáo viên)' })
  @ApiResponse({ status: 200, description: 'Thống kê' })
  getGradebookStatistics(@Param('id', ParseIntPipe) classId: number) {
    return this.gradebookService.getClassStatistics(classId);
  }

  @Post(':id/gradebook/assignments')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Thêm bài tập vào bảng điểm' })
  @ApiResponse({ status: 201, description: 'Bài tập được thêm' })
  addAssignmentToGradebook(
    @Param('id', ParseIntPipe) classId: number,
    @Body() data: {
      id: number;
      title: string;
      category?: string;
      maxScore: number;
      weight?: number;
      dueDate?: Date;
    },
  ) {
    this.gradebookService.addAssignment(classId, data);
    return { success: true };
  }

  @Post(':id/gradebook/grades')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Ghi điểm cho học sinh' })
  @ApiResponse({ status: 200, description: 'Điểm được ghi' })
  recordGrade(
    @Param('id', ParseIntPipe) classId: number,
    @CurrentUser() user: User,
    @Body() data: {
      assignmentId: number;
      userId: number;
      score: number;
      submissionId?: number;
      submittedAt?: Date;
      isLate?: boolean;
      comments?: string;
    },
  ) {
    return this.gradebookService.recordGrade(classId, data.assignmentId, data.userId, {
      score: data.score,
      submissionId: data.submissionId,
      submittedAt: data.submittedAt,
      gradedBy: user.id,
      isLate: data.isLate,
      comments: data.comments,
    });
  }

  @Post(':id/gradebook/excuse')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Miễn điểm cho học sinh' })
  @ApiResponse({ status: 200, description: 'Đã miễn điểm' })
  excuseStudent(
    @Param('id', ParseIntPipe) classId: number,
    @Body() data: { assignmentId: number; userId: number },
  ) {
    return { success: this.gradebookService.excuseStudent(classId, data.assignmentId, data.userId) };
  }

  @Put(':id/gradebook/policy')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Cập nhật chính sách điểm' })
  @ApiResponse({ status: 200, description: 'Chính sách được cập nhật' })
  updateGradingPolicy(
    @Param('id', ParseIntPipe) classId: number,
    @Body() policy: {
      latePenaltyPerDay?: number;
      maxLatePenalty?: number;
      passThreshold?: number;
    },
  ) {
    return this.gradebookService.updatePolicy(classId, policy);
  }

  @Get(':id/gradebook/export')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Xuất bảng điểm CSV' })
  @ApiResponse({ status: 200, description: 'CSV data' })
  exportGradebook(@Param('id', ParseIntPipe) classId: number, @Res() res: Response) {
    const csv = this.gradebookService.exportGradebook(classId);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="gradebook-class-${classId}.csv"`,
    });
    res.send(csv);
  }
}
