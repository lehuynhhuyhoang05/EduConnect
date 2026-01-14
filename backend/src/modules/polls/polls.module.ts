import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Poll, PollResponse } from './entities/poll.entity';
import { User } from '@modules/users/entities/user.entity';
import { PollsService } from './polls.service';
import { PollsController } from './polls.controller';
import { PollsGateway } from './polls.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Poll, PollResponse, User]),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PollsController],
  providers: [PollsService, PollsGateway],
  exports: [PollsService],
})
export class PollsModule {}
