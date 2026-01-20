import { IsEnum, IsOptional, IsBoolean, IsNumber, IsString } from 'class-validator';

export enum ImportSource {
  ICAL_FILE = 'ical_file',
  GOOGLE_CALENDAR = 'google_calendar',
  OUTLOOK = 'outlook',
}

export enum ImportAction {
  CREATE_EVENTS = 'create_events',
  CREATE_LIVE_SESSIONS = 'create_live_sessions',
  BOTH = 'both',
}

export class ImportCalendarDto {
  @IsEnum(ImportSource)
  source: ImportSource;

  @IsEnum(ImportAction)
  @IsOptional()
  action?: ImportAction = ImportAction.CREATE_EVENTS;

  @IsNumber()
  @IsOptional()
  classId?: number; // If provided, create events/sessions for this class

  @IsBoolean()
  @IsOptional()
  createLiveSessions?: boolean = false; // Auto create live sessions from events

  @IsString()
  @IsOptional()
  googleCalendarId?: string; // For Google Calendar sync
}

export class ImportResultDto {
  totalEvents: number;
  importedEvents: number;
  createdLiveSessions: number;
  skippedEvents: number;
  errors: string[];
  events: ImportedEventDto[];
}

export class ImportedEventDto {
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  location?: string;
  recurrence?: string;
  imported: boolean;
  liveSessionCreated: boolean;
  error?: string;
}

export class GoogleCalendarAuthDto {
  @IsString()
  code: string; // OAuth authorization code
}

export class ExportCalendarDto {
  @IsNumber()
  @IsOptional()
  classId?: number;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  includePersonal?: boolean = true;
}
