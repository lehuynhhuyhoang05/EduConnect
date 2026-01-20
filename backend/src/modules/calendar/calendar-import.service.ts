import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarEvent, CalendarEventType, RecurrenceType } from './entities/calendar.entity';
import { LiveSession, LiveSessionStatus } from '@modules/live-sessions/entities/live-session.entity';
import { Class } from '@modules/classes/entities/class.entity';
import {
  ImportCalendarDto,
  ImportResultDto,
  ImportedEventDto,
  ImportAction,
  ExportCalendarDto,
} from './dto/import-calendar.dto';
import { v4 as uuidv4 } from 'uuid';

// ical.js doesn't have proper ESM exports, use require
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ICAL = require('ical.js');

@Injectable()
export class CalendarImportService {
  private readonly logger = new Logger(CalendarImportService.name);

  constructor(
    @InjectRepository(CalendarEvent)
    private eventRepository: Repository<CalendarEvent>,
    @InjectRepository(LiveSession)
    private liveSessionRepository: Repository<LiveSession>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
  ) {}

  /**
   * Import calendar from iCal (.ics) file content
   */
  async importFromIcal(
    icalContent: string,
    userId: number,
    options: ImportCalendarDto,
  ): Promise<ImportResultDto> {
    const result: ImportResultDto = {
      totalEvents: 0,
      importedEvents: 0,
      createdLiveSessions: 0,
      skippedEvents: 0,
      errors: [],
      events: [],
    };

    try {
      // Parse iCal content
      const jcalData = ICAL.parse(icalContent);
      const vcalendar = new ICAL.Component(jcalData);
      const vevents = vcalendar.getAllSubcomponents('vevent');

      result.totalEvents = vevents.length;

      // Validate class if provided
      let targetClass: Class | null = null;
      if (options.classId) {
        targetClass = await this.classRepository.findOne({
          where: { id: options.classId },
        });
        if (!targetClass) {
          throw new BadRequestException('Lớp học không tồn tại');
        }
      }

      // Process each event
      for (const vevent of vevents) {
        const event = new ICAL.Event(vevent);
        const importedEvent: ImportedEventDto = {
          title: event.summary || 'Untitled Event',
          description: event.description || undefined,
          startTime: event.startDate?.toJSDate() || new Date(),
          endTime: event.endDate?.toJSDate() || undefined,
          location: event.location || undefined,
          recurrence: this.parseRecurrence(vevent),
          imported: false,
          liveSessionCreated: false,
        };

        try {
          // Skip past events (optional)
          if (importedEvent.startTime < new Date()) {
            importedEvent.error = 'Sự kiện đã qua';
            result.skippedEvents++;
            result.events.push(importedEvent);
            continue;
          }

          // Create calendar event
          if (options.action === ImportAction.CREATE_EVENTS || options.action === ImportAction.BOTH) {
            const calendarEvent = this.eventRepository.create({
              title: importedEvent.title,
              description: importedEvent.description,
              startTime: importedEvent.startTime,
              endTime: importedEvent.endTime,
              location: importedEvent.location,
              eventType: this.determineEventType(importedEvent.title),
              recurrence: this.mapRecurrence(importedEvent.recurrence),
              classId: options.classId || null,
              createdById: userId,
              isPublic: !!options.classId,
              color: this.getColorForEventType(importedEvent.title),
            });

            await this.eventRepository.save(calendarEvent);
            importedEvent.imported = true;
            result.importedEvents++;
          }

          // Create live session if requested
          if (
            (options.action === ImportAction.CREATE_LIVE_SESSIONS || options.action === ImportAction.BOTH) &&
            options.classId
          ) {
            const liveSession = this.liveSessionRepository.create({
              title: importedEvent.title,
              description: importedEvent.description || `Buổi học từ lịch: ${importedEvent.title}`,
              scheduledAt: importedEvent.startTime,
              classId: options.classId,
              hostId: userId,
              roomId: uuidv4(),
              status: LiveSessionStatus.SCHEDULED,
              maxParticipants: 100,
            });

            await this.liveSessionRepository.save(liveSession);
            importedEvent.liveSessionCreated = true;
            result.createdLiveSessions++;
          }

          result.events.push(importedEvent);
        } catch (error: any) {
          importedEvent.error = error.message;
          result.errors.push(`${importedEvent.title}: ${error.message}`);
          result.events.push(importedEvent);
        }
      }

      this.logger.log(
        `Imported ${result.importedEvents}/${result.totalEvents} events, created ${result.createdLiveSessions} live sessions`,
      );

      return result;
    } catch (error: any) {
      this.logger.error('Failed to parse iCal content', error);
      throw new BadRequestException('File iCal không hợp lệ: ' + error.message);
    }
  }

