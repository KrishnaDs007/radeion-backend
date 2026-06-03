import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  @Public()
  @Get('methods')
  getAuthMethods() {
    return {
      methods: ['emailPassword'],
      emailVerificationRequired: true,
      approvalRequiredForSignup: true,
      inviteRequiresPasswordSetup: true,
    };
  }
}
