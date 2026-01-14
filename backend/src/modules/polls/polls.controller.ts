import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { CurrentUser, Roles } from '@modules/auth/decorators';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { PollsService } from './polls.service';
import { CreatePollDto, SubmitResponseDto } from './dto';

@ApiTags('Polls')
@Controller('polls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a new poll/quiz' })
  @ApiResponse({ status: 201, description: 'Poll created successfully' })
  async create(@Body() createPollDto: CreatePollDto, @CurrentUser() user: User) {
    return this.pollsService.create(createPollDto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get poll by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pollsService.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get polls by class or session' })
  async findAll(
    @Query('classId') classId?: number,
    @Query('sessionId') sessionId?: number,
  ) {
    return this.pollsService.findByClassOrSession(classId, sessionId);
  }

  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Start a poll' })
  async startPoll(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.pollsService.startPoll(id, user.id);
  }

  @Post(':id/close')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Close a poll' })
  async closePoll(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.pollsService.closePoll(id, user.id);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Submit a response to a poll' })
  async submitResponse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Omit<SubmitResponseDto, 'pollId'>,
    @CurrentUser() user: User,
  ) {
    return this.pollsService.submitResponse({ ...dto, pollId: id }, user);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get poll results' })
  async getResults(@Param('id', ParseIntPipe) id: number) {
    return this.pollsService.getLiveResults(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete a poll' })
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    await this.pollsService.delete(id, user.id);
    return { success: true };
  }
}
