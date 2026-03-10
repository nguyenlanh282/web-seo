import { IsEnum, IsString, IsOptional, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { AIEditorAction } from '@seopen/shared'

export class AIActionDto {
  @ApiProperty({ enum: AIEditorAction, example: 'rewrite' })
  @IsEnum(AIEditorAction)
  action: AIEditorAction

  @ApiProperty({ example: 'Đây là văn bản cần viết lại' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  selectedText: string

  @ApiProperty({ required: false, example: 'Context từ đoạn văn xung quanh' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  context?: string
}
