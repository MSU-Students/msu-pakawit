import { Body, Controller, Delete, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthUser } from '../shared/security/auth-user';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { ActiveUserGuard } from '../users/active-user.guard';
import { PushSubscriptionDto, RemovePushSubscriptionDto } from './dto/push-subscription.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { PushNotificationsService } from './push-notifications.service';

type AuthenticatedRequest = Request & { user: AuthUser };

@ApiTags('Web Push Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: PushNotificationsService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Get the public VAPID key required to subscribe a browser' })
  getVapidPublicKey() {
    return { publicKey: this.notifications.getPublicKey() };
  }

  @Get('preferences')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user notification preferences' })
  getPreferences(@Req() request: AuthenticatedRequest) {
    return this.notifications.getPreferences(request.user.sub);
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated user notification preferences' })
  updatePreferences(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notifications.updatePreferences(request.user.sub, dto);
  }

  @Post('subscriptions')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a browser push subscription for the authenticated user' })
  async subscribe(@Req() request: AuthenticatedRequest, @Body() dto: PushSubscriptionDto) {
    await this.notifications.saveSubscription(request.user.sub, dto);
    return { success: true };
  }

  @Delete('subscriptions')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a browser push subscription' })
  async unsubscribe(@Req() request: AuthenticatedRequest, @Body() dto: RemovePushSubscriptionDto) {
    await this.notifications.removeSubscription(request.user.sub, dto.endpoint);
    return { success: true };
  }
}
