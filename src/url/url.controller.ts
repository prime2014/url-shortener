import { Controller, Post, Body, Get, Res, NestInterceptor, Logger, Injectable, Req, Ip, BadRequestException, UseGuards, Param } from '@nestjs/common';
import { UrlService } from './url.service';
import { ShortenURLDto } from 'src/dto/url.dto';
import { UrlStatusDto } from './dto/urlstatus.dto';

import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiKeyAuthGuard, JwtAuthGuard } from 'src/auth/guard/jwt.guard';
import { ApiResponse, ApiTags,  ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
var uap = require('ua-parser-js');




@ApiTags("Urls")
@Controller()
export class UrlController {
  
    constructor(private service: UrlService, private config: ConfigService) {}


    @UseGuards(JwtAuthGuard)
    @Post("/url/shorten")
    @ApiBearerAuth()
    @ApiResponse({ status: 201,  description: "The url was successfully shortened"})
    @ApiResponse({ status: 401, description: "Unauthorised" })
    @ApiResponse({ status: 400, description: "Bad request" })
    @ApiResponse({ status: 500, description: "Internal server error" })
    async shortenUrl(@Body() url: ShortenURLDto, @Req() req: Request) {
        let hostname =req.hostname;
        let protocol = req.protocol;
        return this.service.shortenUrl(url, hostname, protocol)
    }


    @Get("/:code")
    async clickCounter(@Req() req: Request, @Param("code") code: string, @Res({ passthrough: true }) res: Response) {
        let agent = req.headers['user-agent']
        let protocol = req.protocol;
        let referer = req.headers.referer;
        let metadata = {
            protocol: protocol,
            userAgent: agent,
            ip: req.ip,
            referrer: referer,
            browser: uap(agent)["browser"]["name"],
            platform: uap(agent)["os"]["name"]
        }
        
        
        let r = await this.service.clickCounter(code, metadata)
        
        res.header("location", r)
        res.status(301)
        return {
            longUrl: r 
        }
    }

    
}
