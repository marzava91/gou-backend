import { GrantAuditRecord } from '../domain/types/grant.types';

export const GRANT_AUDIT_PORT = Symbol('GRANT_AUDIT_PORT');

export interface GrantAuditPort {
  record(record: GrantAuditRecord): Promise<void>;
}
