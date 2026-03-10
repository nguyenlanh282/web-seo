import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('Email already exists')

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
      },
      select: { id: true, email: true, name: true, plan: true, createdAt: true },
    })

    const tokens = await this.generateTokens(user.id, user.email)
    await this.storeRefreshTokenHash(user.id, tokens.refreshToken)
    return { user, ...tokens }
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    return user
  }

  async login(userId: string, email: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, plan: true, avatarUrl: true },
    })
    const tokens = await this.generateTokens(userId, email)
    await this.storeRefreshTokenHash(userId, tokens.refreshToken)
    return { user, ...tokens }
  }

  /**
   * Validates an incoming refresh token against the stored hash,
   * then issues a fresh access + refresh token pair.
   */
  async refreshToken(userId: string, incomingRefreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, refreshTokenHash: true, isActive: true },
    })

    if (!user || !user.isActive) {
      throw new ForbiddenException('Access denied')
    }

    if (!user.refreshTokenHash) {
      throw new ForbiddenException('No active session — please log in again')
    }

    const tokenMatches = await bcrypt.compare(incomingRefreshToken, user.refreshTokenHash)
    if (!tokenMatches) {
      throw new ForbiddenException('Refresh token invalid or expired')
    }

    const tokens = await this.generateTokens(user.id, user.email)
    await this.storeRefreshTokenHash(user.id, tokens.refreshToken)
    return tokens
  }

  /**
   * Clears the stored refresh token hash, effectively logging the user out
   * from all sessions that rely on refresh tokens.
   */
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    })
  }

  async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email }

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '15m',
    })

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    })

    return { accessToken, refreshToken }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async storeRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10)
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    })
  }
}
