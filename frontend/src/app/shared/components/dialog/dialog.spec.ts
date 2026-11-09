import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../../core/services/theme';
import { Dialog } from './dialog';

describe('Dialog', () => {
  beforeEach(async () => {
    document.body.style.overflow = '';
    await TestBed.configureTestingModule({
      imports: [Dialog],
    }).compileComponents();
  });

  it('does not render modal markup when closed', () => {
    const fixture = TestBed.createComponent(Dialog);
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders dialog, locks body scroll, and emits confirm/cancel events', () => {
    const fixture = TestBed.createComponent(Dialog);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Delete item report?');
    fixture.componentRef.setInput(
      'description',
      'This action cannot be undone.',
    );
    fixture.componentRef.setInput('variant', 'danger');
    fixture.componentRef.setInput('confirmLabel', 'Delete');
    fixture.componentRef.setInput('open', true);

    let confirmed = false;
    let cancelled = false;
    component.confirmed.subscribe(() => {
      confirmed = true;
    });
    component.cancelled.subscribe(() => {
      cancelled = true;
    });

    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const dialog = el.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(el.textContent).toContain('Delete item report?');
    expect(document.body.style.overflow).toBe('hidden');

    const buttons = el.querySelectorAll<HTMLButtonElement>(
      '.dialog-default-actions button',
    );
    expect(buttons.length).toBe(2);
    buttons[1].click();
    expect(confirmed).toBe(true);

    buttons[0].click();
    fixture.detectChanges();
    expect(cancelled).toBe(true);
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on Escape key and switches cleanly between light and dark themes', () => {
    const themeService = TestBed.inject(ThemeService);
    const fixture = TestBed.createComponent(Dialog);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('title', 'Confirm match');
    fixture.detectChanges();

    themeService.setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    let closed = false;
    component.closed.subscribe(() => {
      closed = true;
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(closed).toBe(true);
    expect(component.open).toBe(false);

    themeService.setTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
