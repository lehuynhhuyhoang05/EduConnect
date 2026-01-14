import { 
  IsString, 
  IsEnum, 
  IsDateString, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  IsArray,
  MaxLength 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CalendarEventType, RecurrenceType, ReminderTime } from '../entities/calendar.entity';

export class CreateCalendarEventDto {
  @ApiProperty({ description: 'Event title', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CalendarEventType })
  @IsEnum(CalendarEventType)
  eventType: CalendarEventType;

  @ApiProperty({ description: 'Start time (ISO string)' })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ description: 'End time (ISO string)' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'All day event', default: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({ description: 'Location or meeting link' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Color hex code', default: '#3b82f6' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: RecurrenceType, default: RecurrenceType.NONE })
  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrence?: RecurrenceType;

  @ApiPropertyOptional({ description: 'Recurrence end date' })
  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @ApiPropertyOptional({ description: 'Reminder times', isArray: true, enum: ReminderTime })
  @IsOptional()
  @IsArray()
  reminders?: ReminderTime[];

  @ApiPropertyOptional({ description: 'Class ID' })
  @IsOptional()
  @IsNumber()
  classId?: number;

  @ApiPropertyOptional({ description: 'Linked resource ID (assignment, session, etc.)' })
  @IsOptional()
  @IsNumber()
  linkedResourceId?: number;

  @ApiPropertyOptional({ description: 'Linked resource type' })
  @IsOptional()
  @IsString()
  linkedResourceType?: string;

  @ApiPropertyOptional({ description: 'Is public to class members', default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateCalendarEventDto {
  @ApiPropertyOptional({ description: 'Event title', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Start time (ISO string)' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (ISO string)' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Location or meeting link' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Color hex code' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Reminder times', isArray: true, enum: ReminderTime })
  @IsOptional()
  @IsArray()
  reminders?: ReminderTime[];
}

export class GetCalendarEventsDto {
  @ApiPropertyOptional({ description: 'Start date range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Class ID filter' })
  @IsOptional()
  @IsNumber()
  classId?: number;

  @ApiPropertyOptional({ description: 'Event type filter', enum: CalendarEventType })
  @IsOptional()
  @IsEnum(CalendarEventType)
  eventType?: CalendarEventType;
}
