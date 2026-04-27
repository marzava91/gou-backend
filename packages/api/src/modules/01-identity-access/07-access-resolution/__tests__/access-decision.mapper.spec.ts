// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/access-decision.mapper.spec.ts

import { MembershipScopeType, OperationalSurface } from '@prisma/client';
import { AccessDecisionMapper } from '../mappers/access-decision.mapper';

describe('AccessDecisionMapper', () => {
  let mapper: AccessDecisionMapper;

  beforeEach(() => {
    mapper = new AccessDecisionMapper();
  });

  it('maps access decision to response dto', () => {
    const evaluatedAt = new Date('2026-04-18T10:00:00.000Z');

    const result = mapper.toResponse({
      allowed: true,
      reasonCode: 'access_allowed',
      surface: OperationalSurface.PARTNERS_WEB,
      capabilityKey: 'orders.read',
      resourceKey: 'orders',
      actionKey: 'read',
      membership: {
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: 'ACTIVE' as any,
      },
      evaluatedAt,
      explanation: {
        baselineMatchedCapability: true,
        matchedAllowGrantIds: ['grant_allow_1'],
        matchedDenyGrantIds: [],
      },
    });

    expect(result).toEqual({
      allowed: true,
      reasonCode: 'access_allowed',
      surface: OperationalSurface.PARTNERS_WEB,
      capabilityKey: 'orders.read',
      resourceKey: 'orders',
      actionKey: 'read',
      membership: {
        membershipId: 'membership_1',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
      },
      explanation: {
        baselineMatchedCapability: true,
        matchedAllowGrantIds: ['grant_allow_1'],
        matchedDenyGrantIds: [],
      },
      evaluatedAt,
    });
  });

  it('maps membership as null when decision has no resolved membership', () => {
    const result = mapper.toResponse({
      allowed: false,
      reasonCode: 'access_denied',
      surface: OperationalSurface.PARTNERS_WEB,
      capabilityKey: 'orders.write',
      resourceKey: 'orders',
      actionKey: 'write',
      membership: null,
      evaluatedAt: new Date('2026-04-18T10:00:00.000Z'),
      explanation: {
        baselineMatchedCapability: false,
        matchedAllowGrantIds: [],
        matchedDenyGrantIds: [],
      },
    });

    expect(result.membership).toBeNull();
  });
});