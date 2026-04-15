import { RoleQueryService } from '../application/role-query.service';

describe('RoleQueryService', () => {
  let service: RoleQueryService;

  const rolesRepository = {
    listRoles: jest.fn(),
    findRoleById: jest.fn(),
    listAssignmentsByMembership: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RoleQueryService(rolesRepository as any);
  });

  it('delegates listRoles', async () => {
    rolesRepository.listRoles.mockResolvedValue([{ id: 'role_1' }]);

    await expect(service.listRoles()).resolves.toEqual([{ id: 'role_1' }]);
    expect(rolesRepository.listRoles).toHaveBeenCalledTimes(1);
  });

  it('delegates getRoleById', async () => {
    rolesRepository.findRoleById.mockResolvedValue({ id: 'role_1' });

    await expect(service.getRoleById('role_1')).resolves.toEqual({
      id: 'role_1',
    });

    expect(rolesRepository.findRoleById).toHaveBeenCalledWith('role_1');
  });

  it('delegates listMembershipRoleAssignments', async () => {
    rolesRepository.listAssignmentsByMembership.mockResolvedValue([
      { id: 'assignment_1' },
    ]);

    await expect(
      service.listMembershipRoleAssignments('membership_1'),
    ).resolves.toEqual([{ id: 'assignment_1' }]);

    expect(rolesRepository.listAssignmentsByMembership).toHaveBeenCalledWith(
      'membership_1',
    );
  });
});