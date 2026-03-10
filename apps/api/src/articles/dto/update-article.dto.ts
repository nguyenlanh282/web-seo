import { IsString, IsOptional, MaxLength, IsNumber, Min, Max } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string

  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string

  @IsOptional()
  @IsString()
  content?: string

  @IsOptional()
  @IsString()
  contentHtml?: string

  @IsOptional()
  outline?: any

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  seoScore?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  readabilityScore?: number

  @IsOptional()
  @IsNumber()
  wordCount?: number
}
