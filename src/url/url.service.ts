import { Injectable,  BadRequestException, HttpException, HttpStatus, Inject, InternalServerErrorException, OnModuleInit,  NotFoundException } from '@nestjs/common';
import { ShortenURLDto } from 'src/dto/url.dto';
import { isURL } from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Base62Converter } from './base62_encode';
import * as argon from "argon2";
import axios from "axios";
import  * as amqp from "amqplib/callback_api";;


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
    private client: any

    constructor(
        private prisma: PrismaService, 
      
        // private murLockService: MurLockService,
        private config: ConfigService,
    ) {
        this.queueUrl = this.config.get<string>("RABBITMQ_QUEUE_URL")
        this.retry = 0;
        this.ipGeolocationQueue = "ip-geolocation-queue";

    }

    onModuleInit() {
        this.startConsumingMessages();
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
            setTimeout(this.connectToRabbitMQ, 5000); // Retry after 5 seconds
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
          let mymsg = JSON.parse(msg.content.toString())

          let { url, metadata, result } = mymsg;
          try {
            let ipLocation = await axios.get(url);
            
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
            channel.ack(msg)
          } catch(error){
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
            const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${process.env.IP_GEOLOCATION_API_KEY}&ip=${ip}&fields=geo`

            const urlLink = await this.prisma.urlstatus.findFirst({
                where: {
                    code,
                },
            })


            if (urlLink) {
                // Update the click counter of the clicked URL
                const result = await this.prisma.urlstatus.update({
                    where: {
                        code: urlLink.code,
                    },
                    data: {
                        clicks: urlLink.clicks + 1,
                    },
                });

                // the ip locator and the saving of the clicklocation will happen through message queue
                const msg = { url, metadata, result }
                
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


                return result.long_url;
            } else {
                throw new NotFoundException('URL not found');
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


