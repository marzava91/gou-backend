import { Injectable } from '@nestjs/common';
import {
  UserContactVerificationPort,
  EmailChangeVerificationRequestResult,
  EmailChangeVerificationConfirmResult,
  PhoneChangeVerificationRequestResult,
  PhoneChangeVerificationConfirmResult,
} from '../../ports/user-contact-verification.port';

@Injectable()
export class NoopUserContactVerificationAdapter
  implements UserContactVerificationPort
{
  async requestEmailChangeVerification(input: {
    userId: string;
    newPrimaryEmail: string;
  }): Promise<EmailChangeVerificationRequestResult> {
    return {
      type: 'email',
      verificationRef: `noop-email-${input.userId}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  async confirmEmailChangeVerification(_: {
    userId: string;
    verificationToken: string;
  }): Promise<EmailChangeVerificationConfirmResult> {
    return {
      type: 'email',
      verified: false,
    };
  }

  async requestPhoneChangeVerification(input: {
    userId: string;
    newPrimaryPhone: string;
  }): Promise<PhoneChangeVerificationRequestResult> {
    return {
      type: 'phone',
      verificationRef: `noop-phone-${input.userId}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  async confirmPhoneChangeVerification(_: {
    userId: string;
    verificationToken: string;
  }): Promise<PhoneChangeVerificationConfirmResult> {
    return {
      type: 'phone',
      verified: false,
    };
  }
}