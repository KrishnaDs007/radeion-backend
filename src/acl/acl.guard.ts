import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRED_PERMISSION_KEY,
  RequiredPermission,
} from '../common/decorators/require-permission.decorator';
import { RequestWithContext } from '../common/types/request-context.type';
import { AclService } from './acl.service';

@Injectable()
export class AclGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly aclService: AclService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<RequiredPermission>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();

    if (!request.user) {
      throw new ForbiddenException('Missing authenticated user context');
    }

    const allowed = this.aclService.can({
      user: request.user,
      action: permission.action,
      scope: permission.scope,
    });

    if (!allowed) {
      throw new ForbiddenException('Permission denied');
    }

    return true;
  }
}
