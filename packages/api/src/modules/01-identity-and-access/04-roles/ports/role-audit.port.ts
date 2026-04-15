export const ROLE_AUDIT_PORT = Symbol('ROLE_AUDIT_PORT');

export interface RoleAuditPort {
  record(input: {
    action: string;
    actorId: string | null;
    targetId: string | null;
    payload?: Record<string, unknown>;
    at: Date;
  }): Promise<void>;
}