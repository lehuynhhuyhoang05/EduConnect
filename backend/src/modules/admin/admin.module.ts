import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '@modules/users/entities/user.entity';
import { Class, ClassMember } from '@modules/classes/entities';
import { Assignment, Submission } from '@modules/assignments/entities';
import { LiveSession } from '@modules/live-sessions/entities/live-session.entity';
import { UsersModule } from '@modules/users/users.module';
import { ClassesModule } from '@modules/classes/classes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Class,
      ClassMember,
      Assignment,
      Submission,
      LiveSession,
    ]),
    UsersModule,
    ClassesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
