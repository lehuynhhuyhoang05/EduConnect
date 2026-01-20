import { ClassesService } from '@modules/classes/classes.service';
import { User } from '@modules/users/entities/user.entity';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Repository } from 'typeorm';
import { CreateMaterialDto, QueryMaterialDto, UpdateMaterialDto } from './dto';
import { Material } from './entities';

// Allowed file types and max sizes
const FILE_CONFIG = {
  maxSize: 100 * 1024 * 1024, // 100MB for materials
  allowedMimeTypes: [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
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
    // Code files
    'text/x-python',
    'text/x-java',
    'text/x-c',
    'text/x-c++',
    'application/x-python-code',
    'application/x-ipynb+json',
    // Video
    'video/mp4',
    'video/webm',
    'video/mpeg',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Other
    'application/octet-stream',
  ],
};

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);
  private uploadDir: string;

  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    private readonly classesService: ClassesService,
  ) {
    // Create materials directory if not exists
    this.uploadDir = path.join(process.cwd(), 'uploads', 'materials');
    if (!fsSync.existsSync(this.uploadDir)) {
      fsSync.mkdirSync(this.uploadDir, { recursive: true });
    }
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
   * Get file type from extension
   */
  private getFileType(filename: string): string {
    const ext = path.extname(filename).toLowerCase().slice(1);
    const typeMap: Record<string, string> = {
      pdf: 'pdf',
      doc: 'doc',
      docx: 'doc',
      xls: 'excel',
      xlsx: 'excel',
      ppt: 'ppt',
      pptx: 'ppt',
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      webp: 'image',
      svg: 'image',
      mp4: 'video',
      webm: 'video',
      mpeg: 'video',
      mp3: 'audio',
      wav: 'audio',
      ogg: 'audio',
      zip: 'zip',
      rar: 'zip',
      '7z': 'zip',
      txt: 'text',
      csv: 'text',
      html: 'text',
      css: 'text',
      js: 'text',
      py: 'code',
      java: 'code',
      c: 'code',
      cpp: 'code',
      sql: 'sql',
      json: 'json',
    };
    return typeMap[ext] || 'other';
  }

  /**
   * Upload material file
   */
  async upload(
    classId: number,
    file: Express.Multer.File,
    createMaterialDto: CreateMaterialDto,
    user: User,
  ): Promise<Material> {
    // Check if user is teacher of the class
    const isTeacher = await this.classesService.isTeacher(classId, user.id);
    if (!isTeacher) {
      throw new ForbiddenException('Chỉ giáo viên mới có thể tải lên tài liệu');
    }

    // Validate file
    if (!file) {
      throw new BadRequestException('Không có file được upload');
    }

    this.logger.log(
      `Material upload - File: ${file.originalname}, Size: ${file.size}, Type: ${file.mimetype}`,
    );

    if (file.size > FILE_CONFIG.maxSize) {
      throw new BadRequestException(
        `File quá lớn. Kích thước tối đa là ${FILE_CONFIG.maxSize / 1024 / 1024}MB`,
      );
    }

    if (!FILE_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Loại file không được hỗ trợ: ${file.mimetype}`);
    }

    const storedName = this.generateStoredName(file.originalname);
    const filePath = path.join(this.uploadDir, storedName);

    // Save file to disk
    await fs.writeFile(filePath, file.buffer);

    // Create database record
    const material = this.materialRepository.create({
      classId,
      title: createMaterialDto.title,
      description: createMaterialDto.description,
      fileUrl: `/uploads/materials/${storedName}`,
      fileName: file.originalname,
      fileType: this.getFileType(file.originalname),
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: user.id,
    });

    const savedMaterial = await this.materialRepository.save(material);
    this.logger.log(
      `Material uploaded: ${file.originalname} for class ${classId} by user ${user.id}`,
    );

    return this.findOne(savedMaterial.id, user);
  }

  /**
   * Find all materials for a class
   */
  async findByClass(classId: number, query: QueryMaterialDto, user: User) {
    // Check if user is member of the class
    const isMember = await this.classesService.isMember(classId, user.id);
    if (!isMember) {
      throw new ForbiddenException('Bạn không phải thành viên của lớp này');
    }

    const { fileType, search, page = 1, limit = 20 } = query;

    const queryBuilder = this.materialRepository
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.uploader', 'uploader')
      .where('material.classId = :classId', { classId });

    // Filter by file type
    if (fileType) {
      queryBuilder.andWhere('material.fileType = :fileType', { fileType });
    }

    // Search by title or description
    if (search) {
      queryBuilder.andWhere('(material.title LIKE :search OR material.description LIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [materials, total] = await queryBuilder
      .select([
        'material.id',
        'material.classId',
        'material.title',
        'material.description',
        'material.fileUrl',
        'material.fileName',
        'material.fileType',
        'material.fileSize',
        'material.mimeType',
        'material.downloadCount',
        'material.createdAt',
        'material.updatedAt',
        'uploader.id',
        'uploader.fullName',
        'uploader.email',
      ])
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit))
      .orderBy('material.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: materials,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Find one material by ID
   */
  async findOne(id: number, user: User): Promise<Material> {
    const material = await this.materialRepository.findOne({
      where: { id },
      relations: ['uploader', 'class'],
    });

    if (!material) {
      throw new NotFoundException('Tài liệu không tồn tại');
    }

    // Check if user is member of the class
    const isMember = await this.classesService.isMember(material.classId, user.id);
    if (!isMember) {
      throw new ForbiddenException('Bạn không có quyền truy cập tài liệu này');
    }

    return material;
  }

  /**
   * Update material info
   */
  async update(id: number, updateMaterialDto: UpdateMaterialDto, user: User): Promise<Material> {
    const material = await this.findOne(id, user);

    // Only uploader or teacher can update
    const isTeacher = await this.classesService.isTeacher(material.classId, user.id);
    if (material.uploadedBy !== user.id && !isTeacher) {
      throw new ForbiddenException('Bạn không có quyền cập nhật tài liệu này');
    }

    Object.assign(material, updateMaterialDto);
    return this.materialRepository.save(material);
  }

  /**
   * Delete material
   */
  async remove(id: number, user: User): Promise<void> {
    const material = await this.findOne(id, user);

    // Only teacher can delete
    const isTeacher = await this.classesService.isTeacher(material.classId, user.id);
    if (!isTeacher) {
      throw new ForbiddenException('Chỉ giáo viên mới có thể xóa tài liệu');
    }

    // Delete file from disk
    try {
      const filePath = path.join(process.cwd(), material.fileUrl);
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.warn(`Could not delete file: ${material.fileUrl}`);
    }

    await this.materialRepository.remove(material);
    this.logger.log(`Material deleted: ${id} by user ${user.id}`);
  }

  /**
   * Download material (increment download count)
   */
  async download(id: number, user: User): Promise<{ filePath: string; fileName: string }> {
    const material = await this.findOne(id, user);

    // Increment download count
    material.downloadCount += 1;
    await this.materialRepository.save(material);

    const filePath = path.join(process.cwd(), material.fileUrl);

    // Check if file exists
    if (!fsSync.existsSync(filePath)) {
      throw new NotFoundException('File không tồn tại trên server');
    }

    return {
      filePath,
      fileName: material.fileName,
    };
  }

  /**
   * Get materials count for a class
   */
  async getCountByClass(classId: number): Promise<number> {
    return this.materialRepository.count({ where: { classId } });
  }
}
