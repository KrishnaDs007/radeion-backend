import { IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  @MinLength(32)
  inviteToken!: string;

  @IsString()
  @MinLength(32)
  accessToken!: string;
}
