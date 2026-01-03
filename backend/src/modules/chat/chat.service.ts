import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import * as sanitizeHtml from 'sanitize-html';
import { ChatMessage, RoomType, MessageType } from './entities/chat-message.entity';
import { SendMessageDto, UpdateMessageDto, ChatMessageResponseDto } from './dto/chat-message.dto';
import { QueryMessagesDto } from './dto/query.dto';
import { User } from '../users/entities/user.entity';
import { ClassesService } from '../classes/classes.service';
import { LiveSessionsService } from '../live-sessions/live-sessions.service';
import { FileLoggerService } from '../../common/logger/file-logger.service';

// Sanitization config for chat messages
const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'br', 'code', 'pre'],
  allowedAttributes: {
    'a': ['href', 'target'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    private readonly classesService: ClassesService,
    private readonly liveSessionsService: LiveSessionsService,
    private readonly fileLogger: FileLoggerService,
  ) {}

  /**
   * Sanitize message content to prevent XSS
   */
  private sanitizeMessage(content: string): string {
    return sanitizeHtml(content, sanitizeOptions);
  }

  /**
   * Send a message to a chat room
   */
  async sendMessage(
    roomId: string,
    roomType: RoomType,
    dto: SendMessageDto,
    sender: User,
  ): Promise<ChatMessageResponseDto> {
    // Verify room access
    await this.verifyRoomAccess(roomId, roomType, sender);

    // Validate reply reference
    if (dto.replyTo) {
      const replyMessage = await this.messageRepository.findOne({
        where: { id: dto.replyTo, roomId, roomType },
      });
      if (!replyMessage) {
        throw new BadRequestException('Tin nhắn được trả lời không tồn tại');
      }
    }

    // Validate file URL for file/image types
    if ((dto.messageType === MessageType.FILE || dto.messageType === MessageType.IMAGE) && !dto.fileUrl) {
      throw new BadRequestException('File URL là bắt buộc cho tin nhắn loại file/image');
    }

    // Sanitize message content to prevent XSS
    const sanitizedMessage = this.sanitizeMessage(dto.message);

    const message = this.messageRepository.create({
      roomId,
      roomType,
      senderId: sender.id,
      message: sanitizedMessage,
      messageType: dto.messageType || MessageType.TEXT,
      fileUrl: dto.fileUrl,
      replyTo: dto.replyTo,
    });

    const saved = await this.messageRepository.save(message);
    this.logger.log(`Message sent in ${roomType}:${roomId} by user ${sender.id}`);
    this.fileLogger.chat('log', `Message sent`, { 
      messageId: saved.id, 
      roomId, 
      roomType, 
      senderId: sender.id,
      messageType: dto.messageType || MessageType.TEXT,
    });

    return this.toResponseDto(saved, sender, sender);
  }

  /**
   * Get messages from a chat room
   */
  async getMessages(
    roomId: string,
    roomType: RoomType,
    query: QueryMessagesDto,
    user: User,
  ): Promise<{ data: ChatMessageResponseDto[]; hasMore: boolean; total: number }> {
    // Verify room access
    await this.verifyRoomAccess(roomId, roomType, user);

    const { page = 1, limit = 50, before, after, search, includeDeleted } = query;

    const queryBuilder = this.messageRepository
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.sender', 'sender')
      .leftJoinAndSelect('msg.replyToMessage', 'replyTo')
      .leftJoinAndSelect('replyTo.sender', 'replyToSender')
      .where('msg.roomId = :roomId', { roomId })
      .andWhere('msg.roomType = :roomType', { roomType });

    // Filter deleted messages
    if (!includeDeleted) {
      queryBuilder.andWhere('msg.isDeleted = false');
    }

    // Cursor-based pagination
    if (before) {
      queryBuilder.andWhere('msg.id < :before', { before });
    }
    if (after) {
      queryBuilder.andWhere('msg.id > :after', { after });
    }

    // Search in message content
    if (search) {
      queryBuilder.andWhere('msg.message LIKE :search', { search: `%${search}%` });
    }

    const [messages, total] = await queryBuilder
      .orderBy('msg.id', 'DESC')
      .take(limit + 1) // Take one extra to check hasMore
      .getManyAndCount();

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // Remove the extra item
    }

    return {
      data: messages.map(m => this.toResponseDto(m, m.sender, user)),
      hasMore,
      total,
    };
  }

  /**
   * Get a single message by ID
   */
  async getMessage(
    messageId: number,
    user: User,
  ): Promise<ChatMessageResponseDto> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'replyToMessage', 'replyToMessage.sender'],
    });

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    // Verify room access
    await this.verifyRoomAccess(message.roomId, message.roomType, user);

    return this.toResponseDto(message, message.sender, user);
  }

  /**
   * Update a message (edit)
   */
  async updateMessage(
    messageId: number,
    dto: UpdateMessageDto,
    user: User,
  ): Promise<ChatMessageResponseDto> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    if (message.senderId !== user.id) {
      throw new ForbiddenException('Bạn chỉ có thể chỉnh sửa tin nhắn của mình');
    }

    if (message.isDeleted) {
      throw new BadRequestException('Không thể chỉnh sửa tin nhắn đã xóa');
    }

    // Check if message is too old (e.g., 24 hours)
    const maxEditTime = 24 * 60 * 60 * 1000; // 24 hours in ms
    if (Date.now() - message.createdAt.getTime() > maxEditTime) {
      throw new BadRequestException('Không thể chỉnh sửa tin nhắn sau 24 giờ');
    }

    message.message = dto.message;
    message.isEdited = true;

    const saved = await this.messageRepository.save(message);
    this.logger.log(`Message ${messageId} edited by user ${user.id}`);

    return this.toResponseDto(saved, message.sender, user);
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: number, user: User): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    if (message.senderId !== user.id) {
      // Check if user is teacher/host of the room
      const canModerate = await this.canModerateRoom(message.roomId, message.roomType, user);
      if (!canModerate) {
        throw new ForbiddenException('Bạn không có quyền xóa tin nhắn này');
      }
    }

    message.isDeleted = true;
    message.message = '[Tin nhắn đã bị xóa]';
    await this.messageRepository.save(message);

    this.logger.log(`Message ${messageId} deleted by user ${user.id}`);
  }

  /**
   * Get recent messages for real-time sync
   */
  async getRecentMessages(
    roomId: string,
    roomType: RoomType,
    afterId: number,
    user: User,
  ): Promise<ChatMessageResponseDto[]> {
    await this.verifyRoomAccess(roomId, roomType, user);

    const messages = await this.messageRepository.find({
      where: {
        roomId,
        roomType,
        id: MoreThan(afterId),
        isDeleted: false,
      },
      relations: ['sender', 'replyToMessage', 'replyToMessage.sender'],
      order: { id: 'ASC' },
      take: 100, // Max 100 messages per sync
    });

    return messages.map(m => this.toResponseDto(m, m.sender, user));
  }

  /**
   * Get chat rooms for user (classes and live sessions)
   */
  async getChatRooms(user: User): Promise<any[]> {
    this.fileLogger.chat('log', 'getChatRooms called', { userId: user.id });

    try {
      // Get user's classes - filter by myClasses to only get classes user belongs to
      const classes = await this.classesService.findAll({ myClasses: true }, user);
      this.fileLogger.chat('log', 'Classes fetched for rooms', { 
        userId: user.id, 
        classCount: classes.data.length,
      });
      
      const rooms: any[] = [];

      // Add class chat rooms
      for (const cls of classes.data) {
        const lastMessage = await this.messageRepository.findOne({
          where: { 
            roomId: String(cls.id), 
            roomType: RoomType.CLASS,
            isDeleted: false,
          },
          relations: ['sender'],
          order: { createdAt: 'DESC' },
        });

        const unreadCount = await this.getUnreadCount(String(cls.id), RoomType.CLASS, user.id);

        rooms.push({
          roomId: String(cls.id),
          roomType: RoomType.CLASS,
          name: cls.name,
          description: cls.description,
          lastMessage: lastMessage ? {
            message: lastMessage.message,
            sender: lastMessage.sender?.fullName,
            createdAt: lastMessage.createdAt,
          } : null,
          unreadCount,
        });
      }

      this.fileLogger.chat('log', 'Chat rooms built', { 
        userId: user.id, 
        roomCount: rooms.length,
      });

      return rooms;
    } catch (error) {
      this.fileLogger.chat('error', 'getChatRooms failed', {
        userId: user.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * System message for announcements
   */
  async sendSystemMessage(
    roomId: string,
    roomType: RoomType,
    message: string,
  ): Promise<ChatMessage> {
    const systemMessage = this.messageRepository.create({
      roomId,
      roomType,
      senderId: 0, // System sender
      message,
      messageType: MessageType.SYSTEM,
    });

    return this.messageRepository.save(systemMessage);
  }

  /**
   * Get message count in a room
   */
  async getMessageCount(roomId: string, roomType: RoomType): Promise<number> {
    return this.messageRepository.count({
      where: { roomId, roomType, isDeleted: false },
    });
  }

  /**
   * Search messages across rooms
   */
  async searchMessages(
    searchQuery: string,
    user: User,
    limit: number = 50,
  ): Promise<ChatMessageResponseDto[]> {
    // Ensure limit is a valid number
    const safeLimit = typeof limit === 'number' && !isNaN(limit) ? limit : 50;
    
    this.fileLogger.chat('log', 'searchMessages called', { 
      searchQuery, 
      userId: user.id, 
      limit: safeLimit 
    });

    try {
      // Get user's accessible room IDs - filter by myClasses: true
      const classes = await this.classesService.findAll({ myClasses: true }, user);
      this.fileLogger.chat('log', 'Classes found for search', { 
        count: classes.data.length,
        classIds: classes.data.map(c => c.id),
      });

      const classIds = classes.data.map(c => String(c.id));

      if (classIds.length === 0) {
        this.fileLogger.chat('log', 'No classes found, returning empty array');
        return [];
      }

      const messages = await this.messageRepository
        .createQueryBuilder('msg')
        .leftJoinAndSelect('msg.sender', 'sender')
        .where('msg.roomId IN (:...roomIds)', { roomIds: classIds })
        .andWhere('msg.message LIKE :search', { search: `%${searchQuery}%` })
        .andWhere('msg.isDeleted = false')
        .orderBy('msg.createdAt', 'DESC')
        .take(safeLimit)
        .getMany();

      this.fileLogger.chat('log', 'Search results', { 
        query: searchQuery,
        messagesFound: messages.length,
      });

      return messages.map(m => this.toResponseDto(m, m.sender, user));
    } catch (error) {
      this.fileLogger.chat('error', 'searchMessages failed', {
        searchQuery,
        userId: user.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // =============== PRIVATE HELPER METHODS ===============

  /**
   * Verify user has access to the chat room
   */
  private async verifyRoomAccess(roomId: string, roomType: RoomType, user: User): Promise<void> {
    if (roomType === RoomType.CLASS) {
      const classId = parseInt(roomId);
      const isMember = await this.classesService.isMember(classId, user.id);
      const isTeacher = await this.classesService.isTeacher(classId, user.id);
      if (!isMember && !isTeacher) {
        throw new ForbiddenException('Bạn không phải thành viên của lớp này');
      }
    } else if (roomType === RoomType.LIVE_SESSION) {
      // For live session, verify user is in the session
      const session = await this.liveSessionsService.findOneSession(roomId, user);
      if (!session) {
        throw new ForbiddenException('Bạn không có quyền truy cập phiên học này');
      }
    }
  }

  /**
   * Check if user can moderate (delete others' messages) in the room
   */
  private async canModerateRoom(roomId: string, roomType: RoomType, user: User): Promise<boolean> {
    if (roomType === RoomType.CLASS) {
      const classId = parseInt(roomId);
      return this.classesService.isTeacher(classId, user.id);
    } else if (roomType === RoomType.LIVE_SESSION) {
      const session = await this.liveSessionsService.findOneSession(roomId, user);
      return session && session.isHost;
    }
    return false;
  }

  /**
   * Get unread message count for a room (simplified - could use read receipts)
   */
  private async getUnreadCount(roomId: string, roomType: RoomType, userId: number): Promise<number> {
    // Simplified implementation - in production, use read receipts table
    // For now, return 0
    return 0;
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(
    message: ChatMessage,
    sender: User | null,
    currentUser: User,
  ): ChatMessageResponseDto {
    const response: ChatMessageResponseDto = {
      id: message.id,
      roomId: message.roomId,
      roomType: message.roomType,
      sender: sender ? {
        id: sender.id,
        fullName: sender.fullName,
        avatarUrl: sender.avatarUrl,
      } : {
        id: 0,
        fullName: 'System',
        avatarUrl: null,
      },
      message: message.message,
      messageType: message.messageType,
      fileUrl: message.fileUrl,
      replyTo: message.replyToMessage 
        ? this.toResponseDto(message.replyToMessage, message.replyToMessage.sender, currentUser) 
        : null,
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      isOwner: message.senderId === currentUser.id,
    };

    return response;
  }
}
