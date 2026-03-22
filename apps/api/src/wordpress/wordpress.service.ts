import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common'
import axios from 'axios'
import { PrismaService } from '../prisma/prisma.service'
import { encrypt, decrypt } from '../common/utils/crypto'
import { validateWpUrl } from '../common/utils/ssrf'
import { MIN_SEO_SCORE_FOR_PUBLISH } from '@seopen/shared'
import { CreateWpSiteDto } from './dto/create-wp-site.dto'

@Injectable()
export class WordpressService {
  private readonly logger = new Logger(WordpressService.name)

  constructor(
    private prisma: PrismaService,
  ) {}

  /**
   * Validates that a WordPress URL is safe to contact (SSRF protection).
   * Delegates to shared utility so the processor can call it too.
   */
  validateWpUrl(url: string): void {
    validateWpUrl(url)
  }

  /**
   * Encrypts a password using AES-256-GCM (authenticated encryption).
   * Stores as "encrypted:iv:authTag" composite string.
   */
  private encryptPassword(password: string): string {
    const result = encrypt(password)
    return `${result.encrypted}:${result.iv}:${result.authTag}`
  }

  /**
   * Decrypts a password stored as "encrypted:iv:authTag".
   * Throws BadRequestException if format is invalid (e.g. old CryptoJS-CBC records — re-add the site).
   */
  private decryptPassword(stored: string): string {
    const parts = stored.split(':')
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new ForbiddenException('WordPress site credentials are outdated. Please remove and re-add the site.')
    }
    try {
      const [encrypted, iv, authTag] = parts
      return decrypt(encrypted, iv, authTag)
    } catch {
      throw new ForbiddenException('Failed to decrypt WordPress credentials. Please remove and re-add the site.')
    }
  }

  async findAllSites(userId: string) {
    return this.prisma.wpSite.findMany({
      where: { userId },
      select: { id: true, name: true, url: true, username: true, isActive: true, lastSyncAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async addSite(userId: string, dto: CreateWpSiteDto) {
    this.validateWpUrl(dto.url)
    const passwordEnc = this.encryptPassword(dto.password)

    // Test connection first
    await this.testConnection(dto.url, dto.username, dto.password)

    return this.prisma.wpSite.create({
      data: { name: dto.name, url: dto.url, username: dto.username, passwordEnc, userId },
      select: { id: true, name: true, url: true, username: true, isActive: true, createdAt: true },
    })
  }

  async removeSite(id: string, userId: string) {
    const site = await this.prisma.wpSite.findUnique({ where: { id } })
    if (!site) throw new NotFoundException('WP site not found')
    if (site.userId !== userId) throw new ForbiddenException('Access denied')
    return this.prisma.wpSite.delete({ where: { id } })
  }

  async testConnection(url: string, username: string, password: string): Promise<boolean> {
    try {
      const response = await axios.get(`${url}/wp-json/wp/v2/users/me`, {
        auth: { username, password },
        timeout: 10000,
      })
      return response.status === 200
    } catch (error) {
      this.logger.error('WP connection test failed', error)
      throw new Error('Cannot connect to WordPress site. Check URL, username and app password.')
    }
  }

  async publishArticle(articleId: string, wpSiteId: string, userId: string): Promise<{ wpPostId: number; wpPostUrl: string }> {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } })
    if (!article) throw new NotFoundException('Article not found')
    if (article.userId !== userId) throw new ForbiddenException('Access denied')

    if (!article.seoScore || article.seoScore < MIN_SEO_SCORE_FOR_PUBLISH) {
      throw new ForbiddenException(`SEO score must be at least ${MIN_SEO_SCORE_FOR_PUBLISH} to publish (current: ${article.seoScore || 0})`)
    }

    const site = await this.prisma.wpSite.findUnique({ where: { id: wpSiteId } })
    if (!site || site.userId !== userId) throw new ForbiddenException('WP site access denied')

    const password = this.decryptPassword(site.passwordEnc)

    const postData = {
      title: article.title,
      content: article.contentHtml || article.content || '',
      excerpt: article.metaDescription || '',
      status: 'draft',
      slug: article.slug || article.targetKeyword.toLowerCase().replace(/\s+/g, '-'),
    }

    const response = await axios.post(`${site.url}/wp-json/wp/v2/posts`, postData, {
      auth: { username: site.username, password },
      timeout: 30000,
    })

    const wpPostId = response.data.id
    const wpPostUrl = response.data.link

    await this.prisma.article.update({
      where: { id: articleId },
      data: { wpPostId, wpPostUrl, wpSiteId, status: 'PUBLISHED', publishedAt: new Date() },
    })

    return { wpPostId, wpPostUrl }
  }
}
