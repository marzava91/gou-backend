// packages\api\src\modules\01-identity-and-access\02-auth\application\auth-identity.service.ts

import { Inject, Injectable } from '@nestjs/common';
import { Prisma, AuthProvider } from '@prisma/client';

import { AuthRepository } from '../auth.repository';
import { AuthResponseMapper } from '../mappers/auth-response.mapper';

import { AUTH_EVENTS_PORT } from '../ports/auth-events.port';
import type { AuthEventsPort } from '../ports/auth-events.port';

import { AUTH_PROVIDER_PORT } from '../ports/auth-provider.port';
import type { AuthProviderPort } from '../ports/auth-provider.port';

import { AUTH_AUDIT_ACTIONS } from '../domain/constants/auth.constants';
import { AuthDomainEvents } from '../domain/events/auth.events';
import {
  AuthProviderAlreadyLinkedError,
  AuthProviderNotLinkedError,
  AuthProviderUnlinkDeniedError,
  InvalidCredentialsError,
} from '../domain/errors/auth.errors';
import { assertLinkIdentityInputPolicy } from '../policies/auth-link-identity-input.policy';

import { LinkIdentityDto } from '../dto/commands/link-identity.dto';
import { UnlinkIdentityDto } from '../dto/commands/unlink-identity.dto';

import { AuthSupportService } from './support/auth-support.service';

