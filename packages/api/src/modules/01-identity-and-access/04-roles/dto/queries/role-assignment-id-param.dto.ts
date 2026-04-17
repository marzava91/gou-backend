import { IsString } from 'class-validator';

export class RoleAssignmentIdParamDto {
  @IsString()
  assignmentId!: string;
}
