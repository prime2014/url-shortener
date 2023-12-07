import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { AuthService } from '../auth.service';
import { HeaderAPIKeyStrategy } from "passport-headerapikey";


@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'api-key') {
  constructor(private readonly authService: AuthService) {
    super({header: "api-key", prefix: ""}, true, async (apiKey, done) => {
      if(this.authService.validateApiKey(apiKey)) {
        done(null, true)
      }
      done(new UnauthorizedException("You don't have the right access permissions!"), null)
    });
  }

  // async validate(apiKey: string): Promise<any> {
  //   const isValid = await this.authService.validateApiKey(apiKey);
  //   if (!isValid) {
  //     throw new UnauthorizedException('Invalid API Key');
  //   }
  //   return true;
  // }
}