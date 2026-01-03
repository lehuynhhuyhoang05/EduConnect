import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClassesModule } from './modules/classes/classes.module';
import { FilesModule } from './modules/files/files.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { LiveSessionsModule } from './modules/live-sessions/live-sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: typeOrmConfig,
    }),
    AuthModule,
    UsersModule,
    ClassesModule,
    FilesModule,
    AssignmentsModule,
    LiveSessionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
