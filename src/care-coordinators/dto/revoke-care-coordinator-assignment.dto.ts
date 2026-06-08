import { IsOptional, IsString } from 'class-validator';

export class RevokeCareCoordinatorAssignmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
