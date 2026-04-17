import { BadRequestException } from '@nestjs/common';
import { InvitationRecipientType } from '@prisma/client';

export function normalizeInvitationRecipient(
  recipientType: InvitationRecipientType,
  value: string,
): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new BadRequestException('invitation_recipient_required');
  }

  if (recipientType === InvitationRecipientType.EMAIL) {
    return trimmed.toLowerCase();
  }

  return trimmed.replace(/\s+/g, '');
}

export function recipientMatches(
  recipientType: InvitationRecipientType,
  expected: string,
  provided: string,
): boolean {
  return (
    normalizeInvitationRecipient(recipientType, expected) ===
    normalizeInvitationRecipient(recipientType, provided)
  );
}
