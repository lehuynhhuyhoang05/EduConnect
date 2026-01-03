import { 
  IsNotEmpty, 
  IsString, 
  IsOptional, 
  IsEnum, 
  MaxLength,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType, RoomType } from '../entities/chat-message.entity';

export class SendMessageDto {
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  @IsString()
  @MaxLength(5000, { message: 'Tin nhắn không được quá 5000 ký tự' })
  message: string;

  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType = MessageType.TEXT;

  @IsOptional()
  @IsUrl({}, { message: 'URL file không hợp lệ' })
  @MaxLength(500)
  fileUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  replyTo?: number;
}

export class UpdateMessageDto {
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  @IsString()
  @MaxLength(5000, { message: 'Tin nhắn không được quá 5000 ký tự' })
  message: string;
}

export class ChatMessageResponseDto {
  id: number;
  roomId: string;
  roomType: RoomType;
  sender: {
    id: number;
    fullName: string;
    avatarUrl: string | null;
  };
  message: string;
  messageType: MessageType;
  fileUrl: string | null;
  replyTo: ChatMessageResponseDto | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  isOwner?: boolean;
}
