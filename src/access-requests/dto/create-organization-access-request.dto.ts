import {
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateOrganizationAccessRequestDto {
  @IsString()
  organizationName!: string;

  @IsEmail()
  requestedByEmail!: string;

  @IsOptional()
  @IsUUID()
  requestedByAuthUserId?: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsEmail()
  contactEmail!: string;

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
