import { IsOptional, IsString } from 'class-validator';

export class RevokeRoleDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
