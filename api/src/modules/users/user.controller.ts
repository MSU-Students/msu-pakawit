import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../shared/security/jwt-auth.guard';
import { AuthUser } from '../shared/security/auth-user';
import { AssignUserRoleDto } from './dto/assign-user-role.dto';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { SetUserStatusDto } from './dto/set-user-status.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserRole } from './entities/user.entity';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { toUserResponse } from './user-response';
import { UserService } from './user.service';
import { ActiveUserGuard } from './active-user.guard';

type AuthenticatedRequest = Request & { user: AuthUser };

@ApiTags('Users and Roles')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('bootstrap-admin')
  @ApiHeader({ name: 'x-bootstrap-secret', required: true })
  @ApiOperation({ summary: 'Create the first administrator while the users table is empty' })
  async bootstrapAdmin(
    @Body() dto: BootstrapAdminDto,
    @Headers('x-bootstrap-secret') bootstrapSecret?: string,
  ) {
    return toUserResponse(await this.userService.createFirstAdmin(dto, bootstrapSecret));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  async getMe(@Req() request: AuthenticatedRequest) {
    const user = await this.userService.findById(request.user.sub);
    return user ? toUserResponse(user) : null;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  async updateMe(@Req() request: AuthenticatedRequest, @Body() dto: UpdateUserProfileDto) {
    return toUserResponse(await this.userService.updateProfile(request.user.sub, dto));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Provision a user account (administrator only)' })
  async createUser(@Body() dto: CreateUserDto) {
    return toUserResponse(await this.userService.createUser(dto));
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List user accounts (administrator only)' })
  async listUsers() {
    return (await this.userService.findAll()).map(toUserResponse);
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a user role (administrator only)' })
  async assignRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignUserRoleDto) {
    return toUserResponse(await this.userService.assignRole(id, dto.role));
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate or deactivate a user (administrator only)' })
  async setUserStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetUserStatusDto) {
    return toUserResponse(await this.userService.setActiveStatus(id, dto.isActive));
  }
}