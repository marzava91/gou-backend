// packages/api/src/modules/01-identity-and-access/01-users/__tests__/users.service.spec.ts

/**
 * VALIDA REGLAS DE NEGOCIO REAL DEL SUB MODULO
 * Este spec valida las reglas de negocio reales del submódulo de Users, que es la capa más alta de contrato dentro del módulo.
 *
 * ------------------------
 * What this spec validates
 * ------------------------
 * This spec validates the main application behavior of UsersService.
 *
 * It is the highest-value test file in the Users submodule because the service
 * owns most of the real decisions:
 * - uniqueness checks
 * - lifecycle transitions
 * - no-op update rejection
 * - optimistic locking handling
 * - contact change request / confirm flows
 * - audit and domain event side effects
 *
 * We are NOT testing:
 * - HTTP layer behavior
 * - Nest guards
 * - Prisma query details
 * - DTO decorator internals
 *
 * Good indicators
 * ---------------
 * - service rejects invalid domain mutations
 * - service emits audit + event side effects on meaningful state changes
 * - service rejects stale concurrent writes
 * - contact change flows remain safe and deterministic
 *
 * Bad indicators
 * --------------
 * - updates succeed when they should fail
 * - side effects are missing after successful mutations
 * - duplicate contacts are accepted
 * - empty profile updates are accepted
 * - concurrency conflicts are silently ignored
 */

import {
  UserContactChangeStatus,
  UserContactChangeType,
  UserStatus,
} from '@prisma/client';

import { UsersService } from '../users.service';
import { UsersRepository } from '../users.repository';
import { UserContactChangeRequestsRepository } from '../repositories/user-contact-change-requests.repository';

import {
  ContactVerificationRequiredError,
  DuplicatePrimaryEmailError,
  DuplicatePrimaryPhoneError,
  EmptyUserProfileUpdateError,
  InvalidUserStatusTransitionError,
  NewPrimaryEmailMatchesCurrentError,
  UserAlreadyAnonymizedError,
  UserAlreadySuspendedError,
  UserConcurrentModificationError,
  UserNotFoundError,
} from '../domain/errors/user.errors';

import {
  USER_AUDIT_ACTIONS,
  USER_DEFAULTS,
} from '../domain/constants/users.constants';
import { UserDomainEvents } from '../domain/events/user.events';

import type { UserAuditPort } from '../ports/user-audit.port';
import type { UserEventsPort } from '../ports/user-events.port';
import type { UserContactVerificationPort } from '../ports/user-contact-verification.port';

