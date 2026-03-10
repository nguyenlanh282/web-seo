import { IsString, IsUrl, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateWpSiteDto {
  @ApiProperty({ example: 'My Blog' })
  @IsString()
  @MaxLength(100)
  name: string

  @ApiProperty({ example: 'https://myblog.com' })
  @IsUrl()
  url: string

  @ApiProperty({ example: 'admin' })
  @IsString()
  @MaxLength(100)
  username: string

  @ApiProperty({ example: 'xxxx xxxx xxxx xxxx xxxx xxxx' })
  @IsString()
  @MaxLength(256)
  password: string
}
