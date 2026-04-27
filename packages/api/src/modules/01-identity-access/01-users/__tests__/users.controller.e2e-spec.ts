// packages/api/src/modules/01-identity-and-access/01-users/__tests__/users.controller.e2e-spec.ts

/**
 * VALIDA SURFACE HTTP, GUARDS Y WIRING DE DTOs
 * Este spec valida la superficie HTTP de UsersController, incluyendo guards y wiring de DTOs.
 *
 *
 * TODO(testing):
 * Add a higher-level integration/e2e suite for Users using:
 * - real Nest module wiring
 * - test database
 * - real guard/policy integration
 * - authenticated request factory
 *
 * This current spec intentionally remains a lightweight controller-surface test
 * and does not require Prisma, external auth providers, or database connectivity.
 *
 * ------------------------
 * What this spec validates
 * ------------------------
 * This spec validates the public HTTP contract of UsersController.
 *
 * We are testing:
 * - route wiring
 * - guard behavior at endpoint surface
 * - validation pipe integration
 * - argument delegation into UsersService
 *
 * We are NOT testing:
 * - internal UsersService business rules
 * - Prisma behavior
 * - real authentication provider integration
 *
 * Good indicators
 * ---------------
 * - authenticated self-service routes are reachable when allowed
 * - admin routes are blocked when guard denies access
 * - invalid params / invalid DTO payloads fail at HTTP boundary
 * - controller delegates to service with expected values
 *
 * Bad indicators
 * --------------
 * - endpoint works without expected guard
 * - invalid path param bypasses validation
 * - controller mutates payload incorrectly before delegation
 */

import {
  INestApplication,
  ValidationPipe,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

import { UserAuthenticatedGuard } from '../guards/user-authenticated.guard';
import { UserPlatformAdminGuard } from '../guards/user-platform-admin.guard';
import { UserSelfOrAdminGuard } from '../guards/user-self-or-admin.guard';

class AllowGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

class DenyGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return false;
  }
}

describe('UsersController (e2e)', () => {
  let app: INestApplication;

  const usersServiceMock = {
    createUser: jest.fn(),
    listUsers: jest.fn(),
    getCurrentProfile: jest.fn(),
    updateProfile: jest.fn(),
    requestPrimaryEmailChange: jest.fn(),
    confirmPrimaryEmailChange: jest.fn(),
    requestPrimaryPhoneChange: jest.fn(),
    confirmPrimaryPhoneChange: jest.fn(),
    getUserById: jest.fn(),
    suspendUser: jest.fn(),
    reactivateUser: jest.fn(),
    deactivateUser: jest.fn(),
    anonymizeUser: jest.fn(),
  };

  async function buildApp(options?: {
    authenticatedGuard?: CanActivate;
    platformAdminGuard?: CanActivate;
    selfOrAdminGuard?: CanActivate;
  }) {
    const moduleBuilder = Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    });

    moduleBuilder
      .overrideGuard(UserAuthenticatedGuard)
      .useValue(options?.authenticatedGuard ?? new AllowGuard());

    moduleBuilder
      .overrideGuard(UserPlatformAdminGuard)
      .useValue(options?.platformAdminGuard ?? new AllowGuard());

    moduleBuilder
      .overrideGuard(UserSelfOrAdminGuard)
      .useValue(options?.selfOrAdminGuard ?? new AllowGuard());

    const moduleRef = await moduleBuilder.compile();

    const testApp = moduleRef.createNestApplication();

    testApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );

    testApp.use((req: any, _res: any, next: () => void) => {
      req.user = {
        userId: 'cusr_123456789012345678901234',
        isPlatformAdmin: true,
      };
      next();
    });

    await testApp.init();
    return testApp;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await buildApp();

    usersServiceMock.getCurrentProfile.mockResolvedValue({
      id: 'cusr_123456789012345678901234',
      displayName: 'Marvin',
    });

    usersServiceMock.updateProfile.mockResolvedValue({
      id: 'cusr_123456789012345678901234',
      firstName: 'Nuevo',
    });

    usersServiceMock.createUser.mockResolvedValue({
      id: 'cusr_999999999999999999999999',
      primaryEmail: 'new@test.com',
    });

    usersServiceMock.getUserById.mockResolvedValue({
      id: 'cusr_123456789012345678901234',
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /v1/users/me returns current profile when authenticated self-service guard allows access', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users/me')
      .expect(200);

    expect(response.body).toEqual({
      id: 'cusr_123456789012345678901234',
      displayName: 'Marvin',
    });
    expect(usersServiceMock.getCurrentProfile).toHaveBeenCalledWith(
      'cusr_123456789012345678901234',
    );
  });

  it('PATCH /v1/users/me/profile delegates update using current actor as userId and actorUserId', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/users/me/profile')
      .send({
        firstName: 'Nuevo',
      })
      .expect(200);

    expect(response.body).toEqual({
      id: 'cusr_123456789012345678901234',
      firstName: 'Nuevo',
    });

    expect(usersServiceMock.updateProfile).toHaveBeenCalledWith(
      'cusr_123456789012345678901234',
      { firstName: 'Nuevo' },
      'cusr_123456789012345678901234',
    );
  });

  it('POST /v1/users returns 400 when CreateUserDto has neither primaryEmail nor primaryPhone', async () => {
    /**
     * This is a contract test for the DTO boundary.
     * Good signal: invalid admin command is rejected before service logic executes.
     */
    await request(app.getHttpServer())
      .post('/v1/users')
      .send({
        firstName: 'Marvin',
      })
      .expect(400);

    expect(usersServiceMock.createUser).not.toHaveBeenCalled();
  });

  it('GET /v1/users/:id returns 400 when path param does not match expected CUID format', async () => {
    await request(app.getHttpServer())
      .get('/v1/users/not-a-valid-cuid')
      .expect(400);

    expect(usersServiceMock.getUserById).not.toHaveBeenCalled();
  });

  it('POST /v1/users is blocked when platform admin guard denies access', async () => {
    await app.close();
    app = await buildApp({
      platformAdminGuard: new DenyGuard(),
    });

    await request(app.getHttpServer())
      .post('/v1/users')
      .send({
        primaryEmail: 'new@test.com',
      })
      .expect(403);

    expect(usersServiceMock.createUser).not.toHaveBeenCalled();
  });

  it('GET /v1/users/me is blocked when authenticated guard denies access', async () => {
    await app.close();
    app = await buildApp({
      authenticatedGuard: new DenyGuard(),
    });

    await request(app.getHttpServer()).get('/v1/users/me').expect(403);

    expect(usersServiceMock.getCurrentProfile).not.toHaveBeenCalled();
  });
});
