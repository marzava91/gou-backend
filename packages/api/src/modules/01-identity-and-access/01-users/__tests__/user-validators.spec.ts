// packages/api/src/modules/01-identity-and-access/01-users/__tests__/user-validators.spec.ts

/**
 * VALIDA HELPERS Y VALIDATORS PUROS
 * Este spec valida los pequeños validadores puros y helpers de normalización usados por el submódulo de Users.
 * 
 * ------------------------
 * What this spec validates
 * ------------------------
 * This spec validates the small pure validators and normalization helpers
 * used by the Users submodule.
 *
 * We are testing:
 * - AtLeastOneOf decorator behavior
 * - IsCuid decorator behavior
 * - email normalization + operational constraints
 * - phone normalization + E.164 validation
 * - canonical contact presence assertion
 *
 * We are NOT testing:
 * - controller DTO wiring
 * - service business flows
 * - repository or database behavior
 *
 * Why this matters
 * ----------------
 * These validators sit at the edge of the module contract.
 * If they fail, invalid input may enter the service layer or valid input may be rejected incorrectly.
 *
 * Good indicators
 * ---------------
 * - normalization is deterministic
 * - empty/invalid contact inputs are rejected
 * - valid canonical inputs pass cleanly
 * - decorators behave predictably on valid and invalid payloads
 *
 * Bad indicators
 * --------------
 * - blank strings bypass required-contact validation
 * - malformed phone numbers are accepted
 * - invalid ids pass validation
 * - operational constraints diverge from expected canonical format
 */

import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

import { AtLeastOneOf } from '../validators/at-least-one-of.validator';
import { IsCuid } from '../validators/is-cuid.decorator';
import {
  normalizeEmail,
  normalizePhone,
  assertEmailOperationalConstraints,
  assertValidE164Phone,
  assertAtLeastOneContact,
} from '../validators/user-contact.validator';
import { USER_FIELD_LIMITS } from '../domain/constants/users.constants';

@AtLeastOneOf(['primaryEmail', 'primaryPhone'], {
  message: 'primary_email_or_phone_required',
})
class ContactInputDto {
  primaryEmail?: string;
  primaryPhone?: string;
}

class UserIdParamsDto {
  @IsCuid({ message: 'invalid_user_id_format' })
  id!: string;
}

describe('user validators', () => {
  describe('AtLeastOneOf', () => {
    it('passes when primaryEmail is present', async () => {
      const dto = new ContactInputDto();
      dto.primaryEmail = 'marvin@test.com';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('passes when primaryPhone is present', async () => {
      const dto = new ContactInputDto();
      dto.primaryPhone = '+51999999999';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('fails when both fields are missing', async () => {
      const dto = new ContactInputDto();

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some(
          (e) =>
            e.constraints &&
            Object.values(e.constraints).includes('primary_email_or_phone_required'),
        ),
      ).toBe(true);
    });

    it('treats blank string as missing', async () => {
      const dto = new ContactInputDto();
      dto.primaryEmail = '   ';

      const errors = await validate(dto);

      expect(
        errors.some(
          (e) =>
            e.constraints &&
            Object.values(e.constraints).includes('primary_email_or_phone_required'),
        ),
      ).toBe(true);
    });
  });

  describe('IsCuid', () => {
    it('passes for a valid cuid-like value', async () => {
      const dto = new UserIdParamsDto();
      dto.id = 'ckabcdefghijklmnopqrstuvw';

      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('fails for an invalid id', async () => {
      const dto = new UserIdParamsDto();
      dto.id = 'not-a-cuid';

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toBeDefined();
    });
  });

  describe('normalizeEmail', () => {
    it('trims and lowercases email', () => {
      expect(normalizeEmail('  Marvin@Test.COM  ')).toBe('marvin@test.com');
    });
  });

  describe('assertEmailOperationalConstraints', () => {
    it('does not throw for a valid email under max length', () => {
      expect(() =>
        assertEmailOperationalConstraints('marvin@test.com'),
      ).not.toThrow();
    });

    it('throws for empty email', () => {
      expect(() => assertEmailOperationalConstraints('')).toThrow(
        BadRequestException,
      );
    });

    it('throws for email longer than max length', () => {
      const tooLong =
        'a'.repeat(USER_FIELD_LIMITS.EMAIL_MAX_LENGTH - '@x.com'.length + 1) +
        '@x.com';

      expect(() => assertEmailOperationalConstraints(tooLong)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('normalizePhone', () => {
    it('removes spaces and formatting characters', () => {
      expect(normalizePhone(' +51 (999) 999-999 ')).toBe('+51999999999');
    });
  });

  describe('assertValidE164Phone', () => {
    it('does not throw for a valid E.164 phone', () => {
      expect(() => assertValidE164Phone('+51999999999')).not.toThrow();
    });

    it('throws for empty phone', () => {
      expect(() => assertValidE164Phone('')).toThrow(BadRequestException);
    });

    it('throws for invalid E.164 phone', () => {
      expect(() => assertValidE164Phone('999999999')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('assertAtLeastOneContact', () => {
    it('does not throw when primaryEmail exists', () => {
      expect(() =>
        assertAtLeastOneContact({ primaryEmail: 'marvin@test.com' }),
      ).not.toThrow();
    });

    it('does not throw when primaryPhone exists', () => {
      expect(() =>
        assertAtLeastOneContact({ primaryPhone: '+51999999999' }),
      ).not.toThrow();
    });

    it('throws when both contacts are missing', () => {
      expect(() => assertAtLeastOneContact({})).toThrow(BadRequestException);
    });
  });
});