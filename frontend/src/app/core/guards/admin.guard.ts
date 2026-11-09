import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastService } from '../services/toast';
import { TokenStorage } from '../services/token-storage';

export const adminGuard: CanActivateFn = (_route, state) => {
  const tokenStorage = inject(TokenStorage);
  const router = inject(Router);
  const toastService = inject(ToastService);

  if (!tokenStorage.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  if (tokenStorage.isAdmin()) {
    return true;
  }

  toastService.warning(
    'Administrator access is required to view this area.',
    'Restricted Area',
  );
  return router.createUrlTree(['/']);
};
