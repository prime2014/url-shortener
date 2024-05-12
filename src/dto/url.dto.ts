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
    })
    source: string

    @ApiProperty({
        example: "example@company1.com",
    })
    delivered_to: string

}

