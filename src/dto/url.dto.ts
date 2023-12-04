import { IsString, IsNotEmpty, IsEmail } from "class-validator";


export class ShortenURLDto {
    @IsNotEmpty()
    @IsString()
    longUrl: string

    @IsNotEmpty()
    @IsString()
    source: string

    @IsEmail()
    @IsString()
    delivered_to: string

}

