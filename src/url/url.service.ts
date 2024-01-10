import { Injectable,  BadRequestException, HttpException, HttpStatus, Inject, InternalServerErrorException, HttpCode, Res, NotFoundException } from '@nestjs/common';
import { ShortenURLDto } from 'src/dto/url.dto';
import { isURL } from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Base62Converter } from './base62_encode';
import * as argon from "argon2";
import axios from "axios";


async function getBase62EncodedString(): Promise<string|null> {
    let encoder = new Base62Converter()
    let myresp = await encoder.getBase62Parallel(); 

    if(myresp) {
        return myresp;
    }
}


// nestjs service

@Injectable()
export class UrlService {
    

    constructor(
        private prisma: PrismaService, 
      
        // private murLockService: MurLockService,
        private config: ConfigService,
    ) {}
    
    async shortenUrl(url: ShortenURLDto, hostname: string, protocol: string){
       
        const { longUrl, source, delivered_to } = url;
        
        // if string is not a valid url return a bad request
        try {
            if (!isURL(longUrl)) throw new BadRequestException('String Must be a Valid URL');
           
            // base62 encoding of the counter
            let myresp = await getBase62EncodedString()
            
            let short_code_url = `${protocol}://${hostname}/${myresp}`;

            //query the db to find if the encoded short url exists
            return await this.prisma.urlstatus.findUnique({
                where: {
                    short_url: short_code_url
                }
            }).then(async resp=> {
                
                if (resp) {
                    myresp = await getBase62EncodedString()

                    while (myresp == resp.code) {
                        myresp =  await getBase62EncodedString()
                    }   
                } else {
                    // await this.cacheService.set("mycounter", counter + 1)
                    let urlResponse = await this.prisma.urlstatus.create({
                        data: {
                            delivered_to: delivered_to,
                            long_url: longUrl,
                            short_url: short_code_url,
                            status: "200/OK",
                            source: source,
                            code: myresp,
                            updatedAt: new Date(Date.now()).toISOString()
                        }
                    }).catch(error=>{
                        console.log(error)
                        return new HttpException("The server encountered an error", HttpStatus.INTERNAL_SERVER_ERROR)
                    })

                    if (urlResponse) return {
                        longUrl,
                        shortUrl: short_code_url
                    }
                }
                
            }).catch(error=>{
               // throw an exception
               return new InternalServerErrorException("There was an internal server error")
            })
            
            
        } catch(error) {
            throw error
        }
        
    }

    async setApiKey() {
        const apiKey = await argon.hash(this.config.get("API_KEY"))
        let key = await this.prisma.apikey.create({
            data: {
                key: apiKey
            }
        })
        return key;
    }

    async clickCounter(code: string, ip: string, metadata: { protocol: string; userAgent: string; referrer: string; browser: string; platform: string }) {
        try {
            // Fetch IP location data and URL from the database concurrently
            const [ipLocation, urlLink] = await Promise.all([
                axios.get(`https://api.ipgeolocation.io/ipgeo?apiKey=${process.env.IP_GEOLOCATION_API_KEY}&ip=${ip}&fields=geo`, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
                this.prisma.urlstatus.findFirst({
                    where: {
                        code,
                    },
                }),
            ]);

            // Check if both URL and IP location data are found
            if (urlLink && ipLocation?.data) {
                // Update the click counter of the clicked URL
                const result = await this.prisma.urlstatus.update({
                    where: {
                        code: urlLink.code,
                    },
                    data: {
                        clicks: urlLink.clicks + 1,
                    },
                });

                // Create IP location record
                await this.prisma.clickLocation.create({
                    data: {
                        urlId: result.id,
                        ip: ipLocation.data.ip,
                        country: ipLocation.data.country_name,
                        city: ipLocation.data.city,
                        lat: ipLocation.data.latitude,
                        lon: ipLocation.data.longitude,
                        county: ipLocation.data.state_prov,
                        referrer: metadata.referrer,
                        browser: metadata.browser,
                        platform: metadata.platform,
                    },
                });

                return result.long_url;
            } else {
                throw new NotFoundException('URL not found or invalid IP location data.');
            }
        } catch (error) {
            // Handle specific errors and provide appropriate responses
            if (error instanceof NotFoundException) {
                throw error;
            } else if (error.response) {
                throw new HttpException(error.response.data, error.response.status);
            } else {
                throw new InternalServerErrorException('Internal server error');
            }
        }
    }
}


