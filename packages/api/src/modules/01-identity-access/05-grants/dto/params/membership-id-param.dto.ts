import { IsString, Matches } from 'class-validator';

export class MembershipIdParamDto {
  @IsString()
  @Matches(/^c[a-z0-9]{24,}$/i)
  membershipId!: string;
}
