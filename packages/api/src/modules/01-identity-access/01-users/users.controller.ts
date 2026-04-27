// packages\api\src\modules\01-identity-and-access\01-users\users.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/commands/create-user.dto';
import { UpdateUserProfileDto } from './dto/commands/update-user-profile.dto';
import { RequestPrimaryEmailChangeDto } from './dto/commands/request-primary-email-change.dto';
import { ConfirmPrimaryEmailChangeDto } from './dto/commands/confirm-primary-email-change.dto';
import { RequestPrimaryPhoneChangeDto } from './dto/commands/request-primary-phone-change.dto';
import { ConfirmPrimaryPhoneChangeDto } from './dto/commands/confirm-primary-phone-change.dto';
import { SuspendUserDto } from './dto/commands/suspend-user.dto';
import { ReactivateUserDto } from './dto/commands/reactivate-user.dto';
import { DeactivateUserDto } from './dto/commands/deactivate-user.dto';
import { AnonymizeUserDto } from './dto/commands/anonymize-user.dto';
import { ListUsersQueryDto } from './dto/queries/list-users-query.dto';
import { GetUserByIdParamsDto } from './dto/queries/get-user-by-id-params.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedActor } from './domain/types/user.types';
import { UserSelfOrAdminGuard } from './guards/user-self-or-admin.guard';
import { UserPlatformAdminGuard } from './guards/user-platform-admin.guard';
import { UserAuthenticatedGuard } from './guards/user-authenticated.guard';

@Controller('v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(UserPlatformAdminGuard)
  async createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.usersService.createUser(dto, actor.userId);
  }

  @Get()
  @UseGuards(UserPlatformAdminGuard)
  async listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Get('me')
  @UseGuards(UserAuthenticatedGuard)
  async getCurrentProfile(@CurrentUser() actor: AuthenticatedActor) {
    return this.usersService.getCurrentProfile(actor.userId);
  }

  @Patch('me/profile')
  @UseGuards(UserAuthenticatedGuard)
  async updateCurrentProfile(
    @Body() dto: UpdateUserProfileDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.usersService.updateProfile(actor.userId, dto, actor.userId);
  }

  @Post('me/primary-email-change/request')
  @UseGuards(UserAuthenticatedGuard)
  async requestPrimaryEmailChange(
    @Body() dto: RequestPrimaryEmailChangeDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.usersService.requestPrimaryEmailChange(
      actor.userId,
      dto,
      actor.userId,
    );
  }

  @Post('me/primary-email-change/confirm')
  @UseGuards(UserAuthenticatedGuard)
  async confirmPrimaryEmailChange(
    @Body() dto: ConfirmPrimaryEmailChangeDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.usersService.confirmPrimaryEmailChange(
      actor.userId,
      dto,
      actor.userId,
    );
  }

  @Post('me/primary-phone-change/request')
  @UseGuards(UserAuthenticatedGuard)
  async requestPrimaryPhoneChange(
    @Body() dto: RequestPrimaryPhoneChangeDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.usersService.requestPrimaryPhoneChange(
      actor.userId,
      dto,
      actor.userId,
    );
  }

  @Post('me/primary-phone-change/confirm')
  @UseGuards(UserAuthenticatedGuard)
  async confirmPrimaryPhoneChange(
    @Body() dto: ConfirmPrimaryPhoneChangeDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.usersService.confirmPrimaryPhoneChange(
      actor.userId,
      dto,
      actor.userId,
    );
  }

  @Get(':id')
  @UseGuards(UserSelfOrAdminGuard)
  async getUserById(@Param() params: GetUserByIdParamsDto) {
    return this.usersService.getUserById(params.id);
  }

  @Post(':id/suspend')
  @UseGuards(UserPlatformAdminGuard)
  async suspendUser(
    @Param() params: GetUserByIdParamsDto,
    @Body() dto: SuspendUserDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.usersService.suspendUser(params.id, dto, actor.userId);
  }

  @Post(':id/reactivate')
  @UseGuards(UserPlatformAdminGuard)
  async reactivateUser(
    @Param() params: GetUserByIdParamsDto,
    @Body() dto: ReactivateUserDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.usersService.reactivateUser(params.id, dto, actor.userId);
  }

  @Post(':id/deactivate')
  @UseGuards(UserPlatformAdminGuard)
  async deactivateUser(
    @Param() params: GetUserByIdParamsDto,
    @Body() dto: DeactivateUserDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.usersService.deactivateUser(params.id, dto, actor.userId);
  }

  @Post(':id/anonymize')
  @UseGuards(UserPlatformAdminGuard)
  async anonymizeUser(
    @Param() params: GetUserByIdParamsDto,
    @Body() dto: AnonymizeUserDto,
    @CurrentUser() actor: AuthenticatedActor,
  ) {
    return this.usersService.anonymizeUser(params.id, dto, actor.userId);
  }
}
