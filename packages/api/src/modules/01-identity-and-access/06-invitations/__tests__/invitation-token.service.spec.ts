import { InvitationTokenService } from '../application/invitation-token.service';

describe('InvitationTokenService', () => {
  let service: InvitationTokenService;

  beforeEach(() => {
    service = new InvitationTokenService();
  });

  describe('generate', () => {
    it('should generate a token payload with invitationId, token and expiresAt', () => {
      const expiresAt = new Date('2026-04-20T12:00:00.000Z');

      const result = service.generate('inv_01', expiresAt);

      expect(result.invitationId).toBe('inv_01');
      expect(result.expiresAt).toBe(expiresAt);
      expect(typeof result.token).toBe('string');
      expect(result.token).toHaveLength(64);
    });

    it('should generate different tokens on consecutive calls', () => {
      const expiresAt = new Date('2026-04-20T12:00:00.000Z');

      const first = service.generate('inv_01', expiresAt);
      const second = service.generate('inv_01', expiresAt);

      expect(first.token).not.toBe(second.token);
    });
  });

  describe('hash', () => {
    it('should hash the same token deterministically', () => {
      const token = 'plain-token';

      const first = service.hash(token);
      const second = service.hash(token);

      expect(first).toBe(second);
      expect(first).toHaveLength(64);
    });

    it('should produce different hashes for different tokens', () => {
      const first = service.hash('token-1');
      const second = service.hash('token-2');

      expect(first).not.toBe(second);
    });
  });
});