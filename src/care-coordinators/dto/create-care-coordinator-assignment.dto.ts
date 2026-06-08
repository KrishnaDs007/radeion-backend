import { IsOptional, IsUUID } from 'class-validator';

export class CreateCareCoordinatorAssignmentDto {
  @IsUUID()
  profileId!: string;

  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsUUID()
  practiceId?: string;

  @IsOptional()
  @IsUUID()
  providerId?: string;
}
