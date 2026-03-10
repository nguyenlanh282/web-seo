import { IsString, IsNumber, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class Step2Dto {
  @ApiProperty({ example: 1500, description: 'Target word count for the article' })
  @IsNumber()
  targetLength: number

  @ApiProperty({ required: false, example: 'SEO OnPage là gì?' })
  @IsOptional()
  @IsString()
  additionalInstructions?: string
}

export class Step3Dto {
  @ApiProperty({ required: false, description: 'Custom outline sections (optional)' })
  @IsOptional()
  sections?: any[]

  @ApiProperty({ required: false, example: 'Add more examples and case studies' })
  @IsOptional()
  @IsString()
  additionalInstructions?: string
}
