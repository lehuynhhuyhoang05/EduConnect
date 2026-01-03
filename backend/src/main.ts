import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

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
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || 'http://localhost:5173',
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
