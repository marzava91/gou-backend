import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GetInvitationByTokenQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token!: string;
}
