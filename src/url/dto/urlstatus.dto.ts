import { IsString, IsNotEmpty, IsIP, IsEmail, IsUrl } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UrlStatusDto {
    id: number;

    @ApiProperty({
        example: "http://testexample.com",
        required: true
    })
    @IsString()
    @IsNotEmpty({
        message: "short url is required"
    })
    shortUrl: string
    
    
    @IsString()
    @IsIP(4)
    ip: string
}


export class UrlUpdateDto {
   
    @ApiProperty({
        example: "https://www.example.com",
        required: false
    })
    @IsUrl({}, {
        message: "Please enter a valid long url"
    })
    long_url?: string
}
