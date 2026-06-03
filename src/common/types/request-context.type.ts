import { Request } from 'express';
import { UserContext } from '../../auth/auth.types';

export type RequestWithContext = Request & {
  requestId: string;
  user?: UserContext;
};
