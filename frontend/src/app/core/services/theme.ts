
import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<ThemeMode>('light');

  setTheme(theme: ThemeMode): void {
    this.theme.set(theme);

    this.document.documentElement.setAttribute('data-theme', theme);
  }

  toggleTheme(): void {
    const nextTheme = this.theme() === 'light' ? 'dark' : 'light';

    this.setTheme(nextTheme);
  }
}
