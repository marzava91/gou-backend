// packages/api/src/modules/01-identity-and-access/01-users/__tests__/users.repository.int.spec.ts

/**
 * VALIDA PERSISTENCIA REAL Y OPTIMISTIC LOCKING
 * Este spec valida la persistencia real de UsersRepository contra una base de datos de prueba real.
 *
 * TODO(infrastructure/testing):
 *
 * This integration spec requires a real database connection via TEST_DATABASE_URL.
 *
 * Current status:
 * - The spec is implemented and validated at the code level.
 * - Execution is intentionally blocked until test database infrastructure is configured.
 *
 * Why this is deferred:
 * - Database test infrastructure will be introduced together with Auth module
 *   (shared across Users, Auth, Memberships, etc.).
 * - Avoids duplicating setup effort and ensures consistent test environment.
 *
 * Activation requirements:
 * - Define TEST_DATABASE_URL
 * - Provision a dedicated test database
 * - Run Prisma migrations against test DB
 * - Ensure test isolation (cleanup strategy or transactional tests)
 *
 * IMPORTANT:
 * This is not a failing spec due to logic errors.
 * It is a pending infrastructure dependency.
 *
 * ------------------------
 * What this spec validates
 * ------------------------
 * This is an integration spec for UsersRepository against a real test database.
 *
 * We are testing:
 * - real Prisma behavior
 * - uniqueness assumptions
 * - optimistic locking semantics
 * - filtering and sorting behavior
 *
 * We are NOT testing:
 * - service business rules
 * - controller guards
 * - DTO validation
 *
 * Why this matters
 * ----------------
 * The service layer assumes the repository behaves exactly as designed.
 * If the repository contract is wrong, service tests may still pass with mocks
 * while production behavior fails with the real database.
 *
 * Good indicators
 * ---------------
 * - unique lookups resolve correctly
 * - updateByIdAndVersion succeeds only when version matches
 * - stale version updates return null
 * - list filters and sorting behave predictably
 *
 * Bad indicators
 * --------------
 * - unique fields allow duplicates unexpectedly
 * - versioned updates overwrite stale data
 * - list filters ignore boundaries or return unstable ordering
 */

import { UsersRepository } from '../users.repository';
import {
  USER_LIST_SORT_FIELDS,
  USER_SORT_DIRECTIONS,
} from '../domain/constants/users.constants';
import { PrismaClient, UserStatus } from '@prisma/client';

