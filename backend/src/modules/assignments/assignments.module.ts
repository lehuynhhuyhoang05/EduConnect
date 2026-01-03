import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { Assignment, Submission } from './entities';
import { ClassesModule } from '@modules/classes/classes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, Submission]),
    ClassesModule,
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
