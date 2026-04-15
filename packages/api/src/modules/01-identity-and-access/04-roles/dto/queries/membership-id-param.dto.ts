import { IsString } from 'class-validator';

export class MembershipIdParamDto {
  @IsString()
  membershipId!: string;
}