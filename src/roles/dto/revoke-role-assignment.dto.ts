import { IsOptional, IsString } from 'class-validator';

export class RevokeRoleAssignmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
