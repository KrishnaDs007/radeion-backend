import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePracticeDto {
  @IsUUID()
  organizationId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  externalReferenceId?: string;

  @IsOptional()
  @IsIn(['manual', 'databricks'])
  source?: 'manual' | 'databricks';
}
