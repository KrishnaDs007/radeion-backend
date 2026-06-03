import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { RequestWithContext } from '../types/request-context.type';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const requestWithContext = request as RequestWithContext;
    const existingRequestId = request.header('x-request-id');

    requestWithContext.requestId = existingRequestId || randomUUID();
    response.setHeader('x-request-id', requestWithContext.requestId);

    next();
  }
}
