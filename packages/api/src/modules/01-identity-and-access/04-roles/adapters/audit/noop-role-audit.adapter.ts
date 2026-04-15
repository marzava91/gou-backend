import { Injectable } from '@nestjs/common';
import { RoleAuditPort } from '../../ports/role-audit.port';

@Injectable()
export class NoopRoleAuditAdapter implements RoleAuditPort {
  async record(): Promise<void> {
    return;
  }
}