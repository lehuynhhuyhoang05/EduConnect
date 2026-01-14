import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import * as compression from 'compression';
import * as crypto from 'crypto';
import { AppModule } from './app.module';
import { HighPerformanceIoAdapter } from './config/socket-adapter';

// Polyfill for Node.js crypto in webpack bundle
if (typeof global !== 'undefined' && !global.crypto) {
  global.crypto = crypto.webcrypto as any;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  // ===== HIGH PERFORMANCE WEBSOCKET ADAPTER =====
  // Custom Socket.IO adapter with network optimizations
  app.useWebSocketAdapter(new HighPerformanceIoAdapter(app));

  // Compression middleware - reduce response size by 60-80%
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024, // Only compress responses > 1KB
  }));

  // Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        mediaSrc: ["'self'", 'blob:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for video conferencing
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Serve static files from uploads folder
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Enable CORS
  const corsOrigin = configService.get('CORS_ORIGIN');
  const origins = corsOrigin 
    ? corsOrigin.split(',').map((o: string) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3001'];
  
  app.enableCors({
    origin: origins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('EduConnect API')
    .setDescription('Interactive LMS Platform - Backend API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication & Authorization')
    .addTag('Users', 'User Management')
    .addTag('Classes', 'Class Management')
    .addTag('Files', 'File Upload & Management')
    .addTag('Assignments', 'Assignment & Submissions')
    .addTag('Materials', 'Learning Materials')
    .addTag('Live Sessions', 'Real-time Sessions')
    .addTag('Chat', 'Chat Messages')
    .addTag('Notifications', 'User Notifications')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 EduConnect Backend running on: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/docs`);
}

bootstrap();
