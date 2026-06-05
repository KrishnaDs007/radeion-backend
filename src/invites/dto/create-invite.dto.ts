import {
  IsArray,
  IsDateString,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsArray()
  @IsString({ each: true })
  assignedRoles!: string[];

  @IsObject()
  assignedScope!: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
