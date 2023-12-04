import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

import { JwtStrategy } from 'src/auth/strategy/jwt.strategy';
import { AuthModule } from 'src/auth/auth.module';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/auth/guard/jwt.guard';
import { PrismaService } from 'src/prisma/prisma.service';


@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy, JwtService, JwtAuthGuard, PrismaService]
})
export class UsersModule {}
