import { Injectable, NotFoundException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from 'src/prisma/prisma.service';
import * as argon from "argon2";
import { generateKey } from './gen-apikeys';




@Injectable()
export class AuthService {
    // private const apikey = "dhshshhhshshshs"

    constructor(private jwt: JwtService, private config: ConfigService, private prisma: PrismaService) {}

    async validateApiKey(apiKey: string): Promise<boolean> {
        let secret_api_key = await this.prisma.apikey.findFirst({
            where: {
                key:apiKey
            }
        })
        return secret_api_key.key == apiKey
    }


    async setApiKey() {
        const key = generateKey()
        const hashed = await argon.hash(key)
        await this.prisma.apikey.upsert({
            where: {
                id:1
            },
            update: {
                key: hashed
            },
            create: {
                key: hashed
            }
        })

        return {
            message: "Please copy this api key and store it somewhere safe.It will only be displayed once",
            apiKey: key
        }
    }

    async signToken(userId: number, email: string) {
        //create a payload
        const payload = {
            sub: userId,
            email
        }

        // secret to sign the token with
        const secret = this.config.get("JWT_SECRET")
        
        // sign the token with signAsync
        const token = await this.jwt.signAsync(payload, {
            expiresIn: "15m",
            secret
        })

        return token
    }

   

    async signRefreshToken(userId: number, email:string) {
        //create a payload
        const payload = {
            sub: userId,
            email
        }

        // secret to sign the token with
        const secret = this.config.get("JWT_REFRESH_SECRET")
        
        // sign the token with signAsync
        const token = await this.jwt.signAsync(payload, {
            expiresIn: "7d",
            secret
        })

        return token
    }
}
