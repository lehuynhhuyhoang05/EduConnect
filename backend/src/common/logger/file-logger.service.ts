import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export enum LogModule {
  AUTH = 'auth',
  USERS = 'users',
  CLASSES = 'classes',
  FILES = 'files',
  ASSIGNMENTS = 'assignments',
  LIVE_SESSIONS = 'live-sessions',
  CHAT = 'chat',
  WHITEBOARD = 'whiteboard',
  NOTIFICATIONS = 'notifications',
  GENERAL = 'general',
}

interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  context?: string;
  message: string;
  data?: any;
  error?: {
    message: string;
    stack?: string;
  };
}

@Injectable()
export class FileLoggerService implements LoggerService {
  private readonly logsDir: string;
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly maxFiles = 10;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.ensureLogsDirectory();
  }

  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    // Create module-specific directories
    Object.values(LogModule).forEach(module => {
      const moduleDir = path.join(this.logsDir, module);
      if (!fs.existsSync(moduleDir)) {
        fs.mkdirSync(moduleDir, { recursive: true });
      }
    });
  }

  private getLogFilePath(module: LogModule, level: string): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logsDir, module, `${date}-${level}.log`);
  }

  private getCombinedLogPath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logsDir, `${date}-combined.log`);
  }

  private getErrorLogPath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logsDir, `${date}-errors.log`);
  }

  private formatLogEntry(entry: LogEntry): string {
    const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}]`;
    const context = entry.context ? ` [${entry.context}]` : '';
    let log = `${base}${context} ${entry.message}`;
    
    if (entry.data) {
      log += `\n  Data: ${JSON.stringify(entry.data, null, 2).replace(/\n/g, '\n  ')}`;
    }
    
    if (entry.error) {
      log += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        log += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    return log + '\n';
  }

  private writeToFile(filePath: string, content: string): void {
    try {
      // Check file size and rotate if needed
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > this.maxFileSize) {
          this.rotateLogFile(filePath);
        }
      }
      
      fs.appendFileSync(filePath, content, 'utf8');
    } catch (error) {
      console.error(`Failed to write log: ${error.message}`);
    }
  }

  private rotateLogFile(filePath: string): void {
    const ext = path.extname(filePath);
    const base = filePath.slice(0, -ext.length);
    
    // Remove oldest file if max reached
    const oldestPath = `${base}.${this.maxFiles}${ext}`;
    if (fs.existsSync(oldestPath)) {
      fs.unlinkSync(oldestPath);
    }
    
    // Rotate existing files
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const currentPath = `${base}.${i}${ext}`;
      const nextPath = `${base}.${i + 1}${ext}`;
      if (fs.existsSync(currentPath)) {
        fs.renameSync(currentPath, nextPath);
      }
    }
    
    // Rename current file to .1
    fs.renameSync(filePath, `${base}.1${ext}`);
  }

  private writeLog(
    level: string,
    message: any,
    module: LogModule = LogModule.GENERAL,
    context?: string,
    data?: any,
    error?: Error,
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      context,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      data,
      error: error ? { message: error.message, stack: error.stack } : undefined,
    };

    const formattedLog = this.formatLogEntry(entry);

    // Write to module-specific file
    this.writeToFile(this.getLogFilePath(module, level), formattedLog);

    // Write to combined log
    this.writeToFile(this.getCombinedLogPath(), formattedLog);

    // Write errors to error log
    if (level === 'error' || level === 'warn') {
      this.writeToFile(this.getErrorLogPath(), formattedLog);
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const colors = {
        log: '\x1b[32m',    // Green
        error: '\x1b[31m',  // Red
        warn: '\x1b[33m',   // Yellow
        debug: '\x1b[36m',  // Cyan
        verbose: '\x1b[35m', // Magenta
      };
      const reset = '\x1b[0m';
      const color = colors[level] || '';
      console.log(`${color}${formattedLog}${reset}`);
    }
  }

  // Standard LoggerService methods
  log(message: any, context?: string): void {
    this.writeLog('log', message, LogModule.GENERAL, context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.writeLog('error', message, LogModule.GENERAL, context, undefined, 
      trace ? { message: '', stack: trace } as Error : undefined);
  }

  warn(message: any, context?: string): void {
    this.writeLog('warn', message, LogModule.GENERAL, context);
  }

  debug?(message: any, context?: string): void {
    this.writeLog('debug', message, LogModule.GENERAL, context);
  }

  verbose?(message: any, context?: string): void {
    this.writeLog('verbose', message, LogModule.GENERAL, context);
  }

  // Module-specific logging methods
  logModule(module: LogModule, level: string, message: string, context?: string, data?: any, error?: Error): void {
    this.writeLog(level, message, module, context, data, error);
  }

  // Convenience methods for each module
  auth(level: string, message: string, data?: any, error?: Error): void {
    this.logModule(LogModule.AUTH, level, message, 'AuthModule', data, error);
  }

  users(level: string, message: string, data?: any, error?: Error): void {
    this.logModule(LogModule.USERS, level, message, 'UsersModule', data, error);
  }

  classes(level: string, message: string, data?: any, error?: Error): void {
    this.logModule(LogModule.CLASSES, level, message, 'ClassesModule', data, error);
  }

  files(level: string, message: string, data?: any, error?: Error): void {
    this.logModule(LogModule.FILES, level, message, 'FilesModule', data, error);
  }

  assignments(level: string, message: string, data?: any, error?: Error): void {
    this.logModule(LogModule.ASSIGNMENTS, level, message, 'AssignmentsModule', data, error);
  }

  liveSessions(level: string, message: string, data?: any, error?: Error): void {
    this.logModule(LogModule.LIVE_SESSIONS, level, message, 'LiveSessionsModule', data, error);
  }

  chat(level: string, message: string, data?: any, error?: Error): void {
    this.logModule(LogModule.CHAT, level, message, 'ChatModule', data, error);
  }

  whiteboard(level: string, message: string, data?: any, error?: Error): void {
    this.logModule(LogModule.WHITEBOARD, level, message, 'WhiteboardModule', data, error);
  }

  notifications(level: string, message: string, data?: any, error?: Error): void {
    this.logModule(LogModule.NOTIFICATIONS, level, message, 'NotificationsModule', data, error);
  }

  // Get logs for a specific module
  getModuleLogs(module: LogModule, level: string = 'log', lines: number = 100): string[] {
    const filePath = this.getLogFilePath(module, level);
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const allLines = content.split('\n').filter(line => line.trim());
    return allLines.slice(-lines);
  }

  // Get all error logs
  getErrorLogs(lines: number = 100): string[] {
    const filePath = this.getErrorLogPath();
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const allLines = content.split('\n').filter(line => line.trim());
    return allLines.slice(-lines);
  }

  // Get combined logs
  getCombinedLogs(lines: number = 100): string[] {
    const filePath = this.getCombinedLogPath();
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const allLines = content.split('\n').filter(line => line.trim());
    return allLines.slice(-lines);
  }

  // Clear logs for a module
  clearModuleLogs(module: LogModule): void {
    const moduleDir = path.join(this.logsDir, module);
    if (fs.existsSync(moduleDir)) {
      fs.readdirSync(moduleDir).forEach(file => {
        fs.unlinkSync(path.join(moduleDir, file));
      });
    }
  }

  // Get log file paths for a module
  getLogFiles(module: LogModule): string[] {
    const moduleDir = path.join(this.logsDir, module);
    if (!fs.existsSync(moduleDir)) {
      return [];
    }
    return fs.readdirSync(moduleDir).map(file => path.join(moduleDir, file));
  }
}

// Singleton instance for easy access
export const fileLogger = new FileLoggerService();
