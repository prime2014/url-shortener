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




@Injectable()
export class UrlService {
    

    constructor(
        private prisma: PrismaService, 
      
        // private murLockService: MurLockService,
        private config: ConfigService,
    ) {}
    
    async shortenUrl(url: ShortenURLDto, hostname: string){
       
        const { longUrl, source, delivered_to } = url;
        var baseURL = process.env.BASE_URL;
        
        // if string is not a valid url return a bad request
        try {
            if (!isURL(longUrl)) throw new BadRequestException('String Must be a Valid URL');
           
            // base62 encoding of the counter
            let myresp = await getBase62EncodedString()
            

            //query the db to find if the encoded short url exists
            await this.prisma.urlstatus.findUnique({
                where: {
                    short_url: `${hostname}:3333/${myresp}`
                }
            }).then(async resp=> {
                
                if (resp) {
                    myresp = await getBase62EncodedString()

                    while (myresp == resp.code) {
                        myresp =  await getBase62EncodedString()
                    }   
                } else {
                    // await this.cacheService.set("mycounter", counter + 1)
                    await this.prisma.urlstatus.create({
                        data: {
                            delivered_to: delivered_to,
                            long_url: longUrl,
                            short_url: `${hostname}:3333/${myresp}`,
                            status: "200/OK",
                            source: source,
                            code: myresp,
                            updatedAt: new Date(Date.now()).toISOString()
                        }
                    }).catch(error=>{
                        console.log(error)
                        return new HttpException("The server encountered an error", HttpStatus.INTERNAL_SERVER_ERROR)
                    })
                }
                
            }).catch(error=>{
               // throw an exception
               return new InternalServerErrorException("There was an internal server error")
            })

            
            let short_url = `${hostname}:3333/${myresp}`
            
            return {
                longUrl,
                shortUrl: short_url
            }
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

    async clickCounter(code: string, metadata: {ip: string, userAgent: string, referrer: string, browser: string, platform: string}) {
        
        let result: any;
       
        try {

            // concurrently fetch query the ip service and the url from the database
            let [ipLocation, urlLink] = await Promise.all([
                axios.get(`https://api.ipgeolocation.io/ipgeo?apiKey=${this.config.get("IP_GEOLOCATION_API_KEY")}&ip=${metadata.ip !== '::1' ? metadata.ip : '8.8.8.8'}&fields=geo`, {
                    headers: {
                        "Content-Type": "application/json"
                    }
                }),
                this.prisma.urlstatus.findFirst({
                    where: {
                        code: code
                    }
                }).catch(error=> {
                    throw new NotFoundException("The url was not found on our servers!")
                })
            ])
    
            // if both the url and the ipLocation data are found save the result to db else error out
            if (urlLink && ipLocation.data) {
                // console.log(ipLocation.data)
                // update the click counter of the clicked url
                result = await this.prisma.urlstatus.update({
                    where: {
                        code: urlLink.code 
                    },
                    data: {
                        clicks: urlLink.clicks + 1
                    }
                }).catch(error=>{
                    console.log(error)
                    throw new HttpException("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR)
                })

                // console.log(result);
                // if resp then create the iplocation
                if(result) {
                    let iploc = await this.prisma.clickLocation.create({
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
                            platform: metadata.platform
                        }
                    
                    }).catch(error=> {
                        throw new InternalServerErrorException("Internal server error")
                    })
                    console.log("MY RESULT: ", result)
                }
                return result.long_url;
            } else {
                throw new InternalServerErrorException("There was an internal server error");
            }
            
        } catch(error) {
            return new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR)
        }
        
    }
}
