import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileLoggerService, LogModule } from './file-logger.service';

// Make logs accessible without auth in development for debugging
// In production, add proper auth guards

@Controller('api/logs')
export class LogsController {
  constructor(private readonly logger: FileLoggerService) {}

  /**
   * Get available modules
   */
  @Get('modules')
  getModules() {
    return {
      modules: Object.values(LogModule),
      description: 'Available log modules',
    };
  }

  /**
   * Get logs for a specific module
   */
  @Get('module/:module')
  getModuleLogs(
    @Param('module') module: LogModule,
    @Query('level') level: string = 'log',
    @Query('lines') lines: number = 100,
  ) {
    if (!Object.values(LogModule).includes(module)) {
      return { error: 'Invalid module', validModules: Object.values(LogModule) };
    }

    const logs = this.logger.getModuleLogs(module, level, lines);
    return {
      module,
      level,
      count: logs.length,
      logs,
    };
  }

  /**
   * Get all error logs
   */
  @Get('errors')
  getErrorLogs(@Query('lines') lines: number = 100) {
    const logs = this.logger.getErrorLogs(lines);
    return {
      type: 'errors',
      count: logs.length,
      logs,
    };
  }

  /**
   * Get combined logs
   */
  @Get('combined')
  getCombinedLogs(@Query('lines') lines: number = 100) {
    const logs = this.logger.getCombinedLogs(lines);
    return {
      type: 'combined',
      count: logs.length,
      logs,
    };
  }

  /**
   * Get log files for a module
   */
  @Get('files/:module')
  getLogFiles(@Param('module') module: LogModule) {
    if (!Object.values(LogModule).includes(module)) {
      return { error: 'Invalid module', validModules: Object.values(LogModule) };
    }

    const files = this.logger.getLogFiles(module);
    return {
      module,
      files,
    };
  }

  /**
   * Clear logs for a module
   */
  @Delete('module/:module')
  clearModuleLogs(@Param('module') module: LogModule) {
    if (!Object.values(LogModule).includes(module)) {
      return { error: 'Invalid module', validModules: Object.values(LogModule) };
    }

    this.logger.clearModuleLogs(module);
    return {
      success: true,
      message: `Logs cleared for module: ${module}`,
    };
  }

  /**
   * Quick view of recent activity across all modules
   */
  @Get('summary')
  getLogsSummary() {
    const summary: Record<string, any> = {};
    
    Object.values(LogModule).forEach(module => {
      const logs = this.logger.getModuleLogs(module, 'log', 5);
      const errors = this.logger.getModuleLogs(module, 'error', 5);
      summary[module] = {
        recentLogs: logs.length,
        recentErrors: errors.length,
        lastLog: logs[logs.length - 1] || null,
        lastError: errors[errors.length - 1] || null,
      };
    });

    return {
      timestamp: new Date().toISOString(),
      summary,
    };
  }
}
