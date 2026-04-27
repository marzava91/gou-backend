// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/access-resolution-support.service.spec.ts

import { OperationalSurface } from '@prisma/client';

import { AccessResolutionSupportService } from '../application/support/access-resolution-support.service';
import {
  ACCESS_RESOLUTION_AUDIT_ACTIONS,
} from '../domain/constants/access-resolution.constants';
import { AccessResolutionDomainEvents } from '../domain/events/access-resolution.events';

describe('AccessResolutionSupportService', () => {
  let service: AccessResolutionSupportService;

  const auditPort = {
    record: jest.fn(),
  };

  const eventsPort = {
    publish: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    auditPort.record.mockResolvedValue(undefined);
    eventsPort.publish.mockResolvedValue(undefined);

    service = new AccessResolutionSupportService(
      auditPort as any,
      eventsPort as any,
    );
  });

  describe('now', () => {
    it('returns a Date instance', () => {
      const result = service.now();

      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('recordEvaluation', () => {
    it('audits access_evaluated with normalized nullable fields and publishes access_evaluated event', async () => {
      const at = new Date('2026-04-18T12:00:00.000Z');

      await service.recordEvaluation({
        actorId: 'user_1',
        membershipId: 'membership_1',
        allowed: false,
        reasonCode: 'access_denied',
        capabilityKey: 'orders.write',
        resourceKey: 'orders',
        actionKey: 'write',
        at,
      });

      expect(auditPort.record).toHaveBeenCalledTimes(1);
      expect(auditPort.record).toHaveBeenCalledWith({
        action: ACCESS_RESOLUTION_AUDIT_ACTIONS.ACCESS_EVALUATED,
        actorId: 'user_1',
        targetId: 'membership_1',
        payload: {
          allowed: false,
          reasonCode: 'access_denied',
          capabilityKey: 'orders.write',
          resourceKey: 'orders',
          actionKey: 'write',
        },
        at,
      });

      expect(eventsPort.publish).toHaveBeenCalledTimes(1);
      expect(eventsPort.publish).toHaveBeenCalledWith({
        eventName: AccessResolutionDomainEvents.ACCESS_EVALUATED,
        payload: {
          actorId: 'user_1',
          membershipId: 'membership_1',
          allowed: false,
          reasonCode: 'access_denied',
          at,
        },
      });
    });

    it('uses null membershipId and nullable target fields when optional values are omitted', async () => {
      const at = new Date('2026-04-18T12:05:00.000Z');

      await service.recordEvaluation({
        actorId: 'user_1',
        membershipId: null,
        allowed: true,
        reasonCode: 'access_allowed',
        capabilityKey: null,
        resourceKey: undefined,
        actionKey: undefined,
        at,
      });

      expect(auditPort.record).toHaveBeenCalledWith({
        action: ACCESS_RESOLUTION_AUDIT_ACTIONS.ACCESS_EVALUATED,
        actorId: 'user_1',
        targetId: null,
        payload: {
          allowed: true,
          reasonCode: 'access_allowed',
          capabilityKey: null,
          resourceKey: null,
          actionKey: null,
        },
        at,
      });

      expect(eventsPort.publish).toHaveBeenCalledWith({
        eventName: AccessResolutionDomainEvents.ACCESS_EVALUATED,
        payload: {
          actorId: 'user_1',
          membershipId: null,
          allowed: true,
          reasonCode: 'access_allowed',
          at,
        },
      });
    });

    it('does not publish event when audit recording fails', async () => {
      const at = new Date('2026-04-18T12:10:00.000Z');
      auditPort.record.mockRejectedValueOnce(new Error('audit_failed'));

      await expect(
        service.recordEvaluation({
          actorId: 'user_1',
          membershipId: 'membership_1',
          allowed: true,
          reasonCode: 'access_allowed',
          capabilityKey: 'orders.read',
          resourceKey: 'orders',
          actionKey: 'read',
          at,
        }),
      ).rejects.toThrow('audit_failed');

      expect(eventsPort.publish).not.toHaveBeenCalled();
    });
  });

  describe('recordContextResolved', () => {
    it('audits context_resolved and publishes access_context_resolved event', async () => {
      const at = new Date('2026-04-18T12:15:00.000Z');

      await service.recordContextResolved({
        actorId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        effectiveCapabilityCount: 7,
        at,
      });

      expect(auditPort.record).toHaveBeenCalledTimes(1);
      expect(auditPort.record).toHaveBeenCalledWith({
        action: ACCESS_RESOLUTION_AUDIT_ACTIONS.ACCESS_CONTEXT_RESOLVED,
        actorId: 'user_1',
        targetId: 'membership_1',
        payload: {
          surface: OperationalSurface.PARTNERS_WEB,
          effectiveCapabilityCount: 7,
        },
        at,
      });

      expect(eventsPort.publish).toHaveBeenCalledTimes(1);
      expect(eventsPort.publish).toHaveBeenCalledWith({
        eventName: AccessResolutionDomainEvents.ACCESS_CONTEXT_RESOLVED,
        payload: {
          actorId: 'user_1',
          membershipId: 'membership_1',
          surface: OperationalSurface.PARTNERS_WEB,
          effectiveCapabilityCount: 7,
          at,
        },
      });
    });

    it('uses null targetId when membershipId is not resolved', async () => {
      const at = new Date('2026-04-18T12:20:00.000Z');

      await service.recordContextResolved({
        actorId: 'user_1',
        membershipId: null,
        surface: OperationalSurface.PARTNERS_WEB,
        effectiveCapabilityCount: 0,
        at,
      });

      expect(auditPort.record).toHaveBeenCalledWith({
        action: ACCESS_RESOLUTION_AUDIT_ACTIONS.ACCESS_CONTEXT_RESOLVED,
        actorId: 'user_1',
        targetId: null,
        payload: {
          surface: OperationalSurface.PARTNERS_WEB,
          effectiveCapabilityCount: 0,
        },
        at,
      });

      expect(eventsPort.publish).toHaveBeenCalledWith({
        eventName: AccessResolutionDomainEvents.ACCESS_CONTEXT_RESOLVED,
        payload: {
          actorId: 'user_1',
          membershipId: null,
          surface: OperationalSurface.PARTNERS_WEB,
          effectiveCapabilityCount: 0,
          at,
        },
      });
    });

    it('does not publish event when audit recording fails', async () => {
      const at = new Date('2026-04-18T12:25:00.000Z');
      auditPort.record.mockRejectedValueOnce(new Error('audit_failed'));

      await expect(
        service.recordContextResolved({
          actorId: 'user_1',
          membershipId: 'membership_1',
          surface: OperationalSurface.PARTNERS_WEB,
          effectiveCapabilityCount: 3,
          at,
        }),
      ).rejects.toThrow('audit_failed');

      expect(eventsPort.publish).not.toHaveBeenCalled();
    });
  });

  describe('recordEffectivePermissionsComputed', () => {
    it('audits effective_permissions_computed and publishes effective_permissions_computed event', async () => {
      const at = new Date('2026-04-18T12:30:00.000Z');

      await service.recordEffectivePermissionsComputed({
        actorId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        capabilityCount: 12,
        at,
      });

      expect(auditPort.record).toHaveBeenCalledTimes(1);
      expect(auditPort.record).toHaveBeenCalledWith({
        action: ACCESS_RESOLUTION_AUDIT_ACTIONS.EFFECTIVE_PERMISSIONS_COMPUTED,
        actorId: 'user_1',
        targetId: 'membership_1',
        payload: {
          surface: OperationalSurface.PARTNERS_WEB,
          capabilityCount: 12,
        },
        at,
      });

      expect(eventsPort.publish).toHaveBeenCalledTimes(1);
      expect(eventsPort.publish).toHaveBeenCalledWith({
        eventName: AccessResolutionDomainEvents.EFFECTIVE_PERMISSIONS_COMPUTED,
        payload: {
          actorId: 'user_1',
          membershipId: 'membership_1',
          surface: OperationalSurface.PARTNERS_WEB,
          capabilityCount: 12,
          at,
        },
      });
    });

    it('does not publish event when audit recording fails', async () => {
      const at = new Date('2026-04-18T12:35:00.000Z');
      auditPort.record.mockRejectedValueOnce(new Error('audit_failed'));

      await expect(
        service.recordEffectivePermissionsComputed({
          actorId: 'user_1',
          membershipId: 'membership_1',
          surface: OperationalSurface.PARTNERS_WEB,
          capabilityCount: 5,
          at,
        }),
      ).rejects.toThrow('audit_failed');

      expect(eventsPort.publish).not.toHaveBeenCalled();
    });
  });
});