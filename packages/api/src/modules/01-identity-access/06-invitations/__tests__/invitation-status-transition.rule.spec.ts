import { InvitationStatus } from '@prisma/client';
import { canTransitionInvitationStatus } from '../domain/rules/invitation-status-transition.rule';

describe('invitation status transition rule', () => {
  it('allows PROPOSED -> CANCELED', () => {
    expect(
      canTransitionInvitationStatus(
        InvitationStatus.PROPOSED,
        InvitationStatus.CANCELED,
      ),
    ).toBe(true);
  });

  it('allows SENT -> DECLINED', () => {
    expect(
      canTransitionInvitationStatus(
        InvitationStatus.SENT,
        InvitationStatus.DECLINED,
      ),
    ).toBe(true);
  });

  it('rejects SENT -> CANCELED', () => {
    expect(
      canTransitionInvitationStatus(
        InvitationStatus.SENT,
        InvitationStatus.CANCELED,
      ),
    ).toBe(false);
  });

  it('rejects PROPOSED -> DECLINED', () => {
    expect(
      canTransitionInvitationStatus(
        InvitationStatus.PROPOSED,
        InvitationStatus.DECLINED,
      ),
    ).toBe(false);
  });

  it('rejects DECLINED -> ACCEPTED', () => {
    expect(
      canTransitionInvitationStatus(
        InvitationStatus.DECLINED,
        InvitationStatus.ACCEPTED,
      ),
    ).toBe(false);
  });
});