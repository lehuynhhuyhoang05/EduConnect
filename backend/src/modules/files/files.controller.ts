import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { FilesService } from './files.service';
import { QueryFileDto } from './dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';
import { File } from './entities';

// Helper to add URL to file response
const fileWithUrl = (file: File, req: Request) => ({
  ...file,
  url: `${req.protocol}://${req.get('host')}${file.path}`,
});

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload một file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Upload thành công' })
  @ApiResponse({ status: 400, description: 'File không hợp lệ' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const uploaded = await this.filesService.upload(file, user);
    return fileWithUrl(uploaded, req);
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({ summary: 'Upload nhiều files (tối đa 10)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Upload thành công' })
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const uploaded = await this.filesService.uploadMultiple(files, user);
    return uploaded.map(f => fileWithUrl(f, req));
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách files' })
  @ApiResponse({ status: 200, description: 'Danh sách files' })
  async findAll(@Query() query: QueryFileDto, @CurrentUser() user: User) {
    return this.filesService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin file' })
  @ApiResponse({ status: 200, description: 'Thông tin file' })
  @ApiResponse({ status: 404, description: 'File không tồn tại' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.filesService.findOne(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download file' })
  @ApiResponse({ status: 200, description: 'File được download' })
  @ApiResponse({ status: 404, description: 'File không tồn tại' })
  async downloadFile(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { path, originalName } = await this.filesService.getFilePath(id);
    res.download(path, originalName);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa file' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa' })
  @ApiResponse({ status: 404, description: 'File không tồn tại' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.filesService.remove(id, user);
    return { message: 'Đã xóa file thành công' };
  }
}
