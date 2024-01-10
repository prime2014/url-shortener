import { Controller, Get, Post, Req, UseGuards, Body, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request } from "express";
import { JwtAuthGuard } from './guard/jwt.guard';
import { AuthDto } from './dto/auth.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags("Auth")
@Controller('auth')
export class AuthController {

    constructor(private authService: AuthService){}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post("/set/key")
    async setApiKey(@Res() res: Response) {
        try {
            let resp = this.authService.setApiKey()
            return res.status(201).json(resp)
        } catch(error) {
            return res.status(500).json("There was an internal server error");
        }
    }
    
}

