import { IsString, IsNotEmpty, IsIP } from "class-validator";


export class UrlStatusDto {
    @IsString()
    @IsNotEmpty()
    shortUrl: string
    
    @IsString()
    @IsIP(4)
    ip: string
}
