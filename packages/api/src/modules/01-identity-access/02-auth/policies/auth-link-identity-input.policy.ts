import { AuthProvider } from '@prisma/client';
import { LinkIdentityDto } from '../dto/commands/link-identity.dto';
import { InvalidCredentialsError } from '../domain/errors/auth.errors';

const FEDERATED_PROVIDERS = new Set<AuthProvider>([
  AuthProvider.GOOGLE,
  AuthProvider.APPLE,
]);

export function assertLinkIdentityInputPolicy(dto: LinkIdentityDto): void {
  const hasExternalToken =
    typeof dto.externalToken === 'string' &&
    dto.externalToken.trim().length > 0;

  const hasProviderSubject =
    typeof dto.providerSubject === 'string' &&
    dto.providerSubject.trim().length > 0;

  if (!hasExternalToken && !hasProviderSubject) {
    throw new InvalidCredentialsError();
  }

  if (hasExternalToken && hasProviderSubject) {
    throw new InvalidCredentialsError();
  }

  if (FEDERATED_PROVIDERS.has(dto.provider) && hasProviderSubject) {
    throw new InvalidCredentialsError();
  }
}
