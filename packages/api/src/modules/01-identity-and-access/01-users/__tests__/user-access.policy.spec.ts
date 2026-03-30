// packages/api/src/modules/01-identity-and-access/01-users/__tests__/user-access.policy.spec.ts

/**
 * VALIDA DECISIONES BASE DE AUTORIZACIÓN DE UserAccessPolicy
 * Este spec valida las decisiones de autorización base que toma UserAccessPolicy, que es la fuente de verdad para las reglas de acceso a usuarios.
 * 
 * ------------------------
 * What this spec validates
 * ------------------------
 * This spec validates the authorization policy decisions owned by UserAccessPolicy.
 *
 * We are NOT testing:
 * - Nest guards
 * - decorators
 * - HTTP responses
 * - authentication provider behavior
 *
 * Why this matters
 * ----------------
 * Guards should remain thin. The real authorization decision should live here.
 * If this policy is wrong, guards may consistently enforce the wrong rule.
 *
 * Good indicators
 * ---------------
 * - platform admins can perform platform-level user actions
 * - regular users can operate only on their own identity where allowed
 * - self-service boundaries are enforced clearly
 *
 * Bad indicators
 * --------------
 * - regular users gain lifecycle permissions
 * - self-only actions can be executed on other users
 * - platform admins are unexpectedly blocked from global actions
 */

import { UserAccessPolicy } from '../policies/user-access.policy';
import type { AuthenticatedActor } from '../domain/types/user.types';

describe('UserAccessPolicy', () => {
  let policy: UserAccessPolicy;

  beforeEach(() => {
    policy = new UserAccessPolicy();
  });

  const regularActor: AuthenticatedActor = {
    userId: 'user_1',
    isPlatformAdmin: false,
  };

  const platformAdmin: AuthenticatedActor = {
    userId: 'admin_1',
    isPlatformAdmin: true,
  };

  describe('canReadUser', () => {
    it('allows a platform admin to read any user', () => {
      expect(policy.canReadUser(platformAdmin, 'user_999')).toBe(true);
    });

    it('allows a user to read their own profile', () => {
      expect(policy.canReadUser(regularActor, 'user_1')).toBe(true);
    });

    it('rejects a regular user reading another user', () => {
      expect(policy.canReadUser(regularActor, 'user_2')).toBe(false);
    });
  });

  describe('canUpdateOwnProfile', () => {
    it('allows a user to update their own profile', () => {
      expect(policy.canUpdateOwnProfile(regularActor, 'user_1')).toBe(true);
    });

    it('rejects a user updating another user profile', () => {
      expect(policy.canUpdateOwnProfile(regularActor, 'user_2')).toBe(false);
    });
  });

  describe('canManageUserLifecycle', () => {
    it('allows platform admin lifecycle management', () => {
      expect(policy.canManageUserLifecycle(platformAdmin)).toBe(true);
    });

    it('rejects lifecycle management for regular users', () => {
      expect(policy.canManageUserLifecycle(regularActor)).toBe(false);
    });
  });

  describe('canRequestOwnContactChange', () => {
    it('allows a user to request their own contact change', () => {
      expect(
        policy.canRequestOwnContactChange(regularActor, 'user_1'),
      ).toBe(true);
    });

    it('rejects a user requesting contact change for another user', () => {
      expect(
        policy.canRequestOwnContactChange(regularActor, 'user_2'),
      ).toBe(false);
    });
  });
});