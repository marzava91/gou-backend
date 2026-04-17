// packages/api/src/modules/01-identity-and-access/03-memberships/__tests__/membership-command.service.spec.ts

import { MembershipScopeType, MembershipStatus } from '@prisma/client';

import { MembershipCommandService } from '../application/membership-command.service';

import {
  DuplicateMembershipError,
  InvalidMembershipScopeError,
  InvalidMembershipTransitionError,
  InvitationMembershipConflictError,
  MembershipNotFoundError,
} from '../domain/errors/membership.errors';

describe('MembershipCommandService', () => {
  let service: MembershipCommandService;

  const membershipsRepository = {
    findEquivalentOpenMembership: jest.fn(),
    createMembership: jest.fn(),
    createStatusHistory: jest.fn(),
    findById: jest.fn(),
    updateMembershipStatus: jest.fn(),
    clearActiveContextsForMembership: jest.fn(),
    findByIdOrThrow: jest.fn(),
  };

  const membershipSupportService = {
    now: jest.fn(),
    normalizeReason: jest.fn(),
    recordAudit: jest.fn(),
    publishEvent: jest.fn(),
    recordLifecycleChange: jest.fn(),
    resolveStatusTimestampField: jest.fn(),
  };

  const membershipScopeDirectoryPort = {
    tenantExists: jest.fn(),
    storeExists: jest.fn(),
    storeBelongsToTenant: jest.fn(),
  };

  const membershipInvitationReaderPort = {
    findAcceptedInvitationById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    membershipSupportService.now.mockReturnValue(
      new Date('2026-04-10T20:00:00.000Z'),
    );
    membershipSupportService.normalizeReason.mockImplementation(
      (value?: string | null) => value?.trim() || null,
    );
    membershipSupportService.resolveStatusTimestampField.mockImplementation(
      (status: MembershipStatus) => {
        switch (status) {
          case MembershipStatus.ACTIVE:
            return 'activatedAt';
          case MembershipStatus.SUSPENDED:
            return 'suspendedAt';
          case MembershipStatus.REVOKED:
            return 'revokedAt';
          case MembershipStatus.EXPIRED:
            return 'expiredAt';
          default:
            return null;
        }
      },
    );

    membershipScopeDirectoryPort.tenantExists.mockResolvedValue(true);
    membershipScopeDirectoryPort.storeExists.mockResolvedValue(true);
    membershipScopeDirectoryPort.storeBelongsToTenant.mockResolvedValue(true);

    service = new MembershipCommandService(
      membershipsRepository as any,
      membershipSupportService as any,
      membershipScopeDirectoryPort as any,
      membershipInvitationReaderPort as any,
    );
  });

  describe('createMembership', () => {
    it('creates a pending membership when scope is valid and no equivalent open membership exists', async () => {
      membershipsRepository.findEquivalentOpenMembership.mockResolvedValue(
        null,
      );
      membershipsRepository.createMembership.mockResolvedValue({
        id: 'membership_123',
        userId: 'user_123',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_123',
        storeId: null,
        invitationId: null,
        status: MembershipStatus.PENDING,
        effectiveFrom: null,
        expiresAt: null,
        reason: 'initial setup',
        createdAt: new Date('2026-04-10T20:00:00.000Z'),
        updatedAt: new Date('2026-04-10T20:00:00.000Z'),
        version: 1,
      });

      const result = await service.createMembership('actor_123', {
        userId: 'user_123',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_123',
        reason: '  initial setup  ',
      });

      expect(membershipScopeDirectoryPort.tenantExists).toHaveBeenCalledWith(
        'tenant_123',
      );
      expect(
        membershipsRepository.findEquivalentOpenMembership,
      ).toHaveBeenCalledWith({
        userId: 'user_123',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_123',
        storeId: null,
      });
      expect(membershipsRepository.createMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_123',
          storeId: null,
          status: MembershipStatus.PENDING,
          reason: 'initial setup',
          version: 1,
        }),
      );
      expect(membershipsRepository.createStatusHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          membershipId: 'membership_123',
          fromStatus: null,
          toStatus: MembershipStatus.PENDING,
          changedBy: 'actor_123',
        }),
      );
      expect(membershipSupportService.recordAudit).toHaveBeenCalled();
      expect(membershipSupportService.publishEvent).toHaveBeenCalled();

      expect(result).toEqual(
        expect.objectContaining({
          id: 'membership_123',
          status: MembershipStatus.PENDING,
        }),
      );
    });

    it('throws InvalidMembershipScopeError when scope shape is invalid', async () => {
      await expect(
        service.createMembership('actor_123', {
          userId: 'user_123',
          scopeType: MembershipScopeType.STORE,
          tenantId: 'tenant_123',
        } as any),
      ).rejects.toBeInstanceOf(InvalidMembershipScopeError);

      expect(membershipScopeDirectoryPort.tenantExists).not.toHaveBeenCalled();
      expect(membershipsRepository.createMembership).not.toHaveBeenCalled();
    });

    it('throws InvalidMembershipScopeError when tenant does not exist', async () => {
      membershipScopeDirectoryPort.tenantExists.mockResolvedValue(false);

      await expect(
        service.createMembership('actor_123', {
          userId: 'user_123',
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_123',
        }),
      ).rejects.toBeInstanceOf(InvalidMembershipScopeError);

      expect(membershipsRepository.createMembership).not.toHaveBeenCalled();
    });

    it('throws InvalidMembershipScopeError when store does not belong to tenant', async () => {
      membershipScopeDirectoryPort.storeBelongsToTenant.mockResolvedValue(
        false,
      );

      await expect(
        service.createMembership('actor_123', {
          userId: 'user_123',
          scopeType: MembershipScopeType.STORE,
          tenantId: 'tenant_123',
          storeId: 'store_123',
        }),
      ).rejects.toBeInstanceOf(InvalidMembershipScopeError);

      expect(membershipsRepository.createMembership).not.toHaveBeenCalled();
    });

    it('throws DuplicateMembershipError when an equivalent open membership already exists', async () => {
      membershipsRepository.findEquivalentOpenMembership.mockResolvedValue({
        id: 'membership_existing',
      });

      await expect(
        service.createMembership('actor_123', {
          userId: 'user_123',
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_123',
        }),
      ).rejects.toBeInstanceOf(DuplicateMembershipError);

      expect(membershipsRepository.createMembership).not.toHaveBeenCalled();
    });

    it('throws InvitationMembershipConflictError when invitation does not exist', async () => {
      membershipsRepository.findEquivalentOpenMembership.mockResolvedValue(
        null,
      );
      membershipInvitationReaderPort.findAcceptedInvitationById.mockResolvedValue(
        null,
      );

      await expect(
        service.createMembership('actor_123', {
          userId: 'user_123',
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_123',
          invitationId: 'invitation_123',
        }),
      ).rejects.toBeInstanceOf(InvitationMembershipConflictError);

      expect(membershipsRepository.createMembership).not.toHaveBeenCalled();
    });

    it('throws InvitationMembershipConflictError when invitation userId mismatches', async () => {
      membershipsRepository.findEquivalentOpenMembership.mockResolvedValue(
        null,
      );
      membershipInvitationReaderPort.findAcceptedInvitationById.mockResolvedValue(
        {
          id: 'invitation_123',
          userId: 'other_user',
          tenantId: 'tenant_123',
          storeId: null,
          acceptedAt: new Date('2026-04-10T20:00:00.000Z'),
        },
      );

      await expect(
        service.createMembership('actor_123', {
          userId: 'user_123',
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_123',
          invitationId: 'invitation_123',
        }),
      ).rejects.toBeInstanceOf(InvitationMembershipConflictError);
    });

    it('creates a pending store-scoped membership when tenant and store are valid', async () => {
      membershipsRepository.findEquivalentOpenMembership.mockResolvedValue(
        null,
      );
      membershipsRepository.createMembership.mockResolvedValue({
        id: 'membership_store_123',
        userId: 'user_123',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_123',
        storeId: 'store_123',
        invitationId: null,
        status: MembershipStatus.PENDING,
        effectiveFrom: null,
        expiresAt: null,
        reason: 'store setup',
        createdAt: new Date('2026-04-10T20:00:00.000Z'),
        updatedAt: new Date('2026-04-10T20:00:00.000Z'),
        version: 1,
      });

      const result = await service.createMembership('actor_123', {
        userId: 'user_123',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_123',
        storeId: 'store_123',
        reason: '  store setup  ',
      });

      expect(membershipScopeDirectoryPort.tenantExists).toHaveBeenCalledWith(
        'tenant_123',
      );
      expect(membershipScopeDirectoryPort.storeExists).toHaveBeenCalledWith(
        'store_123',
      );
      expect(
        membershipScopeDirectoryPort.storeBelongsToTenant,
      ).toHaveBeenCalledWith({
        storeId: 'store_123',
        tenantId: 'tenant_123',
      });

      expect(
        membershipsRepository.findEquivalentOpenMembership,
      ).toHaveBeenCalledWith({
        userId: 'user_123',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_123',
        storeId: 'store_123',
      });

      expect(membershipsRepository.createMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          scopeType: MembershipScopeType.STORE,
          tenantId: 'tenant_123',
          storeId: 'store_123',
          status: MembershipStatus.PENDING,
          reason: 'store setup',
          version: 1,
        }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          id: 'membership_store_123',
          scopeType: MembershipScopeType.STORE,
          tenantId: 'tenant_123',
          storeId: 'store_123',
          status: MembershipStatus.PENDING,
        }),
      );
    });

    it('throws InvitationMembershipConflictError when invitation tenantId mismatches', async () => {
      membershipsRepository.findEquivalentOpenMembership.mockResolvedValue(
        null,
      );
      membershipInvitationReaderPort.findAcceptedInvitationById.mockResolvedValue(
        {
          id: 'invitation_123',
          userId: 'user_123',
          tenantId: 'tenant_other',
          storeId: null,
          acceptedAt: new Date('2026-04-10T20:00:00.000Z'),
        },
      );

      await expect(
        service.createMembership('actor_123', {
          userId: 'user_123',
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_123',
          invitationId: 'invitation_123',
        }),
      ).rejects.toBeInstanceOf(InvitationMembershipConflictError);

      expect(membershipsRepository.createMembership).not.toHaveBeenCalled();
    });

    it('throws InvitationMembershipConflictError when invitation storeId mismatches', async () => {
      membershipsRepository.findEquivalentOpenMembership.mockResolvedValue(
        null,
      );
      membershipInvitationReaderPort.findAcceptedInvitationById.mockResolvedValue(
        {
          id: 'invitation_123',
          userId: 'user_123',
          tenantId: 'tenant_123',
          storeId: 'store_other',
          acceptedAt: new Date('2026-04-10T20:00:00.000Z'),
        },
      );

      await expect(
        service.createMembership('actor_123', {
          userId: 'user_123',
          scopeType: MembershipScopeType.STORE,
          tenantId: 'tenant_123',
          storeId: 'store_123',
          invitationId: 'invitation_123',
        }),
      ).rejects.toBeInstanceOf(InvitationMembershipConflictError);

      expect(membershipsRepository.createMembership).not.toHaveBeenCalled();
    });
  });

  describe('activateMembership', () => {
    it('activates a pending membership', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership_123',
        userId: 'user_123',
        tenantId: 'tenant_123',
        storeId: null,
        status: MembershipStatus.PENDING,
      });
      membershipsRepository.updateMembershipStatus.mockResolvedValue(1);
      membershipsRepository.findByIdOrThrow.mockResolvedValue({
        id: 'membership_123',
        status: MembershipStatus.ACTIVE,
      });

      const result = await service.activateMembership(
        'actor_123',
        'membership_123',
        { reason: 'approved' },
      );

      expect(membershipsRepository.updateMembershipStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'membership_123',
          fromStatus: MembershipStatus.PENDING,
          toStatus: MembershipStatus.ACTIVE,
          reason: 'approved',
          timestampField: 'activatedAt',
        }),
      );
      expect(membershipsRepository.createStatusHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          membershipId: 'membership_123',
          fromStatus: MembershipStatus.PENDING,
          toStatus: MembershipStatus.ACTIVE,
        }),
      );
      expect(
        membershipsRepository.clearActiveContextsForMembership,
      ).not.toHaveBeenCalled();
      expect(membershipSupportService.recordLifecycleChange).toHaveBeenCalled();

      expect(result).toEqual({
        id: 'membership_123',
        status: MembershipStatus.ACTIVE,
      });
    });

    it('throws MembershipNotFoundError when membership does not exist', async () => {
      membershipsRepository.findById.mockResolvedValue(null);

      await expect(
        service.activateMembership('actor_123', 'membership_missing', {
          reason: 'approved',
        }),
      ).rejects.toBeInstanceOf(MembershipNotFoundError);
    });

    it('throws InvalidMembershipTransitionError when transition is invalid', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership_123',
        userId: 'user_123',
        tenantId: 'tenant_123',
        storeId: null,
        status: MembershipStatus.REVOKED,
      });

      await expect(
        service.activateMembership('actor_123', 'membership_123', {
          reason: 'approved',
        }),
      ).rejects.toBeInstanceOf(InvalidMembershipTransitionError);

      expect(
        membershipsRepository.updateMembershipStatus,
      ).not.toHaveBeenCalled();
    });

    it('throws InvalidMembershipTransitionError when compare-and-set update affects zero rows', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership_123',
        userId: 'user_123',
        tenantId: 'tenant_123',
        storeId: null,
        status: MembershipStatus.PENDING,
      });
      membershipsRepository.updateMembershipStatus.mockResolvedValue(0);

      await expect(
        service.activateMembership('actor_123', 'membership_123', {
          reason: 'approved',
        }),
      ).rejects.toBeInstanceOf(InvalidMembershipTransitionError);
    });

    it('reactivates a suspended membership', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership_123',
        userId: 'user_123',
        tenantId: 'tenant_123',
        storeId: 'store_123',
        status: MembershipStatus.SUSPENDED,
      });
      membershipsRepository.updateMembershipStatus.mockResolvedValue(1);
      membershipsRepository.findByIdOrThrow.mockResolvedValue({
        id: 'membership_123',
        status: MembershipStatus.ACTIVE,
      });

      const result = await service.activateMembership(
        'actor_123',
        'membership_123',
        {
          reason: 'reactivated',
        },
      );

      expect(membershipsRepository.updateMembershipStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'membership_123',
          fromStatus: MembershipStatus.SUSPENDED,
          toStatus: MembershipStatus.ACTIVE,
          reason: 'reactivated',
          timestampField: 'activatedAt',
        }),
      );

      expect(membershipsRepository.createStatusHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          membershipId: 'membership_123',
          fromStatus: MembershipStatus.SUSPENDED,
          toStatus: MembershipStatus.ACTIVE,
          changedBy: 'actor_123',
        }),
      );

      expect(result).toEqual({
        id: 'membership_123',
        status: MembershipStatus.ACTIVE,
      });
    });
  });

  describe('suspendMembership', () => {
    it('suspends an active membership and clears active contexts', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership_123',
        userId: 'user_123',
        tenantId: 'tenant_123',
        storeId: 'store_123',
        status: MembershipStatus.ACTIVE,
      });
      membershipsRepository.updateMembershipStatus.mockResolvedValue(1);
      membershipsRepository.findByIdOrThrow.mockResolvedValue({
        id: 'membership_123',
        status: MembershipStatus.SUSPENDED,
      });

      await service.suspendMembership('actor_123', 'membership_123', {
        reason: 'temporary suspension',
      });

      expect(
        membershipsRepository.clearActiveContextsForMembership,
      ).toHaveBeenCalledWith('membership_123');
      expect(
        membershipSupportService.recordLifecycleChange,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          toStatus: MembershipStatus.SUSPENDED,
          membershipId: 'membership_123',
        }),
      );
    });

    it('throws InvalidMembershipTransitionError when suspend compare-and-set update affects zero rows', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership_123',
        userId: 'user_123',
        tenantId: 'tenant_123',
        storeId: 'store_123',
        status: MembershipStatus.ACTIVE,
      });
      membershipsRepository.updateMembershipStatus.mockResolvedValue(0);

      await expect(
        service.suspendMembership('actor_123', 'membership_123', {
          reason: 'temporary suspension',
        }),
      ).rejects.toBeInstanceOf(InvalidMembershipTransitionError);

      expect(
        membershipsRepository.clearActiveContextsForMembership,
      ).not.toHaveBeenCalled();
    });
  });

  describe('revokeMembership', () => {
    it('revokes a pending membership and clears active contexts', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership_123',
        userId: 'user_123',
        tenantId: 'tenant_123',
        storeId: null,
        status: MembershipStatus.PENDING,
      });
      membershipsRepository.updateMembershipStatus.mockResolvedValue(1);
      membershipsRepository.findByIdOrThrow.mockResolvedValue({
        id: 'membership_123',
        status: MembershipStatus.REVOKED,
      });

      await service.revokeMembership('actor_123', 'membership_123', {
        reason: 'cancelled',
      });

      expect(membershipsRepository.updateMembershipStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          toStatus: MembershipStatus.REVOKED,
          timestampField: 'revokedAt',
        }),
      );
      expect(
        membershipsRepository.clearActiveContextsForMembership,
      ).toHaveBeenCalledWith('membership_123');
    });
  });

  describe('expireMembership', () => {
    it('expires an active membership using dto.expiredAt when provided', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership_123',
        userId: 'user_123',
        tenantId: 'tenant_123',
        storeId: null,
        status: MembershipStatus.ACTIVE,
      });
      membershipsRepository.updateMembershipStatus.mockResolvedValue(1);
      membershipsRepository.findByIdOrThrow.mockResolvedValue({
        id: 'membership_123',
        status: MembershipStatus.EXPIRED,
      });

      await service.expireMembership('actor_123', 'membership_123', {
        expiredAt: '2026-04-12T10:00:00.000Z',
        reason: 'validity ended',
      });

      expect(membershipsRepository.updateMembershipStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          toStatus: MembershipStatus.EXPIRED,
          timestampField: 'expiredAt',
          at: new Date('2026-04-12T10:00:00.000Z'),
        }),
      );
      expect(
        membershipsRepository.clearActiveContextsForMembership,
      ).toHaveBeenCalledWith('membership_123');
    });
  });
});
