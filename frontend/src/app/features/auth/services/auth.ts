import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_ERROR_TOAST } from '../../../core/interceptors/error.interceptor';
import { SKIP_LOADING } from '../../../core/interceptors/loading.interceptor';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from '../../../core/models';
import { TokenStorage } from '../../../core/services/token-storage';
import { NotificationService } from '../../notifications/services/notification';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorage);
  private readonly notificationService = inject(NotificationService);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  readonly user = this.tokenStorage.user;
  readonly token = this.tokenStorage.token;
  readonly isAuthenticated = this.tokenStorage.isAuthenticated;
  readonly isAdmin = this.tokenStorage.isAdmin;

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, {
        email: payload.email.trim(),
        password: payload.password,
      })
      .pipe(
        tap((response) => {
          this.tokenStorage.setSession(response.accessToken, response.user);
          this.notificationService.refreshUnreadCount().subscribe();
        }),
      );
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    const body: RegisterRequest = {
      fullName: payload.fullName.trim(),
      email: payload.email.trim(),
      password: payload.password,
    };
    const trimmedPhone = payload.phone?.trim();
    if (trimmedPhone) {
      body.phone = trimmedPhone;
    }

    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, body).pipe(
      tap((response) => {
        this.tokenStorage.setSession(response.accessToken, response.user);
        this.notificationService.refreshUnreadCount().subscribe();
      }),
    );
  }

  getMe(silent = false): Observable<User> {
    const context = silent
      ? new HttpContext().set(SKIP_LOADING, true).set(SKIP_ERROR_TOAST, true)
      : undefined;

    return this.http
      .get<User>(`${this.baseUrl}/me`, { context })
      .pipe(tap((user) => this.tokenStorage.updateUser(user)));
  }

  restoreSession(): Observable<User | null> {
    if (!this.tokenStorage.getToken()) {
      return of(null);
    }

    return this.getMe(true).pipe(
      tap(() => {
        this.notificationService.refreshUnreadCount().subscribe();
      }),
      catchError((error: unknown) => {
        if (
          error instanceof HttpErrorResponse &&
          (error.status === 401 || error.status === 403)
        ) {
          this.tokenStorage.clearSession();
          this.notificationService.resetUnreadCount();
        }
        return of(null);
      }),
    );
  }

  logout(redirectTo = '/login'): void {
    this.tokenStorage.clearSession();
    this.notificationService.resetUnreadCount();
    if (redirectTo) {
      void this.router.navigateByUrl(redirectTo);
    }
  }
}
