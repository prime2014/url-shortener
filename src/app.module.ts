import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
// import { AuthMiddleware } from './middleware/auth/auth.middleware';
import { UrlModule } from './url/url.module';
// import { UrlController } from './url/url.controller';
// import { UrlService } from './url/url.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { PrismaModule } from './prisma/prisma.module';

import { ThrottlerModule } from "@nestjs/throttler";
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { UrlController } from './url/url.controller';
import { UrlService } from './url/url.service';
import { PrismaModule } from './prisma/prisma.module';
import sendgridConfig from "./sendgrid.config";
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from "cache-manager-redis-store";
import { RateLimiterModule, RateLimiterGuard } from 'nestjs-rate-limiter';

@Module({
  imports: [
    RateLimiterModule.register({
      keyPrefix: "myRateLimitTrend",
      points:1000,
      errorMessage: "Too many requests",
      duration: 60
    }),
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: "localhost",
      port: 6379
    }),
    ConfigModule.forRoot({ 
      isGlobal: true,
      load: [sendgridConfig]
    }),
   
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get("THROTTLE_TTL"),
          limit: config.get("THROTTLE_LIMIT")
        }
      ]
    }),
    UrlModule,
    PrismaModule,
  
  
    UsersModule, 
    AuthModule
    ],
  controllers: [UrlController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard
    },
    UrlService
  ]
})
export class AppModule {
 
}
