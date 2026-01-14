import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CalendarEvent, EventReminder } from './entities/calendar.entity';
import { ClassMember } from '@modules/classes/entities/class-member.entity';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CalendarEvent, EventReminder, ClassMember]),
    ScheduleModule.forRoot(),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
