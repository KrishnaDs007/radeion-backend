import { IsString, MinLength } from 'class-validator';

export class PreviewInviteDto {
  @IsString()
  @MinLength(32)
  inviteToken!: string;
}
