// packages\api\src\modules\01-identity-and-access\01-users\validators\user-contact.validator.ts

import { BadRequestException } from '@nestjs/common';
import {
  USER_FIELD_LIMITS,
  USER_REGEX,
} from '../domain/constants/users.constants';

/**
 * Normaliza email (trim + lowercase)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validates operational constraints for email (non-format).
 *
 * IMPORTANT:
 * Email format validation is enforced at the DTO level using class-validator (@IsEmail).
 * This function must NOT redefine email format validation to avoid divergence
 * between transport-level validation and domain/service-level validation.
 *
 * Responsibility:
 * - ensure presence
 * - enforce length limits
 * - support normalization consistency
 */
export function assertEmailOperationalConstraints(email: string): void {
  if (!email) {
    throw new BadRequestException('invalid_email');
  }

  if (email.length > USER_FIELD_LIMITS.EMAIL_MAX_LENGTH) {
    throw new BadRequestException('email_too_long');
  }
}

export function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s\-().]/g, '');
}

export function assertValidE164Phone(phone: string): void {
  if (!phone) {
    throw new BadRequestException('invalid_phone');
  }

  const normalized = normalizePhone(phone);

  if (!USER_REGEX.E164_PHONE.test(normalized)) {
    throw new BadRequestException('invalid_phone_format');
  }

  if (normalized.length > USER_FIELD_LIMITS.PHONE_MAX_LENGTH) {
    throw new BadRequestException('phone_too_long');
  }
}

/**
 * Validates that at least one canonical contact is present.
 */
export function assertAtLeastOneContact(input: {
  primaryEmail?: string | null;
  primaryPhone?: string | null;
}): void {
  if (!input.primaryEmail && !input.primaryPhone) {
    throw new BadRequestException('primary_email_or_phone_required');
  }
}