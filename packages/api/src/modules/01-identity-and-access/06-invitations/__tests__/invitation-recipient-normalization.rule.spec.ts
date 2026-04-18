import { BadRequestException } from '@nestjs/common';
import { InvitationRecipientType } from '@prisma/client';

import {
  normalizeInvitationRecipient,
  recipientMatches,
} from '../domain/rules/invitation-recipient-normalization.rule';

describe('invitation recipient normalization rule', () => {
  describe('normalizeInvitationRecipient', () => {
    it('should trim and lowercase email recipients', () => {
      const result = normalizeInvitationRecipient(
        InvitationRecipientType.EMAIL,
        '  User@Example.COM  ',
      );

      expect(result).toBe('user@example.com');
    });

    it('should trim and remove internal whitespace for phone recipients', () => {
      const result = normalizeInvitationRecipient(
        InvitationRecipientType.PHONE,
        '  +51 999 888 777  ',
      );

      expect(result).toBe('+51999888777');
    });

    it('should throw BadRequestException when recipient is empty after trim', () => {
      expect(() =>
        normalizeInvitationRecipient(InvitationRecipientType.EMAIL, '   '),
      ).toThrow(BadRequestException);

      expect(() =>
        normalizeInvitationRecipient(InvitationRecipientType.EMAIL, '   '),
      ).toThrow('invitation_recipient_required');
    });
  });

  describe('recipientMatches', () => {
    it('should match equivalent emails after normalization', () => {
      const result = recipientMatches(
        InvitationRecipientType.EMAIL,
        'USER@example.com',
        ' user@EXAMPLE.com ',
      );

      expect(result).toBe(true);
    });

    it('should match equivalent phones after normalization', () => {
      const result = recipientMatches(
        InvitationRecipientType.PHONE,
        '+51 999 888 777',
        ' +51999888777 ',
      );

      expect(result).toBe(true);
    });

    it('should return false when normalized values differ', () => {
      const result = recipientMatches(
        InvitationRecipientType.EMAIL,
        'a@example.com',
        'b@example.com',
      );

      expect(result).toBe(false);
    });
  });
});