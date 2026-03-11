import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PublishWpDto {
  @ApiProperty({ description: 'WordPress site ID to publish to' })
  @IsString()
  @IsNotEmpty()
  wpSiteId: string
}

export class RetryPublishDto {
  @ApiPropertyOptional({ description: 'WordPress site ID (uses last known site if omitted)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  wpSiteId?: string
}
