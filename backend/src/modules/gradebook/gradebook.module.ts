import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradeItem, GradeEntry } from './entities/grade.entity';
import { ClassMember } from '@modules/classes/entities/class-member.entity';
import { GradebookService } from './gradebook.service';
import { GradebookController } from './gradebook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([GradeItem, GradeEntry, ClassMember]),
  ],
  controllers: [GradebookController],
  providers: [GradebookService],
  exports: [GradebookService],
})
export class GradebookModule {}
