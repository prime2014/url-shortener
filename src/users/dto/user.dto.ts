import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsEmail } from "class-validator";



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