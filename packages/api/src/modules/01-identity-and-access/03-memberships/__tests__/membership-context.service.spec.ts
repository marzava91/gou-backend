// packages/api/src/modules/01-identity-and-access/03-memberships/__tests__/membership-context.service.spec.ts

import {
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
} from '@prisma/client';

import { MembershipContextService } from '../application/membership-context.service';
import {
  MembershipContextDeniedError,
  MembershipNotActiveError,
} from '../domain/errors/membership.errors';
import { MEMBERSHIP_AUDIT_ACTIONS } from '../domain/constants/membership.constants';
import { MembershipDomainEvents } from '../domain/events/membership.events';

describe('MembershipContextService', () => {
  let service: MembershipContextService;

  const membershipsRepository = {
    findMembershipOwnedByUser: jest.fn(),
    upsertActiveContext: jest.fn(),
    findActiveContext: jest.fn(),
    clearActiveContext: jest.fn(),
  };

  const membershipSupportService = {
    now: jest.fn(),
    recordAudit: jest.fn(),
    publishEvent: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    membershipSupportService.now.mockReturnValue(
      new Date('2026-04-10T21:00:00.000Z'),
    );

    service = new MembershipContextService(
      membershipsRepository as any,
      membershipSupportService as any,
    );
  });

  describe('setActiveMembershipContext', () => {
    it('sets active membership context when membership belongs to user and is ACTIVE', async () => {
      membershipsRepository.findMembershipOwnedByUser.mockResolvedValue({
        id: 'membership_123',
        userId: 'user_123',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_123',
        storeId: 'store_123',
        status: MembershipStatus.ACTIVE,
      });

      membershipsRepository.upsertActiveContext.mockResolvedValue({
        id: 'context_123',
        userId: 'user_123',
        membershipId: 'membership_123',
        surface: OperationalSurface.PARTNERS_WEB,
        updatedAt: new Date('2026-04-10T21:00:00.000Z'),
      });

      const result = await service.setActiveMembershipContext('user_123', {
        membershipId: 'membership_123',
        surface: OperationalSurface.PARTNERS_WEB,
      });

      expect(membershipsRepository.findMembershipOwnedByUser).toHaveBeenCalledWith(
        {
          membershipId: 'membership_123',
          userId: 'user_123',
        },
      );

      expect(membershipsRepository.upsertActiveContext).toHaveBeenCalledWith({
        userId: 'user_123',
        surface: OperationalSurface.PARTNERS_WEB,
        membershipId: 'membership_123',
      });

      expect(membershipSupportService.recordAudit).toHaveBeenCalledWith({
        action: MEMBERSHIP_AUDIT_ACTIONS.ACTIVE_CONTEXT_SET,
        actorId: 'user_123',
        membershipId: 'membership_123',
        payload: {
          userId: 'user_123',
          surface: OperationalSurface.PARTNERS_WEB,
          tenantId: 'tenant_123',
          storeId: 'store_123',
        },
        at: new Date('2026-04-10T21:00:00.000Z'),
      });

      expect(membershipSupportService.publishEvent).toHaveBeenCalledWith({
        event: MembershipDomainEvents.ACTIVE_MEMBERSHIP_CONTEXT_CHANGED,
        payload: {
          userId: 'user_123',
          membershipId: 'membership_123',
          surface: OperationalSurface.PARTNERS_WEB,
          tenantId: 'tenant_123',
          storeId: 'store_123',
        },
        at: new Date('2026-04-10T21:00:00.000Z'),
      });

      expect(result).toEqual({
        membershipId: 'membership_123',
        userId: 'user_123',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_123',
        storeId: 'store_123',
        status: MembershipStatus.ACTIVE,
        updatedAt: new Date('2026-04-10T21:00:00.000Z'),
      });
    });

    it('throws MembershipContextDeniedError when membership does not belong to user', async () => {
      membershipsRepository.findMembershipOwnedByUser.mockResolvedValue(null);

      await expect(
        service.setActiveMembershipContext('user_123', {
          membershipId: 'membership_123',
          surface: OperationalSurface.PARTNERS_WEB,
        }),
      ).rejects.toBeInstanceOf(MembershipContextDeniedError);

      expect(membershipsRepository.upsertActiveContext).not.toHaveBeenCalled();
      expect(membershipSupportService.recordAudit).not.toHaveBeenCalled();
      expect(membershipSupportService.publishEvent).not.toHaveBeenCalled();
    });

    it.each([
      MembershipStatus.PENDING,
      MembershipStatus.SUSPENDED,
      MembershipStatus.REVOKED,
      MembershipStatus.EXPIRED,
    ])(
      'throws MembershipNotActiveError when membership status is %s',
      async (status) => {
        membershipsRepository.findMembershipOwnedByUser.mockResolvedValue({
          id: 'membership_123',
          userId: 'user_123',
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_123',
          storeId: null,
          status,
        });

        await expect(
          service.setActiveMembershipContext('user_123', {
            membershipId: 'membership_123',
            surface: OperationalSurface.PARTNERS_WEB,
          }),
        ).rejects.toBeInstanceOf(MembershipNotActiveError);

        expect(membershipsRepository.upsertActiveContext).not.toHaveBeenCalled();
        expect(membershipSupportService.recordAudit).not.toHaveBeenCalled();
        expect(membershipSupportService.publishEvent).not.toHaveBeenCalled();
      },
    );
  });

  describe('getActiveMembershipContext', () => {
    it('returns null when there is no active context', async () => {
      membershipsRepository.findActiveContext.mockResolvedValue(null);

      const result = await service.getActiveMembershipContext(
        'user_123',
        OperationalSurface.PARTNERS_WEB,
      );

      expect(membershipsRepository.findActiveContext).toHaveBeenCalledWith({
        userId: 'user_123',
        surface: OperationalSurface.PARTNERS_WEB,
      });
      expect(result).toBeNull();
    });

    it('returns resolved active context when linked membership is ACTIVE', async () => {
      membershipsRepository.findActiveContext.mockResolvedValue({
        id: 'context_123',
        userId: 'user_123',
        membershipId: 'membership_123',
        surface: OperationalSurface.PARTNERS_WEB,
        updatedAt: new Date('2026-04-10T21:05:00.000Z'),
        membership: {
          id: 'membership_123',
          userId: 'user_123',
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_123',
          storeId: null,
          status: MembershipStatus.ACTIVE,
        },
      });

      const result = await service.getActiveMembershipContext(
        'user_123',
        OperationalSurface.PARTNERS_WEB,
      );

      expect(result).toEqual({
        membershipId: 'membership_123',
        userId: 'user_123',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_123',
        storeId: null,
        status: MembershipStatus.ACTIVE,
        updatedAt: new Date('2026-04-10T21:05:00.000Z'),
      });

      expect(membershipsRepository.clearActiveContext).not.toHaveBeenCalled();
      expect(membershipSupportService.recordAudit).not.toHaveBeenCalled();
      expect(membershipSupportService.publishEvent).not.toHaveBeenCalled();
    });

    it('clears stale context and returns null when linked membership is no longer ACTIVE', async () => {
      membershipsRepository.findActiveContext.mockResolvedValue({
        id: 'context_123',
        userId: 'user_123',
        membershipId: 'membership_123',
        surface: OperationalSurface.PARTNERS_WEB,
        updatedAt: new Date('2026-04-10T21:05:00.000Z'),
        membership: {
          id: 'membership_123',
          userId: 'user_123',
          scopeType: MembershipScopeType.STORE,
          tenantId: 'tenant_123',
          storeId: 'store_123',
          status: MembershipStatus.SUSPENDED,
        },
      });

      const result = await service.getActiveMembershipContext(
        'user_123',
        OperationalSurface.PARTNERS_WEB,
      );

      expect(membershipsRepository.clearActiveContext).toHaveBeenCalledWith({
        userId: 'user_123',
        surface: OperationalSurface.PARTNERS_WEB,
      });

      expect(membershipSupportService.recordAudit).toHaveBeenCalledWith({
        action: MEMBERSHIP_AUDIT_ACTIONS.ACTIVE_CONTEXT_CLEARED,
        actorId: 'user_123',
        membershipId: 'membership_123',
        payload: {
          userId: 'user_123',
          surface: OperationalSurface.PARTNERS_WEB,
          reason: 'membership_no_longer_active',
        },
        at: new Date('2026-04-10T21:00:00.000Z'),
      });

      expect(membershipSupportService.publishEvent).toHaveBeenCalledWith({
        event: MembershipDomainEvents.ACTIVE_MEMBERSHIP_CONTEXT_CLEARED,
        payload: {
          userId: 'user_123',
          membershipId: 'membership_123',
          surface: OperationalSurface.PARTNERS_WEB,
          reason: 'membership_no_longer_active',
        },
        at: new Date('2026-04-10T21:00:00.000Z'),
      });

      expect(result).toBeNull();
    });

    it('clears stale context and returns null when membership relation is missing', async () => {
      membershipsRepository.findActiveContext.mockResolvedValue({
        id: 'context_123',
        userId: 'user_123',
        membershipId: 'membership_123',
        surface: OperationalSurface.PARTNERS_WEB,
        updatedAt: new Date('2026-04-10T21:05:00.000Z'),
        membership: null,
      });

      const result = await service.getActiveMembershipContext(
        'user_123',
        OperationalSurface.PARTNERS_WEB,
      );

      expect(membershipsRepository.clearActiveContext).toHaveBeenCalledWith({
        userId: 'user_123',
        surface: OperationalSurface.PARTNERS_WEB,
      });

      expect(membershipSupportService.recordAudit).toHaveBeenCalled();
      expect(membershipSupportService.publishEvent).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});