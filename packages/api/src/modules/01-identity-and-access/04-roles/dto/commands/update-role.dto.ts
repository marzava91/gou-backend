import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateRoleDto {
  @IsInt()
  @Min(1)
  expectedVersion!: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  capabilityKeys?: string[];
}
