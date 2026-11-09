import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorage } from '../services/token-storage';

export const guestGuard: CanActivateFn = () => {
  const tokenStorage = inject(TokenStorage);
  const router = inject(Router);

  if (!tokenStorage.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([
    tokenStorage.isAdmin() ? '/admin' : '/items/my',
  ]);
};
