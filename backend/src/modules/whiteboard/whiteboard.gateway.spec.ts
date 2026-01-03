import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { WhiteboardGateway } from './whiteboard.gateway';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardStroke, DrawingTool } from './entities';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { FileLoggerService } from '@common/logger/file-logger.service';
import { Server, Socket } from 'socket.io';

describe('WhiteboardGateway', () => {
  let gateway: WhiteboardGateway;
  let whiteboardService: Partial<WhiteboardService>;
  let jwtService: Partial<JwtService>;
  let fileLogger: Partial<FileLoggerService>;

  const mockUser: User = {
    id: 1,
    email: 'test@test.com',
    fullName: 'Test User',
    role: UserRole.TEACHER,
  } as User;

  const mockSocket = {
    id: 'socket-1',
    handshake: {
      auth: { token: 'valid-token' },
      headers: {},
      query: {},
    },
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    data: {},
    disconnect: jest.fn(),
  } as any as Socket;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as any as Server;

  beforeEach(async () => {
    whiteboardService = {
      startStroke: jest.fn().mockResolvedValue({
        id: 1,
        strokeId: 'stroke-1',
        roomId: '1',
        roomType: 'class',
        userId: 1,
        userName: 'Test User',
        tool: DrawingTool.PEN,
        path: [{ x: 0, y: 0, pressure: 1, timestamp: Date.now() }],
        color: '#000000',
        strokeWidth: 2,
        opacity: 1,
        createdAt: new Date(),
      }),
      drawMove: jest.fn().mockReturnValue({
        strokeId: 'stroke-1',
        points: [{ x: 10, y: 10, pressure: 1, timestamp: Date.now() }],
      }),
      endStroke: jest.fn().mockResolvedValue({
        id: 1,
        strokeId: 'stroke-1',
        roomId: '1',
        roomType: 'class',
        userId: 1,
      }),
      drawShape: jest.fn().mockResolvedValue({
        id: 2,
        strokeId: 'shape-1',
        tool: DrawingTool.RECTANGLE,
      }),
      drawText: jest.fn().mockResolvedValue({
        id: 3,
        strokeId: 'text-1',
        tool: DrawingTool.TEXT,
      }),
      deleteStroke: jest.fn().mockResolvedValue(true),
      undoLastStroke: jest.fn().mockResolvedValue('stroke-1'),
      clearWhiteboard: jest.fn().mockResolvedValue(5),
      getWhiteboardState: jest.fn().mockResolvedValue([]),
    };

    jwtService = {
      verify: jest.fn().mockReturnValue({ sub: 1, email: 'test@test.com' }),
    };

    fileLogger = {
      whiteboard: jest.fn(),
    };

    const mockUserRepository = {
      findOne: jest.fn().mockResolvedValue(mockUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhiteboardGateway,
        {
          provide: WhiteboardService,
          useValue: whiteboardService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: FileLoggerService,
          useValue: fileLogger,
        },
      ],
    }).compile();

    gateway = module.get<WhiteboardGateway>(WhiteboardGateway);
    gateway['server'] = mockServer;
  });

  describe('handleConnection', () => {
    it('should authenticate valid connection', async () => {
      await gateway.handleConnection(mockSocket);
      
      // After successful connection, the jwtService.verify should be called with the token
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
    });

    it('should disconnect on invalid token', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleJoinRoom', () => {
    it('should join room and send whiteboard state', async () => {
      const payload = { roomId: '1', roomType: 'class' };
      mockSocket.data = { user: mockUser };
      gateway['connectedUsers'].set('socket-1', { user: mockUser, rooms: new Set() });

      await gateway.handleJoinRoom(mockSocket, payload);

      expect(mockSocket.join).toHaveBeenCalledWith('wb:class:1');
      expect(whiteboardService.getWhiteboardState).toHaveBeenCalled();
    });
  });

  describe('handleLeaveRoom', () => {
    it('should leave room and notify others', () => {
      const payload = { roomId: '1', roomType: 'class' };
      mockSocket.data = { user: mockUser };
      gateway['connectedUsers'].set('socket-1', { user: mockUser, rooms: new Set(['wb:class:1']) });

      gateway.handleLeaveRoom(mockSocket, payload);

      expect(mockSocket.leave).toHaveBeenCalledWith('wb:class:1');
    });
  });

  describe('handleStartStroke', () => {
    it('should start stroke and broadcast to room', async () => {
      mockSocket.data = { user: mockUser };
      gateway['connectedUsers'].set('socket-1', { user: mockUser, rooms: new Set() });
      const payload = {
        strokeId: 'stroke-new',
        roomId: '1',
        roomType: 'class',
        tool: DrawingTool.PEN,
        color: '#FF0000',
        strokeWidth: 3,
        startPoint: { x: 10, y: 20, pressure: 1, timestamp: Date.now() },
      };

      await gateway.handleStartStroke(mockSocket, payload);

      expect(whiteboardService.startStroke).toHaveBeenCalled();
      expect(mockSocket.to).toHaveBeenCalledWith('wb:class:1');
    });
  });

  describe('handleDrawMove', () => {
    it('should add points and broadcast to room', () => {
      mockSocket.data = { user: mockUser };
      gateway['connectedUsers'].set('socket-1', { user: mockUser, rooms: new Set() });
      const payload = {
        strokeId: 'stroke-1',
        roomId: '1',
        roomType: 'class',
        points: [{ x: 10, y: 10, pressure: 1, timestamp: Date.now() }],
      };

      gateway.handleDrawMove(mockSocket, payload);

      expect(whiteboardService.drawMove).toHaveBeenCalledWith(payload, mockUser);
      expect(mockSocket.to).toHaveBeenCalled();
    });
  });

  describe('handleEndStroke', () => {
    it('should end stroke and broadcast to room', async () => {
      mockSocket.data = { user: mockUser };
      gateway['connectedUsers'].set('socket-1', { user: mockUser, rooms: new Set() });
      const payload = {
        strokeId: 'stroke-1',
        roomId: '1',
        roomType: 'class',
      };

      await gateway.handleEndStroke(mockSocket, payload);

      expect(whiteboardService.endStroke).toHaveBeenCalled();
      expect(mockSocket.to).toHaveBeenCalled();
    });
  });

  describe('handleDrawShape', () => {
    it('should draw shape and broadcast to room', async () => {
      mockSocket.data = { user: mockUser };
      gateway['connectedUsers'].set('socket-1', { user: mockUser, rooms: new Set() });
      const payload = {
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

      await gateway.handleDrawShape(mockSocket, payload);

      expect(whiteboardService.drawShape).toHaveBeenCalled();
      expect(mockSocket.to).toHaveBeenCalled();
    });
  });

  describe('handleDrawText', () => {
    it('should draw text and broadcast to room', async () => {
      mockSocket.data = { user: mockUser };
      gateway['connectedUsers'].set('socket-1', { user: mockUser, rooms: new Set() });
      const payload = {
        strokeId: 'text-1',
        roomId: '1',
        roomType: 'class',
        text: 'Hello',
        x: 50,
        y: 50,
        fontSize: 16,
        color: '#000000',
      };

      await gateway.handleDrawText(mockSocket, payload);

      expect(whiteboardService.drawText).toHaveBeenCalled();
      expect(mockSocket.to).toHaveBeenCalled();
    });
  });

  describe('handleEraseStroke', () => {
    it('should erase stroke and broadcast to room', async () => {
      mockSocket.data = { user: mockUser };
      gateway['connectedUsers'].set('socket-1', { user: mockUser, rooms: new Set() });
      const payload = {
        strokeId: 'stroke-1',
        roomId: '1',
        roomType: 'class',
      };

      await gateway.handleEraseStroke(mockSocket, payload);

      expect(whiteboardService.deleteStroke).toHaveBeenCalled();
    });
  });

  describe('handleUndo', () => {
    it('should undo last stroke and broadcast to room', async () => {
      mockSocket.data = { user: mockUser };
      gateway['connectedUsers'].set('socket-1', { user: mockUser, rooms: new Set() });
      const payload = { roomId: '1', roomType: 'class' };

      await gateway.handleUndo(mockSocket, payload);

      expect(whiteboardService.undoLastStroke).toHaveBeenCalled();
    });
  });

  describe('handleClear', () => {
    it('should clear whiteboard and broadcast to room', async () => {
      mockSocket.data = { user: mockUser };
      gateway['connectedUsers'].set('socket-1', { user: mockUser, rooms: new Set() });
      const payload = { roomId: '1', roomType: 'class' };

      await gateway.handleClear(mockSocket, payload);

      expect(whiteboardService.clearWhiteboard).toHaveBeenCalled();
    });
  });

  describe('handleSyncRequest', () => {
    it('should send full whiteboard state to client', async () => {
      mockSocket.data = { user: mockUser };
      gateway['connectedUsers'].set('socket-1', { user: mockUser, rooms: new Set() });
      const payload = { roomId: '1', roomType: 'class' };

      await gateway.handleSyncRequest(mockSocket, payload);

      expect(whiteboardService.getWhiteboardState).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('wb:sync-state', expect.any(Object));
    });
  });
});
