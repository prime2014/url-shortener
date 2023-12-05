import { Module } from '@nestjs/common';
// import { AuthMiddleware } from './middleware/auth/auth.middleware';
import { UrlModule } from './url/url.module';
// import { UrlController } from './url/url.controller';
// import { UrlService } from './url/url.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { PrismaModule } from './prisma/prisma.module';
import * as redisStore from 'cache-manager-redis-store';
import { CacheModule } from "@nestjs/cache-manager";
import { MurLockModule } from "murlock";
import { ThrottlerModule } from "@nestjs/throttler";
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { UrlController } from './url/url.controller';
import { UrlService } from './url/url.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MurLockModule.registerSync({
      redisOptions: { url: process.env.REDIS_URL },
      wait: 3000,
      maxAttempts: 5,
      logLevel: "log",
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
  
    CacheModule.register({ 
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    }), UsersModule, AuthModule
    ],
  controllers: [UrlController],
  providers: [UrlService]
})
export class AppModule {
 
}
