import { Body, Controller, Get, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { RequestPasswordRecoveryDto } from './dto/request-password-recovery.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('methods')
  getAuthMethods() {
    return {
      methods: ['emailPassword'],
      emailVerificationRequired: true,
      approvalRequiredForSignup: true,
      inviteRequiresPasswordSetup: true,
      passwordRecoveryEnabled: true,
    };
  }

  @Public()
  @Post('password-recovery')
  requestPasswordRecovery(@Body() body: RequestPasswordRecoveryDto) {
    return this.authService.requestPasswordRecovery(body);
  }
}
