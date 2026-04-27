// packages\api\src\modules\01-identity-and-access\01-users\dto\queries\get-user-by-id-params.dto.ts

import { IsCuid } from '../../validators/is-cuid.decorator';

export class GetUserByIdParamsDto {
  @IsCuid({ message: 'invalid_user_id_format' })
  id!: string;
}
