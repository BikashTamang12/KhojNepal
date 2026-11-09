import type { User } from '../../users/entities/user.entity.js';
import type { AuthenticatedUser } from '../decorators/current-user.decorator.js';

export interface PublicUserSummary {
  id: string;
  fullName: string;
  isVerified: boolean;
}

export function sanitizeUser(user: User): AuthenticatedUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export function toPublicUserSummary(
  user?: Pick<User, 'id' | 'fullName' | 'isVerified'> | null,
): PublicUserSummary | undefined {
  if (!user) return undefined;
  return {
    id: user.id,
    fullName: user.fullName,
    isVerified: user.isVerified,
  };
}
