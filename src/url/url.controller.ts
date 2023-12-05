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


    @UseGuards(ApiKeyAuthGuard)
    @Post("/url/shorten")
    @ApiBearerAuth()
    @ApiHeader({
        name: 'api-key',
        description: 'An api key to authorize a user to use the url shortener service',
    })
    @ApiResponse({ status: 201,  description: "The url was successfully shortened"})
    @ApiResponse({ status: 401, description: "Unauthorised" })
    @ApiResponse({ status: 400, description: "Bad request" })
    @ApiResponse({ status: 500, description: "Internal server error" })
    async shortenUrl(@Body() url: ShortenURLDto, @Req() req: Request) {
        let hostname =req.hostname
        return this.service.shortenUrl(url, hostname)
    }


    @Get("/:code")
    async clickCounter(@Req() req: Request, @Param("code") code: string, @Res({ passthrough: true }) res: Response) {
        let agent = req.headers['user-agent']
    
        let metadata = {
            userAgent: agent,
            ip: req.ip,
            referrer: code ? `http://${req.hostname}:3333` : null,
            browser: uap(agent)["browser"]["name"],
            platform: uap(agent)["os"]["name"]
        }
        
        let r = await this.service.clickCounter(code, metadata)
        
        // res.header("location", "http://facebook.com")
        // res.status(301)
        return r
    }

    
}
