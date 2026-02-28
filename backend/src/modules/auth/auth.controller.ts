import { Controller, Post, Get, Body, Query, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

interface SocialUser {
  providerUserId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  provider: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private configService: ConfigService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@CurrentUser() user: { id: string; email: string }) {
    return this.authService.refreshToken(user.id, user.email);
  }

  @Get('activate')
  activate(@Query('token') token: string) {
    return this.authService.activateAccount(token);
  }

  @Post('resend-activation')
  resendActivation(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendActivation(dto.email);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.validateSocialUser(req.user as SocialUser);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(
      `${frontendUrl}/auth/login?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookAuth() {
    // initiates Facebook OAuth flow
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.validateSocialUser(req.user as SocialUser);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    res.redirect(
      `${frontendUrl}/auth/login?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }
}
