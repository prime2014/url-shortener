import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEmpty } from "class-validator";


export class ShortenURLDto {
    @ApiProperty({
        example: "http://longestpossibleurl.com",
    })
    @IsOptional()
    longUrl: string

    @ApiProperty({
        example: "POS",
    })
    @IsOptional()
    source: string

    @ApiProperty({
        example: "example@company1.com",
    })
    @IsOptional()
    delivered_to: string

}

