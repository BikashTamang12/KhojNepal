import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastService } from '../services/toast';
import { TokenStorage } from '../services/token-storage';

export const userGuard: CanActivateFn = (_route, state) => {
  const tokenStorage = inject(TokenStorage);
  const router = inject(Router);
  const toastService = inject(ToastService);

  if (!tokenStorage.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  if (tokenStorage.isAdmin()) {
    toastService.warning(
      'Administrator accounts cannot access personal user workspace pages.',
      'User Workspace Only',
    );
    return router.createUrlTree(['/admin']);
  }

  return true;
};
