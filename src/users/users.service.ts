import { ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignupDto, LoginDto } from './dto/user.dto';
import * as argon from "argon2";
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';

import { AuthService } from 'src/auth/auth.service';
import { Users } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService, private config: ConfigService, private auth: AuthService) {}


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
                    updatedAt: new Date(Date.now()).toISOString()
                }
            })
            delete user.password;
            const token = await this.getTokens(user.id, user.email);
            

            await this.updateRefreshToken(user.id, token.refreshToken)

            return token;
        } catch(error) {
            if(error instanceof PrismaClientKnownRequestError) {
                if (error.code == "P2002") {
                    throw new ForbiddenException("The email has already been taken");
                }

                throw error;
            }
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

   
}
