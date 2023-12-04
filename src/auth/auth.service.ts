import { Injectable, NotFoundException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class AuthService {
    // private const apikey = "dhshshhhshshshs"

    constructor(private jwt: JwtService, private config: ConfigService, private prisma: PrismaService) {}

    async validateApiKey(apiKey: string): Promise<boolean> {
        let secret_api_key = await this.prisma.apikey.findFirst({
            where: {
                id:1
            }
        })
        return secret_api_key.key == apiKey
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
