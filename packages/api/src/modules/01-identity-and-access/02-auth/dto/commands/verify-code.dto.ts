// packages\api\src\modules\01-identity-and-access\02-auth\dto\commands\verify-code.dto.ts

import { IsString } from 'class-validator';

export class VerifyCodeDto {
  @IsString()
  challengeId!: string;

  @IsString()
  code!: string;
}
