import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback } from 'passport-google-oauth20'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID'),
      clientSecret: config.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.get('GOOGLE_CALLBACK_URL', 'http://localhost:4000/api/v1/auth/google/callback'),
      scope: ['email', 'profile'],
    })
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value
    if (!email) {
      return done(new Error('No email returned from Google'), undefined)
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({ where: { email } })

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: profile.displayName || profile.name?.givenName || email.split('@')[0],
          avatarUrl: profile.photos?.[0]?.value || null,
          googleId: profile.id,
          isActive: true,
        },
      })
    } else if (!user.googleId) {
      // Link Google account to existing user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.id,
          avatarUrl: user.avatarUrl || profile.photos?.[0]?.value || null,
        },
      })
    }

    done(null, user)
  }
}
