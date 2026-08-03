import { Role } from '../../generated/prisma/client';

export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  sessionId: string;
}
