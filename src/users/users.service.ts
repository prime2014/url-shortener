import { BadRequestException, ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignupDto, LoginDto } from './dto/user.dto';
import * as argon from "argon2";
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';

import { AuthService } from 'src/auth/auth.service';
import * as bcrypt from "bcrypt"
import * as fs from "fs";
import  * as amqp from "amqplib/callback_api";
import * as sgMail from "@sendgrid/mail";
import { BadRequestError } from 'passport-headerapikey';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import axios from 'axios';
import * as ejs from 'ejs';
import * as crypto from "crypto";



interface User {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    password: string;
    refreshToken: string;
    resetToken: string;
    resetTokenExpiry: Date;
    createdAt: Date;
    updatedAt: Date;
}


@Injectable()
export class UsersService {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache, private prisma: PrismaService, private configService: ConfigService, private auth: AuthService) {
        sgMail.setApiKey(this.configService.get<string>("sendgrid.apiKey"))
    }


    private compileEjsTemplate(templatePath: string, data: Record<string, string>): string {
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        return ejs.render(templateContent, data);
    }


    async resetPassword(resetToken: string, newPassword: string) {
        // Find the user with the provided reset token
        const user = await this.prisma.users.findFirst({
            where: {
                resetToken,
                resetTokenExpiry: {
                    gte: new Date() // ensure the reset token is not expired
                }
            }
        })

        if (!user) {
            throw new NotFoundException("Invalid or expired token!")
        }

        // Hash the new password
        const hashedPassword = await argon.hash(newPassword)

        // update the user's password and clear the reset token
        try {
            const updatedUser = await this.prisma.users.update({
                where: {
                    id: user.id
                },
                data: {
                    password: hashedPassword,
                    resetToken: null,
                    resetTokenExpiry: null
                }
            })
            return updatedUser
        } catch(error) {
            throw error;
        }
        
    }

    async generatePasswordResetToken(user):Promise<string> {
        try {
            const resetToken = await bcrypt.hash(`${user.id}${Date.now()}`, 10)

            // Save the reset token in the db
            await this.prisma.users.update({
                where: {
                    id: user.id
                },
                data: {
                    resetToken,
                    resetTokenExpiry: new Date(Date.now() + 3600000) // token expires in 1 hr
                }
            })

            return resetToken
        } catch(error) {
            throw error;
        }

    }

    private mergeTemplateWithData(template: string, data: Record<string, string>): string {
        // Replace variables in the template with actual data
        Object.keys(data).forEach(key => {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          template = template.replace(regex, data[key]);
        });
    
        return template;
      }

    async sendPasswordResetEmail(email: string, resetToken: string) {
        const templateData = {username: "Prime Omondi", resetToken}
        const templatePath = "./src/templates/passwordReset.html";
        const htmlTemplate = fs.readFileSync(templatePath, "utf-8");
        const mergedContent = this.mergeTemplateWithData(htmlTemplate, templateData)
        try {
            
            const queueUrl = this.configService.get<string>("RABBITMQ_QUEUE_URL")

            const msg = {
                to: email,
                from: "info@stanbestgroup.com",
                subject: "RESET YOUR PASSWORD",
                message: mergedContent,
                requestSource: "IsaleApp"
            }

            let resp = await axios.post(this.configService.get<string>("EMAIL_SERVICE_BASE_URL"), {emails: [msg]}, {
                headers: {
                    "api-key": this.configService.get("EMAIL_SERVICE_API_KEY"),
                }
            }).catch(error=> {
                console.log(error.response)
                throw error;
            })

            if(resp) {
                return "Email is queued to be delivered"
            }
        } catch(error) {
            console.error("Error sending email: ", error)
            return error;
        }
    }

    private async generateVerificationCode(email: string): Promise<string> {
        const tokenLength = 32;

        for (let attempt = 1; attempt <= 5; attempt++) {
            const verificationToken = crypto.randomBytes(tokenLength).toString('hex');
            console.log(email)
            // Check if the token already exists in the database
            const tokenExists = await this.prisma.users.findFirst({
                where: {
                   verificationCode: verificationToken
                }
            })

            console.log(tokenExists)

            if (!tokenExists) {
                // If the token doesn't exist, save it in the database
                console.log("SAVING")
                let user = await this.prisma.users.update({
                    where: {
                        email,
                    },
                    data: {
                        verificationCode: verificationToken
                    }
                })

                console.log(user)
                return verificationToken;
        
            }
        // Handle collision by generating a new token
        }

        throw new Error('Unable to generate a unique verification token after multiple attempts');
    }

    async verifyToken(token: string) {
        try {
            const user = await this.prisma.users.findUnique({
                where: {
                    verificationCode: token
                }
            })

            if (!user || !user.verificationCode || user.verificationCode !== token) {
                throw new ForbiddenException('Invalid verification code.');
            }

            // Clear the verification code after successful verification
            await this.prisma.users.update({
                where: {
                    id: user.id,
                },
                data: {
                    verificationCode: null,
                    is_active: true
                },
            })

            return "Successfully verified"
        } catch(error) {
            throw error;
        }
    }

    async signup(dto: SignupDto) {
        // generate the password and save user to db, then return new user
        const hash = await argon.hash(dto.password)
        

        // save user in db
        try {
           
            const user = await this.prisma.users.create({
                data: {
                    firstname: dto.firstname,
                    lastname: dto.lastname,
                    email: dto.email,
                    password: hash,
                    updatedAt: new Date(Date.now()).toISOString(),
                }
            })

            let myotp = await this.generateVerificationCode(dto.email)


            let { firstname, lastname } = dto;

            const templatePath = './src/templates/email-template.html';
            const templateData = { firstname, lastname, otp:`http://qr.isale.co.ke/users/api/v1/account/activation?token=${myotp}` };

            const htmlTemplate = fs.readFileSync(templatePath, "utf-8");
            const mergedContent = this.mergeTemplateWithData(htmlTemplate, templateData)

          
            let { email } = user;
            let msg = {
                from: "info@stanbestgroup.com",
                to: email,
                subject: "EMAIL VERIFICATION",
                message: mergedContent,
                requestSource: "IsaleApp"
            }

            delete user.password;

            let resp = await axios.post(this.configService.get<string>("EMAIL_SERVICE_BASE_URL"), {emails: [msg]}, {
                headers: {
                    "api-key": this.configService.get("EMAIL_SERVICE_API_KEY"),
                }
            }).catch(error=> {
                console.log(error.response)
                throw error;
            })

            if(resp) {
                return "A verification email has been sent to your email address";
            }
            // return "successful"
        } catch(error) {
            if(error instanceof PrismaClientKnownRequestError) {
               
                if (error.code == "P2002") {
                    throw new ForbiddenException("The email has already been taken");
                } 

            }
            throw error;
        }
    }



    async signin(dto: LoginDto){
        // receive the email and password
        let { email, password } = dto;

        try {
            // find the unique user in the database
            let user = await this.prisma.users.findUnique({
                where: {
                    email: email
                }
            })
            console.log(user)
            if(!user) throw new ForbiddenException("Invalid Credentials!")
            if(!user.is_active) throw new ForbiddenException("You need to activate your account to login");
            const pwMatches = await argon.verify(user.password, password)
            if(!pwMatches) throw new ForbiddenException("Invalid Credentials!");

            const tokens = await this.getTokens(user.id, user.email)
            await this.updateRefreshToken(user.id, tokens.refreshToken)
            return tokens;
        } catch(error) {
            throw error;
        }
    }

    hashData(data: string) {
        return argon.hash(data)
    }

    async updateRefreshToken(userId: number, refreshToken: string) {
        const hashedRefreshToken = await this.hashData(refreshToken);

        await this.prisma.users.update({
            where: {
                id: userId
            },
            data: {
                refreshToken: hashedRefreshToken
            }
        })
    }

    async signout (user) {
        let { id } = user;
        return await this.prisma.users.update({
            where: {
                id
            },
            data: {
                refreshToken: null
            }
        })
    }


    async getTokens(userId: number, email: string) {
        const [accessToken, refreshToken] = await Promise.all([
            this.auth.signToken(userId, email),
            this.auth.signRefreshToken(userId, email)
        ]);

        console.log(accessToken)
        console.log(refreshToken)
        return {
            accessToken,
            refreshToken
        }
    }


    async refreshTokens(userId: number, refreshToken: string) {

        try {
            const user = await this.prisma.users.findUnique({
                where: {
                    id: userId
                }
            })
    
            if(!user || !user.refreshToken) {
                throw new ForbiddenException("Access Denied!");
            }

            const refreshTokenMatches = await argon.verify(user.refreshToken, refreshToken);

            if (!refreshTokenMatches) throw new ForbiddenException("Access Denied!");

            const tokens = await this.getTokens(user.id, user.email)

            await this.updateRefreshToken(user.id, tokens.refreshToken);

            return tokens
        } catch(error) {
            if (error instanceof ForbiddenException){
                throw error
            }
            throw new InternalServerErrorException("Internal Server Error!")
        }
        
    }

    async updateUser(user, data, userId) {
        let { id } = user;
        if (id !== userId) throw new BadRequestException("Bad Request Exception!")
        try {
            let user = await this.prisma.users.update({
                where: {
                    id
                },
                data
            })

            delete user.password
            delete user.refreshToken
            delete user.resetToken
            delete user.resetTokenExpiry
            return user
        } catch(error) {
            
            throw error
        }
    }

    async findUserByEmail(email: string): Promise<User>{
        const cacheKey = `user:${email}`

        const cachedUser = await this.cacheManager.get<User>(cacheKey)

        if (cachedUser) {
            return cachedUser;
        }
        try {
            const user = await this.prisma.users.findUnique({
                where: {
                    email
                }
            })

            if (user) {
                // cache the user for future requests
                await this.cacheManager.set(cacheKey, user, 60)
            }

            return user
        } catch(error) {
            throw error;
        }
    }

    async deleteUser(user: any, userId: Number) {
        let { id } = user

        if (id !== userId) throw new BadRequestException('Bad Request Exception');
        try {
            const user = this.prisma.users.delete({
                where: {
                    id
                }
            })
            return user
        } catch(error) {
            throw error;
        }
        
    }
}


