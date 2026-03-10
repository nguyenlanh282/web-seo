import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import Anthropic from '@anthropic-ai/sdk'
import { AI_MODELS } from '@seopen/shared'

export type AnthropicUsage = {
  text: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  cost: number
}

// Cost per token by model family (USD) — update when Anthropic changes pricing
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-haiku':   { input: 0.00000025, output: 0.00000125 },
  'claude-sonnet':  { input: 0.000003,   output: 0.000015 },
  'claude-opus':    { input: 0.000015,   output: 0.000075 },
}
const DEFAULT_COST = { input: 0.000003, output: 0.000015 }

function getModelCost(model: string) {
  const key = Object.keys(MODEL_COSTS).find(k => model.includes(k.replace('claude-', '')))
  return key ? MODEL_COSTS[key] : DEFAULT_COST
}

@Injectable()
export class AnthropicService {
  private readonly client: Anthropic
  private readonly logger = new Logger(AnthropicService.name)

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  async complete(
    model: typeof AI_MODELS[keyof typeof AI_MODELS],
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 4096,
    retries = 3,
  ): Promise<string> {
    const { text } = await this.completeWithUsage(model, systemPrompt, userPrompt, maxTokens, retries)
    return text
  }

  async completeWithUsage(
    model: typeof AI_MODELS[keyof typeof AI_MODELS],
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 4096,
    retries = 3,
  ): Promise<AnthropicUsage> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const start = Date.now() // measure only the successful attempt's latency
      try {
        const response = await this.client.messages.create({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        })

        const content = response.content[0]
        if (content.type !== 'text') throw new Error('Unexpected response type')
        const latencyMs = Date.now() - start
        const { input, output } = getModelCost(model)
        return {
          text: content.text,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          latencyMs,
          cost: response.usage.input_tokens * input + response.usage.output_tokens * output,
        }
      } catch (error: any) {
        const isRetryable = [429, 500, 502, 503, 529].includes(error?.status)
        if (!isRetryable || attempt === retries) {
          this.logger.error(`Anthropic API error (attempt ${attempt + 1}): ${error.message}`)
          throw new ServiceUnavailableException(`AI_ERROR: ${error.message}`)
        }
        const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
        this.logger.warn(`Retrying in ${delay}ms (attempt ${attempt + 1})`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    // unreachable — loop always throws on final attempt
    throw new ServiceUnavailableException('AI service unavailable after retries')
  }

  async streamComplete(
    model: typeof AI_MODELS[keyof typeof AI_MODELS],
    systemPrompt: string,
    userPrompt: string,
    onChunk: (text: string) => void,
    maxTokens = 4096,
  ): Promise<string> {
    const stream = this.client.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let fullText = ''
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text
        onChunk(event.delta.text)
      }
    }
    return fullText
  }
}
