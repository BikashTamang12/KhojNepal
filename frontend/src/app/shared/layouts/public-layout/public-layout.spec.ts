import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ThemeService } from '../../../core/services/theme';
import { PublicLayout } from './public-layout';

describe('PublicLayout', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicLayout],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('toggles between light and dark themes', () => {
    const themeService = TestBed.inject(ThemeService);
    themeService.setTheme('light');

    const fixture = TestBed.createComponent(PublicLayout);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const toggleBtn = el.querySelector<HTMLButtonElement>('.theme-toggle');
    expect(toggleBtn).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    toggleBtn?.click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    toggleBtn?.click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggles responsive mobile navigation drawer', () => {
    const fixture = TestBed.createComponent(PublicLayout);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#public-mobile-nav')).toBeNull();

    const menuBtn = el.querySelector<HTMLButtonElement>('.mobile-menu-toggle');
    menuBtn?.click();
    fixture.detectChanges();

    expect(el.querySelector('#public-mobile-nav')).toBeTruthy();
    expect(menuBtn?.getAttribute('aria-expanded')).toBe('true');

    menuBtn?.click();
    fixture.detectChanges();
    expect(el.querySelector('#public-mobile-nav')).toBeNull();
  });
});
