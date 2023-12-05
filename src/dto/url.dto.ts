import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsEmail } from "class-validator";


export class ShortenURLDto {
    @ApiProperty({
        example: "http://longestpossibleurl.com",
        required: true
    })
    @IsNotEmpty()
    @IsString()
    longUrl: string

    @ApiProperty({
        example: "POS",
        required: true
    })
    @IsNotEmpty()
    @IsString()
    source: string

    @ApiProperty({
        example: "example@company1.com",
        required:true
    })
    @IsEmail()
    @IsString()
    delivered_to: string

}

