import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TokenStorage } from '../services/token-storage';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorage);
  const token = tokenStorage.getToken();

  if (!token) {
    return next(req);
  }

  const isApiRequest =
    req.url.startsWith(environment.apiUrl) || req.url.startsWith('/api');

  const isAuthCredentialEndpoint =
    req.url.endsWith('/auth/login') || req.url.endsWith('/auth/register');

  if (!isApiRequest || isAuthCredentialEndpoint || req.headers.has('Authorization')) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authReq);
};
