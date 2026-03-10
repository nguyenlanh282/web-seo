import { IsString, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateProjectDto {
  @ApiProperty({ example: 'My SEO Blog' })
  @IsString()
  @MaxLength(100)
  name: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @ApiProperty({ required: false, example: 'https://myblog.com' })
  @IsOptional()
  @IsString()
  domain?: string

  @ApiProperty({ required: false, default: 'vi' })
  @IsOptional()
  @IsString()
  language?: string
}
