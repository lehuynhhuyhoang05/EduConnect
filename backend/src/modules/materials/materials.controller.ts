import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { User } from '@modules/users/entities/user.entity';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CreateMaterialDto, QueryMaterialDto, UpdateMaterialDto } from './dto';
import { MaterialsService } from './materials.service';

@ApiTags('Materials')
@Controller('classes/:classId/materials')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload tài liệu mới cho lớp học' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        title: {
          type: 'string',
          description: 'Tiêu đề tài liệu',
        },
        description: {
          type: 'string',
          description: 'Mô tả tài liệu',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Upload thành công' })
  @ApiResponse({ status: 400, description: 'File không hợp lệ' })
  @ApiResponse({ status: 403, description: 'Chỉ giáo viên mới có thể upload' })
  async upload(
    @Param('classId', ParseIntPipe) classId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() createMaterialDto: CreateMaterialDto,
    @CurrentUser() user: User,
  ) {
    return this.materialsService.upload(classId, file, createMaterialDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tài liệu của lớp' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiResponse({ status: 200, description: 'Danh sách tài liệu' })
  @ApiResponse({ status: 403, description: 'Không phải thành viên lớp' })
  async findAll(
    @Param('classId', ParseIntPipe) classId: number,
    @Query() query: QueryMaterialDto,
    @CurrentUser() user: User,
  ) {
    return this.materialsService.findByClass(classId, query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết tài liệu' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiParam({ name: 'id', description: 'ID tài liệu' })
  @ApiResponse({ status: 200, description: 'Thông tin tài liệu' })
  @ApiResponse({ status: 404, description: 'Tài liệu không tồn tại' })
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.materialsService.findOne(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin tài liệu' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiParam({ name: 'id', description: 'ID tài liệu' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMaterialDto: UpdateMaterialDto,
    @CurrentUser() user: User,
  ) {
    return this.materialsService.update(id, updateMaterialDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài liệu' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiParam({ name: 'id', description: 'ID tài liệu' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Chỉ giáo viên mới có thể xóa' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    await this.materialsService.remove(id, user);
    return { message: 'Đã xóa tài liệu thành công' };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Tải xuống tài liệu' })
  @ApiParam({ name: 'classId', description: 'ID lớp học' })
  @ApiParam({ name: 'id', description: 'ID tài liệu' })
  @ApiResponse({ status: 200, description: 'File được tải xuống' })
  @ApiResponse({ status: 404, description: 'File không tồn tại' })
  async download(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const { filePath, fileName } = await this.materialsService.download(id, user);
    res.download(filePath, fileName);
  }
}
