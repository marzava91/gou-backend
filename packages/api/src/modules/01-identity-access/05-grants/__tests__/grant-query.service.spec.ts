import { GrantEffect, GrantStatus, GrantTargetType } from '@prisma/client';

import { GrantQueryService } from '../application/grant-query.service';
import { GrantNotFoundError } from '../domain/errors/grant.errors';

describe('GrantQueryService', () => {
  let service: GrantQueryService;

  const grantsRepository = {
    listGrants: jest.fn(),
    findById: jest.fn(),
    listGrantsByMembership: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GrantQueryService(grantsRepository as any);
  });

  it('delegates listGrants filters to repository', async () => {
    const repositoryResult = [
      {
        id: 'grant_1',
        membershipId: 'membership_1',
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.read',
        status: GrantStatus.ACTIVE,
      },
    ];

    grantsRepository.listGrants.mockResolvedValue(repositoryResult);

    const query = {
      membershipId: 'membership_1',
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      status: GrantStatus.ACTIVE,
    };

    const result = await service.listGrants(query);

    expect(grantsRepository.listGrants).toHaveBeenCalledWith({
      membershipId: 'membership_1',
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      status: GrantStatus.ACTIVE,
    });

    expect(result).toEqual(repositoryResult);
  });

  it('returns grant by id when it exists', async () => {
    const repositoryGrant = {
      id: 'grant_1',
      membershipId: 'membership_1',
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      capabilityKey: 'orders.read',
      resourceKey: null,
      actionKey: null,
      status: GrantStatus.ACTIVE,
      version: 1,
    };

    grantsRepository.findById.mockResolvedValue(repositoryGrant);

    const result = await service.getGrantById('grant_1');

    expect(grantsRepository.findById).toHaveBeenCalledWith('grant_1');
    expect(result).toEqual(repositoryGrant);
  });

  it('throws GrantNotFoundError when grant does not exist', async () => {
    grantsRepository.findById.mockResolvedValue(null);

    await expect(service.getGrantById('missing_grant')).rejects.toBeInstanceOf(
      GrantNotFoundError,
    );

    expect(grantsRepository.findById).toHaveBeenCalledWith('missing_grant');
  });

  it('delegates listMembershipGrants to repository', async () => {
    const repositoryResult = [
      {
        id: 'grant_1',
        membershipId: 'membership_1',
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.read',
        status: GrantStatus.ACTIVE,
      },
      {
        id: 'grant_2',
        membershipId: 'membership_1',
        effect: GrantEffect.DENY,
        targetType: GrantTargetType.RESOURCE_ACTION,
        capabilityKey: null,
        resourceKey: 'orders',
        actionKey: 'write',
        status: GrantStatus.REVOKED,
      },
    ];

    grantsRepository.listGrantsByMembership.mockResolvedValue(repositoryResult);

    const result = await service.listMembershipGrants('membership_1');

    expect(grantsRepository.listGrantsByMembership).toHaveBeenCalledWith(
      'membership_1',
    );
    expect(result).toEqual(repositoryResult);
  });
});
