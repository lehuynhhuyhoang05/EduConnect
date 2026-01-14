import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CalendarEvent, EventReminder, ReminderTime, RecurrenceType, CalendarEventType } from './entities/calendar.entity';
import { CreateCalendarEventDto, UpdateCalendarEventDto, GetCalendarEventsDto } from './dto';
import { User } from '@modules/users/entities/user.entity';
import { ClassMember } from '@modules/classes/entities/class-member.entity';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { NotificationType } from '@modules/notifications/entities/notification.entity';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(CalendarEvent)
    private eventRepository: Repository<CalendarEvent>,
    @InjectRepository(EventReminder)
    private reminderRepository: Repository<EventReminder>,
    @InjectRepository(ClassMember)
    private classMemberRepository: Repository<ClassMember>,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new calendar event
   */
  async create(dto: CreateCalendarEventDto, userId: number): Promise<CalendarEvent> {
    const event = this.eventRepository.create({
      ...dto,
      startTime: new Date(dto.startTime),
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      recurrenceEndDate: dto.recurrenceEndDate ? new Date(dto.recurrenceEndDate) : undefined,
      createdById: userId,
    });

    const saved = await this.eventRepository.save(event);

    // Create reminders for class members
    if (dto.classId && dto.reminders && dto.reminders.length > 0) {
      await this.createRemindersForClass(saved, dto.classId);
    } else if (dto.reminders && dto.reminders.length > 0) {
      await this.createRemindersForUser(saved, userId);
    }

    return saved;
  }

  /**
   * Get calendar events for a user
   */
  async getEvents(userId: number, query: GetCalendarEventsDto): Promise<CalendarEvent[]> {
    // Get user's class IDs
    const memberships = await this.classMemberRepository.find({
      where: { userId },
      select: ['classId'],
    });
    const classIds = memberships.map((m) => m.classId);

    const where: any = [];

    // Personal events
    where.push({
      createdById: userId,
      classId: null,
    });

    // Class events (public)
    if (classIds.length > 0) {
      where.push({
        classId: In(classIds),
        isPublic: true,
      });
    }

    // Date range filter
    const dateFilter: any = {};
    if (query.startDate) {
      dateFilter.startTime = MoreThanOrEqual(new Date(query.startDate));
    }
    if (query.endDate) {
      dateFilter.startTime = LessThanOrEqual(new Date(query.endDate));
    }

    let events = await this.eventRepository.find({
      where: where.map((w: any) => ({ ...w, ...dateFilter })),
      relations: ['createdBy', 'class'],
      order: { startTime: 'ASC' },
    });

    // Filter by event type if provided
    if (query.eventType) {
      events = events.filter((e) => e.eventType === query.eventType);
    }

    // Expand recurring events
    events = this.expandRecurringEvents(events, query.startDate, query.endDate);

    return events;
  }

  /**
   * Get events for a specific class
   */
  async getClassEvents(classId: number, query: GetCalendarEventsDto): Promise<CalendarEvent[]> {
    const where: any = { classId };

    if (query.startDate) {
      where.startTime = MoreThanOrEqual(new Date(query.startDate));
    }
    if (query.endDate && !query.startDate) {
      where.startTime = LessThanOrEqual(new Date(query.endDate));
    }

    let events = await this.eventRepository.find({
      where,
      relations: ['createdBy'],
      order: { startTime: 'ASC' },
    });

    if (query.eventType) {
      events = events.filter((e) => e.eventType === query.eventType);
    }

    return this.expandRecurringEvents(events, query.startDate, query.endDate);
  }

  /**
   * Get upcoming events (next 7 days)
   */
  async getUpcomingEvents(userId: number, limit = 10): Promise<CalendarEvent[]> {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    return this.getEvents(userId, {
      startDate: now.toISOString(),
      endDate: nextWeek.toISOString(),
    }).then((events) => events.slice(0, limit));
  }

  /**
   * Get today's events
   */
  async getTodayEvents(userId: number): Promise<CalendarEvent[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return this.getEvents(userId, {
      startDate: todayStart.toISOString(),
      endDate: todayEnd.toISOString(),
    });
  }

  /**
   * Update a calendar event
   */
  async update(id: number, dto: UpdateCalendarEventDto, userId: number): Promise<CalendarEvent> {
    const event = await this.eventRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.createdById !== userId) {
      throw new ForbiddenException('Only event creator can update');
    }

    Object.assign(event, {
      ...dto,
      startTime: dto.startTime ? new Date(dto.startTime) : event.startTime,
      endTime: dto.endTime ? new Date(dto.endTime) : event.endTime,
    });

    const updated = await this.eventRepository.save(event);

    // Recreate reminders if changed
    if (dto.reminders) {
      await this.reminderRepository.delete({ eventId: id });
      if (event.classId) {
        await this.createRemindersForClass(updated, event.classId);
      } else {
        await this.createRemindersForUser(updated, userId);
      }
    }

    return updated;
  }

  /**
   * Delete a calendar event
   */
  async delete(id: number, userId: number): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id } });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.createdById !== userId) {
      throw new ForbiddenException('Only event creator can delete');
    }

    await this.eventRepository.delete(id);
  }

  /**
   * Create event from assignment due date
   */
  async createFromAssignment(
    assignmentId: number,
    title: string,
    dueDate: Date,
    classId: number,
    userId: number,
  ): Promise<CalendarEvent> {
    return this.create(
      {
        title: `📝 Assignment Due: ${title}`,
        eventType: CalendarEventType.ASSIGNMENT_DUE,
        startTime: dueDate.toISOString(),
        allDay: false,
        classId,
        linkedResourceId: assignmentId,
        linkedResourceType: 'assignment',
        reminders: [ReminderTime.ONE_DAY, ReminderTime.ONE_HOUR],
        color: '#f59e0b',
      },
      userId,
    );
  }

  /**
   * Create event from live session
   */
  async createFromLiveSession(
    sessionId: number,
    title: string,
    startTime: Date,
    endTime: Date,
    classId: number,
    userId: number,
    meetingLink?: string,
  ): Promise<CalendarEvent> {
    return this.create(
      {
        title: `🎥 Live Session: ${title}`,
        eventType: CalendarEventType.LIVE_SESSION,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        classId,
        linkedResourceId: sessionId,
        linkedResourceType: 'live_session',
        location: meetingLink,
        reminders: [ReminderTime.FIFTEEN_MIN, ReminderTime.FIVE_MIN],
        color: '#10b981',
      },
      userId,
    );
  }

  /**
   * Send pending reminders (runs every minute)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendPendingReminders(): Promise<void> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const pendingReminders = await this.reminderRepository.find({
      where: {
        sent: false,
        scheduledFor: Between(oneMinuteAgo, now),
      },
      relations: ['event', 'user'],
    });

    for (const reminder of pendingReminders) {
      try {
        await this.notificationsService.create({
          userId: reminder.userId,
          title: 'Upcoming Event Reminder',
          message: `Reminder: ${reminder.event.title} is starting soon`,
          type: NotificationType.REMINDER,
          relatedEntityId: String(reminder.eventId),
          relatedEntityType: 'calendar_event',
        });

        reminder.sent = true;
        reminder.sentAt = new Date();
        await this.reminderRepository.save(reminder);
      } catch (error) {
        console.error(`Failed to send reminder ${reminder.id}:`, error);
      }
    }
  }

  /**
   * Create reminders for all class members
   */
  private async createRemindersForClass(event: CalendarEvent, classId: number): Promise<void> {
    const members = await this.classMemberRepository.find({
      where: { classId },
    });

    for (const member of members) {
      await this.createRemindersForUser(event, member.userId);
    }
  }

  /**
   * Create reminders for a user
   */
  private async createRemindersForUser(event: CalendarEvent, userId: number): Promise<void> {
    if (!event.reminders || event.reminders.length === 0) return;

    for (const reminderTime of event.reminders) {
      const scheduledFor = this.calculateReminderTime(event.startTime, reminderTime);
      
      if (scheduledFor > new Date()) {
        const reminder = this.reminderRepository.create({
          eventId: event.id,
          userId,
          scheduledFor,
        });
        await this.reminderRepository.save(reminder);
      }
    }
  }

  /**
   * Calculate reminder time based on event start and reminder type
   */
  private calculateReminderTime(eventStart: Date, reminderType: ReminderTime): Date {
    const result = new Date(eventStart);
    
    switch (reminderType) {
      case ReminderTime.AT_TIME:
        return result;
      case ReminderTime.FIVE_MIN:
        result.setMinutes(result.getMinutes() - 5);
        return result;
      case ReminderTime.FIFTEEN_MIN:
        result.setMinutes(result.getMinutes() - 15);
        return result;
      case ReminderTime.THIRTY_MIN:
        result.setMinutes(result.getMinutes() - 30);
        return result;
      case ReminderTime.ONE_HOUR:
        result.setHours(result.getHours() - 1);
        return result;
      case ReminderTime.ONE_DAY:
        result.setDate(result.getDate() - 1);
        return result;
      case ReminderTime.ONE_WEEK:
        result.setDate(result.getDate() - 7);
        return result;
      default:
        return result;
    }
  }

  /**
   * Expand recurring events into individual events
   */
  private expandRecurringEvents(
    events: CalendarEvent[],
    startDate?: string,
    endDate?: string,
  ): CalendarEvent[] {
    const expanded: CalendarEvent[] = [];
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const event of events) {
      if (event.recurrence === RecurrenceType.NONE) {
        expanded.push(event);
        continue;
      }

      // Generate recurring instances
      let currentDate = new Date(event.startTime);
      const recurrenceEnd = event.recurrenceEndDate || end;

      while (currentDate <= recurrenceEnd && currentDate <= end) {
        if (currentDate >= start) {
          const instance = { ...event };
          instance.startTime = new Date(currentDate);
          if (event.endTime) {
            const duration = event.endTime.getTime() - event.startTime.getTime();
            instance.endTime = new Date(currentDate.getTime() + duration);
          }
          expanded.push(instance);
        }

        // Move to next occurrence
        switch (event.recurrence) {
          case RecurrenceType.DAILY:
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case RecurrenceType.WEEKLY:
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case RecurrenceType.BIWEEKLY:
            currentDate.setDate(currentDate.getDate() + 14);
            break;
          case RecurrenceType.MONTHLY:
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
        }
      }
    }

    return expanded.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }
}
