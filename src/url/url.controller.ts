import { Controller, Post, Body, Get, Res, Redirect, NestInterceptor, Logger, Injectable, Req, Ip, BadRequestException, UseGuards, Param, HttpStatus } from '@nestjs/common';
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
    async shortenUrl(@Body() url: ShortenURLDto, @Req() req: Request, @Res() res: Response) {
        let hostname =req.hostname;
        let protocol = req.protocol;
        try {
            let resp = await this.service.shortenUrl(url, hostname, protocol)
            
            return res.status(201).json(resp)
        } catch(error){
            return res.json(error.response)
        }
    }

    
    @Get("/:code")
    async clickCounter(@Req() req: Request, @Param("code") code: string, @Res({ passthrough: true }) res: Response, @Ip() ip) {
        let agent = req.headers['user-agent']
	
        let protocol = req.protocol;
        let referer = req.headers.referer;
        let metadata = {
            protocol: protocol,
            userAgent: agent,
            referrer: referer,
            browser: uap(agent)["browser"]["name"],
            platform: uap(agent)["os"]["name"]
        }
        
	    const client_ip = req.clientIp
        
        try {
            let r = await this.service.clickCounter(code, client_ip, metadata)
            
            res.redirect(HttpStatus.FOUND, r);
        } catch(error) {
            const { status, response } = error;
                
            // Check for circular structures before JSON conversion
            const sanitizedResponse = removeCircularReferences(response);

            res.status(status).json(sanitizedResponse);
        }
        
    }

    
}

function removeCircularReferences(obj: any, seen = new WeakSet()): any {
    if (obj !== null && typeof obj === 'object') {
        if (seen.has(obj)) {
            return '[Circular]';
        }
        seen.add(obj);
        return Array.isArray(obj)
            ? obj.map((item) => removeCircularReferences(item, seen))
            : Object.fromEntries(
                  Object.entries(obj).map(([key, value]) => [key, removeCircularReferences(value, seen)])
              );
    }
    return obj;
}


