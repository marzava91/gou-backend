// packages\api\src\modules\01-identity-and-access\02-auth\ports\auth-verification.port.ts

export const AUTH_VERIFICATION_PORT = Symbol('AUTH_VERIFICATION_PORT');

export interface AuthVerificationPort {
  sendCode(params: {
    userId?: string | null;
    target: string;
    purpose: string;
    code: string;
    expiresAt: Date;
  }): Promise<void>;
}
