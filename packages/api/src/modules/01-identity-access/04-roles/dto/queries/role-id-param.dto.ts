import { IsString } from 'class-validator';

export class RoleIdParamDto {
  @IsString()
  roleId!: string;
}
