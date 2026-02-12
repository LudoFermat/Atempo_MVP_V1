import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from './jwt-user.type';

export const CurrentUser = createParamDecorator((data: keyof JwtUser | undefined, context: ExecutionContext) => {
  const req = context.switchToHttp().getRequest<{ user: JwtUser }>();
  if (!data) {
    return req.user;
  }
  return req.user?.[data];
});
