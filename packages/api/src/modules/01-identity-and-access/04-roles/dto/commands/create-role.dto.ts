import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import { RoleScopeType } from '@prisma/client';

export class CreateRoleDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(RoleScopeType)
  scopeType!: RoleScopeType;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  capabilityKeys!: string[];

  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}