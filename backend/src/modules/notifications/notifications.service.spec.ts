import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType, NotificationPriority } from './entities';
import { FileLoggerService } from '@common/logger/file-logger.service';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: Repository<Notification>;
  let fileLogger: Partial<FileLoggerService>;

  const mockNotification = {
    id: 1,
    userId: 1,
    type: NotificationType.ASSIGNMENT_CREATED,
    title: 'Thông báo bài tập',
    message: 'Bài tập mới: Test Assignment',
    priority: NotificationPriority.NORMAL,
    data: { assignmentId: 1, classId: 1 },
    isRead: false,
    readAt: null,
    relatedEntityType: 'assignment',
    relatedEntityId: '1',
    actionUrl: '/classes/1/assignments/1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Notification;

  beforeEach(async () => {
    const mockNotificationRepository = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 1 })),
      save: jest.fn().mockImplementation((notification) =>
        Promise.resolve(Array.isArray(notification)
          ? notification.map((n, i) => ({ ...n, id: i + 1, createdAt: new Date() }))
          : { ...notification, id: 1, createdAt: new Date() }
        )
      ),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[mockNotification], 1]),
      find: jest.fn().mockResolvedValue([mockNotification]),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    fileLogger = {
      notifications: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: FileLoggerService,
          useValue: fileLogger,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const dto = {
        userId: 1,
        type: NotificationType.ASSIGNMENT_CREATED,
        title: 'New Assignment',
        message: 'You have a new assignment',
      };

      const result = await service.create(dto);

      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: dto.userId,
        type: dto.type,
        priority: NotificationPriority.NORMAL,
      }));
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    it('should allow custom priority', async () => {
      const dto = {
        userId: 1,
        type: NotificationType.ASSIGNMENT_OVERDUE,
        title: 'Overdue',
        message: 'Your assignment is overdue',
        priority: NotificationPriority.HIGH,
      };

      await service.create(dto);

      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        priority: NotificationPriority.HIGH,
      }));
    });
  });

  describe('createBulk', () => {
    it('should create notifications for multiple users', async () => {
      const dto = {
        userIds: [1, 2, 3],
        type: NotificationType.CLASS_UPDATED,
        title: 'Class Updated',
        message: 'The class has been updated',
      };

      const result = await service.createBulk(dto);

      expect(notificationRepository.create).toHaveBeenCalledTimes(3);
      expect(notificationRepository.save).toHaveBeenCalled();
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      const result = await service.getNotifications(1, { page: 1, limit: 20 });

      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.unread).toBe(1);
    });

    it('should filter by unread only', async () => {
      await service.getNotifications(1, { unreadOnly: true });

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: false }),
        }),
      );
    });

    it('should filter by type', async () => {
      await service.getNotifications(1, { type: NotificationType.ASSIGNMENT_CREATED });

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: NotificationType.ASSIGNMENT_CREATED }),
        }),
      );
    });
  });

  describe('getNotification', () => {
    it('should return a single notification', async () => {
      (notificationRepository.findOne as jest.Mock).mockResolvedValue(mockNotification);

      const result = await service.getNotification(1, 1);

      expect(result.id).toBe(1);
      expect(result.title).toBe(mockNotification.title);
    });

    it('should throw NotFoundException if notification not found', async () => {
      (notificationRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getNotification(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsRead', () => {
    it('should mark specified notifications as read', async () => {
      const result = await service.markAsRead(1, { notificationIds: [1, 2, 3] });

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { id: In([1, 2, 3]), userId: 1, isRead: false },
        { isRead: true, readAt: expect.any(Date) },
      );
      expect(result).toBe(1);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      const result = await service.markAllAsRead(1);

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { userId: 1, isRead: false },
        { isRead: true, readAt: expect.any(Date) },
      );
      expect(result).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      const result = await service.delete(1, 1);

      expect(notificationRepository.delete).toHaveBeenCalledWith({ id: 1, userId: 1 });
      expect(result).toBe(true);
    });

    it('should throw NotFoundException if notification not found', async () => {
      (notificationRepository.delete as jest.Mock).mockResolvedValue({ affected: 0 });

      await expect(service.delete(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAll', () => {
    it('should delete all notifications for user', async () => {
      const result = await service.deleteAll(1);

      expect(notificationRepository.delete).toHaveBeenCalledWith({ userId: 1 });
      expect(result).toBe(1);
    });
  });

  describe('getCount', () => {
    it('should return total and unread counts', async () => {
      (notificationRepository.count as jest.Mock)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5); // unread

      const result = await service.getCount(1);

      expect(result.total).toBe(10);
      expect(result.unread).toBe(5);
    });
  });

  describe('notifyAssignment', () => {
    it('should create assignment notification', async () => {
      const result = await service.notifyAssignment(
        1,
        NotificationType.ASSIGNMENT_CREATED,
        'Test Assignment',
        1,
        1,
      );

      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ASSIGNMENT_CREATED,
        relatedEntityType: 'assignment',
        relatedEntityId: '1',
      }));
    });

    it('should set high priority for overdue assignments', async () => {
      await service.notifyAssignment(
        1,
        NotificationType.ASSIGNMENT_OVERDUE,
        'Overdue Assignment',
        1,
        1,
      );

      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        priority: NotificationPriority.HIGH,
      }));
    });
  });

  describe('notifyClass', () => {
    it('should create class notification', async () => {
      const result = await service.notifyClass(
        1,
        NotificationType.CLASS_JOINED,
        'Test Class',
        1,
      );

      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.CLASS_JOINED,
        relatedEntityType: 'class',
        relatedEntityId: '1',
      }));
    });
  });

  describe('notifySession', () => {
    it('should create session notification', async () => {
      const result = await service.notifySession(
        1,
        NotificationType.SESSION_STARTED,
        'Test Session',
        1,
        1,
      );

      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.SESSION_STARTED,
        relatedEntityType: 'live_session',
      }));
    });

    it('should set high priority for starting soon notification', async () => {
      await service.notifySession(
        1,
        NotificationType.SESSION_STARTING_SOON,
        'Starting Session',
        1,
        1,
      );

      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        priority: NotificationPriority.HIGH,
      }));
    });
  });

  describe('notifyMention', () => {
    it('should create mention notification', async () => {
      const result = await service.notifyMention(
        1,
        'John Doe',
        '1',
        'class',
        'Hello @you',
      );

      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.MENTIONED,
        priority: NotificationPriority.HIGH,
      }));
    });
  });
});
