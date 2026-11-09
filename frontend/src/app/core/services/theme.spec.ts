import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to light, toggles cleanly, and persists selection in localStorage', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    service.toggleTheme();
    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem('khojnepal_theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    service.setTheme('light');
    expect(localStorage.getItem('khojnepal_theme')).toBe('light');
  });

  it('restores previously saved dark theme from localStorage on creation and syncs storage events', () => {
    localStorage.setItem('khojnepal_theme', 'dark');
    TestBed.resetTestingModule();
    const restored = TestBed.inject(ThemeService);
    expect(restored.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'khojnepal_theme', newValue: 'light' }),
    );
    expect(restored.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
