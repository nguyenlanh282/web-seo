import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ChangePasswordDto } from './dto/change-password.dto'
import { SaveApiKeysDto } from './dto/save-api-keys.dto'

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@Request() req: any) {
    return this.usersService.findById(req.user.id)
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get current user usage stats' })
  getStats(@Request() req: any) {
    return this.usersService.getUsageStats(req.user.id)
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(@Request() req: any, @Body() body: { name?: string; avatarUrl?: string }) {
    return this.usersService.updateProfile(req.user.id, body)
  }

  @Post('me/change-password')
  @ApiOperation({ summary: 'Change user password' })
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, dto.currentPassword, dto.newPassword)
  }

  @Post('me/api-keys')
  @ApiOperation({ summary: 'Save encrypted API keys' })
  saveApiKeys(@Request() req: any, @Body() dto: SaveApiKeysDto) {
    return this.usersService.saveApiKeys(req.user.id, dto)
  }

  @Get('me/api-keys')
  @ApiOperation({ summary: 'Get API key status (has key or not)' })
  getApiKeyStatus(@Request() req: any) {
    return this.usersService.getApiKeyStatus(req.user.id)
  }
}