  /**
   * Export calendar events to iCal format
   */
  async exportToIcal(userId: number, options: ExportCalendarDto): Promise<string> {
    // Build query
    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.class', 'class')
      .where('event.createdById = :userId', { userId });

    if (options.classId) {
      queryBuilder.orWhere('event.classId = :classId', { classId: options.classId });
    }

    if (options.startDate) {
      queryBuilder.andWhere('event.startTime >= :startDate', { startDate: new Date(options.startDate) });
    }

    if (options.endDate) {
      queryBuilder.andWhere('event.startTime <= :endDate', { endDate: new Date(options.endDate) });
    }

    const events = await queryBuilder.getMany();

    // Create iCal content
    const calendar = new ICAL.Component(['vcalendar', [], []]);
    calendar.updatePropertyWithValue('prodid', '-//EduConnect LMS//Calendar//EN');
    calendar.updatePropertyWithValue('version', '2.0');
    calendar.updatePropertyWithValue('calscale', 'GREGORIAN');
    calendar.updatePropertyWithValue('method', 'PUBLISH');
    calendar.updatePropertyWithValue('x-wr-calname', 'EduConnect Calendar');

    for (const event of events) {
      const vevent = new ICAL.Component('vevent');
      
      vevent.updatePropertyWithValue('uid', `event-${event.id}@educonnect.local`);
      vevent.updatePropertyWithValue('summary', event.title);
      
      if (event.description) {
        vevent.updatePropertyWithValue('description', event.description);
      }
      
      if (event.location) {
        vevent.updatePropertyWithValue('location', event.location);
      }

      // Set times
      const dtstart = ICAL.Time.fromJSDate(event.startTime, false);
      vevent.updatePropertyWithValue('dtstart', dtstart);
      
      if (event.endTime) {
        const dtend = ICAL.Time.fromJSDate(event.endTime, false);
        vevent.updatePropertyWithValue('dtend', dtend);
      }

      // Set creation time
      const dtstamp = ICAL.Time.fromJSDate(event.createdAt, false);
      vevent.updatePropertyWithValue('dtstamp', dtstamp);

      calendar.addSubcomponent(vevent);
    }

    return calendar.toString();
  }

  /**
   * Parse recurrence rule from VEVENT
   */
  private parseRecurrence(vevent: any): string | undefined {
    const rrule = vevent.getFirstPropertyValue('rrule');
    if (!rrule) return undefined;
    return rrule.toString();
  }

  /**
   * Map iCal recurrence to our RecurrenceType
   */
  private mapRecurrence(rrule?: string): RecurrenceType {
    if (!rrule) return RecurrenceType.NONE;
    
    const upper = rrule.toUpperCase();
    if (upper.includes('DAILY')) return RecurrenceType.DAILY;
    if (upper.includes('WEEKLY')) {
      if (upper.includes('INTERVAL=2')) return RecurrenceType.BIWEEKLY;
      return RecurrenceType.WEEKLY;
    }
    if (upper.includes('MONTHLY')) return RecurrenceType.MONTHLY;
    
    return RecurrenceType.NONE;
  }

  /**
   * Determine event type based on title keywords
   */
  private determineEventType(title: string): CalendarEventType {
    const lower = title.toLowerCase();
    
    if (lower.includes('live') || lower.includes('meeting') || lower.includes('buổi học') || lower.includes('họp')) {
      return CalendarEventType.LIVE_SESSION;
    }
    if (lower.includes('quiz') || lower.includes('trắc nghiệm') || lower.includes('kiểm tra')) {
      return CalendarEventType.QUIZ;
    }
    if (lower.includes('exam') || lower.includes('thi') || lower.includes('final')) {
      return CalendarEventType.EXAM;
    }
    if (lower.includes('assignment') || lower.includes('bài tập') || lower.includes('deadline') || lower.includes('due')) {
      return CalendarEventType.ASSIGNMENT_DUE;
    }
    if (lower.includes('holiday') || lower.includes('nghỉ') || lower.includes('lễ')) {
      return CalendarEventType.HOLIDAY;
    }
    
    return CalendarEventType.CLASS_EVENT;
  }

  /**
   * Check if event is likely a meeting/class session
   */
  private isLikelyMeeting(title: string): boolean {
    const lower = title.toLowerCase();
    const meetingKeywords = [
      'meeting', 'class', 'session', 'lecture', 'seminar', 'workshop',
      'buổi học', 'họp', 'lớp', 'giảng', 'hội thảo', 'thảo luận',
      'live', 'zoom', 'meet', 'teams'
    ];
    
    return meetingKeywords.some(keyword => lower.includes(keyword));
  }

  /**
   * Get color based on event type
   */
  private getColorForEventType(title: string): string {
    const eventType = this.determineEventType(title);
    
    const colors: Record<CalendarEventType, string> = {
      [CalendarEventType.LIVE_SESSION]: '#3b82f6', // Blue
      [CalendarEventType.ASSIGNMENT_DUE]: '#f59e0b', // Orange
      [CalendarEventType.QUIZ]: '#8b5cf6', // Purple
      [CalendarEventType.EXAM]: '#ef4444', // Red
      [CalendarEventType.HOLIDAY]: '#10b981', // Green
      [CalendarEventType.CLASS_EVENT]: '#6366f1', // Indigo
      [CalendarEventType.PERSONAL]: '#64748b', // Gray
      [CalendarEventType.REMINDER]: '#ec4899', // Pink
    };
    
    return colors[eventType] || '#3b82f6';
  }

  /**
   * Generate Google Calendar OAuth URL
   */
  getGoogleCalendarAuthUrl(redirectUri: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('Google Calendar integration not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return authUrl.toString();
  }
}
