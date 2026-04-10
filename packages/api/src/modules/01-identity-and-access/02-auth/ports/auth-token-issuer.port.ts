// packages/api/src/modules/01-identity-and-access/02-auth/ports/auth-token-issuer.port.ts

export const AUTH_TOKEN_ISSUER_PORT = Symbol('AUTH_TOKEN_ISSUER_PORT');

export interface AuthTokenIssuerPort {
  issueAccessToken(payload: Record<string, unknown>): Promise<{
    token: string;
    expiresAt: Date;
  }>;

  issueRefreshToken(payload: Record<string, unknown>): Promise<{
    token: string;
    expiresAt: Date;
  }>;
}