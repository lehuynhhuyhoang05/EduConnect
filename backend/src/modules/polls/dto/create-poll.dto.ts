import { IsString, IsEnum, IsArray, IsBoolean, IsNumber, IsOptional, Min, Max, MaxLength, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PollType } from '../entities/poll.entity';

export class CreatePollDto {
  @ApiProperty({ description: 'Poll question', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  question: string;

  @ApiProperty({ enum: PollType, default: PollType.SINGLE_CHOICE })
  @IsEnum(PollType)
  type: PollType;

  @ApiPropertyOptional({ description: 'Answer options for choice questions' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  options?: string[];

  @ApiPropertyOptional({ description: 'Index of correct answers (for quiz mode)' })
  @IsOptional()
  @IsArray()
  correctAnswers?: number[];

  @ApiPropertyOptional({ description: 'Is this a quiz with correct answers', default: false })
  @IsOptional()
  @IsBoolean()
  isQuiz?: boolean;

  @ApiPropertyOptional({ description: 'Time limit in seconds (0 = no limit)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3600)
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Show results to students', default: true })
  @IsOptional()
  @IsBoolean()
  showResults?: boolean;

  @ApiPropertyOptional({ description: 'Anonymous voting', default: false })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @ApiPropertyOptional({ description: 'Class ID' })
  @IsOptional()
  @IsNumber()
  classId?: number;

  @ApiPropertyOptional({ description: 'Live session ID' })
  @IsOptional()
  @IsNumber()
  sessionId?: number;
}
