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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto, JoinClassDto, QueryClassDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '@modules/auth/guards';
import { CurrentUser, Roles } from '@modules/auth/decorators';
import { User, UserRole } from '@modules/users/entities/user.entity';

@ApiTags('Classes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

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
}
