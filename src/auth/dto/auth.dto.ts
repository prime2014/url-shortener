import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";


export class AuthDto {
    @ApiProperty({
        example: "dgdgdgwrwrwrtwdwj345858nsdnsdsdsdds",
        required: true
    })
    @IsString()
    @IsNotEmpty()
    apiKey: string
}