// packages/api/src/modules/01-identity-and-access/03-memberships/dto/params/get-membership-by-id.params.dto.ts

import { IsCuid } from '../../validators/is-cuid.validator';

export class GetMembershipByIdParamsDto {
  @IsCuid()
  id!: string;
}