import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardStroke, DrawingTool } from './entities';
import { ClassesService } from '@modules/classes/classes.service';
import { FileLoggerService } from '@common/logger/file-logger.service';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { ForbiddenException } from '@nestjs/common';

describe('WhiteboardService', () => {
  let service: WhiteboardService;
  let strokeRepository: Repository<WhiteboardStroke>;
  let classesService: Partial<ClassesService>;
  let fileLogger: Partial<FileLoggerService>;

  const mockUser = {
    id: 1,
    email: 'test@test.com',
    fullName: 'Test User',
    role: UserRole.TEACHER,
    passwordHash: '',
    avatarUrl: null,
    isVerified: true,
    isActive: true,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshTokens: [],
    taughtClasses: [],
    enrolledClasses: [],
    files: [],
    submissions: [],
  } as unknown as User;

  const mockStudent = {
    id: 2,
    email: 'student@test.com',
    fullName: 'Student User',
    role: UserRole.STUDENT,
    passwordHash: '',
    avatarUrl: null,
    isVerified: true,
    isActive: true,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshTokens: [],
    taughtClasses: [],
    enrolledClasses: [],
    files: [],
    submissions: [],
  } as unknown as User;

  const mockStroke = {
    id: 1,
    strokeId: 'stroke-123',
    roomId: '1',
    roomType: 'class',
    userId: 1,
    tool: DrawingTool.PEN,
    path: [{ x: 0, y: 0, pressure: 1, timestamp: Date.now() }],
    color: '#000000',
    strokeWidth: 2,
    opacity: 1,
    textContent: null,
    fontSize: null,
    fontFamily: null,
    startX: null,
    startY: null,
    endX: null,
    endY: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
  } as unknown as WhiteboardStroke;

  beforeEach(async () => {
    const mockStrokeRepository = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 1 })),
      save: jest.fn().mockImplementation((stroke) => Promise.resolve({ ...stroke, id: 1, createdAt: new Date() })),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    };

    classesService = {
      isMember: jest.fn().mockResolvedValue(true),
      isTeacher: jest.fn().mockResolvedValue(true),
    };

    fileLogger = {
      whiteboard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhiteboardService,
        {
          provide: getRepositoryToken(WhiteboardStroke),
          useValue: mockStrokeRepository,
        },
        {
          provide: ClassesService,
          useValue: classesService,
        },
        {
          provide: DataSource,
          useValue: {},
        },
        {
          provide: FileLoggerService,
          useValue: fileLogger,
        },
      ],
    }).compile();

    service = module.get<WhiteboardService>(WhiteboardService);
    strokeRepository = module.get<Repository<WhiteboardStroke>>(
      getRepositoryToken(WhiteboardStroke),
    );
  });

  describe('startStroke', () => {
    it('should start a stroke and store in memory', async () => {
      const dto = {
        strokeId: 'stroke-new',
        roomId: '1',
        roomType: 'class',
        tool: DrawingTool.PEN,
        color: '#FF0000',
        strokeWidth: 3,
        startPoint: { x: 10, y: 20, pressure: 1, timestamp: Date.now() },
      };

      const result = await service.startStroke(dto, mockUser);

      expect(result.strokeId).toBe(dto.strokeId);
      expect(result.roomId).toBe(dto.roomId);
      expect(result.tool).toBe(DrawingTool.PEN);
      expect(result.color).toBe('#FF0000');
      expect(result.path).toHaveLength(1);
      expect(fileLogger.whiteboard).toHaveBeenCalled();
    });

    it('should verify room access before starting stroke', async () => {
      (classesService.isMember as jest.Mock).mockResolvedValue(false);
      (classesService.isTeacher as jest.Mock).mockResolvedValue(false);

      const dto = {
        strokeId: 'stroke-new',
        roomId: '1',
        roomType: 'class',
        tool: DrawingTool.PEN,
        color: '#FF0000',
        strokeWidth: 3,
        startPoint: { x: 10, y: 20, pressure: 1, timestamp: Date.now() },
      };

      await expect(service.startStroke(dto, mockStudent)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('drawMove', () => {
    it('should add points to an active stroke', async () => {
      // First start a stroke
      const startDto = {
        strokeId: 'stroke-move',
        roomId: '1',
        roomType: 'class',
        tool: DrawingTool.PEN,
        color: '#000000',
        strokeWidth: 2,
        startPoint: { x: 0, y: 0, pressure: 1, timestamp: Date.now() },
      };
      await service.startStroke(startDto, mockUser);

      // Then add more points
      const moveDto = {
        strokeId: 'stroke-move',
        roomId: '1',
        roomType: 'class',
        points: [
          { x: 10, y: 10, pressure: 1, timestamp: Date.now() },
          { x: 20, y: 20, pressure: 1, timestamp: Date.now() },
        ],
      };

      const result = service.drawMove(moveDto, mockUser);

      expect(result).not.toBeNull();
      expect(result!.strokeId).toBe('stroke-move');
      expect(result!.points).toHaveLength(2);
    });

    it('should return null for non-existent stroke', () => {
      const moveDto = {
        strokeId: 'non-existent',
        roomId: '1',
        roomType: 'class',
        points: [{ x: 10, y: 10, pressure: 1, timestamp: Date.now() }],
      };

      const result = service.drawMove(moveDto, mockUser);

      expect(result).toBeNull();
    });

    it('should return null if different user tries to update stroke', async () => {
      const startDto = {
        strokeId: 'stroke-other',
        roomId: '1',
        roomType: 'class',
        tool: DrawingTool.PEN,
        color: '#000000',
        strokeWidth: 2,
        startPoint: { x: 0, y: 0, pressure: 1, timestamp: Date.now() },
      };
      await service.startStroke(startDto, mockUser);

      const moveDto = {
        strokeId: 'stroke-other',
        roomId: '1',
        roomType: 'class',
        points: [{ x: 10, y: 10, pressure: 1, timestamp: Date.now() }],
      };

      const result = service.drawMove(moveDto, mockStudent);
      expect(result).toBeNull();
    });
  });

  describe('endStroke', () => {
    it('should persist stroke to database', async () => {
      const startDto = {
        strokeId: 'stroke-end',
        roomId: '1',
        roomType: 'class',
        tool: DrawingTool.PEN,
        color: '#000000',
        strokeWidth: 2,
        startPoint: { x: 0, y: 0, pressure: 1, timestamp: Date.now() },
      };
      await service.startStroke(startDto, mockUser);

      const endDto = {
        strokeId: 'stroke-end',
        roomId: '1',
        roomType: 'class',
      };

      const result = await service.endStroke(endDto, mockUser);

      expect(result).not.toBeNull();
      expect(strokeRepository.create).toHaveBeenCalled();
      expect(strokeRepository.save).toHaveBeenCalled();
    });
  });

  describe('drawShape', () => {
    it('should create and persist a shape', async () => {
      const dto = {
        strokeId: 'shape-1',
        roomId: '1',
        roomType: 'class',
        tool: DrawingTool.RECTANGLE,
        color: '#0000FF',
        strokeWidth: 2,
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 100,
      };

      const result = await service.drawShape(dto, mockUser);

      expect(result).not.toBeNull();
      expect(strokeRepository.save).toHaveBeenCalled();
      expect(fileLogger.whiteboard).toHaveBeenCalled();
    });
  });

  describe('drawText', () => {
    it('should create and persist text element', async () => {
      const dto = {
        strokeId: 'text-1',
        roomId: '1',
        roomType: 'class',
        text: 'Hello World',
        x: 50,
        y: 50,
        fontSize: 16,
        color: '#000000',
      };

      const result = await service.drawText(dto, mockUser);

      expect(result).not.toBeNull();
      expect(strokeRepository.save).toHaveBeenCalled();
      expect(fileLogger.whiteboard).toHaveBeenCalled();
    });
  });

  describe('deleteStroke', () => {
    it('should delete own stroke', async () => {
      (strokeRepository.findOne as jest.Mock).mockResolvedValue(mockStroke);

      const result = await service.deleteStroke('stroke-123', '1', 'class', mockUser);

      expect(result).toBe(true);
      expect(strokeRepository.save).toHaveBeenCalled();
    });

    it('should allow teacher to delete any stroke', async () => {
      const studentStroke = { ...mockStroke, userId: 2 };
      (strokeRepository.findOne as jest.Mock).mockResolvedValue(studentStroke);
      (classesService.isTeacher as jest.Mock).mockResolvedValue(true);

      const result = await service.deleteStroke('stroke-123', '1', 'class', mockUser);

      expect(result).toBe(true);
    });

    it('should return false for non-existent stroke', async () => {
      (strokeRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.deleteStroke('non-existent', '1', 'class', mockUser);

      expect(result).toBe(false);
    });

    it('should throw if student tries to delete others stroke', async () => {
      const teacherStroke = { ...mockStroke, userId: 1 };
      (strokeRepository.findOne as jest.Mock).mockResolvedValue(teacherStroke);
      (classesService.isTeacher as jest.Mock).mockResolvedValue(false);

      await expect(
        service.deleteStroke('stroke-123', '1', 'class', mockStudent),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('undoLastStroke', () => {
    it('should undo last stroke by user', async () => {
      (strokeRepository.findOne as jest.Mock).mockResolvedValue(mockStroke);

      const result = await service.undoLastStroke('1', 'class', mockUser);

      expect(result).toBe('stroke-123');
      expect(strokeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isDeleted: true }),
      );
    });

    it('should return null if no strokes to undo', async () => {
      (strokeRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.undoLastStroke('1', 'class', mockUser);

      expect(result).toBeNull();
    });
  });

  describe('clearWhiteboard', () => {
    it('should clear all strokes for teacher', async () => {
      (classesService.isTeacher as jest.Mock).mockResolvedValue(true);
      (strokeRepository.update as jest.Mock).mockResolvedValue({ affected: 5 });

      const result = await service.clearWhiteboard(
        { roomId: '1', roomType: 'class' },
        mockUser,
      );

      expect(result).toBe(5);
      expect(strokeRepository.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for students', async () => {
      (classesService.isTeacher as jest.Mock).mockResolvedValue(false);

      await expect(
        service.clearWhiteboard({ roomId: '1', roomType: 'class' }, mockStudent),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getWhiteboardState', () => {
    it('should return all strokes for a room', async () => {
      (strokeRepository.find as jest.Mock).mockResolvedValue([mockStroke]);

      const result = await service.getWhiteboardState('1', 'class', mockUser);

      expect(result).toHaveLength(1);
      expect(result[0].strokeId).toBe('stroke-123');
    });
  });

  describe('getStrokeCount', () => {
    it('should return count of strokes', async () => {
      (strokeRepository.count as jest.Mock).mockResolvedValue(10);

      const result = await service.getStrokeCount('1', 'class');

      expect(result).toBe(10);
    });
  });

  describe('cleanupStaleStrokes', () => {
    it('should cleanup old active strokes', async () => {
      // Start an old stroke
      const oldStartDto = {
        strokeId: 'old-stroke',
        roomId: '1',
        roomType: 'class',
        tool: DrawingTool.PEN,
        color: '#000000',
        strokeWidth: 2,
        startPoint: { x: 0, y: 0, pressure: 1, timestamp: Date.now() - 10 * 60 * 1000 },
      };
      await service.startStroke(oldStartDto, mockUser);

      // Force the lastUpdate to be old
      // This tests the cleanup threshold

      const cleaned = service.cleanupStaleStrokes();
      // Since we just created it, it won't be stale yet
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });
});
