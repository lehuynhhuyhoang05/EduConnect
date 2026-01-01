import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { File } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
