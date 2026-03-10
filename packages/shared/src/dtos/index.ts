import {
  IsString,
  IsEmail,
  IsOptional,
  MaxLength,
  MinLength,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsUrl,
  IsArray,
} from 'class-validator'
import { AIEditorAction } from '../types'

// ============================================================================
// Auth DTOs
// ============================================================================

export class RegisterDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string
}

export class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  password: string
}

// ============================================================================
// Project DTOs
// ============================================================================

export class CreateProjectDto {
  @IsString()
  @MaxLength(100)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Domain must be a valid URL' })
  domain?: string

  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsString()
  domain?: string

  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string
}

// ============================================================================
// Article DTOs
// ============================================================================

export class CreateArticleDto {
  @IsString()
  @MaxLength(200)
  title: string

  @IsString()
  @MaxLength(200)
  targetKeyword: string

  @IsOptional()
  @IsString()
  projectId?: string
}

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

// ============================================================================
// Step DTOs
// ============================================================================

export class AnalyzeKeywordDto {
  @IsString()
  @MaxLength(200)
  keyword: string

  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string

  @IsOptional()
  @IsString()
  @MaxLength(5)
  country?: string
}

export class GenerateOutlineDto {
  @IsOptional()
  @IsNumber()
  @Min(500)
  @Max(10000)
  targetLength?: number
}

export class WriteContentDto {
  @IsOptional()
  @IsArray()
  sections?: string[]
}

export class AIActionDto {
  @IsEnum(AIEditorAction)
  action: AIEditorAction

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  selectedText: string

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  context?: string
}

// ============================================================================
// WordPress DTOs
// ============================================================================

export class CreateWpSiteDto {
  @IsString()
  @IsUrl()
  siteUrl: string

  @IsString()
  @MaxLength(100)
  username: string

  @IsString()
  @MaxLength(200)
  applicationPassword: string
}
