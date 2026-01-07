import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { ClassAnnouncementsService } from './class-announcements.service';
import { GradebookService } from './gradebook.service';
import { Class, ClassMember } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Class, ClassMember])],
  controllers: [ClassesController],
  providers: [ClassesService, ClassAnnouncementsService, GradebookService],
  exports: [ClassesService, ClassAnnouncementsService, GradebookService],
})
export class ClassesModule {}
