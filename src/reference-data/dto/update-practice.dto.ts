import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdatePracticeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  externalReferenceId?: string;

  @IsOptional()
  @IsIn(['manual', 'databricks'])
  source?: 'manual' | 'databricks';

  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';
}
