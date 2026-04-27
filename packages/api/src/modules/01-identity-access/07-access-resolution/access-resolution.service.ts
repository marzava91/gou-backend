// packages/api/src/modules/01-identity-and-access/07-access-resolution/access-resolution.service.ts

import { Injectable } from '@nestjs/common';

import { AccessResolutionService as AccessResolutionApplicationService } from './application/access-resolution.service';

import { EvaluateAccessQueryDto } from './dto/queries/evaluate-access.query.dto';
import { ResolveAccessContextQueryDto } from './dto/queries/resolve-access-context.query.dto';
import { ListEffectivePermissionsQueryDto } from './dto/queries/list-effective-permissions.query.dto';

import { AuthenticatedAccessActor } from './domain/types/access-resolution.types';

@Injectable()
export class AccessResolutionFacadeService {
  constructor(
    private readonly applicationService: AccessResolutionApplicationService,
  ) {}

  async evaluateAccess(
    actor: AuthenticatedAccessActor,
    query: EvaluateAccessQueryDto,
  ) {
    return this.applicationService.evaluateAccess(actor, query);
  }

  async resolveAccessContext(
    actor: AuthenticatedAccessActor,
    query: ResolveAccessContextQueryDto,
  ) {
    return this.applicationService.resolveAccessContext(actor, query);
  }

  async listEffectivePermissions(
    actor: AuthenticatedAccessActor,
    query: ListEffectivePermissionsQueryDto,
  ) {
    return this.applicationService.listEffectivePermissions(actor, query);
  }
}