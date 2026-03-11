import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger'
import { Response } from 'express'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { GoogleAuthGuard } from './guards/google-auth.guard'
import { GetUser } from './decorators'

// 7 days in milliseconds — matches the refresh token JWT expiry
const REFRESH_TOKEN_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto)
    this.setRefreshTokenCookie(res, result.refreshToken)
    this.setAccessTokenCookie(res, result.accessToken)
    // Strip both tokens from response body — they are delivered via HttpOnly cookies only
    const { refreshToken: _r, accessToken: _a, ...response } = result
    return response
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/password' })
  async login(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(req.user.id, req.user.email)
    this.setRefreshTokenCookie(res, result.refreshToken)
    this.setAccessTokenCookie(res, result.accessToken)
    // Strip both tokens from response body — they are delivered via HttpOnly cookies only
    const { refreshToken: _r, accessToken: _a, ...response } = result
    return response
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  async getMe(@GetUser() user: any) {
    return user
  }

  // ---------------------------------------------------------------------------
  // Google OAuth
  // ---------------------------------------------------------------------------

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Request() req: any, @Res() res: Response) {
    const result = await this.authService.login(req.user.id, req.user.email)
    // Set both tokens as HttpOnly cookies — never expose in URL
    this.setRefreshTokenCookie(res, result.refreshToken)
    this.setAccessTokenCookie(res, result.accessToken)
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000')
    // No token in URL: frontend calls /auth/me after redirect to re-hydrate session
    res.redirect(`${frontendUrl}/auth/callback`)
  }

  // ---------------------------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------------------------

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  async refresh(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    // Only accept refresh token from HttpOnly cookie — never from Authorization header
    // (header fallback would re-expose token to JS and defeat the XSS protection)
    const incomingRefreshToken: string | undefined = req.cookies?.refresh_token

    if (!incomingRefreshToken) {
      throw new UnauthorizedException('No refresh token provided')
    }

    // Decode WITHOUT verification just to extract the user id (sub)
    // The real cryptographic check is done in authService.refreshToken()
    let payload: { sub: string; email: string }
    try {
      payload = this.jwtService.verify(incomingRefreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      })
    } catch {
      throw new UnauthorizedException('Refresh token is expired or malformed')
    }

    const tokens = await this.authService.refreshToken(payload.sub, incomingRefreshToken)
    this.setRefreshTokenCookie(res, tokens.refreshToken)
    // Set new access token as HttpOnly cookie — not in response body
    this.setAccessTokenCookie(res, tokens.accessToken)

    return { ok: true }
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — clears refresh token from DB and cookie' })
  async logout(@GetUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(userId)
    res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' })
    res.clearCookie('access_token', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' })
    return { message: 'Logged out successfully' }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
      path: '/',
    })
  }

  private setAccessTokenCookie(res: Response, token: string) {
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/',
    })
  }
}
