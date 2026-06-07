import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationStatusDto {
  @IsIn(['pending', 'active', 'rejected', 'disabled'])
  status!: 'pending' | 'active' | 'rejected' | 'disabled';

  @IsOptional()
  @IsString()
  reason?: string;
}
