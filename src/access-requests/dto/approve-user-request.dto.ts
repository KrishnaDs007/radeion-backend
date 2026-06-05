import { IsOptional, IsUUID } from 'class-validator';

export class ApproveUserRequestDto {
  @IsOptional()
  @IsUUID()
  authUserId?: string;
}
