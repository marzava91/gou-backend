// packages/api/src/modules/01-identity-and-access/03-memberships/__tests__/membership-status-transition.rule.spec.ts

import { MembershipStatus } from '@prisma/client';

import { canTransitionMembershipStatus } from '../domain/rules/membership-status-transition.rule';

describe('canTransitionMembershipStatus', () => {
  describe('valid transitions', () => {
    it.each([
      [MembershipStatus.PENDING, MembershipStatus.ACTIVE],
      [MembershipStatus.PENDING, MembershipStatus.REVOKED],
      [MembershipStatus.PENDING, MembershipStatus.EXPIRED],
      [MembershipStatus.ACTIVE, MembershipStatus.SUSPENDED],
      [MembershipStatus.ACTIVE, MembershipStatus.REVOKED],
      [MembershipStatus.ACTIVE, MembershipStatus.EXPIRED],
      [MembershipStatus.SUSPENDED, MembershipStatus.ACTIVE],
      [MembershipStatus.SUSPENDED, MembershipStatus.REVOKED],
    ])('returns true for %s -> %s', (from, to) => {
      expect(canTransitionMembershipStatus(from, to)).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    it.each([
      [MembershipStatus.PENDING, MembershipStatus.SUSPENDED],
      [MembershipStatus.ACTIVE, MembershipStatus.PENDING],
      [MembershipStatus.SUSPENDED, MembershipStatus.EXPIRED],
      [MembershipStatus.REVOKED, MembershipStatus.ACTIVE],
      [MembershipStatus.REVOKED, MembershipStatus.SUSPENDED],
      [MembershipStatus.EXPIRED, MembershipStatus.ACTIVE],
      [MembershipStatus.EXPIRED, MembershipStatus.SUSPENDED],
      [MembershipStatus.EXPIRED, MembershipStatus.REVOKED],
    ])('returns false for %s -> %s', (from, to) => {
      expect(canTransitionMembershipStatus(from, to)).toBe(false);
    });
  });

  describe('terminal states', () => {
    it('does not allow any outbound transition from REVOKED', () => {
      const targets = [
        MembershipStatus.PENDING,
        MembershipStatus.ACTIVE,
        MembershipStatus.SUSPENDED,
        MembershipStatus.REVOKED,
        MembershipStatus.EXPIRED,
      ];

      for (const target of targets) {
        expect(
          canTransitionMembershipStatus(MembershipStatus.REVOKED, target),
        ).toBe(false);
      }
    });

    it('does not allow any outbound transition from EXPIRED', () => {
      const targets = [
        MembershipStatus.PENDING,
        MembershipStatus.ACTIVE,
        MembershipStatus.SUSPENDED,
        MembershipStatus.REVOKED,
        MembershipStatus.EXPIRED,
      ];

      for (const target of targets) {
        expect(
          canTransitionMembershipStatus(MembershipStatus.EXPIRED, target),
        ).toBe(false);
      }
    });
  });
});