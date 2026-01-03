import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'API root endpoint' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    // Check database connection
    let dbStatus = 'unknown';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      dbLatency = Date.now() - start;
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'EduConnect Backend API',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      },
      database: {
        status: dbStatus,
        latency: dbLatency + 'ms',
      },
    };
  }

  @Get('health/live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  liveCheck() {
    return { status: 'alive' };
  }

  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  async readyCheck() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ready' };
    } catch {
      return { status: 'not ready' };
    }
  }
}
