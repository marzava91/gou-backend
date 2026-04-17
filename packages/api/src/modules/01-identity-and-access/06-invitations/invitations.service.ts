import { Injectable } from '@nestjs/common';

import { InvitationCommandService } from './application/invitation-command.service';
import { InvitationQueryService } from './application/invitation-query.service';

import { CreateInvitationDto } from './dto/commands/create-invitation.dto';
import { ResendInvitationDto } from './dto/commands/resend-invitation.dto';
import { RevokeInvitationDto } from './dto/commands/revoke-invitation.dto';
import { AcceptInvitationDto } from './dto/commands/accept-invitation.dto';
import { DeclineInvitationDto } from './dto/commands/decline-invitation.dto';

import { GetInvitationByTokenQueryDto } from './dto/queries/get-invitation-by-token.query.dto';
import { ListInvitationsQueryDto } from './dto/queries/list-invitations.query.dto';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly invitationCommandService: InvitationCommandService,
    private readonly invitationQueryService: InvitationQueryService,
  ) {}

  createInvitation(actorUserId: string | null, dto: CreateInvitationDto) {
    return this.invitationCommandService.createInvitation(actorUserId, dto);
  }

  resendInvitation(
    actorUserId: string | null,
    invitationId: string,
    dto: ResendInvitationDto,
  ) {
    return this.invitationCommandService.resendInvitation(
      actorUserId,
      invitationId,
      dto,
    );
  }

  revokeInvitation(
    actorUserId: string | null,
    invitationId: string,
    dto: RevokeInvitationDto,
  ) {
    return this.invitationCommandService.revokeInvitation(
      actorUserId,
      invitationId,
      dto,
    );
  }

  declineInvitation(invitationId: string, dto: DeclineInvitationDto) {
    return this.invitationCommandService.declineInvitation(invitationId, dto);
  }

  acceptInvitationByToken(token: string, dto: AcceptInvitationDto) {
    return this.invitationCommandService.acceptInvitationByToken(token, dto);
  }

  getInvitationById(invitationId: string) {
    return this.invitationQueryService.getInvitationById(invitationId);
  }

  getInvitationByToken(dto: GetInvitationByTokenQueryDto) {
    return this.invitationQueryService.getInvitationByToken(dto);
  }

  listInvitations(query: ListInvitationsQueryDto) {
    return this.invitationQueryService.listInvitations(query);
  }
}
