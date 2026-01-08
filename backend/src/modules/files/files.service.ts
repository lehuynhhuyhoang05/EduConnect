import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './entities';
import { QueryFileDto, FileType } from './dto';
import { User } from '@modules/users/entities/user.entity';
import { randomBytes } from 'crypto';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

// Allowed file types and max sizes
const FILE_CONFIG = {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
    'image/tiff',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    'application/rtf',
    // Video
    'video/mp4',
    'video/webm',
    'video/avi',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/3gpp',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/flac',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    'application/x-tar',
    // Code files
    'application/javascript',
    'application/typescript',
    'application/x-python',
    'application/java-archive',
    'text/x-python', // .py files
    'text/x-java-source', // .java files  
    'text/x-c', // .c files
    'text/x-c++src', // .cpp files
    'text/x-csharp', // .cs files
    'text/x-go', // .go files
    'text/x-rust', // .rs files
    'text/x-php', // .php files
    'text/x-ruby', // .rb files
    'text/x-swift', // .swift files
    'text/x-kotlin', // .kt files
    'text/x-scala', // .scala files
    'text/markdown', // .md files
    'text/x-sql', // .sql files
    'text/x-yaml', // .yaml files
    // Other common formats
    'application/octet-stream', // Generic binary - allow for unknown types
  ],
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private uploadDir: string;

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {
    // Create uploads directory if not exists
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fsSync.existsSync(this.uploadDir)) {
      fsSync.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Get file type category from mime type
   */
  private getFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType.startsWith('video/')) return FileType.VIDEO;
    if (mimeType.startsWith('audio/')) return FileType.AUDIO;
    if (
      mimeType.includes('pdf') ||
      mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('powerpoint') ||
      mimeType.includes('text/')
    ) {
      return FileType.DOCUMENT;
    }
    return FileType.OTHER;
  }

  /**
   * Generate unique stored filename
   */
  private generateStoredName(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    return `${timestamp}-${random}${ext}`;
  }

  /**
   * Upload a file
   */
  async upload(
    fileData: Express.Multer.File,
    user: User,
  ): Promise<File> {
    // Validate file
    if (!fileData) {
      throw new BadRequestException('Không có file được upload');
    }

    if (fileData.size > FILE_CONFIG.maxSize) {
      throw new BadRequestException(
        `File quá lớn. Kích thước tối đa là ${FILE_CONFIG.maxSize / 1024 / 1024}MB`,
      );
    }

    if (!FILE_CONFIG.allowedMimeTypes.includes(fileData.mimetype)) {
      throw new BadRequestException('Loại file không được hỗ trợ');
    }

    const storedName = this.generateStoredName(fileData.originalname);
    const filePath = path.join(this.uploadDir, storedName);

    // Save file to disk asynchronously
    await fs.writeFile(filePath, fileData.buffer);

    // Create database record
    const file = this.fileRepository.create({
      originalName: fileData.originalname,
      storedName,
      path: `/uploads/${storedName}`,
      mimeType: fileData.mimetype,
      size: fileData.size,
      uploadedBy: user.id,
    });

    const savedFile = await this.fileRepository.save(file);
    this.logger.log(`File uploaded: ${fileData.originalname} (${fileData.size} bytes) by user ${user.id}`);
    return savedFile;
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(
    files: Express.Multer.File[],
    user: User,
  ): Promise<File[]> {
    const uploadedFiles: File[] = [];

    for (const file of files) {
      const uploaded = await this.upload(file, user);
      uploadedFiles.push(uploaded);
    }

    return uploadedFiles;
  }

  /**
   * Find all files with filters
   */
  async findAll(query: QueryFileDto, user: User) {
    const { type, uploadedBy, page = 1, limit = 20 } = query;

    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .leftJoinAndSelect('file.uploader', 'uploader');

    // Filter by file type
    if (type) {
      switch (type) {
        case FileType.IMAGE:
          queryBuilder.andWhere('file.mimeType LIKE :type', { type: 'image/%' });
          break;
        case FileType.VIDEO:
          queryBuilder.andWhere('file.mimeType LIKE :type', { type: 'video/%' });
          break;
        case FileType.AUDIO:
          queryBuilder.andWhere('file.mimeType LIKE :type', { type: 'audio/%' });
          break;
        case FileType.DOCUMENT:
          queryBuilder.andWhere(
            '(file.mimeType LIKE :pdf OR file.mimeType LIKE :word OR file.mimeType LIKE :excel OR file.mimeType LIKE :text)',
            { pdf: '%pdf%', word: '%word%', excel: '%excel%', text: 'text/%' },
          );
          break;
      }
    }

    // Filter by uploader
    if (uploadedBy) {
      queryBuilder.andWhere('file.uploadedBy = :uploadedBy', { uploadedBy });
    }

    const [files, total] = await queryBuilder
      .select([
        'file.id',
        'file.originalName',
        'file.storedName',
        'file.path',
        'file.mimeType',
        'file.size',
        'file.uploadedAt',
        'uploader.id',
        'uploader.fullName',
        'uploader.email',
      ])
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('file.uploadedAt', 'DESC')
      .getManyAndCount();

    return {
      data: files,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Sanitize user object to remove sensitive fields
   */
  private sanitizeUser(user: any): any {
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Find file by ID
   */
  async findOne(id: number): Promise<any> {
    const file = await this.fileRepository.findOne({
      where: { id },
      relations: ['uploader'],
    });

    if (!file) {
      throw new NotFoundException('File không tồn tại');
    }

    return {
      ...file,
      uploader: this.sanitizeUser(file.uploader),
    };
  }

  /**
   * Get file path for download
   */
  async getFilePath(id: number): Promise<{ path: string; originalName: string }> {
    const file = await this.findOne(id);
    const absolutePath = path.join(this.uploadDir, file.storedName);

    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException('File không tồn tại trên server');
    }

    return {
      path: absolutePath,
      originalName: file.originalName,
    };
  }

  /**
   * Delete a file
   */
  async remove(id: number, user: User): Promise<void> {
    const file = await this.findOne(id);

    // Only uploader can delete
    if (file.uploadedBy !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xóa file này');
    }

    // Delete from disk asynchronously
    const absolutePath = path.join(this.uploadDir, file.storedName);
    try {
      await fs.unlink(absolutePath);
    } catch {
      // File may not exist, continue with DB deletion
    }

    // Delete from database
    await this.fileRepository.remove(file);
    this.logger.log(`File deleted: ${file.originalName} by user ${user.id}`);
  }

  /**
   * Get file info without uploader check (for internal use)
   */
  async getFileById(id: number): Promise<File> {
    return this.findOne(id);
  }
}
