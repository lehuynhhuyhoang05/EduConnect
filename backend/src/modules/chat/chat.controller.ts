import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { SendMessageDto, UpdateMessageDto } from './dto/chat-message.dto';
import { QueryMessagesDto } from './dto/query.dto';
import { RoomType } from './entities/chat-message.entity';

@Controller()
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Get user's chat rooms (classes they're in)
   */
  @Get('chat/rooms')
  async getChatRooms(@CurrentUser() user: User) {
    return this.chatService.getChatRooms(user);
  }

  /**
   * Get messages in a class chat room
   */
  @Get('classes/:classId/messages')
  async getClassMessages(
    @Param('classId', ParseIntPipe) classId: number,
    @Query() query: QueryMessagesDto,
    @CurrentUser() user: User,
  ) {
    return this.chatService.getMessages(
      String(classId),
      RoomType.CLASS,
      query,
      user,
    );
  }

  /**
   * Send message to class chat room
   */
  @Post('classes/:classId/messages')
  async sendClassMessage(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: User,
  ) {
    const message = await this.chatService.sendMessage(
      String(classId),
      RoomType.CLASS,
      dto,
      user,
    );

    // Broadcast via WebSocket
    this.chatGateway.broadcastToRoom(
      String(classId),
      RoomType.CLASS,
      'new-message',
      message,
    );

    return message;
  }

  /**
   * Get messages in a live session chat room
   */
  @Get('sessions/:roomId/messages')
  async getSessionMessages(
    @Param('roomId') roomId: string,
    @Query() query: QueryMessagesDto,
    @CurrentUser() user: User,
  ) {
    return this.chatService.getMessages(
      roomId,
      RoomType.LIVE_SESSION,
      query,
      user,
    );
  }

  /**
   * Send message to live session chat room
   */
  @Post('sessions/:roomId/messages')
  async sendSessionMessage(
    @Param('roomId') roomId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: User,
  ) {
    const message = await this.chatService.sendMessage(
      roomId,
      RoomType.LIVE_SESSION,
      dto,
      user,
    );

    // Broadcast via WebSocket
    this.chatGateway.broadcastToRoom(
      roomId,
      RoomType.LIVE_SESSION,
      'new-message',
      message,
    );

    return message;
  }

  /**
   * Get a single message
   */
  @Get('messages/:id')
  async getMessage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.chatService.getMessage(id, user);
  }

  /**
   * Edit a message
   */
  @Put('messages/:id')
  async updateMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMessageDto,
    @CurrentUser() user: User,
  ) {
    const message = await this.chatService.updateMessage(id, dto, user);

    // Broadcast via WebSocket
    this.chatGateway.broadcastToRoom(
      message.roomId,
      message.roomType,
      'message-edited',
      message,
    );

    return message;
  }

  /**
   * Delete a message
   */
  @Delete('messages/:id')
  async deleteMessage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    // Get message first to broadcast
    const message = await this.chatService.getMessage(id, user);
    await this.chatService.deleteMessage(id, user);

    // Broadcast via WebSocket
    this.chatGateway.broadcastToRoom(
      message.roomId,
      message.roomType,
      'message-deleted',
      { messageId: id },
    );

    return { success: true, message: 'Tin nhắn đã được xóa' };
  }

  /**
   * Search messages
   */
  @Get('chat/search')
  async searchMessages(
    @Query('q') searchQuery: string,
    @Query('limit') limitParam: string,
    @CurrentUser() user: User,
  ) {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return { data: [], message: 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự' };
    }
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const messages = await this.chatService.searchMessages(searchQuery, user, limit);
    return { data: messages };
  }

  /**
   * Get online users in a room
   */
  @Get('chat/rooms/:roomId/online')
  async getOnlineUsers(
    @Param('roomId') roomId: string,
    @Query('type') roomType: RoomType = RoomType.CLASS,
  ) {
    const userIds = this.chatGateway.getOnlineUsersInRoom(roomId, roomType);
    return { userIds, count: userIds.length };
  }
}
