import { Body, Controller, Post, Delete, Put, UseGuards, Req, Query, Res, HttpStatus, NotFoundException, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { LoginDto, PasswordResetDto, ResetPasswordDto, SignupDto, UpdateDto } from './dto/user.dto';
import { Request } from 'express';
import { HttpExceptionFilter } from 'src/exception.filter';
import { GetUser } from './decorator/get-user.decorator';
import { Users } from '@prisma/client';
import { JwtAuthGuard, RefreshTokenGuard } from 'src/auth/guard/jwt.guard';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiTags, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';


interface UrlParams {
    id: string
}


@ApiTags("Users")
@Controller('users')
export class UsersController {
    constructor(private userService: UsersService) {}

    @Post("/api/v1/signup")
    @ApiBody({
        type: SignupDto
    })
    async signup(@Body() dto: SignupDto, @Res() res: Response) {
        try {
            let resp = await this.userService.signup(dto)
            return res.status(HttpStatus.CREATED).json({
                statusCode: HttpStatus.CREATED,
                message: resp
            })
        } catch(error) {
            let { status, response } = error;
            return res.status(status).json(response)
        }
    }

    @Post("/api/v1/account/activation?")
    async activateAccount(@Query("token") token: string,  @Res() res: Response) {
        try {
            let resp = await this.userService.verifyToken(token)
            return res.status(HttpStatus.OK).json({
                statusCode: HttpStatus.OK,
                message: resp
            });
        } catch(error) {
            let { status, response } = error;
            return res.status(status).json(response)
        }
    }

    
    @Post("/api/v1/signin")
    @ApiBody({
        type: LoginDto
    })
    async signin(@Body() dto: LoginDto, @Res() res: Response){
        try {
            let resp = await this.userService.signin(dto);
            return res.status(HttpStatus.OK).json(resp);
        } catch(error) {
            let { status, response } = error;
            return res.status(status).json(response)
        }
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post("/api/v1/signout")
    async signout(@Req() req: Request, @Res() res: Response) {
        try {
            let resp = await this.userService.signout(req.user)
            return res.status(HttpStatus.OK).json(resp);
        } catch(error) {
            let { status, response } = error;
            return res.status(status).json(response)
        }
        
    }

    @ApiBearerAuth()
    @UseGuards(RefreshTokenGuard)
    @Post("/api/v1/refreshtoken")
    async refreshToken(@Req() req: Request, @Res() res: Response) {
        try {
            let resp = await this.userService.refreshTokens(req.user["sub"], req.user["refreshToken"])
            return res.status(HttpStatus.CREATED).json(resp);
        } catch(error) {
            let { status, response } = error;
            return res.status(status).json(response)
        }
    }

    @ApiBearerAuth()
    @ApiBody({
        type: UpdateDto
    })
    @UseGuards(JwtAuthGuard)
    @Put("/api/v1/:id/update")
    @ApiParam({ name: "id", type: Number, description: "User id field as saved on the database" })
    async updateUserCredentials(@Param() param: UrlParams, @Req() req: Request, @Res() res: Response, @Body() dto: UpdateDto) {
        console.log("THIS IS DTO: ", dto)
        console.log(req.user)
        let { id } = param;
        try {
            let resp = await this.userService.updateUser(req.user, dto, parseInt(id))
            return res.status(HttpStatus.OK).json(resp);
        } catch(error) {
            let { status, response } = error;
            console.log("THIS IS THE ERROR: ", error)
            return res.status(status).json(response)
        }
    }

    // @ApiBearerAuth()
    @ApiBody({
        type: PasswordResetDto
    })
    @Put("/api/v1/password/")
    async sendResetPasswordToken(@Req() req: Request, @Res() res: Response, @Body() dto: PasswordResetDto) {
        let { email } = dto
        
        let user = await this.userService.findUserByEmail(email)

        if(!user) {
            throw new NotFoundException("User not found!")
        }

        // generate and save password reset token
        const resetToken: any = await this.userService.generatePasswordResetToken(user)
        
        try {
            let resp = await this.userService.sendPasswordResetEmail(user.email, resetToken)
            return res.status(HttpStatus.OK).json({message: "We have sent you an email. If you did not receive our email, check your spam folder."})
        } catch(error) {
            let { status, response } = error;
            return res.status(status).json("There was an error sending the reset email!")
        }
    }

    @ApiBody({
        type: ResetPasswordDto
    })
   @ApiResponse({
    status: HttpStatus.OK,
    description: "Your password was successfully updated"
   })
    @Post("/api/v1/password/reset")
    async resetPassword(@Query("token") resetToken: string, @Body() resetPasswordDto: ResetPasswordDto, @Res() res: Response) {
        const { newPassword } = resetPasswordDto;

        try {
            const user = await this.userService.resetPassword(resetToken, newPassword)
            if (user) {
                return res.status(HttpStatus.OK).json({message: "Your password was successfully updated"})
            }
        } catch(error){
            let { status, response } = error;
            return res.status(status).json(response)
        }
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Delete("/api/v1/:id/delete")
    @ApiParam({ name: "id", type: Number, description: "User id field as saved on the database" })
    async deleteUserCredentials(@Param() param: UrlParams, @Req() req: Request, @Res() res: Response) {
        let { id } = param;
        try {
        let resp = await this.userService.deleteUser(req.user,  parseInt(id))
            return res.status(HttpStatus.NO_CONTENT).json(resp)
        } catch(error) {
            let { status, response } = error;
            return res.status(status).json(response)
        }
    }
}


