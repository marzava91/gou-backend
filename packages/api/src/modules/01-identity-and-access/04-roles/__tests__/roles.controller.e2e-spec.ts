import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { RolesController } from '../roles.controller';
import { RolesService } from '../roles.service';
import { RoleResponseMapper } from '../mappers/role-response.mapper';
import { RolePlatformAdminGuard } from '../guards/role-platform-admin.guard';

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

describe('RolesController (e2e)', () => {
  let app: INestApplication;

  const rolesServiceMock = {
    createRole: jest.fn(),
    assignRole: jest.fn(),
    revokeRoleAssignment: jest.fn(),
    listRoles: jest.fn(),
    getRoleById: jest.fn(),
    listMembershipRoleAssignments: jest.fn(),
  };

  async function buildApp(platformAdminGuard?: CanActivate) {
    const moduleBuilder = Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: RolesService, useValue: rolesServiceMock },
        RoleResponseMapper,
      ],
    });

    moduleBuilder
      .overrideGuard(RolePlatformAdminGuard)
      .useValue(platformAdminGuard ?? new AllowGuard());

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
        userId: 'admin_1',
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

    rolesServiceMock.createRole.mockResolvedValue({
      id: 'role_1',
      key: 'tenant_admin',
      name: 'Tenant Admin',
      description: null,
      scopeType: 'TENANT',
      isSystem: true,
      retiredAt: null,
      version: 1,
      createdAt: '2026-04-15T10:00:00.000Z',
      updatedAt: '2026-04-15T10:00:00.000Z',
      capabilities: [{ capabilityKey: 'orders.read' }],
    });

    rolesServiceMock.listRoles.mockResolvedValue([
      {
        id: 'role_1',
        key: 'tenant_admin',
        name: 'Tenant Admin',
        description: null,
        scopeType: 'TENANT',
        isSystem: true,
        retiredAt: null,
        version: 1,
        createdAt: '2026-04-15T10:00:00.000Z',
        updatedAt: '2026-04-15T10:00:00.000Z',
        capabilities: [{ capabilityKey: 'orders.read' }],
      },
    ]);

    rolesServiceMock.assignRole.mockResolvedValue({
      id: 'assignment_1',
      membershipId: 'membership_1',
      roleId: 'role_1',
      status: 'ACTIVE',
      assignedBy: 'admin_1',
      revokedBy: null,
      reason: 'initial setup',
      assignedAt: '2026-04-15T10:00:00.000Z',
      revokedAt: null,
      role: {
        id: 'role_1',
        key: 'tenant_admin',
        name: 'Tenant Admin',
        description: null,
        scopeType: 'TENANT',
        isSystem: true,
        retiredAt: null,
        version: 1,
        createdAt: '2026-04-15T10:00:00.000Z',
        updatedAt: '2026-04-15T10:00:00.000Z',
        capabilities: [{ capabilityKey: 'orders.read' }],
      },
    });

    rolesServiceMock.listMembershipRoleAssignments.mockResolvedValue([
      {
        id: 'assignment_1',
        membershipId: 'membership_1',
        roleId: 'role_1',
        status: 'ACTIVE',
        assignedBy: 'admin_1',
        revokedBy: null,
        reason: 'initial setup',
        assignedAt: '2026-04-15T10:00:00.000Z',
        revokedAt: null,
        role: {
          id: 'role_1',
          key: 'tenant_admin',
          name: 'Tenant Admin',
          description: null,
          scopeType: 'TENANT',
          isSystem: true,
          retiredAt: null,
          version: 1,
          createdAt: '2026-04-15T10:00:00.000Z',
          updatedAt: '2026-04-15T10:00:00.000Z',
          capabilities: [{ capabilityKey: 'orders.read' }],
        },
      },
    ]);

    rolesServiceMock.revokeRoleAssignment.mockResolvedValue({
      id: 'assignment_1',
      status: 'REVOKED',
      revokedAt: '2026-04-15T10:30:00.000Z',
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /v1/roles creates role when platform admin guard allows access', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/roles')
      .send({
        key: 'tenant_admin',
        name: 'Tenant Admin',
        scopeType: 'TENANT',
        capabilityKeys: ['orders.read'],
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'role_1',
        key: 'tenant_admin',
        capabilityKeys: ['orders.read'],
      }),
    );
  });

  it('GET /v1/roles passes scopeType filter to service', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/roles?scopeType=TENANT')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(rolesServiceMock.listRoles).toHaveBeenCalledWith({
      scopeType: 'TENANT',
    });
  });

  it('POST /v1/roles/assignments assigns role', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/roles/assignments')
      .send({
        membershipId: 'membership_1',
        roleId: 'role_1',
        reason: 'initial setup',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'assignment_1',
        membershipId: 'membership_1',
        roleId: 'role_1',
        status: 'ACTIVE',
      }),
    );
  });

  it('PATCH /v1/roles/assignments/:assignmentId/revoke revokes role assignment', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/roles/assignments/assignment_1/revoke')
      .send({
        reason: 'manual revoke',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'assignment_1',
        status: 'REVOKED',
      }),
    );

    expect(rolesServiceMock.revokeRoleAssignment).toHaveBeenCalledWith(
      'admin_1',
      'assignment_1',
      { reason: 'manual revoke' },
    );
  });

  it('GET /v1/roles/memberships/:membershipId/assignments lists membership assignments', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/roles/memberships/membership_1/assignments')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(
      rolesServiceMock.listMembershipRoleAssignments,
    ).toHaveBeenCalledWith('membership_1');
  });

  it('POST /v1/roles returns 403 when platform admin guard denies access', async () => {
    await app.close();
    app = await buildApp(new DenyGuard());

    await request(app.getHttpServer())
      .post('/v1/roles')
      .send({
        key: 'tenant_admin',
        name: 'Tenant Admin',
        scopeType: 'TENANT',
        capabilityKeys: ['orders.read'],
      })
      .expect(403);
  });

  it('PATCH /v1/roles/assignments/:assignmentId/revoke returns 403 when platform admin guard denies access', async () => {
    await app.close();
    app = await buildApp(new DenyGuard());

    await request(app.getHttpServer())
      .patch('/v1/roles/assignments/assignment_1/revoke')
      .send({
        reason: 'manual revoke',
      })
      .expect(403);
  });

  it('POST /v1/roles returns 400 for invalid payload', async () => {
    await request(app.getHttpServer())
      .post('/v1/roles')
      .send({
        key: '',
        name: 'Tenant Admin',
        scopeType: 'INVALID_SCOPE',
        capabilityKeys: [],
      })
      .expect(400);
  });

  it('POST /v1/roles/assignments returns 400 for invalid payload', async () => {
    await request(app.getHttpServer())
      .post('/v1/roles/assignments')
      .send({
        membershipId: 123,
        roleId: null,
      })
      .expect(400);
  });
});