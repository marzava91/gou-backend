import { InvitationRecipientType, InvitationStatus, MembershipScopeType } from '@prisma/client';

import { InvitationQueryService } from '../application/invitation-query.service';
import { InvitationTokenService } from '../application/invitation-token.service';
import { InvitationResponseMapper } from '../mappers/invitation-response.mapper';
import { InvitationsRepository } from '../invitations.repository';

import { InvitationNotFoundError } from '../domain/errors/invitation.errors';

describe('InvitationQueryService', () => {
  let service: InvitationQueryService;

  const repository = {
    findById: jest.fn(),
    findByTokenHash: jest.fn(),
    listInvitations: jest.fn(),
  } as unknown as jest.Mocked<Partial<InvitationsRepository>> as InvitationsRepository;

  const mapper = {
    toResponse: jest.fn(),
    toPublicResponse: jest.fn(),
  } as unknown as jest.Mocked<Partial<InvitationResponseMapper>> as InvitationResponseMapper;

  const tokenService = {
    hash: jest.fn(),
  } as unknown as jest.Mocked<Partial<InvitationTokenService>> as InvitationTokenService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new InvitationQueryService(repository, mapper, tokenService);
  });

  describe('getInvitationById', () => {
    it('should return mapped response when invitation exists', async () => {
      const invitation = {
        id: 'inv_01',
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_01',
        storeId: null,
        status: InvitationStatus.SENT,
      };

      const mapped = {
        id: 'inv_01',
        status: InvitationStatus.SENT,
      };

      (repository.findById as jest.Mock).mockResolvedValue(invitation);
      (mapper.toResponse as jest.Mock).mockReturnValue(mapped);

      const result = await service.getInvitationById('inv_01');

      expect(repository.findById).toHaveBeenCalledWith('inv_01');
      expect(mapper.toResponse).toHaveBeenCalledWith(invitation);
      expect(result).toEqual(mapped);
    });

    it('should throw InvitationNotFoundError when invitation does not exist', async () => {
      (repository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getInvitationById('missing_inv')).rejects.toBeInstanceOf(
        InvitationNotFoundError,
      );

      expect(mapper.toResponse).not.toHaveBeenCalled();
    });
  });

  describe('getInvitationByToken', () => {
    it('should hash token, load invitation and return public mapped response', async () => {
      const invitation = {
        id: 'inv_02',
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_02',
        storeId: null,
        status: InvitationStatus.SENT,
      };

      const mapped = {
        id: 'inv_02',
        status: InvitationStatus.SENT,
      };

      (tokenService.hash as jest.Mock).mockReturnValue('hashed_token');
      (repository.findByTokenHash as jest.Mock).mockResolvedValue(invitation);
      (mapper.toPublicResponse as jest.Mock).mockReturnValue(mapped);

      const result = await service.getInvitationByToken({
        token: 'plain-token',
      });

      expect(tokenService.hash).toHaveBeenCalledWith('plain-token');
      expect(repository.findByTokenHash).toHaveBeenCalledWith('hashed_token');
      expect(mapper.toPublicResponse).toHaveBeenCalledWith(invitation);
      expect(result).toEqual(mapped);
    });

    it('should throw InvitationNotFoundError when token is not found', async () => {
      (tokenService.hash as jest.Mock).mockReturnValue('hashed_token');
      (repository.findByTokenHash as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getInvitationByToken({
          token: 'bad-token',
        }),
      ).rejects.toBeInstanceOf(InvitationNotFoundError);

      expect(mapper.toPublicResponse).not.toHaveBeenCalled();
    });
  });

  describe('listInvitations', () => {
    it('should return paginated mapped invitations with explicit sort', async () => {
      const invitations = [
        {
          id: 'inv_10',
          recipientType: InvitationRecipientType.EMAIL,
          recipientValue: 'a@example.com',
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_01',
          storeId: null,
          status: InvitationStatus.SENT,
          createdAt: new Date(),
        },
        {
          id: 'inv_11',
          recipientType: InvitationRecipientType.EMAIL,
          recipientValue: 'b@example.com',
          scopeType: MembershipScopeType.STORE,
          tenantId: 'tenant_01',
          storeId: 'store_01',
          status: InvitationStatus.DECLINED,
          createdAt: new Date(),
        },
      ];

      (repository.listInvitations as jest.Mock).mockResolvedValue({
        items: invitations,
        total: 2,
      });

      (mapper.toResponse as jest.Mock).mockImplementation((invitation) => ({
        id: invitation.id,
        status: invitation.status,
      }));

      const result = await service.listInvitations({
        page: 2,
        pageSize: 10,
        status: InvitationStatus.SENT,
        recipientType: InvitationRecipientType.EMAIL,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_01',
        sortBy: 'expiresAt',
        sortDirection: 'asc',
      });

      expect(repository.listInvitations).toHaveBeenCalledWith({
        where: {
          status: InvitationStatus.SENT,
          recipientType: InvitationRecipientType.EMAIL,
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_01',
        },
        skip: 10,
        take: 10,
        orderBy: { expiresAt: 'asc' },
      });

      expect(result).toEqual({
        items: [
          { id: 'inv_10', status: InvitationStatus.SENT },
          { id: 'inv_11', status: InvitationStatus.DECLINED },
        ],
        page: 2,
        pageSize: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('should clamp pageSize to max and use default createdAt desc sort', async () => {
      (repository.listInvitations as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await service.listInvitations({
        page: 1,
        pageSize: 999,
      });

      expect(repository.listInvitations).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 100,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual({
        items: [],
        page: 1,
        pageSize: 100,
        total: 0,
        totalPages: 0,
      });
    });

    it('should use default page and pageSize when omitted', async () => {
      (repository.listInvitations as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await service.listInvitations({});

      expect(repository.listInvitations).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      });
    });
  });
});