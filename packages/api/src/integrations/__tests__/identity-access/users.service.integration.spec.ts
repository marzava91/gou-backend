// packages/api/src/integrations/__tests__/identity-access/users.service.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { UserStatus } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { UsersModule } from '../../../modules/01-identity-access/01-users/users.module';
import { UsersService } from '../../../modules/01-identity-access/01-users/users.service';
import { cleanIdentityAccessTestData } from '../../setup/test-db-cleaner';

import {
  DuplicatePrimaryEmailError,
  EmptyUserProfileUpdateError,
} from '../../../modules/01-identity-access/01-users/domain/errors/user.errors';

jest.setTimeout(30000);

describe('UsersService Integration (REAL DB)', () => {
  let moduleRef: TestingModule;
  let usersService: UsersService;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    usersService = moduleRef.get(UsersService);
    prisma = moduleRef.get(PrismaService);

    await prisma.$connect();
    await cleanIdentityAccessTestData(prisma);
  });

  afterAll(async () => {
    await cleanIdentityAccessTestData(prisma);
    await prisma.$disconnect();
    await moduleRef.close();
  });

  it('creates a user through UsersService and persists it', async () => {
    const rawEmail = ` Integration-Test-Users-Service-${Date.now()}@Example.com `;
    const expectedEmail = rawEmail.trim().toLowerCase();

    const result = await usersService.createUser(
      {
        firstName: 'Integration',
        lastName: 'User',
        displayName: 'Integration User',
        primaryEmail: rawEmail,
      } as any,
      'integration-test-actor',
    );

    expect(result.id).toBeDefined();
    expect(result.primaryEmail).toBe(expectedEmail);
    expect(result.status).toBe(UserStatus.ACTIVE);

    const persisted = await prisma.user.findUnique({
      where: { id: result.id },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.primaryEmail).toBe(expectedEmail);
    expect(persisted?.status).toBe(UserStatus.ACTIVE);
    expect(persisted?.emailVerified).toBe(false);
    expect(persisted?.phoneVerified).toBe(false);
  });

  it('rejects duplicate primary email through UsersService', async () => {
    const email = `integration-test-duplicate-${Date.now()}@example.com`;

    await usersService.createUser(
      {
        primaryEmail: email,
      } as any,
      'integration-test-actor',
    );

    await expect(
      usersService.createUser(
        {
          primaryEmail: email,
        } as any,
        'integration-test-actor',
      ),
    ).rejects.toBeInstanceOf(DuplicatePrimaryEmailError);
  });

  it('updates profile through UsersService and persists the change', async () => {
    const email = `integration-test-update-${Date.now()}@example.com`;

    const created = await usersService.createUser(
      {
        primaryEmail: email,
        displayName: 'Original Name',
      } as any,
      'integration-test-actor',
    );

    const updated = await usersService.updateProfile(
      created.id,
      {
        firstName: 'Updated',
        displayName: 'Updated Name',
      } as any,
      'integration-test-actor',
    );

    expect(updated.firstName).toBe('Updated');
    expect(updated.displayName).toBe('Updated Name');
    expect(updated.version).toBe(2);

    const persisted = await prisma.user.findUnique({
      where: { id: created.id },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.firstName).toBe('Updated');
    expect(persisted?.displayName).toBe('Updated Name');
    expect(persisted?.version).toBe(2);
  });

  it('rejects empty profile update through UsersService', async () => {
    const email = `integration-test-empty-update-${Date.now()}@example.com`;

    const created = await usersService.createUser(
      {
        primaryEmail: email,
      } as any,
      'integration-test-actor',
    );

    await expect(
      usersService.updateProfile(
        created.id,
        {} as any,
        'integration-test-actor',
      ),
    ).rejects.toBeInstanceOf(EmptyUserProfileUpdateError);
  });
});