export const INVITATION_AUDIT_PORT = Symbol('INVITATION_AUDIT_PORT');

export interface InvitationAuditPort {
  record(
    action: string,
    actorUserId: string | null,
    targetId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void>;
}
