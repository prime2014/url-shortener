import { Controller, Get, Post, Req, UseGuards, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request } from "express";
import { JwtAuthGuard } from './guard/jwt.guard';
import { AuthDto } from './dto/auth.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags("Auth")
@Controller('auth')
export class AuthController {

    constructor(private authService: AuthService){}


    @UseGuards(JwtAuthGuard)
    @Post("/set/key")
    async setApiKey() {
        return await this.authService.setApiKey()
    }
    
}
