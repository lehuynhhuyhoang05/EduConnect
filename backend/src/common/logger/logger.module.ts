import { Module, Global } from '@nestjs/common';
import { FileLoggerService } from './file-logger.service';
import { LogsController } from './logs.controller';

@Global()
@Module({
  controllers: [LogsController],
  providers: [FileLoggerService],
  exports: [FileLoggerService],
})
export class LoggerModule {}
