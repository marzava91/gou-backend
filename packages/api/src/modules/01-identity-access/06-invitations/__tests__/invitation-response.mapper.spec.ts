import { InvitationResponseMapper } from '../mappers/invitation-response.mapper';
import { InvitationStatus, InvitationRecipientType, MembershipScopeType } from '@prisma/client';

describe('InvitationResponseMapper', () => {
  let mapper: InvitationResponseMapper;

  beforeEach(() => {
    mapper = new InvitationResponseMapper();
  });

  describe('toResponse', () => {
    it('should map full invitation correctly', () => {
      const invitation = {
        id: 'inv_01',
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_01',
        storeId: null,
        status: InvitationStatus.SENT,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = mapper.toResponse(invitation as any);

      expect(result).toMatchObject({
        id: 'inv_01',
        status: InvitationStatus.SENT,
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
      });
    });
  });

  describe('toPublicResponse', () => {
    it('should map public invitation without exposing sensitive fields', () => {
      const invitation = {
        id: 'inv_02',
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: 'user@example.com',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_02',
        storeId: null,
        status: InvitationStatus.SENT,
      };

      const result = mapper.toPublicResponse(invitation as any);

      expect(result).toMatchObject({
        id: 'inv_02',
        status: InvitationStatus.SENT,
      });

      // 🔒 importante: no debería exponer cosas sensibles
      expect(result).not.toHaveProperty('currentTokenHash');
    });
  });
});