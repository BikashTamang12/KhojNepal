import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { extractErrorMessage } from '../models';
import { ToastService } from '../services/toast';
import { TokenStorage } from '../services/token-storage';

export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const tokenStorage = inject(TokenStorage);
  const router = inject(Router);
  const skipToast = req.context.get(SKIP_ERROR_TOAST);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const isAuthCredentialEndpoint =
          req.url.includes('/auth/login') || req.url.includes('/auth/register');

        if (error.status === 401 && !isAuthCredentialEndpoint) {
          const hadSession = tokenStorage.hasToken();
          tokenStorage.clearSession();

          if (hadSession && !req.url.includes('/auth/me')) {
            if (!skipToast) {
              toastService.warning(
                'Your session has expired. Please sign in again.',
                'Session Expired',
              );
            }
            const currentUrl = router.url;
            if (!currentUrl.startsWith('/login')) {
              void router.navigate(['/login'], {
                queryParams: { returnUrl: currentUrl },
              });
            }
          }
          return throwError(() => error);
        }

        if (!skipToast && error.status !== 401) {
          const message = extractErrorMessage(error);
          if (error.status === 0) {
            toastService.error(message, 'Connection Error');
          } else if (error.status === 403) {
            toastService.error(message, 'Access Denied');
          } else if (error.status >= 500) {
            toastService.error(message, 'Server Error');
          }
        }
      }

      return throwError(() => error);
    }),
  );
};
