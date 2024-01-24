import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsEmail, IsOptional, MinLength, IsNumber } from "class-validator";


export class SignupDto {
    @ApiProperty({
        example: "Test",
        required: true
    })
    @IsNotEmpty({
        message: "Firstname is required"
    })
    @IsString()
    firstname: string

    @ApiProperty({
        example: "User",
        required: true
    })
    @IsNotEmpty({
        message: "Lastname is required"
    })
    @IsString()
    lastname: string

    @ApiProperty({
        example: "test.user@example.com",
        required: true
    })
    @IsNotEmpty({
        message: "Email is required!"
    })
    @IsEmail({}, {
        message: "Invalid email address format, Please enter a valid email address!"
    })
    @IsString()
    email: string

    
    @ApiProperty({
        example: "fgdhdte535D",
        required: true
    })
    @IsNotEmpty({
        message: "password is required"
    })
    @IsString()
    @MinLength(8, {
        message: "Password should be at least 8 characters long"
    })
    password: string

}


export class LoginDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @IsEmail({}, {
        message: "Invalid email address format, Please enter a valid email address!"
    })
    email: string

    @ApiProperty()
    @IsNotEmpty({
        message: "Password is required"
    })
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
    @IsString({
        message: "A valid lastname must have only a string of characters"
    })
    @IsOptional()
    @IsNotEmpty({
        message: "Lastname value should not be empty!"
    })
    lastname?: string

    @ApiProperty()
    @IsEmail({}, {
        message: "Please enter a valid email address"
    })
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
    @IsEmail({}, {
        message: "Please enter a valid email address"
    })
    email: string
}




export class ResetPasswordDto {

    @ApiProperty()
    @IsString({
        message: "A valid password should be a string of characters"
    })
    @MinLength(8, {
        message: "Password should be at least 8 characters long"
    })
    newPassword: string
}


