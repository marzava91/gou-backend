import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { InvitationsService } from './invitations.service';
import { InvitationResponseMapper } from './mappers/invitation-response.mapper';

import { CurrentInvitationActor } from './decorators/current-invitation-actor.decorator';
import { InvitationPlatformAdminGuard } from './guards/invitation-platform-admin.guard';

import { CreateInvitationDto } from './dto/commands/create-invitation.dto';
import { ResendInvitationDto } from './dto/commands/resend-invitation.dto';
import { RevokeInvitationDto } from './dto/commands/revoke-invitation.dto';
import { AcceptInvitationDto } from './dto/commands/accept-invitation.dto';
import { DeclineInvitationDto } from './dto/commands/decline-invitation.dto';

import { InvitationIdParamDto } from './dto/params/invitation-id-param.dto';
import { GetInvitationByTokenQueryDto } from './dto/queries/get-invitation-by-token.query.dto';
import { ListInvitationsQueryDto } from './dto/queries/list-invitations.query.dto';

@Controller('v1/invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly mapper: InvitationResponseMapper,
  ) {}

  @Post()
  @UseGuards(InvitationPlatformAdminGuard)
  async createInvitation(
    @CurrentInvitationActor() actor: { userId?: string } | null,
    @Body() dto: CreateInvitationDto,
  ) {
    const result = await this.invitationsService.createInvitation(
      actor?.userId ?? null,
      dto,
    );

    return {
      invitation: this.mapper.toResponse(result.invitation),
      token: result.token,
    };
  }

  @Post(':id/resend')
  @UseGuards(InvitationPlatformAdminGuard)
  async resendInvitation(
    @CurrentInvitationActor() actor: { userId?: string } | null,
    @Param() params: InvitationIdParamDto,
    @Body() dto: ResendInvitationDto,
  ) {
    const result = await this.invitationsService.resendInvitation(
      actor?.userId ?? null,
      params.id,
      dto,
    );

    return {
      invitation: this.mapper.toResponse(result.invitation),
      token: result.token,
    };
  }

  @Post(':id/revoke')
  @UseGuards(InvitationPlatformAdminGuard)
  async revokeInvitation(
    @CurrentInvitationActor() actor: { userId?: string } | null,
    @Param() params: InvitationIdParamDto,
    @Body() dto: RevokeInvitationDto,
  ) {
    const invitation = await this.invitationsService.revokeInvitation(
      actor?.userId ?? null,
      params.id,
      dto,
    );

    return this.mapper.toResponse(invitation);
  }

  @Post(':id/decline')
  async declineInvitation(
    @Param() params: InvitationIdParamDto,
    @Body() dto: DeclineInvitationDto,
  ) {
    const invitation = await this.invitationsService.declineInvitation(
      params.id,
      dto,
    );

    return this.mapper.toPublicResponse(invitation);
  }

  @Post('accept')
  async acceptInvitation(
    @Query() query: GetInvitationByTokenQueryDto,
    @Body() dto: AcceptInvitationDto,
  ) {
    const result = await this.invitationsService.acceptInvitationByToken(
      query.token,
      dto,
    );

    return {
      invitation: this.mapper.toPublicResponse(result.invitation),
      membershipId: result.membershipId,
      accepted: result.accepted,
      idempotent: result.idempotent,
    };
  }

  @Get('token')
  async getInvitationByToken(@Query() dto: GetInvitationByTokenQueryDto) {
    return this.invitationsService.getInvitationByToken(dto);
  }

  @Get()
  @UseGuards(InvitationPlatformAdminGuard)
  async listInvitations(@Query() query: ListInvitationsQueryDto) {
    return this.invitationsService.listInvitations(query);
  }

  @Get(':id')
  @UseGuards(InvitationPlatformAdminGuard)
  async getInvitationById(@Param() params: InvitationIdParamDto) {
    return this.invitationsService.getInvitationById(params.id);
  }
}
