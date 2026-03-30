// packages\api\src\modules\01-identity-and-access\01-users\ports\user-contact-verification.port.ts

export const USER_CONTACT_VERIFICATION_PORT = Symbol(
  'USER_CONTACT_VERIFICATION_PORT',
);

export type EmailChangeVerificationRequestResult = {
  type: 'email';
  verificationRef: string;
  expiresAt: Date;
};

export type PhoneChangeVerificationRequestResult = {
  type: 'phone';
  verificationRef: string;
  expiresAt: Date;
};

export type EmailChangeVerificationConfirmResult = {
  type: 'email';
  verified: boolean;
  verificationRef?: string;
  newPrimaryEmail?: string;
};

export type PhoneChangeVerificationConfirmResult = {
  type: 'phone';
  verified: boolean;
  verificationRef?: string;
  newPrimaryPhone?: string;
};

export interface UserContactVerificationPort {
  requestEmailChangeVerification(input: {
    userId: string;
    newPrimaryEmail: string;
  }): Promise<EmailChangeVerificationRequestResult>;

  requestPhoneChangeVerification(input: {
    userId: string;
    newPrimaryPhone: string;
  }): Promise<PhoneChangeVerificationRequestResult>;

  confirmEmailChangeVerification(input: {
    userId: string;
    verificationToken: string;
  }): Promise<EmailChangeVerificationConfirmResult>;

  confirmPhoneChangeVerification(input: {
    userId: string;
    verificationToken: string;
  }): Promise<PhoneChangeVerificationConfirmResult>;
}