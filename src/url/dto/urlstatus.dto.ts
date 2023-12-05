import { IsString, IsNotEmpty, IsIP } from "class-validator";
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
