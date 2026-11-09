import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading';

export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);
export const LOADING_SCOPE = new HttpContextToken<string | undefined>(
  () => undefined,
);

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_LOADING)) {
    return next(req);
  }

  const loadingService = inject(LoadingService);
  const scope = req.context.get(LOADING_SCOPE);
  loadingService.show(scope);

  return next(req).pipe(
    finalize(() => {
      loadingService.hide(scope);
    }),
  );
};
