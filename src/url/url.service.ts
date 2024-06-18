import { Injectable, BadRequestException, HttpException, HttpStatus, Inject, InternalServerErrorException, OnModuleInit,  NotFoundException } from '@nestjs/common';
import { ShortenURLDto } from 'src/dto/url.dto';
import { isURL } from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Base62Converter } from './base62_encode';
import * as argon from "argon2";
import axios from "axios";
import  * as amqp from "amqplib/callback_api";;
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UrlUpdateDto } from './dto/urlstatus.dto';
import { generateHexUuid } from './base62_encode';





async function getBase62EncodedString(): Promise<string|null> {
    let encoder = new Base62Converter()
    let myresp = await encoder.getBase62Parallel(); 

    if(myresp) {
        return myresp;
    }
}


// nestjs service

@Injectable()
export class UrlService implements OnModuleInit {
    private queueUrl: string
    private retry: number 
    private ipGeolocationQueue: string

    constructor(
        private prisma: PrismaService, 
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        private config: ConfigService,
    ) {
        this.queueUrl = this.config.get<string>("RABBITMQ_QUEUE_URL")
        this.retry = 0;
        this.ipGeolocationQueue = "ip-geolocation-queue";

    }

    onModuleInit() {
        
        this.startConsumingMessages();
    }


    async getUrlsList(limit: number=10, offset: number=0){
        
        try {
            
            let total = await this.prisma.urlstatus.count()
            let urls = await this.prisma.urlstatus.findMany({
                skip: offset,
                take: limit
            })

            return {
                currentPage: Math.floor(offset/ limit) + 1,
                totalPages: Math.ceil(total / limit),
                count: total,
                data: urls,
            }
        } catch(error){
            throw error;
        }
    }

    async getClicksList(limit: number=10, offset: number=0){
        try {
            let count = await this.prisma.clickLocation.count()
            let clicks = await this.prisma.clickLocation.findMany({
                include: {
                    click: {
                        select: {
                            long_url: true,
                            short_url: true
                        }
                    },
                
                },
                skip: offset,
                take: limit
            })

            return {
                currentPage: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(count /limit),
                count,
                data: clicks
            }
        } catch(error){
            throw error;
        }
    }

    async updateShortenedUrls(code: string, data: UrlUpdateDto) {
        try {
            let url = await this.prisma.urlstatus.update({
                where: {
                    code
                },
                data
            })
            return url
        } catch(error){
            throw error;
        }
    }


    async deleteShortenedUrls(code: string) {
        try {
            let url = await this.prisma.urlstatus.delete({
                where: {
                    code
                }
            })

            return url;
        } catch(error) {
            throw error;
        }
    }
    
    private startConsumingMessages() {
        this.connectToRabbitMQ()
    }

    connectToRabbitMQ() {
        amqp.connect(this.queueUrl, (error0, connection) => {
          if (this.retry > 5) throw new Error("ERROR: Could not connect to RabbitMQ")
          if (error0) {
            console.error('Error connecting to RabbitMQ:', error0.message);
            this.retry += 1
            setTimeout(()=>this.connectToRabbitMQ, 5000); // Retry after 5 seconds
            return;
          }
      
          const ipGeolocationChannel = connection.createChannel();

          
          this.setupChannel(ipGeolocationChannel, this.ipGeolocationQueue);
        });
    }

    private setupChannel(channel, queueName) {
        channel.assertQueue(queueName, { durable: true });
        channel.prefetch(1); // Process one message at a time
    
        console.log(`Worker is waiting for messages on queue: ${queueName}`);
    
        this.consumeMessages(channel);
    }


    private consumeMessages(channel) {
        channel.consume(this.ipGeolocationQueue, async (msg) => {
          console.log("MESSAGE RECEIVED")
          let mymsg = JSON.parse(msg.content.toString())

          let { url, metadata, result } = mymsg;
          console.log("API URL: ", url)
          try {
            let ipLocation = await axios.get(url, {
                headers: {
                    "Content-Type": "application/json"
                }
            });
            
            if (ipLocation?.data) {
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
            }
            
            channel.ack(msg)
          } catch(error){
            console.log(error)
            return error;
          }
          
        }, {
          noAck: false, // Set to false to manually acknowledge messages
        });
    }
    

