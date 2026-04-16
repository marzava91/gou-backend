import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RevokeGrantDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}