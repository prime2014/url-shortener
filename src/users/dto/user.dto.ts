import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsEmail, IsOptional, MinLength } from "class-validator";



export class SignupDto {
    @ApiProperty({
        example: "Test",
        required: true
    })
    @IsNotEmpty()
    @IsString()
    firstname: string

    @ApiProperty({
        example: "User",
        required: true
    })
    @IsNotEmpty()
    @IsString()
    lastname: string

    @ApiProperty({
        example: "test.user@example.com",
        required: true
    })
    @IsNotEmpty()
    @IsEmail()
    @IsString()
    email: string

    
    @ApiProperty({
        example: "fgdhdte535D",
        required: true
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    password: string

}


export class LoginDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @IsEmail()
    email: string

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    password: string
}


export class UpdateDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    @IsNotEmpty({
        message:"Firstname value should not be empty!"
    })
    firstname?: string

    @ApiProperty()
    @IsString()
    @IsOptional()
    @IsNotEmpty({
        message: "Lastname value should not be empty!"
    })
    lastname?: string

    @ApiProperty()
    @IsEmail()
    @IsOptional()
    @IsNotEmpty({
        message: "Email value should not be empty!"
    })
    email?: string
}


export class PasswordResetDto {
    @ApiProperty({
        required: true,
        example: "example@example.com"
    })
    @IsEmail()
    email: string
}


export class ResetPasswordDto {

    @ApiProperty()
    @IsString()
    @MinLength(8)
    newPassword: string
}