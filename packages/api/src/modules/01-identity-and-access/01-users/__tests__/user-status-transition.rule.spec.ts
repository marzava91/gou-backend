// packages/api/src/modules/01-identity-and-access/01-users/__tests__/user-status-transition.rule.spec.ts

/**
 * VALIDA MATRIZ DE LIFECYCLE DE UserStatus
 * Este spec valida la matriz de transición de estados de UserStatus, que es una regla de negocio pura.
 * 
 * ------------------------
 * What this spec validates
 * ------------------------
 * This spec validates the pure lifecycle transition matrix for UserStatus.
 *
 * We are NOT testing:
 * - authorization
 * - service-layer "already in same state" guards
 * - persistence
 * - controller behavior
 *
 * Why this matters
 * ----------------
 * This is the lowest-level contract for lifecycle integrity.
 * If this matrix is wrong, higher layers may allow illegal state mutations.
 *
 * Good indicators
 * ---------------
 * - all explicitly allowed transitions return true
 * - all explicitly disallowed transitions return false
 * - same-state transitions return false
 * - every enum value is covered by the transition map
 *
 * Bad indicators
 * --------------
 * - a forbidden transition starts returning true
 * - a newly added enum status is not represented in the map
 * - same-state transitions are accidentally accepted
 */

import { UserStatus } from '@prisma/client';
import { canTransitionUserStatus } from '../domain/rules/user-status-transition.rule';

describe('canTransitionUserStatus', () => {
  describe('allowed transitions', () => {
    it('allows ACTIVE -> SUSPENDED', () => {
      expect(
        canTransitionUserStatus(UserStatus.ACTIVE, UserStatus.SUSPENDED),
      ).toBe(true);
    });

    it('allows SUSPENDED -> ACTIVE', () => {
      expect(
        canTransitionUserStatus(UserStatus.SUSPENDED, UserStatus.ACTIVE),
      ).toBe(true);
    });

    it('allows ACTIVE -> DEACTIVATED', () => {
      expect(
        canTransitionUserStatus(UserStatus.ACTIVE, UserStatus.DEACTIVATED),
      ).toBe(true);
    });

    it('allows SUSPENDED -> DEACTIVATED', () => {
      expect(
        canTransitionUserStatus(UserStatus.SUSPENDED, UserStatus.DEACTIVATED),
      ).toBe(true);
    });

    it('allows DEACTIVATED -> ANONYMIZED', () => {
      expect(
        canTransitionUserStatus(UserStatus.DEACTIVATED, UserStatus.ANONYMIZED),
      ).toBe(true);
    });
  });

  describe('forbidden transitions', () => {
    it('rejects ACTIVE -> ACTIVE', () => {
      expect(
        canTransitionUserStatus(UserStatus.ACTIVE, UserStatus.ACTIVE),
      ).toBe(false);
    });

    it('rejects ANONYMIZED -> ANONYMIZED', () => {
      expect(
        canTransitionUserStatus(UserStatus.ANONYMIZED, UserStatus.ANONYMIZED),
      ).toBe(false);
    });

    it('rejects DEACTIVATED -> ACTIVE', () => {
      expect(
        canTransitionUserStatus(UserStatus.DEACTIVATED, UserStatus.ACTIVE),
      ).toBe(false);
    });

    it('rejects ANONYMIZED -> ACTIVE', () => {
      expect(
        canTransitionUserStatus(UserStatus.ANONYMIZED, UserStatus.ACTIVE),
      ).toBe(false);
    });

    it('rejects ANONYMIZED -> SUSPENDED', () => {
      expect(
        canTransitionUserStatus(UserStatus.ANONYMIZED, UserStatus.SUSPENDED),
      ).toBe(false);
    });

    it('rejects ANONYMIZED -> DEACTIVATED', () => {
      expect(
        canTransitionUserStatus(UserStatus.ANONYMIZED, UserStatus.DEACTIVATED),
      ).toBe(false);
    });
  });

  describe('transition map completeness', () => {
    it('covers all enum values without returning undefined behavior', () => {
      const allStatuses = Object.values(UserStatus);

      for (const from of allStatuses) {
        for (const to of allStatuses) {
          expect(typeof canTransitionUserStatus(from, to)).toBe('boolean');
        }
      }
    });
  });
});