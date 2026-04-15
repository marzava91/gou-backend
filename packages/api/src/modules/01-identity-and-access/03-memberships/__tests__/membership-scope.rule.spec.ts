// packages/api/src/modules/01-identity-and-access/03-memberships/__tests__/membership-scope.rule.spec.ts

import { MembershipScopeType } from '@prisma/client';

import { validateMembershipScope } from '../domain/rules/membership-scope.rule';

describe('validateMembershipScope', () => {
  it('returns true for a valid tenant-scoped membership', () => {
    expect(
      validateMembershipScope({
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_123',
        storeId: null,
      }),
    ).toBe(true);
  });

  it('returns false for tenant-scoped membership when storeId is present', () => {
    expect(
      validateMembershipScope({
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_123',
        storeId: 'store_123',
      }),
    ).toBe(false);
  });

  it('returns true for a valid store-scoped membership', () => {
    expect(
      validateMembershipScope({
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_123',
        storeId: 'store_123',
      }),
    ).toBe(true);
  });

  it('returns false for store-scoped membership without storeId', () => {
    expect(
      validateMembershipScope({
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_123',
        storeId: null,
      }),
    ).toBe(false);
  });

  it('returns false when tenantId is empty', () => {
    expect(
      validateMembershipScope({
        scopeType: MembershipScopeType.TENANT,
        tenantId: '',
        storeId: null,
      }),
    ).toBe(false);
  });

  it('returns false when tenantId is blank', () => {
    expect(
      validateMembershipScope({
        scopeType: MembershipScopeType.STORE,
        tenantId: '   ',
        storeId: 'store_123',
      }),
    ).toBe(false);
  });

  it('returns true for store-scoped membership when storeId has trimmed content', () => {
    expect(
      validateMembershipScope({
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_123',
        storeId: '   store_123   ',
      }),
    ).toBe(true);
  });
});