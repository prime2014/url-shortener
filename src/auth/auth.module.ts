import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtStrategy } from "./strategy/jwt.strategy";
import { ApiKeyAuthGuard, JwtAuthGuard, RefreshTokenGuard } from '../auth/guard/jwt.guard';
import { ApiKeyStrategy } from './strategy/api-key.strategy';
import { RefreshTokenStrategy } from './strategy/refreshtoken.strategy';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthController } from './auth.controller';


@Module({
  imports: [JwtModule.register({})],
  providers: [AuthService, JwtService, JwtStrategy, JwtAuthGuard, RefreshTokenStrategy, RefreshTokenGuard, ApiKeyStrategy, ApiKeyAuthGuard, PrismaService],
  exports: [AuthService, JwtAuthGuard, RefreshTokenGuard, ApiKeyAuthGuard],
  controllers: [AuthController]
})
export class AuthModule {}
