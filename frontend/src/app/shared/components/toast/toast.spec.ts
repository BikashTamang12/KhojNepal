import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ThemeService } from '../../../core/services/theme';
import { ToastService } from '../../../core/services/toast';
import { ToastContainer } from './toast-container';

describe('ToastContainer & ToastService', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [ToastContainer],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(ToastService).clear();
    vi.useRealTimers();
  });

  it('displays success, error, warning, and info notifications and allows dismiss', () => {
    const toastService = TestBed.inject(ToastService);
    const fixture = TestBed.createComponent(ToastContainer);

    const id1 = toastService.success('Item reported successfully.');
    toastService.error('Failed to verify ownership.');
    toastService.warning('Session will expire soon.');
    toastService.info('A potential match was found.');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('app-toast').length).toBe(4);
    expect(el.querySelector('.toast-success')).toBeTruthy();
    expect(el.querySelector('.toast-error')?.getAttribute('role')).toBe('alert');
    expect(el.querySelector('.toast-warning')).toBeTruthy();
    expect(el.querySelector('.toast-info')).toBeTruthy();

    toastService.dismiss(id1);
    fixture.detectChanges();
    expect(el.querySelectorAll('app-toast').length).toBe(3);
  });

  it('auto-dismisses after duration expires and caps max visible toasts', () => {
    const toastService = TestBed.inject(ToastService);
    const fixture = TestBed.createComponent(ToastContainer);

    for (let i = 1; i <= 7; i += 1) {
      toastService.info(`Message ${i}`, 'Info', 3000);
    }
    fixture.detectChanges();
    expect(toastService.toasts().length).toBe(5);

    vi.advanceTimersByTime(3100);
    fixture.detectChanges();
    expect(toastService.toasts().length).toBe(0);
  });

  it('renders cleanly in light and dark themes', () => {
    const themeService = TestBed.inject(ThemeService);
    const toastService = TestBed.inject(ToastService);
    const fixture = TestBed.createComponent(ToastContainer);

    toastService.success('Updated in dark theme');
    themeService.setTheme('dark');
    fixture.detectChanges();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.toast-success'),
    ).toBeTruthy();

    themeService.setTheme('light');
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
