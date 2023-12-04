import { Module } from '@nestjs/common';
import { UrlController } from './url.controller';
import { UrlService } from './url.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiKeyAuthGuard } from 'src/auth/guard/jwt.guard';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UrlController],
  providers: [UrlService, PrismaService, ApiKeyAuthGuard]
})
export class UrlModule {}
