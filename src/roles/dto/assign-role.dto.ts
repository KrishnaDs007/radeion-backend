import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignRoleDto {
  @IsUUID()
  profileId!: string;

  @IsIn([
    'provider',
    'practice',
    'careCoordinator',
    'acoAdmin',
    'clientAdmin',
    'superAdmin',
    'developer',
  ])
  roleName!:
    | 'provider'
    | 'practice'
    | 'careCoordinator'
    | 'acoAdmin'
    | 'clientAdmin'
    | 'superAdmin'
    | 'developer';

  @IsIn(['global', 'organization', 'aco', 'practice', 'provider'])
  scopeType!: 'global' | 'organization' | 'aco' | 'practice' | 'provider';

  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
