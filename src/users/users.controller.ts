import { Body, Controller, Post, UseGuards, Req, Get, UseFilters, Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { LoginDto, SignupDto } from './dto/user.dto';
import { Request } from 'express';
import { HttpExceptionFilter } from 'src/exception.filter';
import { GetUser } from './decorator/get-user.decorator';
import { Users } from '@prisma/client';
import { JwtAuthGuard, RefreshTokenGuard } from 'src/auth/guard/jwt.guard';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiTags, ApiHeader } from '@nestjs/swagger';

@ApiTags("Users")
@Controller('users')
export class UsersController {
    constructor(private userService: UsersService) {}

    @Post("/api/v1/signup")
    @ApiBody({
        type: SignupDto
    })
    async signup(@Body() dto: SignupDto) {
        return await this.userService.signup(dto)
    }

    
    @Post("/api/v1/signin")
    @ApiBody({
        type: LoginDto
    })
    async signin(@Body() dto: LoginDto){
        return await this.userService.signin(dto);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post("/api/v1/signout")
    async signout(@Req() req: Request) {
       
        return await this.userService.signout(req.user)
    }

    @ApiBearerAuth()
    // @ApiHeader({
    //     name: 'Authorization',
    //     description: 'This is where the client provides the access token from login',
    // })
    @UseGuards(RefreshTokenGuard)
    @Post("/api/v1/refreshtoken")
    async refreshToken(@Req() req: Request) {
        return await this.userService.refreshTokens(req.user["sub"], req.user["refreshToken"])
    }
}
