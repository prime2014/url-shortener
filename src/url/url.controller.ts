import { Controller, Post, Body, Get, Res, NestInterceptor, Logger, Injectable, Req, Ip, BadRequestException, UseGuards, Param } from '@nestjs/common';
import { UrlService } from './url.service';
import { ShortenURLDto } from 'src/dto/url.dto';
import { UrlStatusDto } from './dto/urlstatus.dto';

import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiKeyAuthGuard, JwtAuthGuard } from 'src/auth/guard/jwt.guard';
var uap = require('ua-parser-js');





@Controller()
export class UrlController {
  
    constructor(private service: UrlService, private config: ConfigService) {}


    @UseGuards(ApiKeyAuthGuard)
    @Post("/url/shorten")
    async shortenUrl(@Body() url: ShortenURLDto, @Req() req: Request) {
        let hostname =req.hostname
        return this.service.shortenUrl(url, hostname)
    }

    @Get("/url/api/key")
    @UseGuards(JwtAuthGuard)
    async getApiKey(){
        
    }

    @Get("/url/set/apikey")
    // @UseGuards(JwtAuthGuard)
    async setAPiKey() {
        let resp = await this.service.setApiKey();
        return resp;
    }

    @Get("/:code")
    async clickCounter(@Req() req: Request, @Param("code") code: string, @Res({ passthrough: true }) res: Response) {
        let agent = req.headers['user-agent']
        let metadata = {
            userAgent: agent,
            ip: req.ip,
            referrer: code ? `${req.hostname}:3333` : null,
            browser: uap(agent)["browser"]["name"],
            platform: uap(agent)["os"]["name"]
        }
        
        let r = await this.service.clickCounter(code, metadata)
        
        // res.header("location", "http://facebook.com")
        // res.status(301)
        return "Status: success"
    }

    
}
