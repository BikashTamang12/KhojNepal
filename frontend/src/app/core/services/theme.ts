import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'khojnepal_theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly theme = signal<ThemeMode>(this.readInitialTheme());

  constructor() {
    this.applyTheme(this.theme());

    const win = this.document.defaultView;
    if (win) {
      const onStorage = (event: StorageEvent): void => {
        if (event.key === null) {
          this.theme.set('light');
          this.applyTheme('light');
          return;
        }
        if (event.key === THEME_STORAGE_KEY) {
          const nextTheme: ThemeMode =
            event.newValue === 'dark' ? 'dark' : 'light';
          this.theme.set(nextTheme);
          this.applyTheme(nextTheme);
        }
      };
      win.addEventListener('storage', onStorage);
      this.destroyRef.onDestroy(() => win.removeEventListener('storage', onStorage));
    }
  }

  setTheme(theme: ThemeMode): void {
    this.theme.set(theme);
    this.applyTheme(theme);
    try {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota / privacy mode restrictions
    }
  }

  toggleTheme(): void {
    const nextTheme = this.theme() === 'light' ? 'dark' : 'light';
    this.setTheme(nextTheme);
  }

  private applyTheme(theme: ThemeMode): void {
    this.document.documentElement?.setAttribute('data-theme', theme);
  }

  private readInitialTheme(): ThemeMode {
    try {
      const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch {
      // Ignore storage restrictions
    }
    const attrTheme = this.document.documentElement?.getAttribute('data-theme');
    if (attrTheme === 'dark' || attrTheme === 'light') {
      return attrTheme;
    }
    return 'light';
  }
}
