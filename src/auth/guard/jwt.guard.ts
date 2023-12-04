import { AuthGuard } from "@nestjs/passport";
import { UnauthorizedException, ExecutionContext, Injectable, CanActivate } from "@nestjs/common";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "src/prisma/prisma.service";


@Injectable()
export class ApiKeyAuthGuard extends AuthGuard('api-key') {}


@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {

    handleRequest(err, user, info) {
        // You can throw an exception based on your own custom logic
        console.log(err)
        console.log(user)
        console.log(info)
        if (err || !user) {
        throw err || new UnauthorizedException();
        }
        return user;
    }
}


@Injectable()
export class RefreshTokenGuard extends AuthGuard("jwt-refresh") {}