describe('UsersService', () => {
  let service: UsersService;

  let usersRepository: jest.Mocked<UsersRepository>;
  let userContactChangeRequestsRepository: jest.Mocked<UserContactChangeRequestsRepository>;
  let userAuditPort: jest.Mocked<UserAuditPort>;
  let userEventsPort: jest.Mocked<UserEventsPort>;
  let userContactVerificationPort: jest.Mocked<UserContactVerificationPort>;

  const now = new Date('2026-03-28T12:00:00.000Z');

  function makeUser(overrides: Partial<any> = {}) {
    return {
      id: 'cusr_123456789012345678901234',
      firstName: 'Marvin',
      lastName: 'Zavaleta',
      displayName: 'Marvin',
      avatarUrl: null,
      primaryEmail: 'marvin@test.com',
      primaryPhone: '+51999999999',
      emailVerified: false,
      phoneVerified: false,
      status: UserStatus.ACTIVE,
      deactivatedAt: null,
      anonymizedAt: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  beforeEach(() => {
    usersRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByPrimaryEmail: jest.fn(),
      findByPrimaryPhone: jest.fn(),
      existsById: jest.fn(),
      existsByPrimaryEmail: jest.fn(),
      existsByPrimaryPhone: jest.fn(),
      updateById: jest.fn(),
      updateByIdAndVersion: jest.fn(),
      updatePrimaryEmailById: jest.fn(),
      updatePrimaryEmailByIdAndVersion: jest.fn(),
      updatePrimaryPhoneById: jest.fn(),
      updatePrimaryPhoneByIdAndVersion: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    userContactChangeRequestsRepository = {
      create: jest.fn(),
      findLatestActiveByUserIdAndType: jest.fn(),
      findPendingByVerificationRef: jest.fn(),
      findByVerificationRef: jest.fn(),
      cancelById: jest.fn(),
      markVerifiedById: jest.fn(),
      markConsumedById: jest.fn(),
      markExpiredPendingRequests: jest.fn(),
      cancelActiveByUserIdAndType: jest.fn(),
    } as unknown as jest.Mocked<UserContactChangeRequestsRepository>;

    userAuditPort = {
      record: jest.fn(),
    };

    userEventsPort = {
      publish: jest.fn(),
    };

    userContactVerificationPort = {
      requestEmailChangeVerification: jest.fn(),
      requestPhoneChangeVerification: jest.fn(),
      confirmEmailChangeVerification: jest.fn(),
      confirmPhoneChangeVerification: jest.fn(),
    };

    service = new UsersService(
      usersRepository,
      userContactChangeRequestsRepository,
      userAuditPort,
      userEventsPort,
      userContactVerificationPort,
    );
  });

  describe('createUser', () => {
    it('creates a user, records audit, and publishes a domain event', async () => {
      /**
       * We are testing the main happy path for explicit user creation.
       *
       * Good signal:
       * - uniqueness checks happen first
       * - repository.create is called with normalized canonical values
       * - audit/event side effects happen after success
       */
      usersRepository.findByPrimaryEmail.mockResolvedValue(null);
      usersRepository.findByPrimaryPhone.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(
        makeUser({
          primaryEmail: 'marvin@test.com',
          primaryPhone: null,
        }),
      );

      const result = await service.createUser(
        {
          firstName: ' Marvin ',
          primaryEmail: ' Marvin@Test.com ',
        } as any,
        'actor_1',
      );

      expect(usersRepository.findByPrimaryEmail).toHaveBeenCalledWith(
        'marvin@test.com',
      );
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: ' Marvin ',
          primaryEmail: 'marvin@test.com',
          primaryPhone: null,
          status: UserStatus.ACTIVE,
          emailVerified: false,
          phoneVerified: false,
        }),
      );
      expect(userAuditPort.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: USER_AUDIT_ACTIONS.CREATE,
          actorUserId: 'actor_1',
          targetUserId: 'cusr_123456789012345678901234',
        }),
      );
      expect(userEventsPort.publish).toHaveBeenCalledWith(
        UserDomainEvents.USER_CREATED,
        expect.objectContaining({
          userId: 'cusr_123456789012345678901234',
          status: UserStatus.ACTIVE,
        }),
      );
      expect(result.primaryEmail).toBe('marvin@test.com');
    });

    it('rejects duplicate primary email before create', async () => {
      usersRepository.findByPrimaryEmail.mockResolvedValue(
        makeUser({ id: 'existing_user' }),
      );

      await expect(
        service.createUser({ primaryEmail: 'dup@test.com' } as any),
      ).rejects.toBeInstanceOf(DuplicatePrimaryEmailError);

      expect(usersRepository.create).not.toHaveBeenCalled();
    });

    it('rejects duplicate primary phone before create', async () => {
      usersRepository.findByPrimaryPhone.mockResolvedValue(
        makeUser({ id: 'existing_user' }),
      );

      await expect(
        service.createUser({ primaryPhone: '+51911111111' } as any),
      ).rejects.toBeInstanceOf(DuplicatePrimaryPhoneError);

      expect(usersRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('returns user when it exists', async () => {
      usersRepository.findById.mockResolvedValue(makeUser());

      const result = await service.getUserById('cusr_123456789012345678901234');

      expect(result.id).toBe('cusr_123456789012345678901234');
    });

    it('throws UserNotFoundError when user does not exist', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.getUserById('missing')).rejects.toBeInstanceOf(
        UserNotFoundError,
      );
    });
  });

  describe('listUsers', () => {
    it('maps page/limit and returns summary list contract', async () => {
      /**
       * We are testing service-level paging behavior and list contract shape.
       *
       * Good signal:
       * - skip is derived correctly from page + limit
       * - items are returned and total is preserved
       */
      usersRepository.list.mockResolvedValue({
        items: [makeUser()],
        total: 1,
      });

      const result = await service.listUsers({
        page: 2,
        limit: 10,
        sortBy: 'createdAt',
        sortDir: 'desc',
      } as any);

      expect(usersRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result).toEqual({
        items: [
          expect.objectContaining({
            id: 'cusr_123456789012345678901234',
          }),
        ],
        page: 2,
        limit: 10,
        total: 1,
      });
    });
  });

  describe('updateProfile', () => {
    it('rejects empty profile update', async () => {
      await expect(
        service.updateProfile(
          'cusr_123456789012345678901234',
          {} as any,
          'actor_1',
        ),
      ).rejects.toBeInstanceOf(EmptyUserProfileUpdateError);

      expect(usersRepository.findById).not.toHaveBeenCalled();
      expect(userAuditPort.record).not.toHaveBeenCalled();
      expect(userEventsPort.publish).not.toHaveBeenCalled();
    });

    it('updates profile, records audit, and publishes event', async () => {
      usersRepository.findById.mockResolvedValue(makeUser());
      usersRepository.updateByIdAndVersion.mockResolvedValue(
        makeUser({
          version: 2,
          firstName: 'Nuevo',
          displayName: 'Nuevo Nombre',
        }),
      );

      const result = await service.updateProfile(
        'cusr_123456789012345678901234',
        {
          firstName: 'Nuevo',
          displayName: 'Nuevo Nombre',
        } as any,
        'actor_1',
      );

      expect(usersRepository.updateByIdAndVersion).toHaveBeenCalledWith(
        'cusr_123456789012345678901234',
        1,
        expect.objectContaining({
          firstName: 'Nuevo',
          displayName: 'Nuevo Nombre',
        }),
      );
      expect(userAuditPort.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: USER_AUDIT_ACTIONS.PROFILE_UPDATE,
          actorUserId: 'actor_1',
          targetUserId: 'cusr_123456789012345678901234',
        }),
      );
      expect(userEventsPort.publish).toHaveBeenCalledWith(
        UserDomainEvents.USER_PROFILE_UPDATED,
        { userId: 'cusr_123456789012345678901234' },
      );
      expect(result.firstName).toBe('Nuevo');
    });

    it('rejects profile update for anonymized user', async () => {
      usersRepository.findById.mockResolvedValue(
        makeUser({
          status: UserStatus.ANONYMIZED,
          anonymizedAt: now,
        }),
      );

      await expect(
        service.updateProfile(
          'cusr_123456789012345678901234',
          { firstName: 'Nuevo' } as any,
          'actor_1',
        ),
      ).rejects.toBeInstanceOf(UserAlreadyAnonymizedError);

      expect(usersRepository.updateByIdAndVersion).not.toHaveBeenCalled();
    });

    it('rejects stale concurrent profile update', async () => {
      usersRepository.findById.mockResolvedValue(makeUser());
      usersRepository.updateByIdAndVersion.mockResolvedValue(null);

      await expect(
        service.updateProfile(
          'cusr_123456789012345678901234',
          { firstName: 'Nuevo' } as any,
          'actor_1',
        ),
      ).rejects.toBeInstanceOf(UserConcurrentModificationError);

      expect(userAuditPort.record).not.toHaveBeenCalled();
      expect(userEventsPort.publish).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle operations', () => {
    it('suspends an active user and emits side effects', async () => {
      usersRepository.findById.mockResolvedValue(
        makeUser({ status: UserStatus.ACTIVE }),
      );
      usersRepository.updateByIdAndVersion.mockResolvedValue(
        makeUser({ status: UserStatus.SUSPENDED, version: 2 }),
      );

      const result = await service.suspendUser(
        'cusr_123456789012345678901234',
        { reason: 'manual review' } as any,
        'admin_1',
      );

      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(userAuditPort.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: USER_AUDIT_ACTIONS.SUSPEND,
          actorUserId: 'admin_1',
        }),
      );
      expect(userEventsPort.publish).toHaveBeenCalledWith(
        UserDomainEvents.USER_SUSPENDED,
        expect.objectContaining({
          userId: 'cusr_123456789012345678901234',
          status: UserStatus.SUSPENDED,
        }),
      );
    });

    it('rejects suspend when user is already suspended', async () => {
      usersRepository.findById.mockResolvedValue(
        makeUser({ status: UserStatus.SUSPENDED }),
      );

      await expect(
        service.suspendUser(
          'cusr_123456789012345678901234',
          {} as any,
          'admin_1',
        ),
      ).rejects.toBeInstanceOf(UserAlreadySuspendedError);
    });

    it('rejects invalid lifecycle transition on reactivate', async () => {
      /**
       * DEACTIVATED -> ACTIVE is forbidden by the transition matrix.
       * This validates that service-layer lifecycle methods actually enforce the rule.
       */
      usersRepository.findById.mockResolvedValue(
        makeUser({ status: UserStatus.DEACTIVATED }),
      );

      await expect(
        service.reactivateUser(
          'cusr_123456789012345678901234',
          {} as any,
          'admin_1',
        ),
      ).rejects.toBeInstanceOf(InvalidUserStatusTransitionError);
    });

    it('deactivates user with timestamp', async () => {
      usersRepository.findById.mockResolvedValue(
        makeUser({ status: UserStatus.ACTIVE, version: 3 }),
      );
      usersRepository.updateByIdAndVersion.mockResolvedValue(
        makeUser({
          status: UserStatus.DEACTIVATED,
          version: 4,
          deactivatedAt: now,
        }),
      );

      const result = await service.deactivateUser(
        'cusr_123456789012345678901234',
        { reason: 'requested closure' } as any,
        'admin_1',
      );

      expect(result.status).toBe(UserStatus.DEACTIVATED);
      expect(result.deactivatedAt).toEqual(now);
    });

    it('anonymizes user and clears PII fields in returned model', async () => {
      usersRepository.findById.mockResolvedValue(
        makeUser({ status: UserStatus.DEACTIVATED, version: 4 }),
      );
      usersRepository.updateByIdAndVersion.mockResolvedValue(
        makeUser({
          status: UserStatus.ANONYMIZED,
          version: 5,
          anonymizedAt: now,
          firstName: null,
          lastName: null,
          displayName: USER_DEFAULTS.ANONYMIZED_DISPLAY_NAME,
          avatarUrl: null,
          primaryEmail: null,
          primaryPhone: null,
          emailVerified: false,
          phoneVerified: false,
        }),
      );

      const result = await service.anonymizeUser(
        'cusr_123456789012345678901234',
        { reason: 'retention policy completed' } as any,
        'admin_1',
      );

      expect(result.status).toBe(UserStatus.ANONYMIZED);
      expect(result.displayName).toBe(USER_DEFAULTS.ANONYMIZED_DISPLAY_NAME);
      expect(result.primaryEmail).toBeNull();
      expect(result.primaryPhone).toBeNull();
    });
  });

  describe('requestPrimaryEmailChange', () => {
    it('reuses an existing active pending request for the same new value', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      const existingPending = {
        id: 'req_1',
        userId: 'cusr_123456789012345678901234',
        type: UserContactChangeType.PRIMARY_EMAIL,
        newValue: 'new@test.com',
        verificationRef: 'verif_123',
        status: UserContactChangeStatus.PENDING,
        expiresAt: futureDate,
      };

      usersRepository.findById.mockResolvedValue(makeUser());
      usersRepository.findByPrimaryEmail.mockResolvedValue(null);
      userContactChangeRequestsRepository.findLatestActiveByUserIdAndType.mockResolvedValue(
        existingPending as any,
      );

      const result = await service.requestPrimaryEmailChange(
        'cusr_123456789012345678901234',
        { newPrimaryEmail: 'new@test.com' } as any,
        'actor_1',
      );

      expect(result).toEqual({
        requested: true,
        verificationRef: 'verif_123',
        expiresAt: futureDate,
      });

      expect(
        userContactVerificationPort.requestEmailChangeVerification,
      ).not.toHaveBeenCalled();
      expect(userContactChangeRequestsRepository.create).not.toHaveBeenCalled();
      expect(userAuditPort.record).not.toHaveBeenCalled();
      expect(userEventsPort.publish).not.toHaveBeenCalled();
    });

    it('rejects requesting the same current primary email', async () => {
      usersRepository.findById.mockResolvedValue(
        makeUser({ primaryEmail: 'marvin@test.com' }),
      );

      await expect(
        service.requestPrimaryEmailChange(
          'cusr_123456789012345678901234',
          { newPrimaryEmail: 'marvin@test.com' } as any,
          'actor_1',
        ),
      ).rejects.toBeInstanceOf(NewPrimaryEmailMatchesCurrentError);
    });

    it('creates verification flow, audit, and event for a new email', async () => {
      usersRepository.findById.mockResolvedValue(makeUser());
      usersRepository.findByPrimaryEmail.mockResolvedValue(null);
      userContactChangeRequestsRepository.findLatestActiveByUserIdAndType.mockResolvedValue(
        null,
      );
      userContactVerificationPort.requestEmailChangeVerification.mockResolvedValue(
        {
          type: 'email',
          verificationRef: 'verif_456',
          expiresAt: new Date('2026-03-29T10:00:00.000Z'),
        },
      );

      const result = await service.requestPrimaryEmailChange(
        'cusr_123456789012345678901234',
        { newPrimaryEmail: 'new@test.com' } as any,
        'actor_1',
      );

      expect(
        userContactVerificationPort.requestEmailChangeVerification,
      ).toHaveBeenCalledWith({
        userId: 'cusr_123456789012345678901234',
        newPrimaryEmail: 'new@test.com',
      });
      expect(userContactChangeRequestsRepository.create).toHaveBeenCalled();
      expect(userAuditPort.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: USER_AUDIT_ACTIONS.EMAIL_CHANGE_REQUEST,
        }),
      );
      expect(userEventsPort.publish).toHaveBeenCalledWith(
        UserDomainEvents.USER_PRIMARY_EMAIL_CHANGE_REQUESTED,
        expect.objectContaining({
          userId: 'cusr_123456789012345678901234',
          verificationRef: 'verif_456',
        }),
      );
      expect(result.requested).toBe(true);
    });
  });

  describe('confirmPrimaryEmailChange', () => {
    it('rejects incomplete verification result', async () => {
      usersRepository.findById.mockResolvedValue(makeUser());
      userContactVerificationPort.confirmEmailChangeVerification.mockResolvedValue(
        {
          type: 'email',
          verified: false,
        },
      );

      await expect(
        service.confirmPrimaryEmailChange(
          'cusr_123456789012345678901234',
          { verificationToken: 'token_1' } as any,
          'actor_1',
        ),
      ).rejects.toBeInstanceOf(ContactVerificationRequiredError);
    });

    it('confirms primary email change, updates user, consumes request, and emits side effects', async () => {
      usersRepository.findById.mockResolvedValue(makeUser({ version: 7 }));
      userContactVerificationPort.confirmEmailChangeVerification.mockResolvedValue(
        {
          type: 'email',
          verified: true,
          verificationRef: 'verif_789',
          newPrimaryEmail: 'verified@test.com',
        },
      );
      usersRepository.findByPrimaryEmail.mockResolvedValue(null);
      userContactChangeRequestsRepository.findPendingByVerificationRef.mockResolvedValue(
        {
          id: 'req_2',
          userId: 'cusr_123456789012345678901234',
          type: UserContactChangeType.PRIMARY_EMAIL,
          status: UserContactChangeStatus.PENDING,
          newValue: 'verified@test.com',
          verificationRef: 'verif_789',
          expiresAt: new Date('2026-03-29T10:00:00.000Z'),
        } as any,
      );
      userContactChangeRequestsRepository.markVerifiedById.mockResolvedValue(
        {} as any,
      );
      usersRepository.updatePrimaryEmailByIdAndVersion.mockResolvedValue(
        makeUser({
          version: 8,
          primaryEmail: 'verified@test.com',
          emailVerified: true,
        }),
      );
      userContactChangeRequestsRepository.markConsumedById.mockResolvedValue(
        {} as any,
      );

      const result = await service.confirmPrimaryEmailChange(
        'cusr_123456789012345678901234',
        { verificationToken: 'token_1' } as any,
        'actor_1',
      );

      expect(
        userContactChangeRequestsRepository.markVerifiedById,
      ).toHaveBeenCalledWith('req_2');
      expect(
        usersRepository.updatePrimaryEmailByIdAndVersion,
      ).toHaveBeenCalledWith(
        'cusr_123456789012345678901234',
        7,
        'verified@test.com',
      );
      expect(
        userContactChangeRequestsRepository.markConsumedById,
      ).toHaveBeenCalledWith('req_2');
      expect(userAuditPort.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: USER_AUDIT_ACTIONS.EMAIL_CHANGE_CONFIRM,
        }),
      );
      expect(userEventsPort.publish).toHaveBeenCalledWith(
        UserDomainEvents.USER_PRIMARY_EMAIL_CHANGED,
        expect.objectContaining({
          userId: 'cusr_123456789012345678901234',
          type: UserContactChangeType.PRIMARY_EMAIL,
        }),
      );
      expect(result.primaryEmail).toBe('verified@test.com');
    });

    it('rejects stale concurrent update during confirm flow', async () => {
      usersRepository.findById.mockResolvedValue(makeUser({ version: 7 }));
      userContactVerificationPort.confirmEmailChangeVerification.mockResolvedValue(
        {
          type: 'email',
          verified: true,
          verificationRef: 'verif_789',
          newPrimaryEmail: 'verified@test.com',
        },
      );
      usersRepository.findByPrimaryEmail.mockResolvedValue(null);
      userContactChangeRequestsRepository.findPendingByVerificationRef.mockResolvedValue(
        {
          id: 'req_2',
          userId: 'cusr_123456789012345678901234',
          type: UserContactChangeType.PRIMARY_EMAIL,
          status: UserContactChangeStatus.PENDING,
          newValue: 'verified@test.com',
          verificationRef: 'verif_789',
          expiresAt: new Date('2026-03-29T10:00:00.000Z'),
        } as any,
      );
      userContactChangeRequestsRepository.markVerifiedById.mockResolvedValue(
        {} as any,
      );
      usersRepository.updatePrimaryEmailByIdAndVersion.mockResolvedValue(null);

      await expect(
        service.confirmPrimaryEmailChange(
          'cusr_123456789012345678901234',
          { verificationToken: 'token_1' } as any,
          'actor_1',
        ),
      ).rejects.toBeInstanceOf(UserConcurrentModificationError);
    });
  });
});
