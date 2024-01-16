import { IsString, IsNotEmpty, IsIP, IsEmail, IsUrl } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UrlStatusDto {
    id: number;

    @ApiProperty({
        example: "http://testexample.com",
        required: true
    })
    @IsString()
    @IsNotEmpty()
    shortUrl: string
    
    
    @IsString()
    @IsIP(4)
    ip: string
}


export class UrlUpdateDto {
    @ApiProperty({
        example: "example@example.com",
        required: false
    })
    @IsEmail()
    delivered_to?: string

    @ApiProperty({
        example: "https://www.example.com",
        required: false
    })
    @IsUrl()
    long_url?: string
}
