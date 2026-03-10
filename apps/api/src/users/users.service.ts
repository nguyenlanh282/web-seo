import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { encrypt, decrypt } from '../common/utils/crypto'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        plan: true,
        planExpiresAt: true,
        articlesUsedMonth: true,
        monthResetAt: true,
        createdAt: true,
      },
    })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }

  async updateProfile(id: string, data: { name?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, avatarUrl: true, plan: true },
    })
  }

  async getUsageStats(id: string) {
    const user = await this.findById(id)
    const articleCount = await this.prisma.article.count({ where: { userId: id } })
    const projectCount = await this.prisma.project.count({ where: { userId: id } })
    const wpSiteCount = await this.prisma.wpSite.count({ where: { userId: id } })

    return {
      plan: user.plan,
      articlesUsedMonth: user.articlesUsedMonth,
      monthResetAt: user.monthResetAt,
      totalArticles: articleCount,
      totalProjects: projectCount,
      totalWpSites: wpSiteCount,
    }
  }

  // ---------------------------------------------------------------------------
  // Password change
  // ---------------------------------------------------------------------------

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, googleId: true },
    })

    if (!user) throw new NotFoundException('User not found')

    // Google-only users don't have a password
    if (!user.passwordHash && user.googleId) {
      throw new BadRequestException(
        'Tài khoản đăng nhập bằng Google không có mật khẩu. Sử dụng Google để đăng nhập.',
      )
    }

    if (!user.passwordHash) {
      throw new BadRequestException('Tài khoản chưa thiết lập mật khẩu.')
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng.')
    }

    const newHash = await bcrypt.hash(newPassword, 12)
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    })

    return { message: 'Đổi mật khẩu thành công.' }
  }

  // ---------------------------------------------------------------------------
  // API Key management (encrypted at rest with AES-256-GCM)
  // ---------------------------------------------------------------------------

  async saveApiKeys(
    userId: string,
    keys: { anthropicKey?: string; serpApiKey?: string },
  ) {
    const updateData: Record<string, string | null> = {}

    if (keys.anthropicKey !== undefined) {
      if (keys.anthropicKey) {
        const { encrypted, iv, authTag } = encrypt(keys.anthropicKey)
        updateData.anthropicKeyEnc = encrypted
        updateData.anthropicKeyIv = iv
        updateData.anthropicKeyTag = authTag
      } else {
        // Clear the key
        updateData.anthropicKeyEnc = null
        updateData.anthropicKeyIv = null
        updateData.anthropicKeyTag = null
      }
    }

    if (keys.serpApiKey !== undefined) {
      if (keys.serpApiKey) {
        const { encrypted, iv, authTag } = encrypt(keys.serpApiKey)
        updateData.serpApiKeyEnc = encrypted
        updateData.serpApiKeyIv = iv
        updateData.serpApiKeyTag = authTag
      } else {
        updateData.serpApiKeyEnc = null
        updateData.serpApiKeyIv = null
        updateData.serpApiKeyTag = null
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    return { message: 'API keys đã được lưu.' }
  }

  async getApiKeyStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        anthropicKeyEnc: true,
        serpApiKeyEnc: true,
      },
    })
    if (!user) throw new NotFoundException('User not found')

    return {
      hasAnthropicKey: !!user.anthropicKeyEnc,
      hasSerpApiKey: !!user.serpApiKeyEnc,
    }
  }

  async getDecryptedApiKey(userId: string, keyType: 'anthropic' | 'serpapi'): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        anthropicKeyEnc: true,
        anthropicKeyIv: true,
        anthropicKeyTag: true,
        serpApiKeyEnc: true,
        serpApiKeyIv: true,
        serpApiKeyTag: true,
      },
    })
    if (!user) return null

    if (keyType === 'anthropic' && user.anthropicKeyEnc && user.anthropicKeyIv && user.anthropicKeyTag) {
      return decrypt(user.anthropicKeyEnc, user.anthropicKeyIv, user.anthropicKeyTag)
    }

    if (keyType === 'serpapi' && user.serpApiKeyEnc && user.serpApiKeyIv && user.serpApiKeyTag) {
      return decrypt(user.serpApiKeyEnc, user.serpApiKeyIv, user.serpApiKeyTag)
    }

    return null
  }
}
