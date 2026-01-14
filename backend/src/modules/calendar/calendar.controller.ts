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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators';
import { User } from '@modules/users/entities/user.entity';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto, UpdateCalendarEventDto, GetCalendarEventsDto } from './dto';

@ApiTags('Calendar')
@Controller('calendar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  @ApiOperation({ summary: 'Create a calendar event' })
  async create(@Body() dto: CreateCalendarEventDto, @CurrentUser() user: User) {
    return this.calendarService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get calendar events for current user' })
  async getEvents(@CurrentUser() user: User, @Query() query: GetCalendarEventsDto) {
    return this.calendarService.getEvents(user.id, query);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming events (next 7 days)' })
  async getUpcomingEvents(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
  ) {
    return this.calendarService.getUpcomingEvents(user.id, limit);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today events' })
  async getTodayEvents(@CurrentUser() user: User) {
    return this.calendarService.getTodayEvents(user.id);
  }

  @Get('class/:classId')
  @ApiOperation({ summary: 'Get calendar events for a class' })
  async getClassEvents(
    @Param('classId', ParseIntPipe) classId: number,
    @Query() query: GetCalendarEventsDto,
  ) {
    return this.calendarService.getClassEvents(classId, query);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a calendar event' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCalendarEventDto,
    @CurrentUser() user: User,
  ) {
    return this.calendarService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a calendar event' })
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    await this.calendarService.delete(id, user.id);
    return { success: true };
  }
}
