import { Controller, Post, Body, Get, Res, Redirect, NestInterceptor, Logger, Injectable, Req, Ip, BadRequestException, UseGuards, Param, HttpStatus, Query, Put, Delete, UseInterceptors } from '@nestjs/common';
import { UrlService } from './url.service';
import { ShortenURLDto } from 'src/dto/url.dto';
import { UrlStatusDto, UrlUpdateDto } from './dto/urlstatus.dto';

import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiKeyAuthGuard, JwtAuthGuard } from 'src/auth/guard/jwt.guard';
import { ApiResponse, ApiTags,  ApiBearerAuth, ApiParam, ApiHeader } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from "fs";
import { RateLimit } from 'nestjs-rate-limiter';
var uap = require('ua-parser-js');


interface UrlUpdateParam {
    code: string
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


    @UseGuards(ApiKeyAuthGuard)
    @Post("/url/shorten")
    @ApiHeader({
        name: "api-key",
        description: "Bearer Token"
    })
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

    @RateLimit({ keyPrefix:"myRateLimitTrend", points: 500, duration: 60, errorMessage: "This url cannot be accessed more than 100 times in per minute" })
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
                    expires: new Date(Date.now() + (1000 * 60 * 60 * 24))
                });
            }

            if (r.url !== null) {
                res.redirect(HttpStatus.FOUND, r.url);
            } else {
                const htmlFilePath = path.resolve(__dirname, '../url/notFound.html'); // Adjust the path based on your project structure
                console.log("***************************OUR DIR NAME******************************");
                console.log(htmlFilePath);
                console.log("*************************END*******************************");
                // Render an HTML page since r.url is null
                const htmlString = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Isale</title>
                    <style>
                       body {
                            text-align: center;
                       }
                    </style>
                </head>
                <body>
                    <h1>ETIMS RECEIPT PROCESSING IN PROGRESS</h1>
                    <hr>
                    <p>Your receipt is currently being processed. It will be available shortly.</p>
                    
                    <p>Thank you for your patience</p>
                </body>
                </html>
                `;
                res.status(HttpStatus.OK).send(htmlString);
            }
        } catch(error) {
            const { status, response } = error;
            console.log(response)
            // Check for circular structures before JSON conversion
            const sanitizedResponse = removeCircularReferences(response);

            res.status(status).json(sanitizedResponse);
        }
        
    }


    @UseGuards(ApiKeyAuthGuard)
    @ApiHeader({
        name: "api-key",
        description: "Bearer Token"
    })
    @ApiResponse({ status: 200, description: "Successful" })
    @ApiParam({ name: "code", type: String, description: "Short code assinged to the end of each url" })
    @Put("/api/v1/:code/update")
    async updateUrl(@Param() param: UrlUpdateParam, @Body() dto: UrlUpdateDto, @Res() res: Response) {
        let { code } = param;
        try {
            let url = await this.service.updateShortenedUrls(code, dto)
            return res.status(HttpStatus.OK).json(url)
        } catch(error) {
            let { status, response } = error;
            return res.status(status).json(response)
        }
    }

    @UseGuards(ApiKeyAuthGuard)
    @ApiHeader({
        name: "api-key",
        description: "Bearer Token"
    })
    @ApiResponse({ status: 200, description: "Successful" })
    @ApiParam({ name: "code", type: String, description: "Short code assinged to each url" })
    @Delete("/api/v1/:code/delete")
    async deleteUrl(@Param() param: UrlUpdateParam, @Res() res: Response) {
        let { code } = param;
        try {
            let url = await this.service.deleteShortenedUrls(code)
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


