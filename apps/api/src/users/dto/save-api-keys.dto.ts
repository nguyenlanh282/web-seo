import { IsString, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SaveApiKeysDto {
  @ApiProperty({ example: 'sk-ant-...', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(256, { message: 'API key tối đa 256 ký tự' })
  anthropicKey?: string

  @ApiProperty({ example: 'serpapi_key_...', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(256, { message: 'API key tối đa 256 ký tự' })
  serpApiKey?: string
}
