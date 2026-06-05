import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserContext } from '../../auth/auth.types';
import { RequestWithContext } from '../types/request-context.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserContext => {
    const request = context.switchToHttp().getRequest<RequestWithContext>();

    if (!request.user) {
      throw new Error('Authenticated user context is missing.');
    }

    return request.user;
  },
);
