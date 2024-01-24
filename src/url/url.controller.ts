import { Controller, Post, Body, Get, Res, Redirect, NestInterceptor, Logger, Injectable, Req, Ip, BadRequestException, UseGuards, Param, HttpStatus, Query, Put, Delete, UseInterceptors } from '@nestjs/common';
import { UrlService } from './url.service';
import { ShortenURLDto } from 'src/dto/url.dto';
import { UrlStatusDto, UrlUpdateDto } from './dto/urlstatus.dto';

import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiKeyAuthGuard, JwtAuthGuard } from 'src/auth/guard/jwt.guard';
import { ApiResponse, ApiTags,  ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RateLimit } from 'nestjs-rate-limiter';
var uap = require('ua-parser-js');


interface UrlUpdateParam {
    id: string
}


@ApiTags("Urls")
@Controller()
export class UrlController {
  
    constructor(private service: UrlService, private config: ConfigService) {}

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: "Successful" })
    @Get("/api/v1/clicks?")
    async getUrls(@Query("limit") limit: string, @Query("offset") offset: string, @Res() res: Response) {

        try {
            let urls = await this.service.getClicksList(parseInt(limit), parseInt(offset))
            console.log(urls)
            return res.status(HttpStatus.OK).json(urls)
        } catch(error) {
            let { status, response } = error;
            return res.status(status).json(response)
        }
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: "Successful" })
    @Get("/api/v1/urls?")
    async getClicks(@Query("limit") limit: string, @Query("offset") offset: string, @Res() res: Response) {

        try {
            let urls = await this.service.getUrlsList(parseInt(limit), parseInt(offset))
            console.log(urls)
            return res.status(HttpStatus.OK).json(urls)
        } catch(error) {
            let { status, response } = error;
            return res.status(status).json(response)
        }
    }


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

    // @RateLimit({ keyPrefix:"myRateLimitTrend", points: 5, duration: 60, errorMessage: "This url cannot be accessed more than five times in per minute" })
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
        console.log(req.cookies)
        let cookie = req.cookies && req.cookies.clickid ? req.cookies.clickid : null;
        console.log("VALUE OF CLIENT COOKIE: ", cookie)
	    const client_ip = req.clientIp
        
        try {
            let r = await this.service.clickCounter(code, client_ip, metadata, cookie)
            console.log(r.url)
           
            if (r.cookie !== null) {
                res.cookie("clickid", r.cookie,{ 
                    httpOnly: true,
                    sameSite: "strict",
                    maxAge: 1000 * 60 * 60 * 8,
                    expires: new Date(Date.now() + (1000 * 60 * 60 * 8))
                });
            }

            res.redirect(HttpStatus.FOUND, r.url);  
        } catch(error) {
            const { status, response } = error;
                
            // Check for circular structures before JSON conversion
            const sanitizedResponse = removeCircularReferences(response);

            res.status(status).json(sanitizedResponse);
        }
        
    }


    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: "Successful" })
    @ApiParam({ name: "id", type: Number, description: "User id field as saved on the database" })
    @Put("/api/v1/:id/update")
    async updateUrl(@Param() param: UrlUpdateParam, @Body() dto: UrlUpdateDto, @Res() res: Response) {
        let { id } = param;
        try {
            let url = await this.service.updateShortenedUrls(parseInt(id), dto)
            return res.status(HttpStatus.OK).json(url)
        } catch(error) {
            let { status, response } = error;
            return res.status(status).json(response)
        }
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: "Successful" })
    @ApiParam({ name: "id", type: Number, description: "User id field as saved on the database" })
    @Delete("/api/v1/:id/delete")
    async deleteUrl(@Param() param: UrlUpdateParam, @Res() res: Response) {
        let { id } = param;
        try {
            let url = await this.service.deleteShortenedUrls(parseInt(id))
            return res.status(HttpStatus.NO_CONTENT).json(url)
        } catch(error) {
            let { status, response } = error;
            return res.status(status).json(response)
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


