import {
  InvitationRecipientType,
  InvitationStatus,
  MembershipScopeType,
} from '@prisma/client';

import { InvitationCommandService } from '../application/invitation-command.service';
import { InvitationTokenService } from '../application/invitation-token.service';
import { InvitationSupportService } from '../application/support/invitation-support.service';
import { InvitationsRepository } from '../invitations.repository';

import {
  EquivalentActiveInvitationExistsError,
  InvalidInvitationExpirationError,
  InvalidInvitationStatusTransitionError,
  InvalidInvitationTokenError,
  InvitationRecipientMismatchError,
  InvitationExpiredError,
  InvitationNotFoundError,
} from '../domain/errors/invitation.errors';

import {
  INVITATION_AUDIT_ACTIONS,
} from '../domain/constants/invitation.constants';
import { InvitationDomainEvents } from '../domain/events/invitation.events';

describe('InvitationCommandService', () => {
  let service: InvitationCommandService;

  const repository = {
    findById: jest.fn(),
    updateByIdAndVersion: jest.fn(),
    createHistory: jest.fn(),
    findByTokenHash: jest.fn(),
    acceptInvitationTransaction: jest.fn(),
    expireDueInvitations: jest.fn(),
    expireInvitationIfDue: jest.fn(),
    createInvitation: jest.fn(),
    findEquivalentActiveInvitation: jest.fn(),
  } as unknown as jest.Mocked<Partial<InvitationsRepository>> as InvitationsRepository;

  const tokenService = {
    hash: jest.fn(),
    generate: jest.fn(),
  } as unknown as jest.Mocked<Partial<InvitationTokenService>> as InvitationTokenService;

  const support = {
    assertInvitationAcceptable: jest.fn(),
    expireInvitationIfNeeded: jest.fn(),
    recordAccepted: jest.fn(),
    recordAudit: jest.fn(),
    publishEvent: jest.fn(),
  } as unknown as jest.Mocked<Partial<InvitationSupportService>> as InvitationSupportService;

  const notifications = {
    sendInvitation: jest.fn(),
  } as any;

  const userResolution = {
    resolveOrCreateUserByRecipient: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    (support.expireInvitationIfNeeded as jest.Mock).mockResolvedValue(undefined);

    service = new InvitationCommandService(
      repository,
      tokenService,
      support,
      notifications,
      userResolution,
    );
  });

  describe('acceptInvitationByToken', () => {
    it('should delegate acceptance to acceptInvitationTransaction and return accepted result', async () => {
      const invitation = {
        id: 'inv_01',
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_01',
        storeId: null,
        status: InvitationStatus.SENT,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      };

      const acceptedInvitation = {
        ...invitation,
        status: InvitationStatus.ACCEPTED,
        membershipId: 'mem_01',
        acceptedByUserId: 'user_01',
        acceptedAt: new Date(),
        currentTokenHash: null,
      };

      (tokenService.hash as jest.Mock).mockReturnValue('hashed_token');
      (repository.findByTokenHash as jest.Mock).mockResolvedValue(invitation);
      (userResolution.resolveOrCreateUserByRecipient as jest.Mock).mockResolvedValue({
        userId: 'user_01',
        created: false,
      });
      (repository.acceptInvitationTransaction as jest.Mock).mockResolvedValue({
        invitation: acceptedInvitation,
        membershipId: 'mem_01',
        idempotent: false,
      });

      const result = await service.acceptInvitationByToken('plain-token', {
        recipientValue: 'user@example.com',
      });

      expect(tokenService.hash).toHaveBeenCalledWith('plain-token');
      expect(repository.findByTokenHash).toHaveBeenCalledWith('hashed_token');

      expect(userResolution.resolveOrCreateUserByRecipient).toHaveBeenCalledWith({
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
      });

      expect(repository.acceptInvitationTransaction).toHaveBeenCalledWith({
        invitationId: 'inv_01',
        acceptedByUserId: 'user_01',
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_01',
        storeId: null,
      });

      expect(support.recordAccepted).toHaveBeenCalledWith('inv_01', 'user_01', {
        membershipId: 'mem_01',
        createdUser: false,
      });

      expect(support.recordAudit).toHaveBeenCalled();
      expect(support.publishEvent).toHaveBeenCalled();

      expect(result).toEqual({
        invitation: acceptedInvitation,
        membershipId: 'mem_01',
        accepted: true,
        idempotent: false,
      });
    });

    it('should throw InvalidInvitationTokenError when token is not found', async () => {
      (tokenService.hash as jest.Mock).mockReturnValue('hashed_token');
      (repository.findByTokenHash as jest.Mock).mockResolvedValue(null);

      await expect(
        service.acceptInvitationByToken('bad-token', {
          recipientValue: 'user@example.com',
        }),
      ).rejects.toBeInstanceOf(InvalidInvitationTokenError);

      expect(repository.acceptInvitationTransaction).not.toHaveBeenCalled();
      expect(userResolution.resolveOrCreateUserByRecipient).not.toHaveBeenCalled();
    });

    it('should return idempotent result when transaction reports invitation already accepted', async () => {
      const invitation = {
        id: 'inv_accepted_01',
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_01',
        storeId: null,
        status: InvitationStatus.SENT,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      };

      const acceptedInvitation = {
        ...invitation,
        status: InvitationStatus.ACCEPTED,
        membershipId: 'mem_01',
        acceptedByUserId: 'user_01',
        acceptedAt: new Date(),
        currentTokenHash: null,
      };

      (tokenService.hash as jest.Mock).mockReturnValue('hashed_token');
      (repository.findByTokenHash as jest.Mock).mockResolvedValue(invitation);
      (userResolution.resolveOrCreateUserByRecipient as jest.Mock).mockResolvedValue({
        userId: 'user_01',
        created: false,
      });

      (repository.acceptInvitationTransaction as jest.Mock).mockResolvedValue({
        invitation: acceptedInvitation,
        membershipId: 'mem_01',
        idempotent: true,
      });

      const result = await service.acceptInvitationByToken('plain-token', {
        recipientValue: 'user@example.com',
      });

      expect(tokenService.hash).toHaveBeenCalledWith('plain-token');
      expect(repository.findByTokenHash).toHaveBeenCalledWith('hashed_token');

      expect(userResolution.resolveOrCreateUserByRecipient).toHaveBeenCalledWith({
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
      });

      expect(repository.acceptInvitationTransaction).toHaveBeenCalledWith({
        invitationId: 'inv_accepted_01',
        acceptedByUserId: 'user_01',
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_01',
        storeId: null,
      });

      expect(support.recordAccepted).toHaveBeenCalledWith('inv_accepted_01', 'user_01', {
        membershipId: 'mem_01',
        createdUser: false,
      });

      expect(result).toEqual({
        invitation: acceptedInvitation,
        membershipId: 'mem_01',
        accepted: true,
        idempotent: true,
      });
    });

    it('should throw InvitationRecipientMismatchError when provided recipient does not match invitation recipient', async () => {
      const invitation = {
        id: 'inv_mismatch_01',
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_01',
        storeId: null,
        status: InvitationStatus.SENT,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      };

      (tokenService.hash as jest.Mock).mockReturnValue('hashed_token');
      (repository.findByTokenHash as jest.Mock).mockResolvedValue(invitation);

      await expect(
        service.acceptInvitationByToken('plain-token', {
          recipientValue: 'other@example.com',
        }),
      ).rejects.toBeInstanceOf(InvitationRecipientMismatchError);

      expect(userResolution.resolveOrCreateUserByRecipient).not.toHaveBeenCalled();
      expect(repository.acceptInvitationTransaction).not.toHaveBeenCalled();
      expect(support.recordAccepted).not.toHaveBeenCalled();
    });

    it('should throw InvitationExpiredError when invitation is already expired', async () => {
      const invitation = {
        id: 'inv_expired_01',
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_01',
        storeId: null,
        status: InvitationStatus.SENT,
        expiresAt: new Date(Date.now() - 1000),
      };

      (tokenService.hash as jest.Mock).mockReturnValue('hashed_token');
      (repository.findByTokenHash as jest.Mock).mockResolvedValue(invitation);
      (support.expireInvitationIfNeeded as jest.Mock).mockRejectedValue(
        new InvitationExpiredError(),
      );

      await expect(
        service.acceptInvitationByToken('plain-token', {
          recipientValue: 'user@example.com',
        }),
      ).rejects.toBeInstanceOf(InvitationExpiredError);

      expect(tokenService.hash).toHaveBeenCalledWith('plain-token');
      expect(repository.findByTokenHash).toHaveBeenCalledWith('hashed_token');
      expect(support.expireInvitationIfNeeded).toHaveBeenCalledWith(
        invitation,
        repository,
      );

      expect(userResolution.resolveOrCreateUserByRecipient).not.toHaveBeenCalled();
      expect(repository.acceptInvitationTransaction).not.toHaveBeenCalled();
      expect(support.recordAccepted).not.toHaveBeenCalled();
    });

    it('should throw membership conflict when equivalent active membership already exists', async () => {
      const invitation = {
        id: 'inv_conflict_01',
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_01',
        storeId: null,
        status: InvitationStatus.SENT,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      };

      (tokenService.hash as jest.Mock).mockReturnValue('hashed_token');
      (repository.findByTokenHash as jest.Mock).mockResolvedValue(invitation);
      (userResolution.resolveOrCreateUserByRecipient as jest.Mock).mockResolvedValue({
        userId: 'user_01',
        created: false,
      });

      (repository.acceptInvitationTransaction as jest.Mock).mockRejectedValue(
        new EquivalentActiveInvitationExistsError(),
      );

      await expect(
        service.acceptInvitationByToken('plain-token', {
          recipientValue: 'user@example.com',
        }),
      ).rejects.toBeInstanceOf(EquivalentActiveInvitationExistsError);

      expect(support.recordAccepted).not.toHaveBeenCalled();
    });
  });

  describe('declineInvitation', () => {
    it('should decline invitation from SENT and set declined fields', async () => {
      const invitation = {
        id: 'inv_decline_01',
        version: 3,
        status: InvitationStatus.SENT,
        currentTokenHash: 'hash_01',
      };

      const updated = {
        ...invitation,
        status: InvitationStatus.DECLINED,
        declinedAt: new Date(),
        currentTokenHash: null,
      };

      (repository.findById as jest.Mock).mockResolvedValue(invitation);
      (repository.updateByIdAndVersion as jest.Mock).mockResolvedValue(updated);

      const result = await service.declineInvitation('inv_decline_01', {
        reason: 'not_interested',
      });

      expect(repository.updateByIdAndVersion).toHaveBeenCalledWith(
        'inv_decline_01',
        3,
        expect.objectContaining({
          status: InvitationStatus.DECLINED,
          currentTokenHash: null,
          declinedAt: expect.any(Date),
        }),
      );

      expect(repository.createHistory).toHaveBeenCalledWith({
        invitationId: 'inv_decline_01',
        fromStatus: InvitationStatus.SENT,
        toStatus: InvitationStatus.DECLINED,
        changedBy: null,
        reason: 'not_interested',
      });

      expect(support.recordAudit).toHaveBeenCalledWith(
        'invitation.declined',
        null,
        'inv_decline_01',
        { reason: 'not_interested' },
      );

      expect(support.publishEvent).toHaveBeenCalledWith(
        'invitation_declined',
        { invitationId: 'inv_decline_01' },
      );

      expect(result).toBe(updated);
    });

    it('should reject decline if status is PROPOSED', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({
        id: 'inv_proposed',
        version: 1,
        status: InvitationStatus.PROPOSED,
      });

      await expect(
        service.declineInvitation('inv_proposed', {
          reason: 'cannot_decline_unsent',
        }),
      ).rejects.toBeInstanceOf(InvalidInvitationStatusTransitionError);

      expect(repository.updateByIdAndVersion).not.toHaveBeenCalled();
    });

    it('should reject decline if status is REVOKED', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({
        id: 'inv_revoked',
        version: 1,
        status: InvitationStatus.REVOKED,
      });

      await expect(
        service.declineInvitation('inv_revoked', {
          reason: 'already_revoked',
        }),
      ).rejects.toBeInstanceOf(InvalidInvitationStatusTransitionError);

      expect(repository.updateByIdAndVersion).not.toHaveBeenCalled();
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation from PROPOSED', async () => {
      const invitation = {
        id: 'inv_cancel_01',
        version: 2,
        status: InvitationStatus.PROPOSED,
      };

      const updated = {
        ...invitation,
        status: InvitationStatus.CANCELED,
        canceledAt: new Date(),
        canceledBy: 'admin_01',
        currentTokenHash: null,
      };

      (repository.findById as jest.Mock).mockResolvedValue(invitation);
      (repository.updateByIdAndVersion as jest.Mock).mockResolvedValue(updated);

      const result = await service.cancelInvitation('admin_01', 'inv_cancel_01', {
        reason: 'admin_cancel_before_send',
      });

      expect(repository.updateByIdAndVersion).toHaveBeenCalledWith(
        'inv_cancel_01',
        2,
        expect.objectContaining({
          status: InvitationStatus.CANCELED,
          canceledAt: expect.any(Date),
          canceledBy: 'admin_01',
          currentTokenHash: null,
        }),
      );

      expect(repository.createHistory).toHaveBeenCalledWith({
        invitationId: 'inv_cancel_01',
        fromStatus: InvitationStatus.PROPOSED,
        toStatus: InvitationStatus.CANCELED,
        changedBy: 'admin_01',
        reason: 'admin_cancel_before_send',
      });

      expect(support.recordAudit).toHaveBeenCalledWith(
        'invitation.canceled',
        'admin_01',
        'inv_cancel_01',
        { reason: 'admin_cancel_before_send' },
      );

      expect(support.publishEvent).toHaveBeenCalledWith(
        'invitation_canceled',
        { invitationId: 'inv_cancel_01' },
      );

      expect(result).toBe(updated);
    });

    it('should reject cancel if status is SENT', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({
        id: 'inv_sent',
        version: 1,
        status: InvitationStatus.SENT,
      });

      await expect(
        service.cancelInvitation('admin_01', 'inv_sent', {
          reason: 'too_late',
        }),
      ).rejects.toBeInstanceOf(InvalidInvitationStatusTransitionError);

      expect(repository.updateByIdAndVersion).not.toHaveBeenCalled();
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke invitation from SENT and clear current token', async () => {
      const invitation = {
        id: 'inv_revoke_01',
        version: 7,
        status: InvitationStatus.SENT,
        currentTokenHash: 'hash_01',
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_01',
        storeId: null,
      };

      const updated = {
        ...invitation,
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: 'admin_01',
        currentTokenHash: null,
      };

      (repository.findById as jest.Mock).mockResolvedValue(invitation);
      (repository.updateByIdAndVersion as jest.Mock).mockResolvedValue(updated);

      const result = await service.revokeInvitation('admin_01', 'inv_revoke_01', {
        reason: 'admin_revoked_access',
      });

      expect(repository.findById).toHaveBeenCalledWith('inv_revoke_01');

      expect(repository.updateByIdAndVersion).toHaveBeenCalledWith(
        'inv_revoke_01',
        7,
        expect.objectContaining({
          status: InvitationStatus.REVOKED,
          revokedBy: 'admin_01',
          revokedAt: expect.any(Date),
          currentTokenHash: null,
        }),
      );

      expect(repository.createHistory).toHaveBeenCalledWith({
        invitationId: 'inv_revoke_01',
        fromStatus: InvitationStatus.SENT,
        toStatus: InvitationStatus.REVOKED,
        changedBy: 'admin_01',
        reason: 'admin_revoked_access',
      });

      expect(support.recordAudit).toHaveBeenCalledWith(
        INVITATION_AUDIT_ACTIONS.INVITATION_REVOKED,
        'admin_01',
        'inv_revoke_01',
        { reason: 'admin_revoked_access' },
      );

      expect(support.publishEvent).toHaveBeenCalledWith(
        InvitationDomainEvents.INVITATION_REVOKED,
        { invitationId: 'inv_revoke_01' },
      );

      expect(result).toBe(updated);
    });

    it('should reject revoke when invitation is not found', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.revokeInvitation('admin_01', 'missing_inv', {
          reason: 'not_found',
        }),
      ).rejects.toBeInstanceOf(InvitationNotFoundError);

      expect(repository.updateByIdAndVersion).not.toHaveBeenCalled();
      expect(repository.createHistory).not.toHaveBeenCalled();
    });

    it('should reject revoke when current status cannot transition to REVOKED', async () => {
      (repository.findById as jest.Mock).mockResolvedValue({
        id: 'inv_acc_01',
        version: 3,
        status: InvitationStatus.ACCEPTED,
      });

      await expect(
        service.revokeInvitation('admin_01', 'inv_acc_01', {
          reason: 'too_late',
        }),
      ).rejects.toBeInstanceOf(InvalidInvitationStatusTransitionError);

      expect(repository.updateByIdAndVersion).not.toHaveBeenCalled();
      expect(repository.createHistory).not.toHaveBeenCalled();
    });
  });

  describe('resendInvitation', () => {
    it('should rotate token and create resend history entry', async () => {
      const invitation = {
        id: 'inv_resent_01',
        version: 4,
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_01',
        storeId: null,
        status: InvitationStatus.SENT,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      };

      const updated = {
        ...invitation,
        currentTokenHash: 'new_hash',
        currentTokenIssuedAt: new Date(),
        sentAt: new Date(),
      };

      (repository.findById as jest.Mock).mockResolvedValue(invitation);
      (tokenService.generate as jest.Mock).mockReturnValue({
        invitationId: invitation.id,
        token: 'plain-token',
        expiresAt: invitation.expiresAt,
      });
      (tokenService.hash as jest.Mock).mockReturnValue('new_hash');
      (repository.updateByIdAndVersion as jest.Mock).mockResolvedValue(updated);

      const result = await service.resendInvitation('admin_01', invitation.id, {
        reason: 'manual_resend',
      });

      expect(repository.updateByIdAndVersion).toHaveBeenCalledWith(
        invitation.id,
        invitation.version,
        expect.objectContaining({
          currentTokenHash: 'new_hash',
          currentTokenIssuedAt: expect.any(Date),
          sentAt: expect.any(Date),
        }),
      );

      expect(repository.createHistory).toHaveBeenCalledWith({
        invitationId: updated.id,
        fromStatus: InvitationStatus.SENT,
        toStatus: InvitationStatus.SENT,
        changedBy: 'admin_01',
        reason: 'manual_resend',
      });

      expect(notifications.sendInvitation).toHaveBeenCalledWith({
        invitationId: updated.id,
        recipientType: updated.recipientType,
        recipientValue: updated.recipientValue,
        token: 'plain-token',
        expiresAt: updated.expiresAt,
      });

      expect(support.recordAudit).toHaveBeenCalledWith(
        INVITATION_AUDIT_ACTIONS.INVITATION_RESENT,
        'admin_01',
        updated.id,
        expect.objectContaining({
          reason: 'manual_resend',
          resentAt: expect.any(Date),
          expiresAt: updated.expiresAt,
        }),
      );

      expect(support.publishEvent).toHaveBeenCalledWith(
        InvitationDomainEvents.INVITATION_RESENT,
        expect.objectContaining({
          invitationId: updated.id,
          expiresAt: updated.expiresAt,
          resentAt: expect.any(Date),
        }),
      );

      expect(result).toEqual({
        invitation: updated,
        token: 'plain-token',
      });
    });
  });

  describe('expireDueInvitations', () => {
    it('should record audit and publish event for each expired invitation', async () => {
      const expiredAt = new Date();

      (repository.expireDueInvitations as jest.Mock).mockResolvedValue([
        {
          id: 'inv_exp_01',
          expiresAt: new Date(Date.now() - 1000),
          expiredAt,
        },
        {
          id: 'inv_exp_02',
          expiresAt: new Date(Date.now() - 2000),
          expiredAt,
        },
      ]);

      const result = await service.expireDueInvitations(expiredAt);

      expect(repository.expireDueInvitations).toHaveBeenCalledWith(expiredAt);

      expect(support.recordAudit).toHaveBeenCalledTimes(2);
      expect(support.publishEvent).toHaveBeenCalledTimes(2);

      expect(result).toEqual({
        expiredCount: 2,
        items: expect.any(Array),
      });
    });
  });

  describe('createInvitation', () => {
    beforeEach(() => {
        (repository.findEquivalentActiveInvitation as jest.Mock).mockResolvedValue(null);

        (repository.createInvitation as jest.Mock).mockImplementation(
        async (data) => ({
            id: 'inv_01',
            version: 1,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        }),
        );

        (repository.updateByIdAndVersion as jest.Mock).mockImplementation(
        async (_id, _version, patch) => ({
            id: 'inv_01',
            version: 2,
            recipientType: InvitationRecipientType.EMAIL,
            recipientValue: 'user@example.com',
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_01',
            storeId: null,
            status: InvitationStatus.SENT,
            expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
            createdBy: 'admin_01',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...patch,
        }),
        );

        (tokenService.generate as jest.Mock).mockReturnValue({
        invitationId: 'inv_01',
        token: 'plain-token',
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        });

        (tokenService.hash as jest.Mock).mockReturnValue('hashed-token');
    });
    
    describe('TTL validation', () => {
        it('should apply default ttl when expiresAt is not provided', async () => {
            const before = Date.now();

            await service.createInvitation('admin_01', {
            recipientType: InvitationRecipientType.EMAIL,
            recipientValue: 'user@example.com',
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_01',
            });

            expect(repository.createInvitation).toHaveBeenCalledWith(
            expect.objectContaining({
                expiresAt: expect.any(Date),
            }),
            );

            const expiresAt = (repository.createInvitation as jest.Mock).mock.calls[0][0]
            .expiresAt as Date;

            const ttlMs = expiresAt.getTime() - before;

            expect(ttlMs).toBeGreaterThanOrEqual((72 * 60 * 60 - 5) * 1000);
            expect(ttlMs).toBeLessThanOrEqual((72 * 60 * 60 + 5) * 1000);
        });

        it('should reject invalid expiresAt format', async () => {
            try {
            await service.createInvitation('admin_01', {
                recipientType: InvitationRecipientType.EMAIL,
                recipientValue: 'user@example.com',
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_01',
                expiresAt: 'not-a-date',
            });

            fail('Expected createInvitation to throw');
            } catch (error) {
            expect(error).toBeInstanceOf(InvalidInvitationExpirationError);
            expect(error).toMatchObject({
                response: {
                message: 'invalid_invitation_expiration',
                },
            });
            }
        });

        it('should reject expiresAt in the past', async () => {
            const past = new Date(Date.now() - 60_000).toISOString();

            try {
            await service.createInvitation('admin_01', {
                recipientType: InvitationRecipientType.EMAIL,
                recipientValue: 'user@example.com',
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_01',
                expiresAt: past,
            });

            fail('Expected createInvitation to throw');
            } catch (error) {
            expect(error).toBeInstanceOf(InvalidInvitationExpirationError);
            expect(error).toMatchObject({
                response: {
                message: 'invitation_expiration_must_be_future',
                },
            });
            }
        });

        it('should reject ttl below minimum', async () => {
            const belowMin = new Date(Date.now() + 14 * 60 * 1000).toISOString();

            try {
            await service.createInvitation('admin_01', {
                recipientType: InvitationRecipientType.EMAIL,
                recipientValue: 'user@example.com',
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_01',
                expiresAt: belowMin,
            });

            fail('Expected createInvitation to throw');
            } catch (error) {
            expect(error).toBeInstanceOf(InvalidInvitationExpirationError);
            expect(error).toMatchObject({
                response: {
                message: 'invitation_ttl_below_minimum',
                },
            });
            }
        });

        it('should reject ttl above maximum', async () => {
            const aboveMax = new Date(
            Date.now() + (24 * 30 * 60 * 60 * 1000) + 60_000,
            ).toISOString();

            try {
            await service.createInvitation('admin_01', {
                recipientType: InvitationRecipientType.EMAIL,
                recipientValue: 'user@example.com',
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_01',
                expiresAt: aboveMax,
            });

            fail('Expected createInvitation to throw');
            } catch (error) {
            expect(error).toBeInstanceOf(InvalidInvitationExpirationError);
            expect(error).toMatchObject({
                response: {
                message: 'invitation_ttl_exceeds_maximum',
                },
            });
            }
        });

        it('should accept ttl exactly at minimum boundary', async () => {
            const minBoundary = new Date(Date.now() + 15 * 60 * 1000).toISOString();

            await expect(
            service.createInvitation('admin_01', {
                recipientType: InvitationRecipientType.EMAIL,
                recipientValue: 'user@example.com',
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_01',
                expiresAt: minBoundary,
            }),
            ).resolves.toBeDefined();
        });

        it('should accept ttl exactly at maximum boundary', async () => {
            const maxBoundary = new Date(
            Date.now() + 24 * 30 * 60 * 60 * 1000,
            ).toISOString();

            await expect(
            service.createInvitation('admin_01', {
                recipientType: InvitationRecipientType.EMAIL,
                recipientValue: 'user@example.com',
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_01',
                expiresAt: maxBoundary,
            }),
            ).resolves.toBeDefined();
        });
    });

    describe('scope validation', () => {
        it('should reject TENANT scope when storeId is provided', async () => {
          await expect(
            service.createInvitation('admin_01', {
              recipientType: InvitationRecipientType.EMAIL,
              recipientValue: 'user@example.com',
              scopeType: MembershipScopeType.TENANT,
              tenantId: 'tenant_01',
              storeId: 'store_01',
            }),
          ).rejects.toMatchObject({
            response: {
              message: 'tenant_scope_must_not_include_store',
            },
          });

          expect(repository.findEquivalentActiveInvitation).not.toHaveBeenCalled();
          expect(repository.createInvitation).not.toHaveBeenCalled();
        });

        it('should reject STORE scope when storeId is missing', async () => {
          await expect(
            service.createInvitation('admin_01', {
              recipientType: InvitationRecipientType.EMAIL,
              recipientValue: 'user@example.com',
              scopeType: MembershipScopeType.STORE,
              tenantId: 'tenant_01',
            }),
          ).rejects.toMatchObject({
            response: {
              message: 'store_scope_requires_store_id',
            },
          });

          expect(repository.findEquivalentActiveInvitation).not.toHaveBeenCalled();
          expect(repository.createInvitation).not.toHaveBeenCalled();
        });

        it('should normalize TENANT scope to storeId=null', async () => {
            (repository.findEquivalentActiveInvitation as jest.Mock).mockResolvedValue(null);
            (repository.createInvitation as jest.Mock).mockImplementation(async (data) => ({
                id: 'inv_01',
                version: 1,
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            }));
            (repository.updateByIdAndVersion as jest.Mock).mockImplementation(async (_id, _version, patch) => ({
                id: 'inv_01',
                version: 2,
                recipientType: InvitationRecipientType.EMAIL,
                recipientValue: 'user@example.com',
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_01',
                storeId: null,
                status: InvitationStatus.SENT,
                expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
                createdBy: 'admin_01',
                createdAt: new Date(),
                updatedAt: new Date(),
                ...patch,
            }));
            (tokenService.generate as jest.Mock).mockReturnValue({
                invitationId: 'inv_01',
                token: 'plain-token',
                expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
            });
            (tokenService.hash as jest.Mock).mockReturnValue('hashed-token');

            await service.createInvitation('admin_01', {
                recipientType: InvitationRecipientType.EMAIL,
                recipientValue: 'user@example.com',
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_01',
            });

            expect(repository.createInvitation).toHaveBeenCalledWith(
                expect.objectContaining({
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_01',
                storeId: null,
                }),
            );
        });

        it('should accept STORE scope when tenantId and storeId are provided', async () => {
            (repository.findEquivalentActiveInvitation as jest.Mock).mockResolvedValue(null);
            (repository.createInvitation as jest.Mock).mockImplementation(async (data) => ({
                id: 'inv_01',
                version: 1,
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            }));
            (repository.updateByIdAndVersion as jest.Mock).mockImplementation(async (_id, _version, patch) => ({
                id: 'inv_01',
                version: 2,
                recipientType: InvitationRecipientType.EMAIL,
                recipientValue: 'user@example.com',
                scopeType: MembershipScopeType.STORE,
                tenantId: 'tenant_01',
                storeId: 'store_01',
                status: InvitationStatus.SENT,
                expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
                createdBy: 'admin_01',
                createdAt: new Date(),
                updatedAt: new Date(),
                ...patch,
            }));
            (tokenService.generate as jest.Mock).mockReturnValue({
                invitationId: 'inv_01',
                token: 'plain-token',
                expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
            });
            (tokenService.hash as jest.Mock).mockReturnValue('hashed-token');

            await expect(
                service.createInvitation('admin_01', {
                recipientType: InvitationRecipientType.EMAIL,
                recipientValue: 'user@example.com',
                scopeType: MembershipScopeType.STORE,
                tenantId: 'tenant_01',
                storeId: 'store_01',
                }),
            ).resolves.toBeDefined();

            expect(repository.createInvitation).toHaveBeenCalledWith(
                expect.objectContaining({
                scopeType: MembershipScopeType.STORE,
                tenantId: 'tenant_01',
                storeId: 'store_01',
                }),
            );
        });
    });

    describe('equivalent active invitation', () => {
        it('should reject createInvitation when an equivalent active invitation already exists', async () => {
        (repository.findEquivalentActiveInvitation as jest.Mock).mockResolvedValue({
            id: 'inv_existing_01',
            status: InvitationStatus.SENT,
        });

        await expect(
            service.createInvitation('admin_01', {
            recipientType: InvitationRecipientType.EMAIL,
            recipientValue: 'user@example.com',
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_01',
            }),
        ).rejects.toBeInstanceOf(EquivalentActiveInvitationExistsError);

        expect(repository.createInvitation).not.toHaveBeenCalled();
        expect(repository.updateByIdAndVersion).not.toHaveBeenCalled();
        expect(notifications.sendInvitation).not.toHaveBeenCalled();
        });
    });
  });
});