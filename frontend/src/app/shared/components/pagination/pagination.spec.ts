import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../../core/services/theme';
import { Pagination } from './pagination';

describe('Pagination', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pagination],
    }).compileComponents();
  });

  it('computes summary, total pages, and emits page changes cleanly', () => {
    const fixture = TestBed.createComponent(Pagination);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('totalItems', 55);

    const emittedPages: number[] = [];
    component.pageChange.subscribe((next) => emittedPages.push(next));

    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Showing 11-20 of 55 items');
    expect(component.totalPages).toBe(6);

    const nextBtn = el.querySelector<HTMLButtonElement>(
      'button[aria-label="Next page"]',
    );
    const prevBtn = el.querySelector<HTMLButtonElement>(
      'button[aria-label="Previous page"]',
    );
    nextBtn?.click();
    prevBtn?.click();

    expect(emittedPages).toEqual([3, 1]);
  });

  it('renders ellipsis window when page count is large', () => {
    const fixture = TestBed.createComponent(Pagination);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('page', 6);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('totalItems', 120);
    fixture.detectChanges();

    expect(component.pageTokens.map((t) => (t.type === 'page' ? t.value : '...'))).toEqual([
      1,
      '...',
      5,
      6,
      7,
      '...',
      12,
    ]);

    const activeBtn = (fixture.nativeElement as HTMLElement).querySelector(
      '.page-number-btn.is-active',
    );
    expect(activeBtn?.getAttribute('aria-current')).toBe('page');
    expect(activeBtn?.textContent?.trim()).toBe('6');
  });

  it('emits pageSizeChange and supports hideWhenEmpty + light/dark themes', () => {
    const themeService = TestBed.inject(ThemeService);
    const fixture = TestBed.createComponent(Pagination);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('totalItems', 0);
    fixture.componentRef.setInput('hideWhenEmpty', true);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('nav.pagination'),
    ).toBeNull();

    const emittedSizes: number[] = [];
    component.pageSizeChange.subscribe((size) => emittedSizes.push(size));

    fixture.componentRef.setInput('totalItems', 30);
    fixture.componentRef.setInput('showPageSizeSelector', true);
    fixture.detectChanges();

    const select = (fixture.nativeElement as HTMLElement).querySelector(
      'select.page-size-select',
    ) as HTMLSelectElement;
    select.value = '20';
    select.dispatchEvent(new Event('change'));
    expect(emittedSizes).toEqual([20]);

    themeService.setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    themeService.setTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
