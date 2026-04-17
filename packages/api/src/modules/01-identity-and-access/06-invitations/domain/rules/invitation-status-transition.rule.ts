import { InvitationStatus } from '@prisma/client';

const ALLOWED_TRANSITIONS: Readonly<
  Record<InvitationStatus, readonly InvitationStatus[]>
> = {
  [InvitationStatus.PROPOSED]: [
    InvitationStatus.SENT,
    InvitationStatus.CANCELED,
  ],
  [InvitationStatus.SENT]: [
    InvitationStatus.ACCEPTED,
    InvitationStatus.EXPIRED,
    InvitationStatus.REVOKED,
    InvitationStatus.CANCELED,
  ],
  [InvitationStatus.ACCEPTED]: [],
  [InvitationStatus.EXPIRED]: [],
  [InvitationStatus.REVOKED]: [],
  [InvitationStatus.CANCELED]: [],
};

export function canTransitionInvitationStatus(
  from: InvitationStatus,
  to: InvitationStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
