import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../../core/services/theme';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorState],
    }).compileComponents();
  });

  it('renders error alert and emits retry event', () => {
    const fixture = TestBed.createComponent(ErrorState);
    const component = fixture.componentInstance;
    component.title = 'Failed to load items';
    component.message = 'Unable to connect to KhojNepal services.';
    component.errorCode = '503';
    component.secondaryLabel = 'Go Home';

    let retried = false;
    let secondaryClicked = false;
    component.retry.subscribe(() => {
      retried = true;
    });
    component.secondaryAction.subscribe(() => {
      secondaryClicked = true;
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
    expect(el.textContent).toContain('Failed to load items');
    expect(el.textContent).toContain('503');

    const buttons = el.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    buttons[0].click();
    buttons[1].click();
    expect(retried).toBe(true);
    expect(secondaryClicked).toBe(true);
  });

  it('prevents duplicate retry emissions while retrying is true', () => {
    const fixture = TestBed.createComponent(ErrorState);
    const component = fixture.componentInstance;
    component.retrying = true;

    let count = 0;
    component.retry.subscribe(() => {
      count += 1;
    });
    fixture.detectChanges();

    component.onRetry();
    expect(count).toBe(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Retrying...',
    );
  });

  it('switches cleanly between light and dark themes', () => {
    const themeService = TestBed.inject(ThemeService);
    const fixture = TestBed.createComponent(ErrorState);
    fixture.detectChanges();

    themeService.setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    themeService.setTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
