import { GrantStatus } from '@prisma/client';
import { canTransitionGrantStatus } from '../domain/rules/grant-status-transition.rule';

describe('canTransitionGrantStatus', () => {
  it('allows PROPOSED -> ACTIVE', () => {
    expect(
      canTransitionGrantStatus(GrantStatus.PROPOSED, GrantStatus.ACTIVE),
    ).toBe(true);
  });

  it('allows PROPOSED -> REVOKED', () => {
    expect(
      canTransitionGrantStatus(GrantStatus.PROPOSED, GrantStatus.REVOKED),
    ).toBe(true);
  });

  it('allows ACTIVE -> EXPIRED', () => {
    expect(
      canTransitionGrantStatus(GrantStatus.ACTIVE, GrantStatus.EXPIRED),
    ).toBe(true);
  });

  it('allows ACTIVE -> REVOKED', () => {
    expect(
      canTransitionGrantStatus(GrantStatus.ACTIVE, GrantStatus.REVOKED),
    ).toBe(true);
  });

  it('rejects ACTIVE -> ACTIVE', () => {
    expect(
      canTransitionGrantStatus(GrantStatus.ACTIVE, GrantStatus.ACTIVE),
    ).toBe(false);
  });

  it('rejects REVOKED -> ACTIVE', () => {
    expect(
      canTransitionGrantStatus(GrantStatus.REVOKED, GrantStatus.ACTIVE),
    ).toBe(false);
  });

  it('rejects EXPIRED -> REVOKED', () => {
    expect(
      canTransitionGrantStatus(GrantStatus.EXPIRED, GrantStatus.REVOKED),
    ).toBe(false);
  });

  it('rejects REVOKED -> EXPIRED', () => {
    expect(
      canTransitionGrantStatus(GrantStatus.REVOKED, GrantStatus.EXPIRED),
    ).toBe(false);
  });
});