describe('UsersRepository (integration)', () => {
  let prisma: PrismaClient | undefined;
  let repository: UsersRepository;

  async function createUser(overrides: Partial<any> = {}) {
    return getPrisma().user.create({
      data: {
        firstName: 'Marvin',
        lastName: 'Zavaleta',
        displayName: 'Marvin',
        avatarUrl: null,
        primaryEmail: null,
        primaryPhone: null,
        emailVerified: false,
        phoneVerified: false,
        status: UserStatus.ACTIVE,
        version: 1,
        ...overrides,
      },
    });
  }

  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error(
        '[UsersRepository.int] TEST_DATABASE_URL is not configured',
      );
    }

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL,
        },
      },
    });

    await getPrisma().$connect();
    repository = new UsersRepository(prisma as any);
  });

  beforeEach(async () => {
    if (!prisma) return;

    await getPrisma().userContactChangeRequest.deleteMany();
    await getPrisma().user.deleteMany();
  });

  afterAll(async () => {
    if (!prisma) return;

    await getPrisma().userContactChangeRequest.deleteMany();
    await getPrisma().user.deleteMany();
    await getPrisma().$disconnect();
  });

  describe('finders and existence checks', () => {
    it('finds a user by canonical primaryEmail', async () => {
      const created = await createUser({
        primaryEmail: 'marvin@test.com',
      });

      const found = await repository.findByPrimaryEmail('marvin@test.com');

      expect(found?.id).toBe(created.id);
    });

    it('finds a user by canonical primaryPhone', async () => {
      const created = await createUser({
        primaryPhone: '+51999999999',
      });

      const found = await repository.findByPrimaryPhone('+51999999999');

      expect(found?.id).toBe(created.id);
    });

    it('existsById returns true only for persisted ids', async () => {
      const created = await createUser();

      await expect(repository.existsById(created.id)).resolves.toBe(true);
      await expect(
        repository.existsById('cdoesnotexist12345678901234'),
      ).resolves.toBe(false);
    });

    it('existsByPrimaryEmail returns true only when the email is present', async () => {
      await createUser({
        primaryEmail: 'marvin@test.com',
      });

      await expect(
        repository.existsByPrimaryEmail('marvin@test.com'),
      ).resolves.toBe(true);
      await expect(
        repository.existsByPrimaryEmail('other@test.com'),
      ).resolves.toBe(false);
    });

    it('existsByPrimaryPhone returns true only when the phone is present', async () => {
      await createUser({
        primaryPhone: '+51999999999',
      });

      await expect(
        repository.existsByPrimaryPhone('+51999999999'),
      ).resolves.toBe(true);
      await expect(
        repository.existsByPrimaryPhone('+51911111111'),
      ).resolves.toBe(false);
    });
  });

  describe('updateByIdAndVersion', () => {
    it('updates and increments version when the expected version matches', async () => {
      /**
       * This is the core optimistic locking contract.
       *
       * Good signal:
       * - update succeeds with matching version
       * - returned entity reflects version increment
       */
      const created = await createUser({
        displayName: 'Original',
        version: 3,
      });

      const updated = await repository.updateByIdAndVersion(created.id, 3, {
        displayName: 'Updated',
      });

      expect(updated).not.toBeNull();
      expect(updated?.displayName).toBe('Updated');
      expect(updated?.version).toBe(4);
    });

    it('returns null when version does not match', async () => {
      /**
       * Bad signal if this fails:
       * stale writes may overwrite fresh data in production.
       */
      const created = await createUser({
        version: 5,
      });

      const updated = await repository.updateByIdAndVersion(created.id, 4, {
        displayName: 'Should not apply',
      });

      expect(updated).toBeNull();

      const persisted = await getPrisma().user.findUnique({
        where: { id: created.id },
      });

      expect(persisted?.displayName).toBe('Marvin');
      expect(persisted?.version).toBe(5);
    });
  });

  describe('updatePrimaryEmailByIdAndVersion', () => {
    it('updates canonical primaryEmail, verifies it, and increments version', async () => {
      const created = await createUser({
        primaryEmail: 'old@test.com',
        emailVerified: false,
        version: 2,
      });

      const updated = await repository.updatePrimaryEmailByIdAndVersion(
        created.id,
        2,
        'new@test.com',
      );

      expect(updated).not.toBeNull();
      expect(updated?.primaryEmail).toBe('new@test.com');
      expect(updated?.emailVerified).toBe(true);
      expect(updated?.version).toBe(3);
    });

    it('returns null for stale version in primaryEmail versioned update', async () => {
      const created = await createUser({
        primaryEmail: 'old@test.com',
        version: 8,
      });

      const updated = await repository.updatePrimaryEmailByIdAndVersion(
        created.id,
        7,
        'new@test.com',
      );

      expect(updated).toBeNull();
    });
  });

  describe('updatePrimaryPhoneByIdAndVersion', () => {
    it('updates canonical primaryPhone, verifies it, and increments version', async () => {
      const created = await createUser({
        primaryPhone: '+51999999999',
        phoneVerified: false,
        version: 10,
      });

      const updated = await repository.updatePrimaryPhoneByIdAndVersion(
        created.id,
        10,
        '+51988888888',
      );

      expect(updated).not.toBeNull();
      expect(updated?.primaryPhone).toBe('+51988888888');
      expect(updated?.phoneVerified).toBe(true);
      expect(updated?.version).toBe(11);
    });

    it('returns null for stale version in primaryPhone versioned update', async () => {
      const created = await createUser({
        primaryPhone: '+51999999999',
        version: 3,
      });

      const updated = await repository.updatePrimaryPhoneByIdAndVersion(
        created.id,
        2,
        '+51977777777',
      );

      expect(updated).toBeNull();
    });
  });

  describe('list', () => {
    it('filters by status', async () => {
      await createUser({
        displayName: 'Active User',
        status: UserStatus.ACTIVE,
      });

      await createUser({
        displayName: 'Suspended User',
        status: UserStatus.SUSPENDED,
      });

      const result = await repository.list({
        status: UserStatus.SUSPENDED,
        skip: 0,
        take: 20,
        sortBy: USER_LIST_SORT_FIELDS.CREATED_AT,
        sortDir: USER_SORT_DIRECTIONS.DESC,
      });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe(UserStatus.SUSPENDED);
    });

    it('filters by emailVerified and phoneVerified', async () => {
      await createUser({
        displayName: 'Verified Email',
        emailVerified: true,
        phoneVerified: false,
      });

      await createUser({
        displayName: 'Verified Phone',
        emailVerified: false,
        phoneVerified: true,
      });

      const emailResult = await repository.list({
        emailVerified: true,
        skip: 0,
        take: 20,
        sortBy: USER_LIST_SORT_FIELDS.CREATED_AT,
        sortDir: USER_SORT_DIRECTIONS.DESC,
      });

      const phoneResult = await repository.list({
        phoneVerified: true,
        skip: 0,
        take: 20,
        sortBy: USER_LIST_SORT_FIELDS.CREATED_AT,
        sortDir: USER_SORT_DIRECTIONS.DESC,
      });

      expect(emailResult.total).toBe(1);
      expect(emailResult.items[0].emailVerified).toBe(true);

      expect(phoneResult.total).toBe(1);
      expect(phoneResult.items[0].phoneVerified).toBe(true);
    });

    it('filters by createdFrom / createdTo range', async () => {
      /**
       * This validates repository date filtering only.
       * Service-level start/end-of-day normalization belongs in service tests.
       */
      const oldDate = new Date('2026-03-20T10:00:00.000Z');
      const inRangeDate = new Date('2026-03-25T10:00:00.000Z');
      const lateDate = new Date('2026-03-28T10:00:00.000Z');

      await createUser({
        displayName: 'Old User',
        createdAt: oldDate,
        updatedAt: oldDate,
      });

      await createUser({
        displayName: 'In Range User',
        createdAt: inRangeDate,
        updatedAt: inRangeDate,
      });

      await createUser({
        displayName: 'Late User',
        createdAt: lateDate,
        updatedAt: lateDate,
      });

      const result = await repository.list({
        createdFrom: new Date('2026-03-24T00:00:00.000Z'),
        createdTo: new Date('2026-03-26T23:59:59.999Z'),
        skip: 0,
        take: 20,
        sortBy: USER_LIST_SORT_FIELDS.CREATED_AT,
        sortDir: USER_SORT_DIRECTIONS.ASC,
      });

      expect(result.total).toBe(1);
      expect(result.items[0].displayName).toBe('In Range User');
    });

    it('sorts by displayName ascending', async () => {
      await createUser({ displayName: 'Zeta' });
      await createUser({ displayName: 'Alpha' });
      await createUser({ displayName: 'Mango' });

      const result = await repository.list({
        skip: 0,
        take: 20,
        sortBy: USER_LIST_SORT_FIELDS.DISPLAY_NAME,
        sortDir: USER_SORT_DIRECTIONS.ASC,
      });

      expect(result.items.map((item) => item.displayName)).toEqual([
        'Alpha',
        'Mango',
        'Zeta',
      ]);
    });

    it('supports pagination via skip/take', async () => {
      await createUser({ displayName: 'A' });
      await createUser({ displayName: 'B' });
      await createUser({ displayName: 'C' });

      const result = await repository.list({
        skip: 1,
        take: 1,
        sortBy: USER_LIST_SORT_FIELDS.DISPLAY_NAME,
        sortDir: USER_SORT_DIRECTIONS.ASC,
      });

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].displayName).toBe('B');
    });
  });

  function getPrisma(): PrismaClient {
    if (!prisma) {
      throw new Error(
        'Prisma client is not initialized. Check TEST_DATABASE_URL.',
      );
    }
    return prisma;
  }
});