    async shortenUrl(url: ShortenURLDto, hostname: string, protocol: string){
       
        const { longUrl, source, delivered_to } = url;
        
        // if string is not a valid url return a bad request
        try {
            if (longUrl !== null && !isURL(longUrl)) throw new BadRequestException('String Must be a Valid URL');
           
            // base62 encoding of the counter
            let myresp = await getBase62EncodedString()

        
            
            let short_code_url = `${protocol}://${hostname}/${myresp}`;

            //query the db to find if the encoded short url exists
            let existingUrl = await this.prisma.urlstatus.findUnique({
                    where: {
                        short_url: short_code_url
                    }
            })
            
            while (existingUrl) {
                // if the short code is already in use, generate a new one
                myresp = await getBase62EncodedString()

                short_code_url = `${protocol}://${hostname}/${myresp}`;

                // check again for uniqueness
                existingUrl = await this.prisma.urlstatus.findUnique({
                    where: {
                        short_url: short_code_url
                    }
                })
            }

            let urlResponse = await this.prisma.urlstatus.create({
                data: {
                    delivered_to: delivered_to,
                    long_url: longUrl ? longUrl : null,
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
            console.log(urlResponse)
            if (urlResponse) {
                return {
                    longUrl,
                    shortUrl: short_code_url,
                    code: myresp
                }
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


    publishClick(msg) {
        amqp.connect(this.queueUrl, (error0, connection)=> {
            if (error0) throw(error0);

            connection.createChannel((error1, channel)=> {
                if (error1) throw(error1);

                const queue: string = this.ipGeolocationQueue;


                channel.assertQueue(queue, {
                    durable: true
                })


                channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)), {
                    persistent: true
                })
            })

            setTimeout(()=>{
                connection.close()
            }, 5000)
            
        })
        return
    }

    async clickCounter(code: string, ip: string, metadata: { protocol: string; userAgent: string; referrer: string; browser: string; platform: string }, cookie) {
        try {
            // const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${process.env.IP_GEOLOCATION_API_KEY}&ip=${ip}&fields=geo`;

            

            const urlLink = await this.getUrlLinkFromCacheOrDatabase(code)

            // if (!urlLink) {
            //     console.log("URL not found");
            //     throw new NotFoundException('URL not found');
            // }

            // const urlLink = await this.getUrlLinkFromCacheOrDatabase(code)

            let cacheKey = `unique_click:${urlLink.code}:${cookie}`;

            // console.log("THE CACHE KEY: ", cacheKey);

            // const isUniqueClick =  await this.cacheManager.get<string>(cacheKey);
            // console.log('THE COOKIE IS: ', isUniqueClick);

            // if (isUniqueClick) {
            //     // The click is not unique, return the URL without further processing
            //     console.log("Not a unique click");
            //     return { url: urlLink.long_url, cookie: null };
            // }

            // console.log("THIS IS RESP OBJECT: ", urlLink.code);

            // Update the click counter of the clicked URL
            const result = await this.prisma.urlstatus.update({
                where: {
                    code: urlLink.code,
                },
                data: {
                    clicks: urlLink.clicks + 1,
                },
            });

            // const msg = { url, metadata, result };

            if (cookie) {
                cacheKey = `unique_click:${urlLink.code}:${cookie}`;

                // Mark the click as processed in the cache to prevent further processing for the same cookie
                await this.cacheManager.set(cacheKey, true, 86400);

                // this.publishClick(msg);

                return { url: urlLink.long_url, cookie: null };
            } else {
                cookie = generateHexUuid();

                console.log("GENERATED UNIQUE CODE: ", cookie);

                cacheKey = `unique_click:${urlLink.code}:${cookie}`;

                // Mark the click as processed in the cache to prevent further processing for the same cookie
                await this.cacheManager.set(cacheKey, true, 86400);

                // this.publishClick(msg);

                return { url: urlLink.long_url, cookie };
            }
        } catch (error) {
            // Handle specific errors and provide appropriate responses
            if (error instanceof NotFoundException) {
                console.log("NOT FOUND");
                throw error;
            } else if (error.response) {
                console.log("TYPICAL RESPONSES");
                throw new HttpException(error.response.data, error.response.status);
            } else {
                console.error("SERVER ERROR:", error);  // Log the actual error for debugging
                throw new InternalServerErrorException('Internal server error');
            }
        }
    }

    private async getUrlLinkFromCacheOrDatabase(code: string) {
        // attempt to retrieve the url link from the cache
        const cachedUrlLink = await this.cacheManager.get<any>(code)

        if (cachedUrlLink) {
            // if the url link is found in the cache, return it
            return cachedUrlLink
        }

        // if the urllink is not in the cache, query the db to find it
        const urlLink = await this.prisma.urlstatus.findFirst({
            where: {
                code,
            },
        });

        if (!urlLink) {
            console.log("URL not found");
            throw new NotFoundException('URL not found');
        }

        if(urlLink.long_url) {
            await this.cacheManager.set(urlLink.code, urlLink, 3600)
        }
        

        return urlLink;
    }

}


