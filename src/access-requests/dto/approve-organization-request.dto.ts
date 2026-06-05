import {
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ApproveOrganizationRequestDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  companyBio?: string;

  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(3000)
  startedYear?: number;

  @IsOptional()
  @IsObject()
  additionalDetails?: Record<string, unknown>;
}
