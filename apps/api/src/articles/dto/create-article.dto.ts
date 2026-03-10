import { IsString, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateArticleDto {
  @ApiProperty({ example: '10 Cach Toi Uu SEO OnPage 2024' })
  @IsString()
  @MaxLength(200)
  title: string

  @ApiProperty({ example: 'seo onpage' })
  @IsString()
  @MaxLength(200)
  targetKeyword: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  projectId?: string
}
