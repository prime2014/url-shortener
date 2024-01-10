import { Module } from '@nestjs/common';
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

@Module({
  imports: [
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
  providers: [UrlService]
})
export class AppModule {
 
}
