import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator'

export class AnalyzeKeywordDto {
  @IsString()
  @MaxLength(200)
  keyword: string

  @IsOptional()
  @IsInt()
  @Min(300)
  targetLength?: number
}
