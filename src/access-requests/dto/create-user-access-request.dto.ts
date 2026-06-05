import {
  IsArray,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateUserAccessRequestDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsUUID()
  authUserId?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsArray()
  @IsString({ each: true })
  requestedRoles!: string[];

  @IsObject()
  requestedScope!: Record<string, unknown>;
}
