import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseFilters } from '@nestjs/common';
import { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthExceptionFilter } from './auth-exception.filter';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseFilters(AuthExceptionFilter)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request email verification for a new account' })
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.authService.register(dto, request.ip ?? request.socket.remoteAddress ?? 'unknown');
  }

  @Post('verify')
  @UseFilters(AuthExceptionFilter)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify an email address and create the user account' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @UseFilters(AuthExceptionFilter)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request a fresh email verification link' })
  resendVerification(@Body() dto: ResendVerificationDto, @Req() request: Request) {
    return this.authService.resendVerification(
      dto.email,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate a user with username and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}