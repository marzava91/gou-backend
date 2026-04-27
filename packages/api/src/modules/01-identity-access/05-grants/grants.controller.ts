import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { GrantsService } from './grants.service';
import { GrantResponseMapper } from './mappers/grant-response.mapper';

import { CreateGrantDto } from './dto/commands/create-grant.dto';
import { RevokeGrantDto } from './dto/commands/revoke-grant.dto';
import { ListGrantsQueryDto } from './dto/queries/list-grants.query.dto';
import { GrantIdParamDto } from './dto/params/grant-id-param.dto';
import { MembershipIdParamDto } from './dto/params/membership-id-param.dto';

import { GrantPlatformAdminGuard } from './guards/grant-platform-admin.guard';

@Controller('v1/grants')
export class GrantsController {
  constructor(
    private readonly grantsService: GrantsService,
    private readonly grantResponseMapper: GrantResponseMapper,
  ) {}

  @Post()
  @UseGuards(GrantPlatformAdminGuard)
  async createGrant(
    @Req() req: Request & { user?: { userId?: string | null } },
    @Body() dto: CreateGrantDto,
  ) {
    const actorId = req.user?.userId ?? null;
    const grant = await this.grantsService.createGrant(actorId, dto);
    return this.grantResponseMapper.toGrantResponse(grant);
  }

  @Get()
  @UseGuards(GrantPlatformAdminGuard)
  async listGrants(@Query() query: ListGrantsQueryDto) {
    const grants = await this.grantsService.listGrants(query);
    return grants.map((grant) =>
      this.grantResponseMapper.toGrantSummaryResponse(grant),
    );
  }

  @Patch(':grantId/revoke')
  @UseGuards(GrantPlatformAdminGuard)
  async revokeGrant(
    @Req() req: Request & { user?: { userId?: string | null } },
    @Param() params: GrantIdParamDto,
    @Body() dto: RevokeGrantDto,
  ) {
    const actorId = req.user?.userId ?? null;
    return this.grantsService.revokeGrant(actorId, params.grantId, dto);
  }

  @Get('memberships/:membershipId')
  @UseGuards(GrantPlatformAdminGuard)
  async listMembershipGrants(@Param() params: MembershipIdParamDto) {
    const grants = await this.grantsService.listMembershipGrants(
      params.membershipId,
    );
    return grants.map((grant) =>
      this.grantResponseMapper.toGrantSummaryResponse(grant),
    );
  }

  @Get(':grantId')
  @UseGuards(GrantPlatformAdminGuard)
  async getGrant(@Param() params: GrantIdParamDto) {
    const grant = await this.grantsService.getGrantById(params.grantId);
    return this.grantResponseMapper.toGrantResponse(grant);
  }
}
