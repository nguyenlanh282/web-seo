import { Controller, Post, Body, Param, UseGuards, Logger, ForbiddenException, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { IsString, IsEnum, MaxLength } from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { GetUser as CurrentUser } from '../auth/decorators'
import { AnthropicService } from './anthropic.service'
import { PrismaService } from '../prisma/prisma.service'
import { AI_MODELS, AIEditorAction } from '@seopen/shared'

class EditorActionDto {
  @IsEnum(AIEditorAction)
  action: AIEditorAction

  @IsString()
  @MaxLength(5000)
  text: string

  @IsString()
  keyword: string
}

@ApiTags('ai')
@Controller('articles/:articleId/editor-action')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EditorActionsController {
  private readonly logger = new Logger(EditorActionsController.name)

  constructor(
    private readonly anthropic: AnthropicService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async performAction(
    @CurrentUser() user: { id: string },
    @Param('articleId') articleId: string,
    @Body() dto: EditorActionDto,
  ) {
    // Verify article ownership before billing AI usage to it
    const article = await this.prisma.article.findUnique({ where: { id: articleId }, select: { userId: true } })
    if (!article) throw new NotFoundException('Article not found')
    if (article.userId !== user.id) throw new ForbiddenException('Access denied')

    const prompts: Record<AIEditorAction, string> = {
      [AIEditorAction.REWRITE]: `Viết lại đoạn văn sau bằng tiếng Việt, giữ ý nghĩa nhưng dùng từ ngữ khác, tự nhiên hơn. Trả về chỉ đoạn văn mới, không giải thích:

${dto.text}`,
      [AIEditorAction.EXPAND]: `Mở rộng đoạn văn sau bằng tiếng Việt, thêm chi tiết và ví dụ liên quan đến từ khóa "${dto.keyword}". Trả về chỉ đoạn văn mở rộng:

${dto.text}`,
      [AIEditorAction.SIMPLIFY]: `Đơn giản hóa đoạn văn sau bằng tiếng Việt, dùng từ ngữ dễ hiểu hơn, câu ngắn hơn. Trả về chỉ đoạn văn đã đơn giản hóa:

${dto.text}`,
      [AIEditorAction.HUMANIZE]: `Làm cho đoạn văn sau nghe tự nhiên hơn như người Việt thật sự viết, giảm tính máy móc AI. Trả về chỉ đoạn văn đã chỉnh sửa:

${dto.text}`,
    }

    const { text: result, inputTokens, outputTokens, latencyMs, cost } = await this.anthropic.completeWithUsage(
      AI_MODELS.HAIKU,
      'Bạn là trợ lý viết nội dung SEO tiếng Việt chuyên nghiệp.',
      prompts[dto.action],
      1024,
    )

    await this.prisma.aILog.create({
      data: {
        userId: user.id,
        articleId,
        model: AI_MODELS.HAIKU,
        action: dto.action.toUpperCase() as any,
        inputTokens,
        outputTokens,
        latencyMs,
        cost,
      },
    })

    return { success: true, data: { result, action: dto.action } }
  }
}
