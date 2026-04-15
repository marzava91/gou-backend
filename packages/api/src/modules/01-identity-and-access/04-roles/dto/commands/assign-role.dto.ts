import { IsOptional, IsString } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  membershipId!: string;

  @IsString()
  roleId!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}