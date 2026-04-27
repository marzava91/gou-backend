// packages/api/src/modules/01-identity-and-access/07-access-resolution/access-resolution.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AccessResolutionFacadeService } from './access-resolution.service';
import { CurrentAccessActor } from './decorators/current-access-actor.decorator';
import { AccessResolutionAuthenticatedGuard } from './guards/access-resolution-authenticated.guard';

import { EvaluateAccessQueryDto } from './dto/queries/evaluate-access.query.dto';
import { ResolveAccessContextQueryDto } from './dto/queries/resolve-access-context.query.dto';
import { ListEffectivePermissionsQueryDto } from './dto/queries/list-effective-permissions.query.dto';

import { AccessDecisionMapper } from './mappers/access-decision.mapper';
import { AccessContextMapper } from './mappers/access-context.mapper';
import { EffectivePermissionMapper } from './mappers/effective-permission.mapper';

import type { AuthenticatedAccessActor } from './domain/types/access-resolution.types';

@Controller('v1/access-resolution')
@UseGuards(AccessResolutionAuthenticatedGuard)
export class AccessResolutionController {
  constructor(
    private readonly accessResolutionService: AccessResolutionFacadeService,
    private readonly accessDecisionMapper: AccessDecisionMapper,
    private readonly accessContextMapper: AccessContextMapper,
    private readonly effectivePermissionMapper: EffectivePermissionMapper,
  ) {}

  @Get('evaluate')
  async evaluate(
    @CurrentAccessActor() actor: AuthenticatedAccessActor,
    @Query() query: EvaluateAccessQueryDto,
  ) {
    const result = await this.accessResolutionService.evaluateAccess(actor, query);
    return this.accessDecisionMapper.toResponse(result);
  }

  @Get('context')
  async resolveContext(
    @CurrentAccessActor() actor: AuthenticatedAccessActor,
    @Query() query: ResolveAccessContextQueryDto,
  ) {
    const result = await this.accessResolutionService.resolveAccessContext(
      actor,
      query,
    );
    return this.accessContextMapper.toResponse(result);
  }

  @Get('effective-permissions')
  async listEffectivePermissions(
    @CurrentAccessActor() actor: AuthenticatedAccessActor,
    @Query() query: ListEffectivePermissionsQueryDto,
  ) {
    const result =
      await this.accessResolutionService.listEffectivePermissions(actor, query);

    return this.effectivePermissionMapper.toResponse(result);
  }
}