@Injectable()
export class AuthIdentityService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authSupportService: AuthSupportService,
    @Inject(AUTH_PROVIDER_PORT)
    private readonly authProvider: AuthProviderPort,
    @Inject(AUTH_EVENTS_PORT)
    private readonly authEventsPort: AuthEventsPort,
  ) {}

  /**
   * Links a new authentication identity to an already authenticated user.
   *
   * Current linking policy:
   * - GOOGLE and APPLE must be linked through verified external tokens
   * - providerSubject fallback is allowed only for controlled/internal flows
   *   such as PASSWORD, PHONE_CODE, migrations, or administrative tooling
   * - canonical user ownership is not resolved here; actorUserId is already known
   */

  async linkIdentity(actorUserId: string, dto: LinkIdentityDto) {
    assertLinkIdentityInputPolicy(dto);

    let providerSubject: string | undefined;
    let email: string | null | undefined;
    let phone: string | null | undefined;
    let emailVerified = false;
    let phoneVerified = false;

    if (
      dto.provider === AuthProvider.GOOGLE ||
      dto.provider === AuthProvider.APPLE
    ) {
      if (!dto.externalToken) {
        throw new InvalidCredentialsError();
      }

      if (!this.authProvider.verifyExternalToken) {
        throw new InvalidCredentialsError();
      }

      const providerResult = await this.authProvider.verifyExternalToken({
        provider: dto.provider,
        token: dto.externalToken,
      });

      if (providerResult.provider !== dto.provider) {
        throw new InvalidCredentialsError();
      }

      providerSubject = providerResult.providerSubject;
      email = providerResult.email ?? null;
      phone = providerResult.phone ?? null;
      emailVerified = providerResult.emailVerified ?? false;
      phoneVerified = providerResult.phoneVerified ?? false;
    } else {
      if (dto.externalToken) {
        if (!this.authProvider.verifyExternalToken) {
          throw new InvalidCredentialsError();
        }

        const providerResult = await this.authProvider.verifyExternalToken({
          provider: dto.provider,
          token: dto.externalToken,
        });

        if (providerResult.provider !== dto.provider) {
          throw new InvalidCredentialsError();
        }

        providerSubject = providerResult.providerSubject;
        email = providerResult.email ?? null;
        phone = providerResult.phone ?? null;
        emailVerified = providerResult.emailVerified ?? false;
        phoneVerified = providerResult.phoneVerified ?? false;
      } else if (dto.providerSubject) {
        providerSubject = dto.providerSubject;
      }
    }

    if (!providerSubject) {
      throw new InvalidCredentialsError();
    }

    const existingGlobalIdentity =
      await this.authRepository.findAuthIdentityByProvider(
        dto.provider,
        providerSubject,
      );

    if (existingGlobalIdentity) {
      if (existingGlobalIdentity.userId === actorUserId) {
        await this.authSupportService.recordAudit(
          AUTH_AUDIT_ACTIONS.PROVIDER_LINKED,
          actorUserId,
          actorUserId,
          {
            authIdentityId: existingGlobalIdentity.id,
            provider: dto.provider,
            providerSubject,
            outcome: 'already_linked',
          },
        );

        return {
          linked: true,
          alreadyLinked: true,
          authIdentity: AuthResponseMapper.toIdentityResponse(
            existingGlobalIdentity,
          ),
        };
      }

      throw new AuthProviderAlreadyLinkedError();
    }

    const existingIdentityForProvider =
      await this.authRepository.findAuthIdentityByUserIdAndProvider(
        actorUserId,
        dto.provider,
      );

    if (existingIdentityForProvider) {
      throw new AuthProviderAlreadyLinkedError();
    }

    let createdIdentity;

    try {
      createdIdentity = await this.authRepository.createAuthIdentity({
        userId: actorUserId,
        provider: dto.provider,
        providerSubject,
        email,
        phone,
        emailVerified,
        phoneVerified,
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const concurrentIdentity = await this.resolveConcurrentLinkedIdentity({
        actorUserId,
        provider: dto.provider,
        providerSubject,
        originalError: error,
      });

      await this.authSupportService.recordAudit(
        AUTH_AUDIT_ACTIONS.PROVIDER_LINKED,
        actorUserId,
        actorUserId,
        {
          authIdentityId: concurrentIdentity.id,
          provider: dto.provider,
          providerSubject: concurrentIdentity.providerSubject,
          outcome: 'already_linked_after_concurrency',
          operation: 'link_identity',
          concurrencyDetected: true,
        },
      );

      return {
        linked: true,
        alreadyLinked: true,
        authIdentity: AuthResponseMapper.toIdentityResponse(concurrentIdentity),
      };
    }

    await this.authSupportService.recordAudit(
      AUTH_AUDIT_ACTIONS.PROVIDER_LINKED,
      actorUserId,
      actorUserId,
      {
        authIdentityId: createdIdentity.id,
        provider: dto.provider,
        providerSubject,
        outcome: 'linked',
      },
    );

    await this.authEventsPort.publish({
      eventName: AuthDomainEvents.PROVIDER_LINKED,
      payload: {
        userId: actorUserId,
        authIdentityId: createdIdentity.id,
        provider: dto.provider,
      },
    });

    return {
      linked: true,
      alreadyLinked: false,
      authIdentity: AuthResponseMapper.toIdentityResponse(createdIdentity),
    };
  }

  /**
   * Unlinks an authentication identity from the authenticated user.
   *
   * Business rules:
   * - the provider must currently be linked to the actor user;
   * - the operation must not leave the user without any remaining valid authentication method.
   */
  async unlinkIdentity(actorUserId: string, dto: UnlinkIdentityDto) {
    const identity =
      await this.authRepository.findAuthIdentityByUserIdAndProvider(
        actorUserId,
        dto.provider,
      );

    if (!identity) {
      throw new AuthProviderNotLinkedError();
    }

    const identitiesCount =
      await this.authRepository.countAuthIdentitiesByUserId(actorUserId);

    if (identitiesCount <= 1) {
      throw new AuthProviderUnlinkDeniedError();
    }

    await this.authRepository.deleteAuthIdentity(identity.id);

    await this.authSupportService.recordAudit(
      AUTH_AUDIT_ACTIONS.PROVIDER_UNLINKED,
      actorUserId,
      actorUserId,
      {
        authIdentityId: identity.id,
        provider: identity.provider,
        providerSubject: identity.providerSubject,
      },
    );

    await this.authEventsPort.publish({
      eventName: AuthDomainEvents.PROVIDER_UNLINKED,
      payload: {
        userId: actorUserId,
        authIdentityId: identity.id,
        provider: identity.provider,
      },
    });

    return {
      unlinked: true,
    };
  }

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private async resolveConcurrentLinkedIdentity(params: {
    actorUserId: string;
    provider: AuthProvider;
    providerSubject: string;
    originalError: Prisma.PrismaClientKnownRequestError;
  }) {
    const concurrentGlobalIdentity =
      await this.authRepository.findAuthIdentityByProvider(
        params.provider,
        params.providerSubject,
      );

    if (concurrentGlobalIdentity) {
      if (concurrentGlobalIdentity.userId === params.actorUserId) {
        return concurrentGlobalIdentity;
      }

      throw new AuthProviderAlreadyLinkedError();
    }

    const concurrentIdentityForProvider =
      await this.authRepository.findAuthIdentityByUserIdAndProvider(
        params.actorUserId,
        params.provider,
      );

    if (concurrentIdentityForProvider) {
      return concurrentIdentityForProvider;
    }

    throw params.originalError;
  }
}
