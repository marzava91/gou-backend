import { Injectable } from '@nestjs/common';
import { GrantsRepository } from '../grants.repository';
import { ListGrantsQueryDto } from '../dto/queries/list-grants.query.dto';
import { GrantNotFoundError } from '../domain/errors/grant.errors';

@Injectable()
export class GrantQueryService {
  constructor(private readonly grantsRepository: GrantsRepository) {}

  async listGrants(query: ListGrantsQueryDto) {
    return this.grantsRepository.listGrants({
      membershipId: query.membershipId,
      effect: query.effect,
      targetType: query.targetType,
      status: query.status,
    });
  }

  async getGrantById(grantId: string) {
    const grant = await this.grantsRepository.findById(grantId);

    if (!grant) {
      throw new GrantNotFoundError();
    }

    return grant;
  }

  async listMembershipGrants(membershipId: string) {
    return this.grantsRepository.listGrantsByMembership(membershipId);
  }
}
