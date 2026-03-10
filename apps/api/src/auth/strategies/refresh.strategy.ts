import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Refresh Token Strategy
 *
 * Validates the HttpOnly refresh_token cookie. Unlike JWT strategy which checks
 * the Authorization header, this strategy checks the refresh token and verifies
 * it against the bcrypt-hashed version stored in the database.
 *
 * Note: This strategy is used for the /auth/refresh endpoint. It extracts the
 * refresh token and performs initial JWT verification (signature + expiry).
 * Full validation (hash comparison + rotation) happens in AuthService.refreshToken().
 */
@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Extract from HttpOnly cookie (set by /auth/login or /auth/refresh)
          const cookies = (request.headers as any)?.cookie || ''
          const match = cookies.match(/refresh_token=([^;]+)/)
          return match ? match[1] : null
        },
        // Fallback: also accept refresh token in header for testing
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_REFRESH_SECRET') || 'fallback-refresh-secret',
      passReqToCallback: true,
    })
  }

  async validate(request: Request, payload: { sub: string; email: string }) {
    // At this point, JWT signature and expiry are validated.
    // The actual bcrypt hash comparison and token rotation happen in AuthService.

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        avatarUrl: true,
        isActive: true,
        refreshTokenHash: true,
      },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive')
    }

    if (!user.refreshTokenHash) {
      throw new UnauthorizedException('No active session — please log in again')
    }

    // Return the minimal user data + the raw refresh token for later validation
    return {
      id: user.id,
      email: user.email,
      refreshToken: ExtractJwt.fromExtractors([
        (req: Request) => {
          const cookies = (req.headers as any)?.cookie || ''
          const match = cookies.match(/refresh_token=([^;]+)/)
          return match ? match[1] : null
        },
      ])(request),
    }
  }
}
