import { Role } from '@atempo/shared';

export type JwtUser = {
  sub: string;
  email: string;
  role: Role;
};
