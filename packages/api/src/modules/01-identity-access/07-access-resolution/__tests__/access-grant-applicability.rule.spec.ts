import { GrantEffect, GrantStatus, GrantTargetType } from '@prisma/client';
import {
  grantMatchesRequestedTarget,
  isGrantCurrentlyApplicable,
} from '../domain/rules/access-grant-applicability.rule';

describe('access grant applicability rules', () => {
  const now = new Date('2026-04-17T10:00:00.000Z');

  it('accepts active grant inside validity window', () => {
    expect(
      isGrantCurrentlyApplicable(
        {
          id: 'grant_1',
          membershipId: 'membership_1',
          effect: GrantEffect.ALLOW,
          targetType: GrantTargetType.CAPABILITY,
          capabilityKey: 'orders.read',
          resourceKey: null,
          actionKey: null,
          status: GrantStatus.ACTIVE,
          validFrom: null,
          validUntil: null,
        },
        now,
      ),
    ).toBe(true);
  });

  it('rejects revoked grant', () => {
    expect(
      isGrantCurrentlyApplicable(
        {
          id: 'grant_1',
          membershipId: 'membership_1',
          effect: GrantEffect.ALLOW,
          targetType: GrantTargetType.CAPABILITY,
          capabilityKey: 'orders.read',
          resourceKey: null,
          actionKey: null,
          status: GrantStatus.REVOKED,
          validFrom: null,
          validUntil: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it('matches capability grant to requested capability', () => {
    expect(
      grantMatchesRequestedTarget(
        {
          id: 'grant_1',
          membershipId: 'membership_1',
          effect: GrantEffect.ALLOW,
          targetType: GrantTargetType.CAPABILITY,
          capabilityKey: 'orders.read',
          resourceKey: null,
          actionKey: null,
          status: GrantStatus.ACTIVE,
          validFrom: null,
          validUntil: null,
        },
        {
          capabilityKey: 'orders.read',
          resourceKey: null,
          actionKey: null,
        },
      ),
    ).toBe(true);
  });

  it('rejects grant when validFrom is in the future', () => {
    expect(
        isGrantCurrentlyApplicable(
        {
            id: 'grant_2',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: new Date('2026-04-18T10:00:01.000Z'),
            validUntil: null,
        },
        now,
        ),
    ).toBe(false);
  });

  it('rejects grant when validUntil is already past', () => {
    expect(
        isGrantCurrentlyApplicable(
        {
            id: 'grant_3',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: new Date('2026-04-17T09:59:59.000Z'),
        },
        now,
        ),
    ).toBe(false);
  });

  it('matches resource_action grant to requested resource and action', () => {
    expect(
        grantMatchesRequestedTarget(
        {
            id: 'grant_ra_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.RESOURCE_ACTION,
            capabilityKey: null,
            resourceKey: 'orders',
            actionKey: 'write',
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
        },
        {
            capabilityKey: null,
            resourceKey: 'orders',
            actionKey: 'write',
        },
        ),
    ).toBe(true);
  });

  it('rejects resource_action grant when resource or action does not match', () => {
    expect(
        grantMatchesRequestedTarget(
        {
            id: 'grant_ra_2',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.RESOURCE_ACTION,
            capabilityKey: null,
            resourceKey: 'orders',
            actionKey: 'write',
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
        },
        {
            capabilityKey: null,
            resourceKey: 'orders',
            actionKey: 'delete',
        },
        ),
    ).toBe(false);
  });
});