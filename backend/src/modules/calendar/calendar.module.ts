import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CalendarEvent, EventReminder } from './entities/calendar.entity';
import { ClassMember } from '@modules/classes/entities/class-member.entity';
import { Class } from '@modules/classes/entities/class.entity';
import { LiveSession } from '@modules/live-sessions/entities/live-session.entity';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { CalendarService } from './calendar.service';
import { CalendarImportService } from './calendar-import.service';
import { CalendarController } from './calendar.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CalendarEvent, EventReminder, ClassMember, Class, LiveSession]),
    ScheduleModule.forRoot(),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [CalendarController],
  providers: [CalendarService, CalendarImportService],
  exports: [CalendarService, CalendarImportService],
})
export class CalendarModule {}
