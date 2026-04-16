import { IsString, Matches } from 'class-validator';

export class GrantIdParamDto {
  @IsString()
  @Matches(/^c[a-z0-9]{24,}$/i)
  grantId!: string;
}