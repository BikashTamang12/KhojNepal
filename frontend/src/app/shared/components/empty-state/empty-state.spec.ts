import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ThemeService } from '../../../core/services/theme';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyState],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders title, description, and emits actionClick on button click', () => {
    const fixture = TestBed.createComponent(EmptyState);
    const component = fixture.componentInstance;
    component.title = 'No claims yet';
    component.description = 'Claims submitted for matched items will appear here.';
    component.actionLabel = 'Browse Items';

    let clicked = false;
    component.actionClick.subscribe(() => {
      clicked = true;
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No claims yet');
    expect(el.textContent).toContain(
      'Claims submitted for matched items will appear here.',
    );

    const button = el.querySelector('button');
    button?.click();
    expect(clicked).toBe(true);
  });

  it('renders router link when actionRouterLink is provided', () => {
    const fixture = TestBed.createComponent(EmptyState);
    const component = fixture.componentInstance;
    component.actionLabel = 'Report Lost Item';
    component.actionRouterLink = ['/items/report-lost'];
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a.empty-state-link');
    expect(link).toBeTruthy();
    expect(link?.textContent?.trim()).toBe('Report Lost Item');
  });

  it('supports compact layout and light/dark themes', () => {
    const themeService = TestBed.inject(ThemeService);
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentInstance.compact = true;
    fixture.detectChanges();

    themeService.setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.empty-state-compact'),
    ).toBeTruthy();

    themeService.setTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
