import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../../core/services/theme';
import { Loading } from './loading';

describe('Loading', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Loading],
    }).compileComponents();
  });

  it('renders spinner mode with accessible status and label', () => {
    const fixture = TestBed.createComponent(Loading);
    fixture.componentRef.setInput('mode', 'spinner');
    fixture.componentRef.setInput('label', 'Loading items...');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const status = el.querySelector('[role="status"]');
    expect(status).toBeTruthy();
    expect(status?.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('.loading-spinner')).toBeTruthy();
    expect(el.textContent).toContain('Loading items...');
  });

  it('renders dots indicator mode', () => {
    const fixture = TestBed.createComponent(Loading);
    fixture.componentRef.setInput('mode', 'dots');
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const dots = el.querySelectorAll('.loading-dots span');
    expect(dots.length).toBe(3);
  });

  it('renders skeleton placeholders for card, list, table, detail, and text variants', () => {
    const fixture = TestBed.createComponent(Loading);
    fixture.componentRef.setInput('mode', 'skeleton');
    fixture.componentRef.setInput('count', 4);

    fixture.componentRef.setInput('skeletonVariant', 'card');
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.responsive-grid-3 > div',
      ).length,
    ).toBe(4);

    fixture.componentRef.setInput('skeletonVariant', 'list');
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.surface-card')
        .length,
    ).toBe(4);

    fixture.componentRef.setInput('skeletonVariant', 'text');
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.skeleton-block')
        .length,
    ).toBe(4);

    fixture.componentRef.setInput('skeletonVariant', 'table');
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.surface-card'),
    ).toBeTruthy();

    fixture.componentRef.setInput('skeletonVariant', 'detail');
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.surface-card-padded',
      ),
    ).toBeTruthy();
  });

  it('works across light and dark theme states', () => {
    const themeService = TestBed.inject(ThemeService);
    const fixture = TestBed.createComponent(Loading);
    fixture.componentRef.setInput('mode', 'skeleton');
    fixture.detectChanges();

    themeService.setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="status"]'),
    ).toBeTruthy();

    themeService.setTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
