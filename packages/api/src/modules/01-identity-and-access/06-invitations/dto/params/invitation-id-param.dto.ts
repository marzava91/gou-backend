import { IsString } from 'class-validator';
import { IsCuid } from '../../validators/is-cuid.decorator';

export class InvitationIdParamDto {
  @IsString()
  @IsCuid({ message: 'invalid_invitation_id_format' })
  id!: string;
}
