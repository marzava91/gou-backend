//packages\api\src\modules\01-identity-access\03-memberships\memberships.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OperationalSurface } from '@prisma/client';

import { MembershipsService } from './memberships.service';
import { MembershipResponseMapper } from './mappers/membership-response.mapper';

import { MembershipPlatformAdminGuard } from './guards/membership-platform-admin.guard';
import { MembershipSelfOrPlatformAdminGuard } from './guards/membership-self-or-platform-admin.guard';

import { CreateMembershipDto } from './dto/commands/create-membership.dto';
import { ActivateMembershipDto } from './dto/commands/activate-membership.dto';
import { SuspendMembershipDto } from './dto/commands/suspend-membership.dto';
import { RevokeMembershipDto } from './dto/commands/revoke-membership.dto';
import { ExpireMembershipDto } from './dto/commands/expire-membership.dto';
import { SetActiveMembershipContextDto } from './dto/commands/set-active-membership-context.dto';

import { GetMembershipByIdParamsDto } from './dto/params/get-membership-by-id.params.dto';
import { ListMembershipsQueryDto } from './dto/queries/list-memberships.query.dto';
import { ListCurrentUserMembershipsQueryDto } from './dto/queries/list-current-user-memberships.query.dto';

@Controller('v1/memberships')
export class MembershipsController {
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly membershipResponseMapper: MembershipResponseMapper,
  ) {}

  @Post()
  @UseGuards(MembershipPlatformAdminGuard)
  async createMembership(
    @Req() request: any,
    @Body() dto: CreateMembershipDto,
  ) {
    const membership = await this.membershipsService.createMembership(
      request.user?.userId ?? null,
      dto,
    );

    return this.membershipResponseMapper.toDetailDto(membership);
  }

  @Get()
  @UseGuards(MembershipPlatformAdminGuard)
  async listMemberships(@Query() query: ListMembershipsQueryDto) {
    const result = await this.membershipsService.listMemberships(query);

    return {
      ...result,
      items: result.items.map((item) =>
        this.membershipResponseMapper.toSummaryDto(item),
      ),
    };
  }

  @Get('me')
  @UseGuards(MembershipSelfOrPlatformAdminGuard)
  async listCurrentUserMemberships(
    @Req() request: any,
    @Query() query: ListCurrentUserMembershipsQueryDto,
  ) {
    const result = await this.membershipsService.listCurrentUserMemberships(
      request.user.userId,
      query,
    );

    return {
      ...result,
      items: result.items.map((item) =>
        this.membershipResponseMapper.toSummaryDto(item),
      ),
    };
  }

  @Put('me/active-context')
  @UseGuards(MembershipSelfOrPlatformAdminGuard)
  async setActiveMembershipContext(
    @Req() request: any,
    @Body() dto: SetActiveMembershipContextDto,
  ) {
    const context = await this.membershipsService.setActiveMembershipContext(
      request.user.userId,
      dto,
    );

    return this.membershipResponseMapper.toActiveContextDto(context);
  }

  @Get('me/active-context')
  @UseGuards(MembershipSelfOrPlatformAdminGuard)
  async getActiveMembershipContext(
    @Req() request: any,
    @Query('surface') surface: OperationalSurface,
  ) {
    const context = await this.membershipsService.getActiveMembershipContext(
      request.user.userId,
      surface,
    );

    return context
      ? this.membershipResponseMapper.toActiveContextDto(context)
      : null;
  }

  @Get(':id')
  @UseGuards(MembershipPlatformAdminGuard)
  async getMembershipById(@Param() params: GetMembershipByIdParamsDto) {
    const membership = await this.membershipsService.getMembershipById(params);
    return this.membershipResponseMapper.toDetailDto(membership);
  }

  @Post(':id/activate')
  @UseGuards(MembershipPlatformAdminGuard)
  async activateMembership(
    @Req() request: any,
    @Param('id') id: string,
    @Body() dto: ActivateMembershipDto,
  ) {
    const membership = await this.membershipsService.activateMembership(
      request.user?.userId ?? null,
      id,
      dto,
    );

    return this.membershipResponseMapper.toDetailDto(membership);
  }

  @Post(':id/suspend')
  @UseGuards(MembershipPlatformAdminGuard)
  async suspendMembership(
    @Req() request: any,
    @Param('id') id: string,
    @Body() dto: SuspendMembershipDto,
  ) {
    const membership = await this.membershipsService.suspendMembership(
      request.user?.userId ?? null,
      id,
      dto,
    );

    return this.membershipResponseMapper.toDetailDto(membership);
  }

  @Post(':id/revoke')
  @UseGuards(MembershipPlatformAdminGuard)
  async revokeMembership(
    @Req() request: any,
    @Param('id') id: string,
    @Body() dto: RevokeMembershipDto,
  ) {
    const membership = await this.membershipsService.revokeMembership(
      request.user?.userId ?? null,
      id,
      dto,
    );

    return this.membershipResponseMapper.toDetailDto(membership);
  }

  @Post(':id/expire')
  @UseGuards(MembershipPlatformAdminGuard)
  async expireMembership(
    @Req() request: any,
    @Param('id') id: string,
    @Body() dto: ExpireMembershipDto,
  ) {
    const membership = await this.membershipsService.expireMembership(
      request.user?.userId ?? null,
      id,
      dto,
    );

    return this.membershipResponseMapper.toDetailDto(membership);
  }
}
