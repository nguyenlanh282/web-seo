import { Module } from '@nestjs/common'
import { AnthropicService } from './anthropic.service'
import { EditorActionsController } from './editor-actions.controller'

@Module({
  controllers: [EditorActionsController],
  providers: [AnthropicService],
  exports: [AnthropicService],
})
export class AiModule {}
