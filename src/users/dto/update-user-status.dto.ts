import { IsOptional, IsString } from 'class-validator';

export class UpdateUserStatusDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
