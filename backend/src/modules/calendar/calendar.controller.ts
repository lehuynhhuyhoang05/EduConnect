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
  UseInterceptors,
  UploadedFile,
  Res,
  Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators';
import { User } from '@modules/users/entities/user.entity';
import { CalendarService } from './calendar.service';
import { CalendarImportService } from './calendar-import.service';
import { CreateCalendarEventDto, UpdateCalendarEventDto, GetCalendarEventsDto } from './dto';
import { ImportCalendarDto, ExportCalendarDto, ImportSource } from './dto/import-calendar.dto';

@ApiTags('Calendar')
@Controller('calendar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly calendarImportService: CalendarImportService,
  ) {}

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

  // ==================== IMPORT / EXPORT ====================

  @Post('import')
  @ApiOperation({ summary: 'Import calendar from iCal (.ics) file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importCalendar(
    @UploadedFile() file: Express.Multer.File,
    @Body() options: ImportCalendarDto,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new Error('File is required');
    }

    const icalContent = file.buffer.toString('utf-8');
    return this.calendarImportService.importFromIcal(icalContent, user.id, {
      ...options,
      source: ImportSource.ICAL_FILE,
    });
  }

  @Get('export')
  @ApiOperation({ summary: 'Export calendar to iCal (.ics) format' })
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  async exportCalendar(
    @CurrentUser() user: User,
    @Query() options: ExportCalendarDto,
    @Res() res: Response,
  ) {
    const icalContent = await this.calendarImportService.exportToIcal(user.id, options);
    
    res.setHeader('Content-Disposition', 'attachment; filename="educonnect-calendar.ics"');
    res.send(icalContent);
  }

  @Get('google/auth-url')
  @ApiOperation({ summary: 'Get Google Calendar OAuth URL' })
  async getGoogleAuthUrl(@Query('redirectUri') redirectUri: string) {
    return {
      url: this.calendarImportService.getGoogleCalendarAuthUrl(redirectUri),
    };
  }
}
