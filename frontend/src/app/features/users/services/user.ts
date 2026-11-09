import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  ChangePasswordRequest,
  MessageResponse,
  UpdateProfileRequest,
  User,
  UserProfileWithStats,
} from '../../../core/models';
import { TokenStorage } from '../../../core/services/token-storage';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorage);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  getMyProfile(): Observable<UserProfileWithStats> {
    return this.http.get<UserProfileWithStats>(`${this.baseUrl}/me`).pipe(
      tap((profile) => {
        const { stats: _stats, ...userOnly } = profile;
        this.tokenStorage.updateUser(userOnly);
      }),
    );
  }

  updateProfile(payload: UpdateProfileRequest): Observable<User> {
    const body: UpdateProfileRequest = {};
    if (payload.fullName !== undefined) {
      body.fullName = payload.fullName.trim();
    }
    if (payload.phone !== undefined) {
      body.phone = payload.phone.trim();
    }

    return this.http.patch<User>(`${this.baseUrl}/me`, body).pipe(
      tap((user) => {
        this.tokenStorage.updateUser(user);
      }),
    );
  }

  changePassword(payload: ChangePasswordRequest): Observable<MessageResponse> {
    return this.http.patch<MessageResponse>(`${this.baseUrl}/me/password`, payload);
  }
}
