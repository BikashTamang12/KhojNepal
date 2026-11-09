import { Injectable, computed, signal } from '@angular/core';
import type { User } from '../models';

const TOKEN_STORAGE_KEY = 'khojnepal_access_token';
const USER_STORAGE_KEY = 'khojnepal_user';

@Injectable({
  providedIn: 'root',
})
export class TokenStorage {
  private readonly tokenSignal = signal<string | null>(this.readStoredToken());
  private readonly userSignal = signal<User | null>(this.readStoredUser());

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly hasToken = computed(() => Boolean(this.tokenSignal()));
  readonly isAuthenticated = computed(
    () => Boolean(this.tokenSignal() && this.userSignal()),
  );
  readonly isAdmin = computed(() => this.userSignal()?.role === 'ADMIN');

  getToken(): string | null {
    return this.tokenSignal();
  }

  setSession(accessToken: string, user: User): void {
    this.tokenSignal.set(accessToken);
    this.userSignal.set(user);
    this.writeStorage(TOKEN_STORAGE_KEY, accessToken);
    this.writeStorage(USER_STORAGE_KEY, JSON.stringify(user));
  }

  updateUser(user: User): void {
    this.userSignal.set(user);
    if (this.tokenSignal()) {
      this.writeStorage(USER_STORAGE_KEY, JSON.stringify(user));
    }
  }

  clearSession(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.removeStorage(TOKEN_STORAGE_KEY);
    this.removeStorage(USER_STORAGE_KEY);
  }

  private readStoredToken(): string | null {
    try {
      const value = globalThis.localStorage?.getItem(TOKEN_STORAGE_KEY);
      return value && value.trim() ? value : null;
    } catch {
      return null;
    }
  }

  private readStoredUser(): User | null {
    try {
      const raw = globalThis.localStorage?.getItem(USER_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as User;
      return parsed && typeof parsed.id === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Ignore storage errors in restricted environments
    }
  }

  private removeStorage(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Ignore storage errors in restricted environments
    }
  }
}
